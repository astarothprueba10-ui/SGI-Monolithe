package monolithe.core_service.dto;

import jakarta.validation.constraints.*;

import java.math.BigDecimal;

public record LoteRequest(
        @NotNull
        @Positive
        Long idManzana,

        @Positive
        Long idZona,

        @Size(max = 30)
        String codigoTipoLote,

        @NotBlank
        @Size(max = 30)
        String codigoEstadoLote,

        @NotBlank
        @Size(max = 40)
        String codigo,

        @NotBlank
        @Size(max = 20)
        String numero,

        @NotNull
        @DecimalMin(value = "0.00", inclusive = false)
        @Digits(integer = 10, fraction = 2)
        BigDecimal areaM2,

        @DecimalMin(value = "0.00", inclusive = false)
        @Digits(integer = 8, fraction = 2)
        BigDecimal frenteM,

        @DecimalMin(value = "0.00", inclusive = false)
        @Digits(integer = 8, fraction = 2)
        BigDecimal fondoM,

        @DecimalMin(value = "0.00", inclusive = false)
        @Digits(integer = 8, fraction = 2)
        BigDecimal lateralDerechoM,

        @DecimalMin(value = "0.00", inclusive = false)
        @Digits(integer = 8, fraction = 2)
        BigDecimal lateralIzquierdoM,

        String observaciones,

        Boolean activo
) {
}
