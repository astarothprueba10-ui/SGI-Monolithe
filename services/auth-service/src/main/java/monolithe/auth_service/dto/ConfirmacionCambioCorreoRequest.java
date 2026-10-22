package monolithe.auth_service.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Positive;

public record ConfirmacionCambioCorreoRequest(
        @NotBlank(message = "El correo destinatario es obligatorio.")
        @Email(message = "El correo destinatario debe tener un formato válido.")
        String destinatario,

        @NotBlank(message = "La URL de confirmación es obligatoria.")
        String urlConfirmacion,

        @Positive(message = "Los minutos de expiración deben ser positivos.")
        long minutosExpiracion
) {
}
