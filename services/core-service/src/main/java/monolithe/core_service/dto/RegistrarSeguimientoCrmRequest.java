package monolithe.core_service.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.time.OffsetDateTime;

public record RegistrarSeguimientoCrmRequest(
        @NotBlank @Size(max = 30) String tipoCodigo,
        @NotBlank @Size(max = 150) String asunto,
        @Size(max = 4000) String detalle,
        @Size(max = 255) String resultado,
        @NotNull Boolean requiereSeguimiento,
        OffsetDateTime fechaProximoSeguimiento
) { }
