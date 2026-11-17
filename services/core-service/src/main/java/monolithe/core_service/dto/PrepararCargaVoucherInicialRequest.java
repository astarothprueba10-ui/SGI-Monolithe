package monolithe.core_service.dto;

import jakarta.validation.constraints.*;
import java.math.BigDecimal;
import java.time.LocalDate;

/** Comprobante nuevo exclusivamente para la inicial adicional, no para reserva. */
public record PrepararCargaVoucherInicialRequest(
 @NotNull @Positive Long idVenta,
 @NotNull @Positive Long idPlanPago,
 @NotNull @DecimalMin("0.01") @Digits(integer=12,fraction=2) BigDecimal monto,
 @NotNull @Positive Integer idMetodoPago,
 @NotNull LocalDate fechaOperacion,
 @Size(max=100) String numeroOperacion,
 @NotBlank @Size(max=180) String nombreArchivo,
 @NotBlank String tipoMime,
 @NotNull @Min(1) @Max(5242880) Long tamanioBytes
) {}
