package monolithe.auth_service.repository.projection;

public record TokenRecoveryContext(
        Long idToken,
        Long idUsuario,
        String passwordActualHash
) {}
