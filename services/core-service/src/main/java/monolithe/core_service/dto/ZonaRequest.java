package monolithe.core_service.dto;

import jakarta.validation.constraints.*;

public record ZonaRequest(
        @NotNull
        @Positive
        Long idProyecto,

        @NotBlank
        @Size(max = 30)
        String codigo,

        @NotBlank
        @Size(max = 100)
        String nombre,

        @Size(max = 255)
        String descripcion,

        @Min(1)
        Integer numeroOrden,

        Boolean activo
) {
}
