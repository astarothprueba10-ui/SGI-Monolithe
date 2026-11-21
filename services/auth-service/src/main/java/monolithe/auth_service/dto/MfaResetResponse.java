package monolithe.auth_service.dto;

/** No incluye datos sensibles ni nuevos códigos de activación. */
public record MfaResetResponse(String mensaje) {}
