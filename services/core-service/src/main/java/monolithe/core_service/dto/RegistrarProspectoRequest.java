
package monolithe.core_service.dto;

import jakarta.validation.constraints.*;
import java.util.UUID;

public record RegistrarProspectoRequest(
    @NotNull UUID idSolicitud,
    @NotBlank @Size(min = 2, max = 120)
    @Pattern(regexp = "^[\\p{L}]+(?:[ -][\\p{L}]+)*$", message = "Solo se permiten letras, espacios y guiones.")
    String nombres,

    @NotBlank @Size(min = 2, max = 80)
    @Pattern(regexp = "^[\\p{L}]+(?:[ -][\\p{L}]+)*$", message = "Solo se permiten letras, espacios y guiones.")
    String apellidoPaterno,

    @Size(max = 80)
    @Pattern(regexp = "^[\\p{L}]+(?:[ -][\\p{L}]+)*$", message = "Solo se permiten letras, espacios y guiones.")
    String apellidoMaterno,

    @NotBlank @Email @Size(max = 180) String correo,

    @NotBlank @Size(max = 30)
    @Pattern(regexp = "^(?:9[0-9]{8}|\\+[1-9][0-9]{6,14})$", message = "Ingresa un celular peruano de 9 dígitos o un número internacional con su prefijo.")
    String telefono,

    @NotNull @Positive Long idProyecto,
    @NotBlank @Size(max = 40) String origenCodigo,
    @NotBlank @Size(max = 150) String motivoContacto,
    @Size(max = 4000) String mensaje,
    @Positive Long idPersona,
    @Positive Long idAsesor,

    @NotBlank
    @Pattern(regexp = "^(DNI|RUC|CE|PASAPORTE)$", message = "Tipo de documento no válido.")
    String tipoDocumento,

    @NotBlank @Size(max = 20)
    @Pattern(regexp = "^[A-Za-z0-9]+$", message = "El documento solo admite letras y números.")
    String numeroDocumento,

    @Size(max = 255) String direccion
) {}
