package monolithe.auth_service.security;

public record RefreshTokenRotation(
        Long idUsuario,
        String usuarioLogin,
        String refreshToken
) {
}