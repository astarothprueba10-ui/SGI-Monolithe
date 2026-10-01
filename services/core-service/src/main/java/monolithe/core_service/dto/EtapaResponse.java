package monolithe.core_service.dto;

import java.time.LocalDate;

public record EtapaResponse(
        Long idEtapa,
        Long idProyecto,
        String codigoProyecto,
        String nombreProyecto,
        Integer idEstadoEtapa,
        String codigoEstadoEtapa,
        String nombreEstadoEtapa,
        String codigo,
        String nombre,
        String descripcion,
        Integer numeroOrden,
        LocalDate fechaInicio,
        LocalDate fechaFinEstimada,
        Boolean activo
) {
}
