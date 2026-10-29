package monolithe.core_service.dto;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;

public record AsignarAsesorCrmRequest(
        @NotNull @Positive Long idAsesor,
        @Size(max = 255) String motivo
) { }
