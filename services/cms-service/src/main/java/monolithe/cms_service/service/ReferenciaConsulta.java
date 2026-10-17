package monolithe.cms_service.service;

import java.util.Locale;

public final class ReferenciaConsulta {
    private ReferenciaConsulta() { }
    public static String formatear(Long id) {
        if (id == null || id <= 0) throw new IllegalArgumentException("La consulta debe estar guardada");
        return String.format(Locale.ROOT, "MON-%06d", id);
    }
}
