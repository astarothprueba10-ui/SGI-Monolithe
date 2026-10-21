
export interface TrabajadorResponse {
  idTrabajador: number;
  codigo: string;
  informacionPersonal: InformacionPersonalTrabajador;
  informacionLaboral: InformacionLaboralTrabajador;
}

export interface InformacionPersonalTrabajador {
  idPersona: number;
  idTipoDocumento: number | null;
  numeroDocumento: string | null;
  nombres: string;
  apellidoPaterno: string;
  apellidoMaterno: string | null;
  fechaNacimiento: string | null;
  correoElectronico: string | null;
  telefono: string | null;
  direccion: string | null;
  referencia: string | null;
  departamento: string | null;
  provincia: string | null;
  distrito: string | null;
}

export interface InformacionLaboralTrabajador {
  idArea: number;
  area: string;
  idCargo: number;
  cargo: string;
  idHorario: number | null;
  horario: string | null;
  idTipoVinculoLaboral: number;
  tipoVinculoLaboral: string;
  idEstadoTrabajador: number;
  codigoEstadoTrabajador: string;
  estadoTrabajador: string;
  fechaIngreso: string;
  fechaCese: string | null;
  observaciones: string | null;
}


export interface CatalogosTrabajadorResponse {
  tiposDocumento: {
    idTipoDocumento: number;
    codigo: string;
    nombre: string;
    longitudMinima: number | null;
    longitudMaxima: number | null;
    soloNumerico: boolean;
  }[];

  areas: {
    idArea: number;
    codigo: string;
    nombre: string;
  }[];

  cargos: {
    idCargo: number;
    idArea: number;
    codigo: string;
    nombre: string;
  }[];

  horarios: {
    idHorario: number;
    codigo: string;
    nombre: string;
    minutosTolerancia: number | null;
  }[];

  tiposVinculoLaboral: {
    idTipoVinculoLaboral: number;
    codigo: string;
    nombre: string;
  }[];

  estadosTrabajador: {
    idEstadoTrabajador: number;
    codigo: string;
    nombre: string;
  }[];
}
