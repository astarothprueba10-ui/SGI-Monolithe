package monolithe.core_service.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record SolicitudCambioCorreoRequest(
        @NotBlank(message = "El nuevo correo es obligatorio.")
        @Email(message = "El nuevo correo debe tener un formato válido.")
        String correoNuevo,

        @Size(min = 10, max = 1000, message = "El motivo debe tener entre 10 y 1000 caracteres.")
        String motivo
) {
    public SolicitudCambioCorreoRequest(String correoNuevo) {
        this(correoNuevo, null);
    }
}
