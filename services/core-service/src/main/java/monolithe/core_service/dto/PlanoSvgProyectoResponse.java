package monolithe.core_service.dto;

import java.time.OffsetDateTime;

public record PlanoSvgProyectoResponse(
    Long idProyecto, PlanoSvgProyectoRequest documento, OffsetDateTime fechaActualizacion
) {}
