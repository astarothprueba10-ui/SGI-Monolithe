package monolithe.auth_service.repository.projection;

public record CreatedUserResult(
        Long idUsuario,
        String estado,
        String mensaje) {
}