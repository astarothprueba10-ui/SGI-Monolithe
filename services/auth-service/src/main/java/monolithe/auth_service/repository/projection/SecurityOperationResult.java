package monolithe.auth_service.repository.projection;

public record SecurityOperationResult(
        String estado,
        String mensaje) {
}