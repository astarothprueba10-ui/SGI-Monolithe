package monolithe.core_service.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.time.LocalDate;

public record CesarTrabajadorRequest(

        @NotNull(message = "La fecha de cese es obligatoria.")
        LocalDate fechaCese,

        @NotBlank(message = "El motivo de cese es obligatorio.")
        @Size(min = 10, max = 1000, message = "El motivo debe contener entre 10 y 1000 caracteres.")
        String motivo
) {
}
