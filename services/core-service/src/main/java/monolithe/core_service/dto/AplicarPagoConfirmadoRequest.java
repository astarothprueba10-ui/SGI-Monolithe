package monolithe.core_service.dto;

import jakarta.validation.constraints.*;
import java.math.BigDecimal;
import java.util.UUID;

/** Imputación idempotente; el actor se toma exclusivamente del JWT. */
public record AplicarPagoConfirmadoRequest(
    @NotNull UUID idSolicitud,
    @NotNull @Positive Long idPago,
    @NotBlank String tipo,
    Long idCuota,
    @NotNull @DecimalMin("0.01") @Digits(integer=12,fraction=2) BigDecimal monto,
    @Size(max=255) String observaciones
) {}
