package monolithe.core_service.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

public record ResolverCorreccionRequest(

        @NotBlank(message = "La decision es obligatoria.")
        @Pattern(
                regexp = "APROBAR|RECHAZAR",
                message = "La decision debe ser APROBAR o RECHAZAR.")
        String decision,

        String motivo
) {
}
