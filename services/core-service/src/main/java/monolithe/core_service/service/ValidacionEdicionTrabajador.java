package monolithe.core_service.service;

import java.time.DateTimeException;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.node.ObjectNode;

/** Valida los campos modificados del expediente sin reescribir fechas históricas. */
public final class ValidacionEdicionTrabajador {
    private static final ZoneId PERU = ZoneId.of("America/Lima");
    private ValidacionEdicionTrabajador() {}

    /** Indica si se necesita consultar la fecha de registro persistida. */
    public static boolean requiereFechaActual(JsonNode solicitud) {
        JsonNode fecha = solicitud.path("informacionLaboral").path("fechaIngreso");
        return !fecha.isMissingNode() && !fecha.isNull();
    }

    /** Devuelve una copia validada y normaliza el teléfono si fue enviado. */
    public static JsonNode validar(JsonNode solicitud, JsonNode actual) {
        ObjectNode copia = ((ObjectNode) solicitud).deepCopy();
        JsonNode personal = copia.path("informacionPersonal");
        if (personal.isObject()) validarTelefono((ObjectNode) personal);
        if (requiereFechaActual(copia)) validarFecha(copia.path("informacionLaboral").path("fechaIngreso"), actual);
        return copia;
    }

    private static void validarTelefono(ObjectNode personal) {
        JsonNode valor = personal.path("telefono");
        if (valor.isMissingNode() || valor.isNull()) return;
        String telefono = valor.asString("").trim();
        if (!valor.isString() || (!telefono.isEmpty() && !telefono.matches("9[0-9]{8}"))) {
            throw invalido("El teléfono debe tener 9 dígitos y comenzar con 9.");
        }
        personal.put("telefono", telefono.isEmpty() ? null : telefono);
    }

    private static void validarFecha(JsonNode valor, JsonNode actual) {
        LocalDate propuesta = leerFechaPropuesta(valor);
        if (actual == null || !actual.isObject()) throw invalido("No se pudo obtener el registro del trabajador.");
        String original = actual.path("informacionLaboral").path("fechaIngreso").asString("");
        if (propuesta.toString().equals(original)) return;
        if (propuesta.isBefore(fechaRegistro(actual.path("fechaCreacion").asString("")))) {
            throw invalido("La fecha de ingreso debe ser el día de registro del trabajador o una fecha posterior.");
        }
    }

    private static LocalDate leerFechaPropuesta(JsonNode valor) {
        try {
            String texto = valor.asString("");
            if (!valor.isString() || !texto.matches("[0-9]{4}-[0-9]{2}-[0-9]{2}")) throw new DateTimeException("Formato");
            LocalDate fecha = LocalDate.parse(texto);
            if (fecha.getYear() < 1) throw new DateTimeException("Año");
            return fecha;
        } catch (DateTimeException exception) {
            throw invalido("Ingresa una fecha de ingreso válida.");
        }
    }

    private static LocalDate fechaRegistro(String texto) {
        try {
            if (texto.matches("[0-9]{4}-[0-9]{2}-[0-9]{2}")) return LocalDate.parse(texto);
            var fecha = DateTimeFormatter.ISO_DATE_TIME.parseBest(texto.replace(' ', 'T'),
                    OffsetDateTime::from, LocalDateTime::from);
            if (fecha instanceof OffsetDateTime conZona) return conZona.atZoneSameInstant(PERU).toLocalDate();
            return ((LocalDateTime) fecha).toLocalDate();
        } catch (DateTimeException exception) {
            throw invalido("No se pudo determinar la fecha de registro. Vuelve a cargar el trabajador.");
        }
    }

    private static ResponseStatusException invalido(String mensaje) {
        return new ResponseStatusException(HttpStatus.BAD_REQUEST, mensaje);
    }
}
