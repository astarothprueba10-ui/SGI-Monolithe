package monolithe.auth_service.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

/** Reto temporal posterior a documento y contraseña; nunca contiene datos de identidad libres. */
public record MfaInvitationRequest(
    @NotBlank @Pattern(regexp = "[A-Za-z0-9_-]{43}") String reto
) {
    @Override public String toString() { return "MfaInvitationRequest[datos omitidos]"; }
}
