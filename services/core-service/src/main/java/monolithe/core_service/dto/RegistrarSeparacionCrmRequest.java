package monolithe.core_service.dto;

import java.math.BigDecimal;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;

public record RegistrarSeparacionCrmRequest(

        @NotNull @Positive Long idProspecto,

        @NotNull @Positive Long idLote,

        @NotBlank String metodoPago,

        @Size(max = 100) String numeroOperacion,

        @NotNull BigDecimal monto,

        @Size(max = 500) String observaciones,

        @NotBlank @Size(max = 500) String claveArchivo,

        @NotBlank @Size(max = 255) String nombreArchivo,

        @NotBlank @Size(max = 100) String tipoMime,

        @NotNull @Positive Long tamanioBytes,

        @Size(max = 64) String hashSha256

) {

}
