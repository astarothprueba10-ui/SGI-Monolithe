package monolithe.auth_service.dto;

public record UserOperationResponse(
        String estado,
        String mensaje
) {
}