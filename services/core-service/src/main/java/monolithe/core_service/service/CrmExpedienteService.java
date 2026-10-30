package monolithe.core_service.service;

import lombok.RequiredArgsConstructor;
import monolithe.core_service.dto.AgendarVisitaCrmRequest;
import monolithe.core_service.dto.ActualizarEstadoVisitaCrmRequest;
import monolithe.core_service.repository.CrmExpedienteRepository;
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
public class CrmExpedienteService {
    private final CrmExpedienteRepository repository;
    private final JsonMapper jsonMapper;

    @Transactional(readOnly = true)
    public JsonNode catalogos(Long actor) {
        validarActor(actor);
        return ejecutar(() -> repository.catalogos(actor), false);
    }

    @Transactional(readOnly = true)
    public JsonNode detalle(Long actor, Long prospecto) {
        validarActor(actor);
        validarIdentificador(prospecto, "prospecto");

        return ejecutar(() -> {
            if (!repository.puedeConsultarProspecto(actor, prospecto)) {
                throw new ResponseStatusException(
                        HttpStatus.FORBIDDEN,
                        "No tiene autorizacion para consultar este prospecto.");
            }
            return repository.detalle(actor, prospecto);
        }, false);
    }

    @Transactional(readOnly = true)
    public JsonNode listarVisitas(Long actor, Long prospecto, Integer limite) {
        validarActor(actor);
        validarIdentificador(prospecto, "prospecto");
        if (limite == null || limite < 1 || limite > 200) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Limite de visitas entre 1 y 200.");
        }
        return ejecutar(() -> repository.visitas(actor, prospecto, limite), true);
    }

    @Transactional
    public JsonNode agendar(Long actor, Long prospecto, AgendarVisitaCrmRequest req) {
        validarActor(actor);
        validarIdentificador(prospecto, "prospecto");
        if (req == null || req.idProyecto() == null || req.idProyecto() <= 0 || req.fechaVisita() == null
                || req.turno() == null || !("11:00".equals(req.turno()) || "15:00".equals(req.turno()))) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Proyecto, fecha y turno son obligatorios.");
        }
        OffsetDateTime fecha = req.fechaVisita();
        if (!fecha.isAfter(OffsetDateTime.now()) || fecha.isAfter(OffsetDateTime.now().plusDays(180))) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "La fecha de visita debe estar dentro de los proximos 180 dias.");
        }
        return ejecutar(() -> repository.agendar(actor, prospecto, req.idProyecto(), fecha,
                req.turno(), req.puntoEncuentro(), req.observaciones()), false);
    }

    @Transactional
    public JsonNode actualizarVisita(Long actor, Long visita, ActualizarEstadoVisitaCrmRequest req) {
        validarActor(actor);
        validarIdentificador(visita, "visita");
        if (req == null || req.estadoCodigo() == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Seleccione un estado de visita.");
        }
        String estado = req.estadoCodigo().trim().toUpperCase(Locale.ROOT);
        if (!("CONFIRMADA".equals(estado) || "REALIZADA".equals(estado) || "CANCELADA".equals(estado))) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Estado de visita no admitido.");
        }
        return ejecutar(() -> repository.actualizarEstado(actor, visita, estado, req.observaciones()), false);
    }

    private static void validarActor(Long actor) {
        if (actor == null || actor <= 0) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Sesion CRM no valida.");
        }
    }

    private static void validarIdentificador(Long id, String recurso) {
        if (id == null || id <= 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Identificador de " + recurso + " invalido.");
        }
    }

    private JsonNode ejecutar(Supplier<String> llamada, boolean array) {
        final String json;
        try {
            json = llamada.get();
        } catch (DataAccessException ex) {
            throw traducirError(ex);
        }
        if (json == null)
            throw new IllegalStateException("Respuesta nula del backend CRM.");
        try {
            JsonNode resultado = jsonMapper.readTree(json);
            if (resultado == null || (array ? !resultado.isArray() : !resultado.isObject())) {
                throw new IllegalStateException("Formato de respuesta CRM inesperado.");
            }
            return resultado;
        } catch (JacksonException ex) {
            throw new IllegalStateException("Respuesta JSON de CRM invalida.", ex);
        }
    }

    private ResponseStatusException traducirError(DataAccessException ex) {
        StringBuilder cadena = new StringBuilder();
        for (Throwable causa = ex; causa != null; causa = causa.getCause()) {
            if (causa.getMessage() != null)
                cadena.append(causa.getMessage()).append(' ');
        }
        String detalle = cadena.toString();
        if (detalle.contains("DENEGADO|")) {
            return new ResponseStatusException(HttpStatus.FORBIDDEN, "No cuenta con permisos CRM vigentes.", ex);
        }
        if (detalle.contains("PROSPECTO_NO_EXISTE|") || detalle.contains("VISITA_NO_EXISTE|")) {
            return new ResponseStatusException(HttpStatus.NOT_FOUND, "El registro CRM solicitado no existe.", ex);
        }
        if (detalle.contains("VISITA_OCUPADA|") || detalle.contains("TRANSICION_INVALIDA|")
                || detalle.contains("PROSPECTO_CERRADO|") || detalle.contains("ASESOR_NO_ASIGNADO|")) {
            return new ResponseStatusException(HttpStatus.CONFLICT,
                    "La operacion no cumple el estado comercial actual.", ex);
        }
        if (detalle.contains("DATOS_INVALIDOS|") || detalle.contains("HORARIO_INVALIDO|")
                || detalle.contains("PROYECTO_INVALIDO|") || detalle.contains("ASESOR_INVALIDO|")
                || detalle.contains("CATALOGO_INVALIDO|")) {
            return new ResponseStatusException(HttpStatus.BAD_REQUEST, "Verifique los datos de la visita comercial.",
                    ex);
        }
        return new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE,
                "No fue posible procesar la solicitud CRM.", ex);
    }
}
