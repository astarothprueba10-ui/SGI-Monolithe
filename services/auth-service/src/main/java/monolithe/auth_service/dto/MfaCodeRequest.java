package monolithe.auth_service.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

/** Prueba de posesión asociada al reto temporal de inicio de sesión. */
public record MfaCodeRequest(
        @NotBlank @Pattern(regexp = "[A-Za-z0-9_-]{43}") String reto,
        @NotBlank @Size(max = 48) String codigo) {

    @Override
    public String toString() {
        return "MfaCodeRequest[datos omitidos]";
    }
}
