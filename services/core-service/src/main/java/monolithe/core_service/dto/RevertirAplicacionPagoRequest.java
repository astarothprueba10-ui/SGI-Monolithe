package monolithe.core_service.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/** Reversión lógica: exige segunda persona y motivo auditado. */
public record RevertirAplicacionPagoRequest(
    @NotBlank @Size(min=5,max=255) String motivo
) {}
