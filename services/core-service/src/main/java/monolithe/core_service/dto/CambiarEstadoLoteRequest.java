package monolithe.core_service.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record CambiarEstadoLoteRequest(

        @NotBlank
        @Size(max = 30)
        String codigoNuevoEstado,

        @Size(max = 255)
        String motivo

) {
}