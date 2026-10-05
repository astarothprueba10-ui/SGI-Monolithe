package monolithe.auth_service.repository.projection;

public record FailedOtpAttemptResult(
        int intentosFallidos,
        int intentosRestantes,
        boolean bloqueado
) {}
