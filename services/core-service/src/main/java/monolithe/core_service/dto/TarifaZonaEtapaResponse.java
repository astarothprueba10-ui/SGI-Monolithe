package monolithe.core_service.dto;

import java.math.BigDecimal;
import java.time.OffsetDateTime;

public record TarifaZonaEtapaResponse(

        Long idTarifa,

        Long idProyecto,
        String codigoProyecto,
        String nombreProyecto,

        Long idZona,
        String codigoZona,
        String nombreZona,

        Long idEtapaComercial,
        String codigoEtapaComercial,
        String nombreEtapaComercial,

        Integer idMoneda,
        String codigoMoneda,
        String nombreMoneda,

        Integer idTipoTarifa,
        String codigoTipoTarifa,
        String nombreTipoTarifa,

        BigDecimal valor,

        OffsetDateTime fechaDesde,
        OffsetDateTime fechaHasta,

        String observaciones,
        Boolean activo

) {
}
