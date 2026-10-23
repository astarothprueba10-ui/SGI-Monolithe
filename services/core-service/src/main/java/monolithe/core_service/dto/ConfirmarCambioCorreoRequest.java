package monolithe.core_service.dto;

import jakarta.validation.constraints.NotBlank;

public record ConfirmarCambioCorreoRequest(
        @NotBlank(message = "El token de confirmación es obligatorio.")
        String token
) {
}
