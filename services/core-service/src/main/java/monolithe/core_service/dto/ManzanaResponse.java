package monolithe.core_service.dto;

public record ManzanaResponse(
        Long idManzana,
        Long idEtapa,
        String codigoEtapa,
        String nombreEtapa,
        Long idProyecto,
        String codigoProyecto,
        String nombreProyecto,
        Integer idEstadoManzana,
        String codigoEstadoManzana,
        String nombreEstadoManzana,
        String codigo,
        String nombre,
        String descripcion,
        Integer numeroOrden,
        Boolean activo
) {
}
