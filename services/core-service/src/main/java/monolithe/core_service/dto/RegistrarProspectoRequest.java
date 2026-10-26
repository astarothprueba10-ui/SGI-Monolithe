package monolithe.core_service.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;
import java.util.UUID;

/** Solicitud interna de captacion CRM. El actor se obtiene exclusivamente del JWT. */
public record RegistrarProspectoRequest(
        @NotNull UUID idSolicitud,
        @NotBlank @Size(max = 120) String nombres,
        @NotBlank @Size(max = 80) String apellidoPaterno,
        @Size(max = 80) String apellidoMaterno,
        @NotBlank @Email @Size(max = 180) String correo,
        @NotBlank @Size(max = 30) String telefono,
        @NotNull @Positive Long idProyecto,
        @NotBlank @Size(max = 40) String origenCodigo,
        @NotBlank @Size(max = 150) String motivoContacto,
        @Size(max = 4000) String mensaje,
        @Positive Long idPersona,
        @Positive Long idAsesor,
        @Size(max = 30) String tipoDocumento,
        @Size(max = 30) String numeroDocumento
) {
}
