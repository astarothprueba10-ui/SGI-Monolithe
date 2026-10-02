package monolithe.core_service.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;
import java.util.List;

public record LoteGeometriaRequest(

        @NotNull
        @Positive
        Long idPlanoInteractivo,

        @NotNull
        @Positive
        Long idLote,

        @NotNull
        @Size(min = 3)
        @Valid
        List<PuntoPlanoDto> puntos,

        @Digits(integer = 8, fraction = 4)
        BigDecimal etiquetaX,

        @Digits(integer = 8, fraction = 4)
        BigDecimal etiquetaY,

        @Digits(integer = 5, fraction = 3)
        BigDecimal rotacionEtiqueta,

        Integer ordenCapa,

        Boolean visible,

        Boolean interactivo,

        @Size(max = 500)
        String observaciones

) {
}
