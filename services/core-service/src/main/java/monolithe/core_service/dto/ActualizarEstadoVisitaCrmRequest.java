package monolithe.core_service.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record ActualizarEstadoVisitaCrmRequest(
        @NotBlank @Size(max = 30) String estadoCodigo,
        @Size(max = 2000) String observaciones
) { }
