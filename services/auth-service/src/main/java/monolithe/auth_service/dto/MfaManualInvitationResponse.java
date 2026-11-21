package monolithe.auth_service.dto;

/** Código excepcional de activación: únicamente devuelto una vez al administrador con MFA. */
public record MfaManualInvitationResponse(String codigoActivacion, int horasVigencia, String mensaje) {
    @Override public String toString() { return "MfaManualInvitationResponse[datos omitidos]"; }
}
