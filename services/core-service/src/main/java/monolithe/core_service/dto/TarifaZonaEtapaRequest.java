package monolithe.core_service.dto;

import jakarta.validation.constraints.*;

import java.math.BigDecimal;

public record TarifaZonaEtapaRequest(

        @NotNull
        @Positive
        Long idProyecto,

        @NotNull
        @Positive
        Long idZona,

        @NotNull
        @Positive
        Long idEtapaComercial,

        @NotBlank
        @Size(max = 3)
        String codigoMoneda,

        @NotBlank
        @Size(max = 30)
        String codigoTipoTarifa,

        @NotNull
        @DecimalMin(value = "0.0000", inclusive = false)
        @Digits(integer = 10, fraction = 4)
        BigDecimal valor,

        @Size(max = 255)
        String observaciones

) {
}
