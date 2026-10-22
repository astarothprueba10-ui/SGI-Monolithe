package monolithe.core_service.dto;

import com.fasterxml.jackson.annotation.JsonFormat;
import jakarta.validation.Valid;

import java.time.LocalDate;

public record ActualizarTrabajadorRequest(

        @Valid
        InformacionPersonal informacionPersonal,

        @Valid
        InformacionLaboral informacionLaboral

) {

    public ActualizarTrabajadorRequest(InformacionLaboral informacionLaboral) {
        this(null, informacionLaboral);
    }

    public record InformacionPersonal(

            Long idPersona,

            Integer idTipoDocumento,

            String numeroDocumento,

            String nombres,

            String apellidoPaterno,

            String apellidoMaterno,

            @JsonFormat(pattern = "yyyy-MM-dd")
            LocalDate fechaNacimiento,

            String correoElectronico,

            String telefono,

            String direccion,

            String referencia,

            String departamento,

            String provincia,

            String distrito

    ) {
    }

    public record InformacionLaboral(

            Long idCargo,

            Long idHorario,

            Integer idTipoVinculoLaboral,

            @JsonFormat(pattern = "yyyy-MM-dd")
            LocalDate fechaIngreso,

            Integer idEstadoTrabajador,

            @JsonFormat(pattern = "yyyy-MM-dd")
            LocalDate fechaCese,

            String motivoCambioEstado,

            String observaciones

    ) {
    }
}

