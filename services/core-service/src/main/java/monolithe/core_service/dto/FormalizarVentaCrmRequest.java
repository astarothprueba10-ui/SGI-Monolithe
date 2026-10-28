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

    @Size(max = 1000)
    String observaciones

) {

}