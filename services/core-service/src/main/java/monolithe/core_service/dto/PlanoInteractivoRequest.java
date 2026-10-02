package monolithe.core_service.dto;

import jakarta.validation.constraints.*;

import java.math.BigDecimal;

public record PlanoInteractivoRequest(

        @NotNull
        @Positive
        Long idProyecto,

        @Positive
        Long idEtapa,

        @NotBlank
        @Size(max = 40)
        String codigo,

        @NotBlank
        @Size(max = 150)
        String nombre,

        @Size(max = 500)
        String descripcion,

        @NotBlank
        @Size(max = 500)
        String claveArchivo,

        @Size(max = 255)
        String nombreArchivoOriginal,

        @Size(max = 120)
        String tipoMime,

        @Size(max = 128)
        String hashArchivo,

        @NotNull
        @DecimalMin(value = "0.0001", inclusive = true)
        @Digits(integer = 8, fraction = 4)
        BigDecimal anchoReferencia,

        @NotNull
        @DecimalMin(value = "0.0001", inclusive = true)
        @Digits(integer = 8, fraction = 4)
        BigDecimal altoReferencia,

        @Size(max = 500)
        String observaciones

) {
}
