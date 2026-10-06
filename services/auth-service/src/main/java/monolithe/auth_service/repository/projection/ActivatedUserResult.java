package monolithe.auth_service.repository.projection;

public record ActivatedUserResult(
        String usuarioLogin,
        String correo,
        String estado,
        String mensaje) {
}