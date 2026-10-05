package monolithe.auth_service.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
public class LoginRequest {

    @NotBlank(message = "El usuario es obligatorio")
    @Size(max = 120, message = "El usuario no debe exceder 120 caracteres")
    @Pattern(
            regexp = "^(?:[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}|[a-zA-Z0-9._-]+)$",
            message = "Ingresa un usuario válido"
    )
    private String usuario;

    @NotBlank(message = "La contraseña es obligatoria")
    @Size(max = 128, message = "La contraseña no debe exceder 128 caracteres")
    @Pattern(
            regexp = "^[^\\p{Cntrl}]+$",
            message = "La contraseña contiene caracteres no permitidos"
    )
    private String contrasena;

    public void setUsuario(String usuario) {
        this.usuario = usuario != null ? usuario.trim() : null;
    }
}