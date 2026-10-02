package monolithe.core_service.dto;

public record CambioEstadoLoteResponse(

        Boolean success,
        String message,
        Long idLote,
        String nuevoEstado

) {
}