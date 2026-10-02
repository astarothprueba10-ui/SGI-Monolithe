package monolithe.core_service.dto;

import jakarta.validation.constraints.*;

public record ManzanaRequest(
        @NotNull
        @Positive
        Long idEtapa,

        @NotBlank
        @Size(max = 30)
        String codigoEstadoManzana,

        @NotBlank
        @Size(max = 30)
        String codigo,

        @Size(max = 100)
        String nombre,

        @Size(max = 255)
        String descripcion,

        @Min(1)
        Integer numeroOrden,

        Boolean activo
) {
}
