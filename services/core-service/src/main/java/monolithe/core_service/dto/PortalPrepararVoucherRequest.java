package monolithe.core_service.dto;

import jakarta.validation.constraints.*;
import java.math.BigDecimal;
import java.time.LocalDate;

/** 5.4.4: solicitud del titular; cada ID se autoriza nuevamente en SQL. */
public record PortalPrepararVoucherRequest(
    @NotNull @Positive Long idVenta,
    @NotBlank String destino,
    Long idCuota,
    @NotNull @DecimalMin("0.01") @Digits(integer=12,fraction=2) BigDecimal monto,
    @NotNull @Positive Integer idMetodoPago,
    @NotNull LocalDate fechaOperacion,
    @Size(max=100) String numeroOperacion,
    @NotBlank @Size(max=180) String nombreArchivo,
    @NotBlank String tipoMime,
    @NotNull @Min(1) @Max(5242880) Long tamanioBytes
) {}
