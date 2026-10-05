package monolithe.auth_service.repository.projection;

public record StartedRecoveryVerification(
        Long idVerificacion,
        Long idUsuario
) {}
