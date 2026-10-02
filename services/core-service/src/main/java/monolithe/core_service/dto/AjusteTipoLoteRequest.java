package monolithe.core_service.dto;

import jakarta.validation.constraints.*;

import java.math.BigDecimal;

public record AjusteTipoLoteRequest(

        @NotNull
        @Positive
        Long idProyecto,

        @NotBlank
        @Size(max = 30)
        String codigoTipoLote,

        @NotBlank
        @Size(max = 30)
        String codigoTipoAjustePrecio,

        @Size(max = 3)
        String codigoMoneda,

        @NotNull
        @DecimalMin(value = "0.0000", inclusive = true)
        @Digits(integer = 10, fraction = 4)
        BigDecimal valor,

        @Size(max = 255)
        String observaciones

) {
}
