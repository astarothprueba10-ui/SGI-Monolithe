package monolithe.core_service.dto;

import java.math.BigDecimal;

public record LoteResponse(
        Long idLote,

        Long idProyecto,
        String codigoProyecto,
        String nombreProyecto,

        Long idManzana,
        String codigoManzana,
        String nombreManzana,

        Long idEtapa,
        String codigoEtapa,
        String nombreEtapa,

        Long idZona,
        String codigoZona,
        String nombreZona,

        Integer idTipoLote,
        String codigoTipoLote,
        String nombreTipoLote,

        Integer idEstadoLote,
        String codigoEstadoLote,
        String nombreEstadoLote,

        String codigo,
        String numero,

        BigDecimal areaM2,
        BigDecimal frenteM,
        BigDecimal fondoM,
        BigDecimal lateralDerechoM,
        BigDecimal lateralIzquierdoM,

        String observaciones,
        Boolean activo
) {
}
