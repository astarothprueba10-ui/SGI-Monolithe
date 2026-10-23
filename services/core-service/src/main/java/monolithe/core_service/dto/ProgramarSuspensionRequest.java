package monolithe.core_service.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.time.OffsetDateTime;

public record ProgramarSuspensionRequest(

        @NotNull(message = "La fecha de inicio es obligatoria.")
        OffsetDateTime fechaInicio,

        @NotNull(message = "La fecha de fin es obligatoria.")
        OffsetDateTime fechaFin,

        @NotBlank(message = "El motivo de la suspension es obligatorio.")
        @Size(min = 10, max = 1000, message = "El motivo debe contener entre 10 y 1000 caracteres.")
        String motivo
) {
}
