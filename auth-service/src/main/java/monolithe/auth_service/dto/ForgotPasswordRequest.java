package monolithe.auth_service.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
public class ForgotPasswordRequest {

    @NotBlank(message = "El usuario es obligatorio")
    private String usuario;
}