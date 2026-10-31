package monolithe.core_service.dto;

import jakarta.validation.constraints.Size;

public record ResolverRetrocesoCrmRequest(
        Boolean aprobar,

        @Size(max = 20, message = "La decision no puede superar 20 caracteres.")
        String decision,

        @Size(max = 2000, message = "La observacion no puede superar 2000 caracteres.")
        String observacion
) {
    public boolean resolverAprobacion() {
        if (aprobar != null) {
            return aprobar;
        }
        if (decision != null) {
            String valor = decision.trim().toUpperCase();
            return "APROBAR".equals(valor) || "APROBADO".equals(valor);
        }
        return false;
    }

    public boolean tieneDecision() {
        return aprobar != null || (decision != null && !decision.isBlank());
    }
}
