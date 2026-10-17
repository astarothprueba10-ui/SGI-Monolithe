package monolithe.auth_service.dto;

import java.util.Locale;

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
            regexp = "^[a-zA-Z0-9._-]{3,120}$",
            message = "Usa entre 3 y 120 letras, números, puntos, guiones o guiones bajos"
    )
    private String usuarioLogin;

    public void setUsuarioLogin(String usuarioLogin) {
        this.usuarioLogin =
                usuarioLogin != null
                        ? usuarioLogin.trim().toLowerCase(Locale.ROOT)
                        : null;
    }
}