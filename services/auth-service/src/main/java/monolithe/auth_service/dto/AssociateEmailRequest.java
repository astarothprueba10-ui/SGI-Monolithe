package monolithe.auth_service.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
public class AssociateEmailRequest {

    @NotBlank(message = "El correo electrónico es obligatorio")
    @Email(message = "Ingresa un correo electrónico válido")
    @Size(max = 180, message = "El correo electrónico no puede exceder 180 caracteres")
    private String correo;

    public void setCorreo(String correo) {
        this.correo = correo != null ? correo.trim().toLowerCase() : null;
    }
}
