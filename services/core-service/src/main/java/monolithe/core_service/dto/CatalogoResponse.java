package monolithe.core_service.dto;

public record CatalogoResponse(
        Integer id,
        String codigo,
        String nombre,
        String descripcion,
        Boolean activo,
        Integer orden
) {
}
