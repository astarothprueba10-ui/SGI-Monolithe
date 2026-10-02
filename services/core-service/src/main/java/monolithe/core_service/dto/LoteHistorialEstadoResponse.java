package monolithe.core_service.dto;

import java.time.OffsetDateTime;

public record LoteHistorialEstadoResponse(

        Long idHistorial,

        Long idLote,
        String codigoLote,
        String numeroLote,

        Integer idEstadoAnterior,
        String codigoEstadoAnterior,
        String nombreEstadoAnterior,

        Integer idEstadoNuevo,
        String codigoEstadoNuevo,
        String nombreEstadoNuevo,

        String motivo,

        OffsetDateTime fechaCambio,

        Long idUsuario

) {
}