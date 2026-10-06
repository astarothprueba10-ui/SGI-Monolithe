package monolithe.auth_service.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
public class CreateUserRequest {

    @NotNull(message = "La persona es obligatoria")
    @Positive(message = "El identificador de la persona debe ser válido")
    private Long idPersona;

    @NotBlank(message = "El usuario es obligatorio")
    @Size(
            min = 3,
            max = 120,
            message = "El usuario debe tener entre 3 y 120 caracteres"
    )
    @Pattern(
            regexp = "^(?:[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}|[a-zA-Z0-9._-]+)$",
            message = "Ingresa un usuario válido"
    )
    private String usuarioLogin;

    public void setUsuarioLogin(String usuarioLogin) {
        this.usuarioLogin =
                usuarioLogin != null
                        ? usuarioLogin.trim()
                        : null;
    }
}