package monolithe.core_service.service;

/**
 * Una etapa no asignada nunca puede venderse por defecto.
 * Es un bloqueo comercial explícito, no un precio inválido que haya que inventar.
 * Los errores de tarifas o cálculos siguen impidiendo publicar.
 */
final class ClasificadorPublicacionComercial {
    private ClasificadorPublicacionComercial() {}

    static String situacion(String resultado) {
        return switch (resultado) {
            case "BLOQUEADA", "SIN_ASIGNACION" -> "BLOQUEADA";
            default -> "ERROR";
        };
    }

    static String detalle(String resultado, String mensajeOriginal) {
        if ("SIN_ASIGNACION".equals(resultado)) {
            return "Sin etapa comercial asignada: el lote quedará bloqueado para nuevas separaciones y ventas. "
                + "Se conservan su estado de inventario, su precio histórico y cualquier operación previa.";
        }
        return mensajeOriginal;
    }
}
