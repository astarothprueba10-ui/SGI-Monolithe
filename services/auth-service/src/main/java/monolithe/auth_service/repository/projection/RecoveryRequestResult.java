package monolithe.auth_service.repository.projection;

public record RecoveryRequestResult(
        Long idUsuario,
        String correo
) {}
