package monolithe.core_service.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;

public record SolicitudCambioCorreoRequest(
        @NotBlank(message = "El nuevo correo es obligatorio.")
        @Email(message = "El nuevo correo debe tener un formato válido.")
        String correoNuevo
) {
}
