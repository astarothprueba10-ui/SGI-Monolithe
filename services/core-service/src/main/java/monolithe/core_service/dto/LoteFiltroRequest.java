package monolithe.core_service.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Positive;

import java.math.BigDecimal;

public record LoteFiltroRequest(

        @Positive
        Long idProyecto,

        @Positive
        Long idEtapa,

        @Positive
        Long idZona,

        @Positive
        Long idManzana,

        @Positive
        Integer idEstadoLote,

        @Positive
        Integer idTipoLote,

        String texto,

        @DecimalMin(value = "0.01")
        BigDecimal areaMin,

        @DecimalMin(value = "0.01")
        BigDecimal areaMax,

        Boolean activo

) {
}