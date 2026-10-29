
package monolithe.core_service.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record RegistrarEvidenciaContratoRequest(

        @NotBlank(message = "La clave del archivo es obligatoria.") @Size(max = 500) String claveArchivo,

        @NotBlank(message = "El nombre del documento es obligatorio.") @Size(min = 5, max = 255) @Pattern(regexp = "(?i)^.+\\.pdf$", message = "El documento debe ser un archivo PDF.") String nombreOriginal

) {
}
