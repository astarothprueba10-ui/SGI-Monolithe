package monolithe.core_service.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;

public record LotePrecioRequest(

        @NotNull
        @Positive
        Long idLote,

        @NotNull
        @Positive
        Long idEtapaComercial,

        @NotBlank
        @Size(max = 3)
        String codigoMoneda,

        @NotBlank
        @Size(max = 30)
        String codigoTipoTarifa,

        @Size(max = 30)
        String codigoTipoAjustePrecio,

        @Size(max = 255)
        String observaciones

) {
}
