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
        Boolean activo,
        long lotesActivos
) {
    public ZonaResponse(Long idZona,Long idProyecto,String codigoProyecto,String nombreProyecto,String codigo,String nombre,String descripcion,Integer numeroOrden,Boolean activo) {
        this(idZona,idProyecto,codigoProyecto,nombreProyecto,codigo,nombre,descripcion,numeroOrden,activo,0);
    }
}
