package monolithe.core_service.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;

import java.time.LocalDate;

public record EtapaComercialRequest(

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

        @NotNull
        @Positive
        Integer numeroOrden,

        LocalDate fechaInicio,

        LocalDate fechaFin,

        Boolean activo

) {
}
