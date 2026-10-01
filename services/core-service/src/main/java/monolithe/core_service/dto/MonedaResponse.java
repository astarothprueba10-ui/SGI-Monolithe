package monolithe.core_service.dto;

public record MonedaResponse(
        Integer id,
        String codigo,
        String nombre,
        String simbolo,
        Boolean activo
) {
}
