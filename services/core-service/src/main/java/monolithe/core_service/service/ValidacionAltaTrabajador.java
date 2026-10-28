package monolithe.core_service.service;

import java.time.LocalDate;
import java.time.format.DateTimeParseException;
import java.util.Locale;
import java.util.Set;
import monolithe.core_service.validation.EmailAddressPolicy;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.node.ObjectNode;

/** Reglas exclusivas del alta; la edición conserva las fechas históricas. */
public final class ValidacionAltaTrabajador {
    private ValidacionAltaTrabajador() {}

    /** Exige las dos secciones antes de consultar los catálogos. */
    public static void validarEstructura(JsonNode datos) {
        if (datos == null || !datos.isObject()
                || !datos.path("informacionPersonal").isObject()
                || !datos.path("informacionLaboral").isObject()) {
            throw invalido("Debe proporcionar informacionPersonal e informacionLaboral.");
        }
    }

    /** Devuelve una copia con correo normalizado después de validar el alta. */
    public static JsonNode validar(JsonNode datos, JsonNode catalogos, LocalDate hoy) {
        validarEstructura(datos);
        validarFecha(datos.path("informacionLaboral").path("fechaIngreso"), hoy);
        validarDocumento(datos.path("informacionPersonal"), catalogos);
        ObjectNode copia = ((ObjectNode) datos).deepCopy();
        validarTelefono((ObjectNode) copia.path("informacionPersonal"));
        normalizarCorreo((ObjectNode) copia.path("informacionPersonal"));
        return copia;
    }

    private static void validarFecha(JsonNode valor, LocalDate hoy) {
        String texto = valor.asString("");
        if (!valor.isString() || !texto.matches("[0-9]{4}-[0-9]{2}-[0-9]{2}")) {
            throw invalido("Ingresa una fecha de ingreso válida.");
        }
        try {
            LocalDate fecha = LocalDate.parse(texto);
            if (fecha.getYear() < 1 || fecha.isBefore(hoy)) {
                throw invalido("La fecha de ingreso debe ser hoy o una fecha posterior (hora de Perú).");
            }
        } catch (DateTimeParseException exception) {
            throw invalido("Ingresa una fecha de ingreso válida.");
        }
    }

    private static void validarDocumento(JsonNode personal, JsonNode catalogos) {
        JsonNode tipos = catalogos.path("tiposDocumento");
        if (!tipos.isArray()) throw new IllegalStateException("Catálogo de documentos no disponible.");
        JsonNode id = personal.path("idTipoDocumento");
        if (!id.isIntegralNumber() || !id.canConvertToInt()) throw invalido("Selecciona un documento personal.");
        for (JsonNode tipo : tipos) {
            if (tipo.path("idTipoDocumento").asInt() != id.asInt()) continue;
            if (!esDocumentoPermitido(tipo)) throw invalido("Selecciona DNI o carné de extranjería.");
            return;
        }
        throw invalido("Selecciona un tipo de documento personal vigente.");
    }

    private static boolean esDocumentoPermitido(JsonNode tipo) {
        String codigo = tipo.path("codigo").asString("").trim().toUpperCase(Locale.ROOT);
        return Set.of("DNI", "01", "1", "CE", "04", "4").contains(codigo);
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

    private static void normalizarCorreo(ObjectNode personal) {
        JsonNode valor = personal.path("correoElectronico");
        if (!valor.isMissingNode() && !valor.isNull() && !valor.isString()) {
            throw invalido("Ingresa un correo válido.");
        }
        try {
            personal.put("correoElectronico", EmailAddressPolicy.normalizeOptional(valor.asString(null)));
        } catch (IllegalArgumentException exception) {
            throw invalido(exception.getMessage());
        }
    }

    private static ResponseStatusException invalido(String mensaje) {
        return new ResponseStatusException(HttpStatus.BAD_REQUEST, mensaje);
    }
}
