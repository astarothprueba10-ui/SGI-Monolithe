package monolithe.core_service.dto;

import jakarta.validation.constraints.NotNull;
import java.util.UUID;

/** Finalización idempotente: el actor solo presenta el ID emitido por el backend. */
public record RegistrarVoucherCuotaPendienteRequest(@NotNull UUID idCarga) {}
