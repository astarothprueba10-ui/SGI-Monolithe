package monolithe.auth_service.repository.projection;

public record SecurityQueryResult(String resultadoJson, String estado, String mensaje) {}