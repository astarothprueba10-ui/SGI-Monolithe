package monolithe.auth_service.dto;

public record ForgotPasswordResponse(
        String mensaje,
        String correoEnmascarado) {
}