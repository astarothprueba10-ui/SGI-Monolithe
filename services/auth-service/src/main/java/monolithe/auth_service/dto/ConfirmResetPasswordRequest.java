package monolithe.auth_service.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
public class ConfirmResetPasswordRequest {

    @NotBlank(message = "El ticket de recuperacion es obligatorio")
    private String ticket;

    @NotBlank(message = "El codigo de verificacion es obligatorio")
    @Pattern(
            regexp = "\\d{6}",
            message = "El codigo de verificacion debe contener 6 digitos"
    )
    private String codigoOtp;
}