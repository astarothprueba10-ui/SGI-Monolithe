package monolithe.auth_service.repository.projection;

public record ResendOtpResult(
        Long idUsuario,
        int reenviosRealizados,
        int reenviosRestantes,
        int segundosEspera,
        String estado) {
}