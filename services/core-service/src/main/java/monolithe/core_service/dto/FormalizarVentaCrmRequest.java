package monolithe.core_service.dto;

import jakarta.validation.constraints.*;
import java.math.BigDecimal;

public record FormalizarVentaCrmRequest(

    @NotNull
    @Positive
    Long idProspecto,

    @NotNull
    @Positive
    Long idLote,

    @NotBlank
    @Pattern(regexp = "CONTADO|FINANCIADA")
    String modalidad,

    @NotNull
    @DecimalMin("0.01")
    BigDecimal montoTotal,

    @DecimalMin("0.00")
    BigDecimal montoInicial,

    @Min(1)
    @Max(36)
    Integer numeroCuotas,

    // La tasa del nuevo financiamiento es fija: 5% nominal anual en BD.
    // No admitir tasas configurables desde el cliente, ni siquiera positivas.
    @Null
    BigDecimal tasaInteresMensualPct,

    @Size(max = 1000)
    String observaciones

) {

}