package monolithe.core_service.dto;

import jakarta.validation.constraints.*;

import java.time.LocalDate;

public record EtapaRequest(
        @NotNull
        @Positive
        Long idProyecto,

        @NotBlank
        @Size(max = 30)
        String codigoEstadoEtapa,

        @NotBlank
        @Size(max = 30)
        String codigo,

        @NotBlank
        @Size(max = 100)
        String nombre,

        String descripcion,

        @Min(1)
        Integer numeroOrden,

        LocalDate fechaInicio,

        LocalDate fechaFinEstimada,

        Boolean activo
) {
}
