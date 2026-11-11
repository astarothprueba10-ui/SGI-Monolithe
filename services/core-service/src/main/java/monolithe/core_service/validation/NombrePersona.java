package monolithe.core_service.validation;

import java.text.Normalizer;
import java.util.Locale;
import java.util.regex.Pattern;
import tools.jackson.databind.node.ObjectNode;

/** Normalización de nombres conservando letras, tildes y separadores. */
public final class NombrePersona {
    private static final Locale ESPANOL = Locale.forLanguageTag("es-PE");
    private static final Pattern INICIAL = Pattern.compile("(^|[\\s'’-])(\\p{L})");
    private NombrePersona() {}

    /** Coloca mayúscula inicial en cada palabra sin eliminar caracteres del nombre. */
    public static String normalizar(String valor) {
        if (valor == null) return null;
        String texto = Normalizer.normalize(valor, Normalizer.Form.NFC).strip().replaceAll("\\s+", " ").toLowerCase(ESPANOL);
        return INICIAL.matcher(texto).replaceAll(match -> match.group(1) + match.group(2).toUpperCase(ESPANOL));
    }

    /** Normaliza exclusivamente los campos de nombre presentes en la persona. */
    public static void normalizarCampos(ObjectNode persona) {
        for (String campo : new String[] { "nombres", "apellidoPaterno", "apellidoMaterno" }) {
            if (persona.path(campo).isString()) persona.put(campo, normalizar(persona.path(campo).asString()));
        }
    }
}
