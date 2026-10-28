package monolithe.core_service.validation;

import java.net.IDN;
import java.util.Locale;
import java.util.regex.Pattern;

/** Valida direcciones convencionales sin listas de proveedores o dominios. */
public final class EmailAddressPolicy {
    private static final Pattern LOCAL = Pattern.compile("[A-Za-z0-9!#$%&'*+/=?^_`{|}~.-]+");
    private static final Pattern LABEL = Pattern.compile("[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?");
    private EmailAddressPolicy() {}

    /** Conserva la parte local y convierte dominios internacionales a ASCII. */
    public static String normalizeOptional(String value) {
        if (value == null || value.isBlank()) return null;
        String[] parts = value.trim().split("@", -1);
        if (parts.length != 2 || !validLocal(parts[0])) throw invalid();
        String domain = normalizeDomain(parts[1]);
        String address = parts[0] + "@" + domain;
        if (address.length() > 254) throw invalid();
        return address;
    }

    /** Exige un destinatario válido antes de enviar credenciales. */
    public static String normalizeRequired(String value) {
        String normalized = normalizeOptional(value);
        if (normalized == null) throw invalid();
        return normalized;
    }

    private static boolean validLocal(String value) {
        return value.length() <= 64 && LOCAL.matcher(value).matches()
                && !value.startsWith(".") && !value.endsWith(".") && !value.contains("..");
    }

    private static String normalizeDomain(String value) {
        try {
            String domain = IDN.toASCII(value, IDN.USE_STD3_ASCII_RULES).toLowerCase(Locale.ROOT);
            String[] labels = domain.split("\\.", -1);
            if (labels.length < 2 || labels[labels.length - 1].matches("[0-9]+")) throw invalid();
            for (String label : labels) if (!LABEL.matcher(label).matches()) throw invalid();
            return domain;
        } catch (IllegalArgumentException exception) {
            throw invalid();
        }
    }

    private static IllegalArgumentException invalid() {
        return new IllegalArgumentException("Ingresa un correo válido (ej: persona@empresa.com.pe).");
    }
}
