package monolithe.core_service.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;

public record PrepararCargaVoucherSeparacionRequest(

    @NotNull
    @Positive
    Long idProspecto,

    @NotNull
    @Positive
    Long idLote,

    @NotBlank
    @Size(max = 255)
    String nombreArchivo,

    @NotBlank
    @Size(max = 100)
    String tipoMime

) {

}

