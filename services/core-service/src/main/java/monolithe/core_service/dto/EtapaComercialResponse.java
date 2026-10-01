package monolithe.core_service.dto;

import java.time.LocalDate;

public record EtapaComercialResponse(

        Long idEtapaComercial,

        Long idProyecto,
        String codigoProyecto,
        String nombreProyecto,

        String codigo,
        String nombre,
        String descripcion,

        Integer numeroOrden,

        LocalDate fechaInicio,
        LocalDate fechaFin,

        Boolean activo

) {
}
