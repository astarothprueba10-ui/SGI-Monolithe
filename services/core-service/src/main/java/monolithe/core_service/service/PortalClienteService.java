package monolithe.core_service.service;

import lombok.RequiredArgsConstructor;
import org.springframework.dao.DataAccessException;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import tools.jackson.core.JacksonException;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;

/**
 * Portal Cliente: el actor deriva únicamente del JWT verificado por Spring.
 * La función SQL verifica el rol vigente y limita las ventas a su persona.
 */
@Service
@RequiredArgsConstructor
public class PortalClienteService {
    private final JdbcTemplate jdbc;
    private final JsonMapper mapper;

    @Transactional(readOnly = true)
    public JsonNode resumenPrivado(Long actor) {
        return consultarPrivado(actor,
                "SELECT public.sp_portal_cliente_resumen_v1(CAST(? AS bigint))::text");
    }

    /**
     * 5.4.2: proyectos, lotes y metadatos contractuales de las operaciones
     * vinculadas al JWT. No permite pasar una venta o cliente externo.
     */
    @Transactional(readOnly = true)
    public JsonNode lotesContratosPrivados(Long actor) {
        return consultarPrivado(actor,
                "SELECT public.sp_portal_cliente_lotes_contratos_v1(CAST(? AS bigint))::text");
    }

    /**
     * 5.4.3: actor exclusivo del JWT, sin identificadores de planes, cuotas
     * o compradores proporcionados por el navegador.
     */
    @Transactional(readOnly = true)
    public JsonNode cronogramaPrivado(Long actor) {
        return consultarPrivado(actor,
                "SELECT public.sp_portal_cliente_cronograma_v1(CAST(? AS bigint))::text");
    }

    /** 5.4.4: opciones propias y estado de revisión, sin rutas de Storage. */
    @Transactional(readOnly = true)
    public JsonNode vouchersPrivados(Long actor) {
        return consultarPrivado(actor,
                "SELECT public.sp_portal_cliente_vouchers_v1(CAST(? AS bigint))::text");
    }

    /** Crea un intento de carga para una compra/cuota cuya titularidad valida SQL. */
    @Transactional
    public JsonNode prepararVoucherPrivado(Long actor,
            monolithe.core_service.dto.PortalPrepararVoucherRequest req) {
        if (req == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Debe completar la información del comprobante.");
        }
        return consultarPrivado(actor, """
                SELECT public.sp_portal_cliente_preparar_voucher_v1(
                    CAST(? AS bigint),CAST(? AS bigint),CAST(? AS varchar),
                    CAST(? AS bigint),CAST(? AS numeric),CAST(? AS integer),
                    CAST(? AS date),CAST(? AS varchar),CAST(? AS varchar),
                    CAST(? AS varchar),CAST(? AS bigint)
                )::text
                """,req.idVenta(),req.destino(),req.idCuota(),req.monto(),
                req.idMetodoPago(),req.fechaOperacion(),req.numeroOperacion(),
                req.nombreArchivo(),req.tipoMime(),req.tamanioBytes());
    }

    /** Registro idempotente después de validar el objeto real de Storage. */
    @Transactional
    public JsonNode registrarVoucherPrivado(Long actor,java.util.UUID idCarga,String destino) {
        if (idCarga == null || destino == null
                || (!destino.equals("CUOTA") && !destino.equals("INICIAL"))) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "La referencia de comprobante no es válida.");
        }
        return consultarPrivado(actor, """
                SELECT public.sp_portal_cliente_registrar_voucher_v1(
                    CAST(? AS bigint),CAST(? AS uuid),CAST(? AS varchar)
                )::text
                """,idCarga,destino);
    }

    /** 5.4.5: solo metadatos de documentos publicados, nunca rutas o hashes. */
    @Transactional(readOnly = true)
    public JsonNode documentosPrivados(Long actor) {
        return consultarPrivado(actor,
                "SELECT public.sp_portal_cliente_documentos_v1(CAST(? AS bigint))::text");
    }

    /** Alertas recalculadas desde cuotas y vouchers reales del actor JWT. */
    @Transactional(readOnly = true)
    public JsonNode alertasPrivadas(Long actor) {
        return consultarPrivado(actor,
                "SELECT public.sp_portal_cliente_alertas_v1(CAST(? AS bigint))::text");
    }

    /** Entrega la ruta SOLO al servidor que firma la URL; jamás al listado público. */
    @Transactional(readOnly = true)
    public JsonNode autorizarDocumentoPrivado(Long actor, String tipo, Long idDocumento) {
        if (tipo == null || (!tipo.equals("CONTRATO") && !tipo.equals("ANEXO"))
                || idDocumento == null || idDocumento <= 0) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND,
                    "Documento no disponible para la cuenta.");
        }
        return consultarPrivado(actor, """
                SELECT public.sp_portal_cliente_autorizar_documento_v1(
                    CAST(? AS bigint),CAST(? AS varchar),CAST(? AS bigint)
                )::text
                """,tipo,idDocumento);
    }

    private JsonNode consultarPrivado(Long actor, String consulta, Object... parametros) {
        if (actor == null || actor <= 0) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED,
                    "Se requiere una sesión de cliente válida.");
        }
        final String respuesta;
        try {
            Object[] valores = new Object[parametros.length + 1];
            valores[0] = actor;
            System.arraycopy(parametros, 0, valores, 1, parametros.length);
            respuesta = jdbc.queryForObject(consulta, String.class, valores);
        } catch (DataAccessException ex) {
            String message = String.valueOf(ex.getMostSpecificCause().getMessage());
            if (message.contains("PORTAL_ACCESO_DENEGADO|")) {
                throw new ResponseStatusException(HttpStatus.FORBIDDEN,
                        "El usuario no tiene una cuenta de cliente activa.", ex);
            }
            if (message.contains("PORTAL_DOCUMENTO_NO_AUTORIZADO|")) {
                throw new ResponseStatusException(HttpStatus.NOT_FOUND,
                        "Documento no disponible para la cuenta.", ex);
            }
            if (message.contains("PORTAL_DATOS_INVALIDOS|")) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                        "Revise los datos y el formato del comprobante.", ex);
            }
            if (message.contains("PORTAL_VENTA_NO_AUTORIZADA|")
                    || message.contains("PORTAL_PLAN_NO_AUTORIZADO|")
                    || message.contains("PORTAL_CUOTA_NO_AUTORIZADA|")
                    || message.contains("PORTAL_CARGA_NO_AUTORIZADA|")) {
                throw new ResponseStatusException(HttpStatus.FORBIDDEN,
                        "Operación o comprobante no autorizado para esta cuenta.", ex);
            }
            if (message.contains("PORTAL_MONTO_INVALIDO|")
                    || message.contains("PORTAL_CARGA_EXPIRADA|")
                    || message.contains("PORTAL_ARCHIVO_NO_EXISTE|")
                    || message.contains("PORTAL_PAGO_DUPLICADO|")) {
                throw new ResponseStatusException(HttpStatus.CONFLICT,
                        "El comprobante no pudo registrarse. Revise el saldo, archivo o número de operación.", ex);
            }
            throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE,
                    "No fue posible procesar la solicitud privada.", ex);
        }
        if (respuesta == null) {
            throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE,
                    "No se recibió información del portal.");
        }
        try {
            JsonNode resultado = mapper.readTree(respuesta);
            if (resultado == null || !resultado.isObject()) {
                throw new IllegalStateException("Respuesta de portal inesperada.");
            }
            return resultado;
        } catch (JacksonException ex) {
            throw new IllegalStateException("El resumen del portal no es JSON válido.",ex);
        }
    }
}
