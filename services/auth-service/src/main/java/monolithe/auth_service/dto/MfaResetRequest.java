package monolithe.auth_service.dto;

import jakarta.validation.constraints.AssertTrue;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/** Solicitud de soporte: exige identificación documentada, motivo y login confirmado. */
public record MfaResetRequest(
    @NotBlank String confirmacionLogin,
    @NotBlank @Size(min = 12, max = 500) String motivo,
    @AssertTrue Boolean identidadVerificada
) {}
