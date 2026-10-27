package monolithe.core_service.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;
import java.time.OffsetDateTime;

public record AgendarVisitaCrmRequest(
        @NotNull @Positive Long idProyecto,
        @NotNull OffsetDateTime fechaVisita,
        @NotBlank @Size(max = 5) String turno,
        @Size(max = 250) String puntoEncuentro,
        @Size(max = 4000) String observaciones
) { }
