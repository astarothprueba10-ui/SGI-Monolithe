package monolithe.core_service.dto;

import jakarta.validation.constraints.*;

import java.math.BigDecimal;
import java.time.LocalDate;

public record ProyectoRequest(
        @NotBlank
        @Size(max = 30)
        String codigoEstadoProyecto,

        @NotBlank
        @Size(max = 30)
        String codigo,

        @NotBlank
        @Size(max = 150)
        String nombre,

        String descripcion,

        @Size(max = 255)
        String direccion,

        @Size(max = 255)
        String ubicacionReferencia,

        @Size(max = 100)
        String distrito,

        @Size(max = 100)
        String provincia,

        @Size(max = 100)
        String departamento,

        @Size(max = 100)
        String pais,

        @DecimalMin(value = "-90.0000000")
        @DecimalMax(value = "90.0000000")
        @Digits(integer = 3, fraction = 7)
        BigDecimal latitud,

        @DecimalMin(value = "-180.0000000")
        @DecimalMax(value = "180.0000000")
        @Digits(integer = 3, fraction = 7)
        BigDecimal longitud,

        @DecimalMin(value = "0.00", inclusive = false)
        @Digits(integer = 12, fraction = 2)
        BigDecimal areaTotalM2,

        LocalDate fechaInicio,

        LocalDate fechaFinEstimada,

        Boolean activo
) {
}
