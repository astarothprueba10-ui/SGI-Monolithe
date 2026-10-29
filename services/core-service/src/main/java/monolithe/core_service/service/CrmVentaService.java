
package monolithe.core_service.service;

import lombok.RequiredArgsConstructor;
import monolithe.core_service.dto.FormalizarVentaCrmRequest;
import monolithe.core_service.dto.CancelarVentaPendienteRequest;
import monolithe.core_service.dto.RegistrarEvidenciaContratoRequest;
import monolithe.core_service.dto.ConfirmarFirmaContratoRequest;

import org.springframework.dao.DataAccessException;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import tools.jackson.core.JacksonException;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;

@Service
@RequiredArgsConstructor
public class CrmVentaService {

    private final JdbcTemplate jdbc;
    private final JsonMapper jsonMapper;

    @Transactional(readOnly = true)
    public JsonNode validar(
            Long actor,
            FormalizarVentaCrmRequest req) {

        validarActor(actor);

        if (req == null
                || req.idProspecto() == null
                || req.idLote() == null
                || req.modalidad() == null
                || req.montoTotal() == null) {

            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Datos obligatorios de venta incompletos.");
        }

        return ejecutar("""
                SELECT public.sp_crm_validar_formalizacion_v6(
                    CAST(? AS bigint),
                    CAST(? AS bigint),
                    CAST(? AS bigint),
                    CAST(? AS varchar),
                    CAST(? AS numeric),
                    CAST(? AS numeric),
                    CAST(? AS integer)
                )::text
                """,
                actor,
                req.idProspecto(),
                req.idLote(),
                req.modalidad(),
                req.montoTotal(),
                req.montoInicial(),
                req.numeroCuotas());
    }

    @Transactional(readOnly = true)
    public JsonNode verificarComprador(
            Long actor,
            Long idProspecto) {

        validarActor(actor);

        if (idProspecto == null || idProspecto <= 0) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Identificador de prospecto invalido.");
        }

