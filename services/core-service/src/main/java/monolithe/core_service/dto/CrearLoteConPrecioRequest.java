
package monolithe.core_service.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;

public record CrearLoteConPrecioRequest(
        @NotNull @Valid LoteRequest lote,
        @Valid ConfiguracionPrecio precio
) {
    public record ConfiguracionPrecio(
            @NotNull
            @DecimalMin("0.01")
            @Digits(integer = 12, fraction = 2)
            BigDecimal monto
    ) {
    }
}
