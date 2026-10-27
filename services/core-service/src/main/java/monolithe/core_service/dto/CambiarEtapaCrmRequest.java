package monolithe.core_service.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record CambiarEtapaCrmRequest(
        @NotBlank @Size(max = 30) String estadoCodigo,
        @Size(max = 1000) String observacion
) { }
