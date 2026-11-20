
package monolithe.core_service.dto;

import java.time.LocalDate;
import monolithe.core_service.validation.NombrePersona;

public record TrabajadorResponse(

        Long idTrabajador,
        String codigo,
        String fechaCreacion,

        InformacionPersonal informacionPersonal,
        InformacionLaboral informacionLaboral

) {

    // =========================================
    // 1. INFORMACION PERSONAL
    // =========================================

    public record InformacionPersonal(

            Long idPersona,

            Integer idTipoDocumento,
            String numeroDocumento,

            String nombres,
            String apellidoPaterno,
            String apellidoMaterno,
            LocalDate fechaNacimiento,

            String correoElectronico,
            Boolean correoVerificado,
            Boolean documentoVerificado,
            String telefono,

            // DOMICILIO
            String direccion,
            String referencia,
            Long idPais,
            String pais,
            Long idDepartamento,
            String codigoDepartamento,
            String departamento,
            Long idProvincia,
            String codigoProvincia,
            String provincia,
            Long idDistrito,
            String codigoDistrito,
            String distrito

    ) {
        /** Presenta también los registros históricos con iniciales uniformes. */
        public InformacionPersonal {
            nombres = NombrePersona.normalizar(nombres);
            apellidoPaterno = NombrePersona.normalizar(apellidoPaterno);
            apellidoMaterno = NombrePersona.normalizar(apellidoMaterno);
        }
    }

    // =========================================
    // 2. INFORMACION LABORAL
    // =========================================

    public record InformacionLaboral(

            Long idArea,
            String area,

            Long idCargo,
            String cargo,

            Long idHorario,
            String horario,

            Integer idTipoVinculoLaboral,
            String tipoVinculoLaboral,

            Integer idEstadoTrabajador,
            String codigoEstadoTrabajador,
            String estadoTrabajador,

            LocalDate fechaIngreso,
            LocalDate fechaCese,

            String observaciones

    ) {
    }
}
