
package monolithe.core_service.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import java.time.LocalDate;

public record TrabajadorRequest(

        @NotNull
        @Valid
        InformacionPersonal informacionPersonal,

        @NotNull
        @Valid
        InformacionLaboral informacionLaboral

) {

    public record InformacionPersonal(

            @NotNull
            Integer idTipoDocumento,

            @NotBlank
            String numeroDocumento,

            @NotBlank
            String nombres,

            String apellidoPaterno,

            String apellidoMaterno,

            LocalDate fechaNacimiento,

            @Email
            String correoElectronico,

            String telefono,

            @NotBlank
            String direccion,

            String referencia,

            @NotBlank
            String departamento,

            @NotBlank
            String provincia,

            @NotBlank
            String distrito

    ) {
    }

    public record InformacionLaboral(

            @NotNull
            Long idCargo,

            Long idHorario,

            @NotNull
            Integer idTipoVinculoLaboral,

            @NotNull
            LocalDate fechaIngreso,

            String observaciones

    ) {
    }
}
