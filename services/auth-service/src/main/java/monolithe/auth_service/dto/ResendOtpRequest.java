package monolithe.auth_service.dto;

import jakarta.validation.constraints.NotBlank;

public record ResendOtpRequest(

        @NotBlank(message = "El ticket de recuperacion es obligatorio")
        String ticket) {
}