package monolithe.core_service.service;

import lombok.RequiredArgsConstructor;
import monolithe.core_service.dto.AsignarAsesorCrmRequest;
import monolithe.core_service.dto.CambiarEtapaCrmRequest;
import monolithe.core_service.dto.RegistrarSeguimientoCrmRequest;
import monolithe.core_service.repository.CrmGestionRepository;
import org.springframework.dao.DataAccessException;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import tools.jackson.core.JacksonException;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;

import java.time.OffsetDateTime;
import java.util.Locale;
import java.util.function.Supplier;

@Service
@RequiredArgsConstructor
public class CrmGestionService {
    private final CrmGestionRepository repository;
    private final JsonMapper jsonMapper;

    @Transactional
    public JsonNode cambiarEtapa(Long actor, Long prospecto, CambiarEtapaCrmRequest req) {
        validarIdentidad(actor, prospecto);
        if (req == null || blanco(req.estadoCodigo())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Debe seleccionar una etapa.");
        }
        return ejecutar(() -> repository.cambiarEtapa(actor, prospecto,
                req.estadoCodigo().trim().toUpperCase(Locale.ROOT), req.observacion()), false);
    }

    @Transactional
    public JsonNode asignarAsesor(Long actor, Long prospecto, AsignarAsesorCrmRequest req) {
        validarIdentidad(actor, prospecto);
        if (req == null || req.idAsesor() == null || req.idAsesor() <= 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Seleccione un asesor valido.");
        }
        String motivo = req.motivo() != null && !req.motivo().isBlank() ? req.motivo().trim() : null;
        return ejecutar(() -> repository.asignarAsesor(actor, prospecto, req.idAsesor(), motivo), false);
    }

    @Transactional
    public JsonNode registrarSeguimiento(Long actor, Long prospecto, RegistrarSeguimientoCrmRequest req) {
        validarIdentidad(actor, prospecto);
        if (req == null || blanco(req.tipoCodigo()) || blanco(req.asunto()) || req.requiereSeguimiento() == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Tipo, asunto y seguimiento son obligatorios.");
        }
        OffsetDateTime proxima = req.fechaProximoSeguimiento();
        if ((req.requiereSeguimiento() && (proxima == null || !proxima.isAfter(OffsetDateTime.now())))
                || (!req.requiereSeguimiento() && proxima != null)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Ingrese una fecha futura solo cuando se requiera seguimiento.");
        }
        return ejecutar(() -> repository.registrarSeguimiento(actor, prospecto,
                req.tipoCodigo().trim().toUpperCase(Locale.ROOT), req.asunto().trim(),
                req.detalle(), req.resultado(), req.requiereSeguimiento(), proxima), false);
    }

    @Transactional(readOnly = true)
    public JsonNode listarSeguimientos(Long actor, Long prospecto, Integer limite) {
        validarIdentidad(actor, prospecto);
        if (limite == null || limite < 1 || limite > 200) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "El limite debe estar entre 1 y 200.");
        }
        return ejecutar(() -> repository.listarSeguimientos(actor, prospecto, limite), true);
    }

    @Transactional(readOnly = true)
    public JsonNode listarAsignaciones(Long actor, Long prospecto) {
        validarIdentidad(actor, prospecto);

        return ejecutar(() -> {
            String historial = repository.listarAsignaciones(actor, prospecto);

            if (historial == null) {
                throw new ResponseStatusException(
                        HttpStatus.FORBIDDEN,
                        "No tiene permiso crm.view vigente.");
            }

            return historial;
        }, true);
    }

    private void validarIdentidad(Long actor, Long prospecto) {
        if (actor == null || actor <= 0) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Sesion no valida.");
        }
        if (prospecto == null || prospecto <= 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Identificador de prospecto invalido.");
        }
    }

    private JsonNode ejecutar(Supplier<String> operacion, boolean esperaArray) {
        String json;
        try {
            json = operacion.get();
        } catch (DataAccessException ex) {
            throw mapearError(ex);
        }
        if (json == null)
            throw new IllegalStateException("Respuesta CRM vacia.");
        try {
            JsonNode resultado = jsonMapper.readTree(json);
            if (resultado == null || (esperaArray ? !resultado.isArray() : !resultado.isObject())) {
                throw new IllegalStateException("Formato de respuesta CRM inesperado.");
            }
            return resultado;
        } catch (JacksonException ex) {
            throw new IllegalStateException("Respuesta JSON CRM invalida.", ex);
        }
    }

    private ResponseStatusException mapearError(DataAccessException ex) {
        String error = extraerMensajeError(ex);
        if (error.contains("DENEGADO|")) {
            return new ResponseStatusException(HttpStatus.FORBIDDEN, "No tiene permisos vigentes para esta operacion.",
                    ex);
        }
        if (error.contains("PROSPECTO_NO_EXISTE|")) {
            return new ResponseStatusException(HttpStatus.NOT_FOUND, "Prospecto no encontrado o inactivo.", ex);
        }
        if (esConflictoNegocio(error)) {
            return new ResponseStatusException(HttpStatus.CONFLICT,
                    "La operacion no esta permitida por el estado comercial.", ex);
        }
        if (esDatoInvalido(error)) {
            return new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Los datos enviados no cumplen las reglas del CRM.", ex);
        }
        return new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE,
                "No se pudo procesar la operacion CRM.", ex);
    }

    private String extraerMensajeError(DataAccessException ex) {
        StringBuilder mensajes = new StringBuilder();
        for (Throwable t = ex; t != null; t = t.getCause()) {
            if (t.getMessage() != null)
                mensajes.append(t.getMessage()).append(' ');
        }
        return mensajes.toString();
    }

    private boolean esConflictoNegocio(String error) {
        return error.contains("ETAPA_FINAL|") || error.contains("VENTA_REQUERIDA|")
                || error.contains("VENTA_EXISTENTE|") || error.contains("PROSPECTO_CERRADO|")
                || error.contains("ASIGNACION_DUPLICADA|") || error.contains("ASESOR_DUPLICADO|");
    }

    private boolean esDatoInvalido(String error) {
        return error.contains("DATOS_INVALIDOS|") || error.contains("ETAPA_INVALIDA|")
                || error.contains("ASESOR_INVALIDO|") || error.contains("ASESOR_INACTIVO|")
                || error.contains("TIPO_INVALIDO|") || error.contains("CATALOGO_INVALIDO|");
    }

    private static boolean blanco(String texto) {
        return texto == null || texto.isBlank();
    }
}
