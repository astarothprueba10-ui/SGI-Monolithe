package monolithe.core_service.service;

import lombok.RequiredArgsConstructor;
import monolithe.core_service.dto.RegistrarProspectoRequest;
import monolithe.core_service.repository.CrmCaptacionRepository;
import org.springframework.dao.DataAccessException;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import tools.jackson.core.JacksonException;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;

import java.util.LinkedHashMap;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class CrmCaptacionService {

    private final CrmCaptacionRepository repository;
    private final JsonMapper jsonMapper;

    @Transactional
    public JsonNode registrarProspecto(Long idActor, RegistrarProspectoRequest solicitud) {
        if (idActor == null || idActor <= 0) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED,
                    "La identidad de la sesion no es valida.");
        }

        final String payload;
        try {
            // No incluye el actor: el valor confiable se envia en un parametro SQL separado.
            Map<String, Object> datos = new LinkedHashMap<>();
            datos.put("nombres", solicitud.nombres());
            datos.put("apellidoPaterno", solicitud.apellidoPaterno());
            datos.put("apellidoMaterno", solicitud.apellidoMaterno());
            datos.put("correo", solicitud.correo());
            datos.put("telefono", solicitud.telefono());
            datos.put("idProyecto", solicitud.idProyecto());
            datos.put("origenCodigo", solicitud.origenCodigo());
            datos.put("motivoContacto", solicitud.motivoContacto());
            datos.put("mensaje", solicitud.mensaje());
            // Los opcionales numericos deben ser JSON null (no "").
            // La funcion SQL interpreta d->>'idPersona' y d->>'idAsesor' como BIGINT.
            datos.put("idPersona", solicitud.idPersona());
            datos.put("idAsesor", solicitud.idAsesor());
            datos.put("tipoDocumento", solicitud.tipoDocumento());
            datos.put("numeroDocumento", solicitud.numeroDocumento());
            payload = jsonMapper.writeValueAsString(datos);
        } catch (JacksonException ex) {
            throw new IllegalStateException("No fue posible serializar la solicitud CRM.", ex);
        }

        final String resultadoSql;
        try {
            resultadoSql = repository.registrar(solicitud.idSolicitud(), idActor, payload);
        } catch (DataAccessException ex) {
            throw mapearErrorSql(ex);
        }

        try {
            if (resultadoSql == null) {
                throw new IllegalStateException("El procedimiento CRM devolvio una respuesta vacia.");
            }
            JsonNode respuesta = jsonMapper.readTree(resultadoSql);
            if (respuesta == null || !respuesta.isObject()) {
                throw new IllegalStateException("El procedimiento CRM no devolvio un objeto JSON.");
            }
            String estado = respuesta.path("estado").asString();
            if ("REGISTRADO".equals(estado)) {
                return respuesta;
            }
            String mensaje = respuesta.path("mensaje").asString();
            if (mensaje == null || mensaje.isBlank()) mensaje = "No se pudo completar la captacion.";
            if ("REQUIERE_IDENTIFICACION".equals(estado)
                    || "PROSPECTO_INACTIVO".equals(estado)
                    || "DOCUMENTO_NO_COINCIDE".equals(estado)
                    || "CONTACTO_NO_COINCIDE".equals(estado)
                    || "ASESOR_YA_ASIGNADO".equals(estado)) {
                throw new ResponseStatusException(HttpStatus.CONFLICT, mensaje);
            }
            if ("DENEGADO".equals(estado)) {
                throw new ResponseStatusException(HttpStatus.FORBIDDEN, mensaje);
            }
            if ("DATOS_INVALIDOS".equals(estado) || "EMAIL_INVALIDO".equals(estado)
                    || "TELEFONO_INVALIDO".equals(estado) || "DOCUMENTO_INVALIDO".equals(estado)
                    || "CATALOGO_INVALIDO".equals(estado) || "PROYECTO_INVALIDO".equals(estado)
                    || "ASESOR_INVALIDO".equals(estado)) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, mensaje);
            }
            throw new IllegalStateException("Respuesta del procedimiento CRM no reconocida.");
        } catch (JacksonException ex) {
            throw new IllegalStateException("No fue posible interpretar la respuesta CRM.", ex);
        }
    }

    private ResponseStatusException mapearErrorSql(DataAccessException error) {
        StringBuilder detalle = new StringBuilder();
        Throwable cursor = error;
        while (cursor != null) {
            if (cursor.getMessage() != null) detalle.append(cursor.getMessage()).append(' ');
            cursor = cursor.getCause();
        }
        String texto = detalle.toString();
        if (texto.contains("DENEGADO|")) {
            return new ResponseStatusException(HttpStatus.FORBIDDEN,
                    "El usuario no tiene permisos vigentes para registrar prospectos.", error);
        }
        if (texto.contains("SOLICITUD_CONFLICTIVA|")) {
            return new ResponseStatusException(HttpStatus.CONFLICT,
                    "El identificador de solicitud ya corresponde a datos diferentes.", error);
        }
        if (texto.contains("REQUIERE_IDENTIFICACION|")
                || texto.contains("CONTACTO_NO_COINCIDE|")
                || texto.contains("DOCUMENTO_NO_COINCIDE|")
                || texto.contains("PROSPECTO_INACTIVO|")
                || texto.contains("ASESOR_YA_ASIGNADO|")) {
            return new ResponseStatusException(HttpStatus.CONFLICT,
                    "Se requiere revisar la identidad o el registro existente.", error);
        }
        if (texto.contains("EMAIL_INVALIDO|") || texto.contains("TELEFONO_INVALIDO|")
                || texto.contains("DOCUMENTO_INVALIDO|") || texto.contains("DATOS_INVALIDOS|")
                || texto.contains("CATALOGO_INVALIDO|") || texto.contains("PROYECTO_INVALIDO|")
                || texto.contains("ASESOR_INVALIDO|")) {
            return new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "La solicitud contiene datos comerciales invalidos.", error);
        }
        return new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR,
                "No se pudo registrar el prospecto.", error);
    }
}
