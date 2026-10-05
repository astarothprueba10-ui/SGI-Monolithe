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
public class ForgotPasswordRequest {

    @NotBlank(message = "El usuario es obligatorio")
    @Size(max = 120, message = "El usuario no debe exceder 120 caracteres")
    @Pattern(
            regexp = "^(?:[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}|[a-zA-Z0-9._-]+)$",
            message = "Ingresa un usuario v\u00e1lido"
    )
    private String usuario;

    @NotBlank(message = "El origen es obligatorio")
    @Pattern(
            regexp = "^(BACKOFFICE|PORTAL_CLIENTE)$",
            message = "El origen debe ser BACKOFFICE o PORTAL_CLIENTE"
    )
    private String origen;

    public void setUsuario(String usuario) {
        this.usuario = usuario != null ? usuario.trim() : null;
    }
}