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
public class UserRoleRequest {

    @NotBlank(message = "El código del rol es obligatorio")
    @Size(
            max = 40,
            message = "El código del rol no debe exceder 40 caracteres"
    )
    @Pattern(
            regexp = "^[A-Za-z][A-Za-z0-9_]*$",
            message = "El código del rol contiene caracteres no permitidos"
    )
    private String codigoRol;

    public void setCodigoRol(String codigoRol) {
        this.codigoRol =
                codigoRol != null
                        ? codigoRol.trim().toUpperCase()
                        : null;
    }
}