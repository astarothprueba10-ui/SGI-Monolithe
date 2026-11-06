package monolithe.core_service.dto;

import jakarta.validation.constraints.*;
import java.math.BigDecimal;

/** Condiciones comerciales verificadas antes de emitir una URL firmada de carga. */
public record PrepararCargaVoucherVentaRequest(
    @NotNull @Positive Long idProspecto,
    @NotNull @Positive Long idLote,
    @NotBlank @Pattern(regexp = "CONTADO|FINANCIADA") String modalidad,
    @NotNull @DecimalMin("0.01") BigDecimal montoTotal,
    @DecimalMin("0") BigDecimal montoInicial,
    @Min(1) @Max(36) Integer numeroCuotas,
    @NotBlank @Size(max = 255) String nombreArchivo,
    @NotBlank String tipoMime
) {}
