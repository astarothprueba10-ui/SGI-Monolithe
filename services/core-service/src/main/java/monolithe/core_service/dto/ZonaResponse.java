package monolithe.core_service.dto;

public record ZonaResponse(
        Long idZona,
        Long idProyecto,
        String codigoProyecto,
        String nombreProyecto,
        String codigo,
        String nombre,
        String descripcion,
        Integer numeroOrden,
        Boolean activo
) {
}
