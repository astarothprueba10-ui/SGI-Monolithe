package monolithe.core_service.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;

public record ActualizarPrecioManualRequest(
        @NotNull(message = "El monto es obligatorio")
        @DecimalMin(value = "0.01", message = "El precio debe ser mayor a cero")
        @Digits(integer = 12, fraction = 2, message = "El precio admite máximo 12 enteros y 2 decimales")
        BigDecimal monto,

        @Size(max = 255, message = "Las observaciones no deben superar 255 caracteres")
        String observaciones
) {
}

