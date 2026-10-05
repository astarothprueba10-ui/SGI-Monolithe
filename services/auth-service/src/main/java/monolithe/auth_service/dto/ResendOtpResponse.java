package monolithe.auth_service.dto;

public record ResendOtpResponse(
        String message,
        int reenviosRestantes,
        int segundosParaNuevoReenvio) {
}