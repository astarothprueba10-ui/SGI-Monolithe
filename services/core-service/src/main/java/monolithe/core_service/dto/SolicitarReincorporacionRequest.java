package monolithe.core_service.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.time.LocalDate;

public record SolicitarReincorporacionRequest(

        @NotNull(message = "La nueva fecha de ingreso es obligatoria.")
        LocalDate nuevaFechaIngreso,

        @NotBlank(message = "El motivo de reincorporacion es obligatorio.")
        @Size(min = 10, max = 1000, message = "El motivo debe contener entre 10 y 1000 caracteres.")
        String motivo
) {
}
