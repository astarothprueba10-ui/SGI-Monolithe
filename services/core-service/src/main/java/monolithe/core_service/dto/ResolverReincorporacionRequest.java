package monolithe.core_service.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

public record ResolverReincorporacionRequest(

        @NotBlank(message = "La decision es obligatoria.")
        @Pattern(
                regexp = "APROBAR|RECHAZAR",
                message = "La decision debe ser APROBAR o RECHAZAR.")
        String decision,

        String motivoResolucion,
        String motivo
) {
        public String obtenerMotivoEfectivo() {
                if (motivoResolucion != null && !motivoResolucion.isBlank()) {
                        return motivoResolucion;
                }
                return motivo;
        }
}
