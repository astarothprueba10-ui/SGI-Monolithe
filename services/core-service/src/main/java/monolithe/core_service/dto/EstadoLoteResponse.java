package monolithe.core_service.dto;

public record EstadoLoteResponse(
        Integer id,
        String codigo,
        String nombre,
        String descripcion,
        Boolean permiteReserva,
        Boolean permiteVenta,
        Boolean activo,
        Integer orden
) {
}
