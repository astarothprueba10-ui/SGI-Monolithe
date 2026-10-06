package monolithe.auth_service.dto;

public record CreatedUserResponse(
        Long idUsuario,
        String estado,
        String mensaje
) {
}