        return ejecutar("""
                SELECT public.sp_crm_verificar_conversion_comprador_v6(
                    CAST(? AS bigint),
                    CAST(? AS bigint)
                )::text
                """,
                actor,
                idProspecto);
    }

    @Transactional
    public JsonNode registrarVentaPendiente(
            Long actor,
            FormalizarVentaCrmRequest req) {

        validarActor(actor);

        if (req == null
                || req.idProspecto() == null
                || req.idLote() == null
                || req.modalidad() == null
                || req.montoTotal() == null) {

            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Datos obligatorios de venta incompletos.");
        }

        return ejecutar("""
                SELECT public.sp_crm_registrar_venta_pendiente_v6(
                    CAST(? AS bigint),
                    CAST(? AS bigint),
                    CAST(? AS bigint),
                    CAST(? AS varchar),
                    CAST(? AS numeric),
                    CAST(? AS numeric),
                    CAST(? AS integer),
                    CAST(? AS text)
                )::text
                """,
                actor,
                req.idProspecto(),
                req.idLote(),
                req.modalidad(),
                req.montoTotal(),
                req.montoInicial(),
                req.numeroCuotas(),
                req.observaciones());
    }

    @Transactional
    public JsonNode cancelarVentaPendiente(
            Long actor,
            Long idVenta,
            CancelarVentaPendienteRequest request) {

        validarActor(actor);

        if (idVenta == null || idVenta <= 0) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Identificador de venta inválido.");
        }

        if (request == null
                || request.motivo() == null
                || request.motivo().trim().length() < 10
                || request.motivo().trim().length() > 250) {

            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "El motivo debe tener entre 10 y 250 caracteres.");
        }

        return ejecutar("""
                SELECT public.sp_crm_cancelar_venta_pendiente_v6(
                    CAST(? AS bigint),
                    CAST(? AS bigint),
                    CAST(? AS varchar)
                )::text
                """,
                actor,
                idVenta,
                request.motivo().trim());
    }

    @Transactional
    public JsonNode registrarEvidenciaContrato(
            Long actor,
            Long idContrato,
            RegistrarEvidenciaContratoRequest request) {

        validarActor(actor);

        if (idContrato == null || idContrato <= 0) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Identificador de contrato inválido.");
        }

        if (request == null
                || request.claveArchivo() == null
                || request.claveArchivo().isBlank()
                || request.nombreOriginal() == null
                || request.nombreOriginal().isBlank()) {

            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Los datos del documento son obligatorios.");
        }

        return ejecutar("""
                SELECT public.sp_crm_registrar_evidencia_contrato_v6(
                    CAST(? AS bigint),
                    CAST(? AS bigint),
                    CAST(? AS varchar),
                    CAST(? AS varchar)
                )::text
                """,
                actor,
                idContrato,
                request.claveArchivo().trim(),
                request.nombreOriginal().trim());
    }

    @Transactional(readOnly = true)
    public JsonNode autorizarCargaContrato(
            Long actor,
            Long idContrato) {

        validarActor(actor);

        if (idContrato == null || idContrato <= 0) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Identificador de contrato inválido.");
        }

        return ejecutar("""
                SELECT public.sp_crm_autorizar_carga_contrato_v6(
                    CAST(? AS bigint),
                    CAST(? AS bigint)
                )::text
                """,
                actor,
                idContrato);
    }

    @Transactional(readOnly = true)
    public JsonNode listarContratosPendientes(
            Long actor,
            String busqueda,
            Integer pagina,
            Integer tamano) {

        validarActor(actor);

        int paginaSegura = pagina == null ? 1 : pagina;
        int tamanoSeguro = tamano == null ? 20 : tamano;

        if (paginaSegura < 1 || paginaSegura > 100000
                || tamanoSeguro < 1 || tamanoSeguro > 100) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Parámetros de paginación inválidos.");
        }

        if (busqueda != null && busqueda.length() > 120) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "El texto de búsqueda es demasiado largo.");
        }

        return ejecutar("""
                SELECT public.sp_crm_listar_contratos_pendientes_v6(
                    CAST(? AS bigint),
                    CAST(? AS varchar),
                    CAST(? AS integer),
                    CAST(? AS integer)
                )::text
                """,
                actor,
                busqueda == null ? null : busqueda.trim(),
                paginaSegura,
                tamanoSeguro);
    }

    @Transactional
    public JsonNode aprobarFirmaContrato(
            Long actor,
            Long idContrato,
            ConfirmarFirmaContratoRequest request) {

        validarActor(actor);

        if (idContrato == null || idContrato <= 0) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Identificador de contrato inválido.");
        }

        if (request == null
                || request.idContratoArchivo() == null
                || request.idContratoArchivo() <= 0
                || request.fechaFirma() == null
                || !request.firmaRevisada()
                || request.observaciones() == null
                || request.observaciones().trim().length() < 15
                || request.observaciones().trim().length() > 500) {

            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Los datos de aprobación son inválidos.");
        }

        return ejecutar("""
                SELECT public.sp_crm_aprobar_firma_contrato_v6(
                    CAST(? AS bigint),
                    CAST(? AS bigint),
                    CAST(? AS bigint),
                    CAST(? AS date),
                    CAST(? AS boolean),
                    CAST(? AS varchar)
                )::text
                """,
                actor,
                idContrato,
                request.idContratoArchivo(),
                request.fechaFirma(),
                request.firmaRevisada(),
                request.observaciones().trim());
    }

    @Transactional(readOnly = true)
    public JsonNode autorizarLecturaPdfContrato(
            Long actor,
            Long idContrato,
            Long idContratoArchivo) {

        validarActor(actor);

        if (idContrato == null || idContrato <= 0
                || idContratoArchivo == null
                || idContratoArchivo <= 0) {

            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "El contrato o documento seleccionado es inválido.");
        }

        return ejecutar("""
                SELECT public.sp_crm_autorizar_lectura_pdf_contrato_v6(
                    CAST(? AS bigint),
                    CAST(? AS bigint),
                    CAST(? AS bigint)
                )::text
                """,
                actor,
                idContrato,
                idContratoArchivo);
    }

    private void validarActor(Long actor) {

        if (actor == null || actor <= 0) {
            throw new ResponseStatusException(
                    HttpStatus.UNAUTHORIZED,
                    "Sesion de usuario invalida.");
        }
    }

    private JsonNode ejecutar(
            String sql,
            Object... parametros) {

        final String respuesta;

        try {
            respuesta = jdbc.queryForObject(
                    sql,
                    String.class,
                    parametros);

        } catch (DataAccessException ex) {
            throw traducirError(ex);
        }

        if (respuesta == null) {
            throw new ResponseStatusException(
                    HttpStatus.SERVICE_UNAVAILABLE,
                    "El procedimiento no devolvio respuesta.");
        }

        try {
            JsonNode resultado = jsonMapper.readTree(respuesta);

            if (resultado == null || !resultado.isObject()) {
                throw new IllegalStateException(
                        "Formato de respuesta inesperado.");
            }

            return resultado;

        } catch (JacksonException ex) {
            throw new IllegalStateException(
                    "Respuesta JSON invalida desde Supabase.",
                    ex);
        }
    }

    private ResponseStatusException traducirError(
            DataAccessException ex) {

        StringBuilder errores = new StringBuilder();

        for (Throwable causa = ex; causa != null; causa = causa.getCause()) {

            if (causa.getMessage() != null) {
                errores.append(causa.getMessage()).append(' ');
            }
        }

        String mensaje = errores.toString();

        if (mensaje.contains("DENEGADO|")) {
            return new ResponseStatusException(
                    HttpStatus.FORBIDDEN,
                    "No tiene permisos para realizar esta operacion.",
                    ex);
        }

        if (mensaje.contains("PROSPECTO_NO_EXISTE|")) {
            return new ResponseStatusException(
                    HttpStatus.NOT_FOUND,
                    "El prospecto no existe o esta inactivo.",
                    ex);
        }

        if (mensaje.contains("DATOS_INVALIDOS|")) {
            return new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Los datos comerciales son invalidos.",
                    ex);
        }

        if (mensaje.contains("PROSPECTO_NO_ELEGIBLE|")
                || mensaje.contains("YA_COMPRADOR|")
                || mensaje.contains("ASESOR_INVALIDO|")
                || mensaje.contains("LOTE_NO_DISPONIBLE|")
                || mensaje.contains("PROYECTO_INVALIDO|")
                || mensaje.contains("RESERVA_INVALIDA|")
                || mensaje.contains("VENTA_EXISTENTE|")
                || mensaje.contains("PRECIO_NO_COINCIDE|")
                || mensaje.contains("PRECIO_NO_DISPONIBLE|")) {

            if (mensaje.contains("VENTA_NO_EXISTE|")) {
                return new ResponseStatusException(
                        HttpStatus.NOT_FOUND,
                        "La venta solicitada no existe.",
                        ex);
            }

            if (mensaje.contains("VENTA_NO_CANCELABLE|")) {
                return new ResponseStatusException(
                        HttpStatus.CONFLICT,
                        "La venta no puede cancelarse porque ya no cumple "
                                + "las condiciones de una operación pendiente.",
                        ex);
            }

            if (mensaje.contains("OPERACION_INVALIDA|")) {
                return new ResponseStatusException(
                        HttpStatus.CONFLICT,
                        "La operación no superó las validaciones comerciales.",
                        ex);
            }

            if (mensaje.contains("CONFIGURACION_INVALIDA|")) {
                return new ResponseStatusException(
                        HttpStatus.SERVICE_UNAVAILABLE,
                        "La configuración comercial requiere revisión.",
                        ex);
            }

            return new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "La operacion no cumple las condiciones comerciales vigentes.",
                    ex);
        }

        if (mensaje.contains("CONTRATO_NO_EXISTE|")) {
            return new ResponseStatusException(
                    HttpStatus.NOT_FOUND,
                    "El contrato solicitado no existe.",
                    ex);
        }

        if (mensaje.contains("CONTRATO_NO_EDITABLE|")) {
            return new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "El contrato no admite nuevas evidencias "
                            + "en su estado actual.",
                    ex);
        }

        if (mensaje.contains("ARCHIVO_NO_EXISTE|")) {
            return new ResponseStatusException(
                    HttpStatus.NOT_FOUND,
                    "El archivo PDF no existe en Storage.",
                    ex);
        }

        if (mensaje.contains("ARCHIVO_INVALIDO|")) {
            return new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "El archivo no cumple las condiciones "
                            + "de almacenamiento seguro.",
                    ex);
        }

        if (mensaje.contains("ARCHIVO_DUPLICADO|")) {
            return new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "Este archivo ya está asociado a un contrato.",
                    ex);
        }

        if (mensaje.contains("FIRMA_INVALIDA|")) {
            return new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "La fecha o revisión de firma es inválida.",
                    ex);
        }

        if (mensaje.contains("FIRMA_SIN_EVIDENCIA|")) {
            return new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "El contrato no cuenta con un PDF válido y vigente.",
                    ex);
        }

        if (mensaje.contains("CONTRATO_NO_APROBABLE|")) {
            return new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "El contrato no cumple las condiciones de aprobación.",
                    ex);
        }

        if (mensaje.contains("PLAN_INCONSISTENTE|")) {
            return new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "El plan de pagos requiere revisión antes de aprobar.",
                    ex);
        }

        return new ResponseStatusException(
                HttpStatus.SERVICE_UNAVAILABLE,
                "No fue posible completar la operacion comercial.",
                ex);
    }

    @Transactional(readOnly = true)
    public JsonNode listarPdfReemplazosPendientes(
            Long actor, Long idContrato) {

        validarActor(actor);

        if (idContrato == null || idContrato <= 0) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Identificador de contrato invalido.");
        }

        return ejecutar("""
                SELECT jsonb_build_object(
                    'items',
                    public.sp_crm_listar_pdf_reemplazos_pendientes_v6(
                        CAST(? AS bigint),
                        CAST(? AS bigint)
                    )
                )::text
                """,
                actor,
                idContrato).path("items");
    }

    @Transactional
    public JsonNode marcarPdfReemplazoEliminado(
            Long actor, Long idContrato, Long idReemplazo) {

        validarActor(actor);

        if (idContrato == null || idContrato <= 0
                || idReemplazo == null || idReemplazo <= 0) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Identificadores invalidos.");
        }

        return ejecutar("""
                SELECT public.sp_crm_marcar_pdf_reemplazo_eliminado_v6(
                    CAST(? AS bigint),
                    CAST(? AS bigint),
                    CAST(? AS bigint)
                )::text
                """,
                actor,
                idContrato,
                idReemplazo);
    }

}
