package monolithe.core_service.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/** Revocar aprobaciones documentales exige Gerencia y un motivo auditable. */
public record ReiniciarDesgloseVentaRequest(
  @NotBlank @Size(min=10,max=500) String motivo
) {}
