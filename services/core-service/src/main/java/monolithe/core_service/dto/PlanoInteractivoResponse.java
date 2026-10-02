package monolithe.core_service.dto;

import java.math.BigDecimal;
import java.time.OffsetDateTime;

public record PlanoInteractivoResponse(

        Long idPlanoInteractivo,

        Long idProyecto,
        String codigoProyecto,
        String nombreProyecto,

        Long idEtapa,
        String codigoEtapa,
        String nombreEtapa,

        String codigo,
        String nombre,
        String descripcion,

        Integer numeroVersion,

        String claveArchivo,
        String nombreArchivoOriginal,
        String tipoMime,
        String hashArchivo,

        BigDecimal anchoReferencia,
        BigDecimal altoReferencia,

        Boolean vigente,

        OffsetDateTime fechaDesde,
        OffsetDateTime fechaHasta,

        String observaciones

) {
}
