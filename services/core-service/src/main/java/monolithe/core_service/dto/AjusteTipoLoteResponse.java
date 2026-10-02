package monolithe.core_service.dto;

import java.math.BigDecimal;
import java.time.OffsetDateTime;

public record AjusteTipoLoteResponse(

        Long idAjusteTipoLote,

        Long idProyecto,
        String codigoProyecto,
        String nombreProyecto,

        Integer idTipoLote,
        String codigoTipoLote,
        String nombreTipoLote,

        Integer idTipoAjustePrecio,
        String codigoTipoAjustePrecio,
        String nombreTipoAjustePrecio,

        Integer idMoneda,
        String codigoMoneda,
        String nombreMoneda,

        BigDecimal valor,

        OffsetDateTime fechaDesde,
        OffsetDateTime fechaHasta,

        String observaciones,
        Boolean activo

) {
}
