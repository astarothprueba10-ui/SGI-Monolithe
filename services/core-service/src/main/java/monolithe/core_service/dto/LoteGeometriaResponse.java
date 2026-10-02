package monolithe.core_service.dto;

import java.math.BigDecimal;
import java.util.List;

public record LoteGeometriaResponse(

        Long idLoteGeometria,

        Long idProyecto,

        Long idPlanoInteractivo,
        String codigoPlano,
        String nombrePlano,

        Long idLote,
        String codigoLote,
        String numeroLote,

        List<PuntoPlanoDto> puntos,

        BigDecimal etiquetaX,
        BigDecimal etiquetaY,
        BigDecimal rotacionEtiqueta,

        Integer ordenCapa,

        Boolean visible,
        Boolean interactivo,

        String observaciones,
        Boolean activo

) {
}
