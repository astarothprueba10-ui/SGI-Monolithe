package monolithe.core_service.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

/** Documento personal del candidato consultado por RRHH. */
public record ConsultaPersonaTrabajadorRequest(@Min(1) int idTipoDocumento,
        @NotBlank @Pattern(regexp = "[0-9]{8,12}") String numeroDocumento) {
}
