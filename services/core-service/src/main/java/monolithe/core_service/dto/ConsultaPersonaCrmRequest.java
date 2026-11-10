package monolithe.core_service.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

/** Documento solicitado por un usuario con permiso para crear leads. */
public record ConsultaPersonaCrmRequest(
        @NotBlank @Pattern(regexp = "^(DNI|CE|PASAPORTE|RUC)$") String tipoDocumento,
        @NotBlank @Size(max = 20) String numeroDocumento) {
}
