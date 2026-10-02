package monolithe.core_service.dto;

import java.math.BigDecimal;
import java.time.LocalDate;

public record ProyectoResponse(
        Long idProyecto,
        Integer idEstadoProyecto,
        String codigoEstadoProyecto,
        String nombreEstadoProyecto,
        String codigo,
        String nombre,
        String descripcion,
        String direccion,
        String ubicacionReferencia,
        String distrito,
        String provincia,
        String departamento,
        String pais,
        BigDecimal latitud,
        BigDecimal longitud,
        BigDecimal areaTotalM2,
        LocalDate fechaInicio,
        LocalDate fechaFinEstimada,
        Boolean activo
) {
}
