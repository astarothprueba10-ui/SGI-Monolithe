package monolithe.core_service.dto;

import java.math.BigDecimal;
import java.time.OffsetDateTime;

public record LotePrecioResponse(

        Long idLotePrecio,

        Long idLote,
        String codigoLote,
        String numeroLote,

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

        Long idTarifa,
        Integer idTipoTarifa,
        String codigoTipoTarifa,
        String nombreTipoTarifa,

        BigDecimal areaM2Aplicada,
        BigDecimal valorTarifaAplicado,
        BigDecimal precioBase,

        Long idAjusteTipoLote,
        Integer idTipoAjustePrecio,
        String codigoTipoAjustePrecio,
        String nombreTipoAjustePrecio,

        BigDecimal valorAjusteAplicado,
        BigDecimal montoAjuste,

        BigDecimal precio,

        OffsetDateTime fechaDesde,
        OffsetDateTime fechaHasta,

        String observaciones,
        Boolean activo

) {
}
