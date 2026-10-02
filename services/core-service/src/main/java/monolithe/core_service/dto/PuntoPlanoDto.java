package monolithe.core_service.dto;

import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;

public record PuntoPlanoDto(

        @NotNull
        @Digits(integer = 8, fraction = 4)
        BigDecimal x,

        @NotNull
        @Digits(integer = 8, fraction = 4)
        BigDecimal y

) {
}
