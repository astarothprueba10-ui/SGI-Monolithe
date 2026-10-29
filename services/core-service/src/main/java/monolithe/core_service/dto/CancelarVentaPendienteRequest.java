
package monolithe.core_service.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record CancelarVentaPendienteRequest(
    @NotBlank(message = "El motivo es obligatorio.")
    @Size(
        min = 10,
        max = 250,
        message = "El motivo debe tener entre 10 y 250 caracteres."
    )
    String motivo
) {}
