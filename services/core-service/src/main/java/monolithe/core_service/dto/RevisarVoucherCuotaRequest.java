package monolithe.core_service.dto;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

/** Decisión del revisor de Finanzas. El actor proviene EXCLUSIVAMENTE del JWT. */
public record RevisarVoucherCuotaRequest(
        @NotNull Boolean aprobar,
        @Size(max=255) String motivo,
        @Size(max=500) String observaciones
) {}
