package monolithe.auth_service.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
public class ChangePasswordRequest {

    @NotBlank(message = "La contraseña actual es obligatoria")
    private String contrasenaActual;

    @NotBlank(message = "La nueva contraseña es obligatoria")
    @Size(
            min = 8,
            max = 72,
            message = "La nueva contraseña debe tener entre 8 y 72 caracteres"
    )
    private String nuevaContrasena;

    @NotBlank(message = "La confirmación de contraseña es obligatoria")
    private String confirmarContrasena;
}