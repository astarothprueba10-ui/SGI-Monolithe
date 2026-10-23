package monolithe.auth_service.dto;

import java.util.Locale;
import java.util.List;
import java.util.stream.Collectors;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
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

    @NotEmpty(message = "Debe seleccionar al menos un rol")
    @Size(max = 20, message = "No se pueden asignar más de 20 roles en una solicitud")
    private List<
            @NotBlank(message = "El código del rol es obligatorio")
            @Size(max = 40, message = "El código del rol no debe exceder 40 caracteres")
            @Pattern(regexp = "^[A-Za-z][A-Za-z0-9_]*$", message = "El código del rol contiene caracteres no permitidos")
            String> codigosRol;

    public void setUsuarioLogin(String usuarioLogin) {
        this.usuarioLogin =
                usuarioLogin != null
                        ? usuarioLogin.trim().toLowerCase(Locale.ROOT)
                        : null;
    }

    public void setCodigosRol(List<String> codigosRol) {
        this.codigosRol = codigosRol == null
                ? null
                : codigosRol.stream()
                        .map(codigo -> codigo == null ? null : codigo.trim().toUpperCase(Locale.ROOT))
                        .collect(Collectors.toList());
    }
}
