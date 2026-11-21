package monolithe.auth_service.dto;

/** Respuesta sin código ni dirección de correo para el reenvío del MFA. */
public record MfaInvitationResponse(String mensaje, int segundosEspera) {}
