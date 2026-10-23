package monolithe.core_service.dto;

public record UbicacionGeograficaResponse(
        Long idUbicacion,
        Long idUbicacionPadre,
        String tipo,
        String codigo,
        String nombre
) {
}
