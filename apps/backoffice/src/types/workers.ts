
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

export interface SolicitudCorreccionDocumentoRequest {
  idTipoDocumento: number;
  numeroDocumento: string;
  motivo: string;
}

export interface SolicitudCorreccionDocumentoResponse {
  idSolicitud: number;
  estado?: string;
  mensaje?: string;
}

export interface CorreccionDocumentalItem {
  idSolicitud: number;
  idTrabajador: number;
  codigoTrabajador?: string;
  nombres?: string;
  apellidoPaterno?: string;
  apellidoMaterno?: string | null;
  trabajador?: string;
  idTipoDocumentoActual?: number | null;
  tipoDocumentoActual?: string;
  numeroDocumentoActual?: string;
  idTipoDocumentoPropuesto?: number;
  tipoDocumentoPropuesto?: string;
  numeroDocumentoPropuesto?: string;
  motivo?: string;
  fechaSolicitud?: string;
  estado?: string;
  tieneEvidencia?: boolean;
  idEvidencia?: number | null;
  storagePath?: string | null;
  idActorSolicitante?: number;
}

export interface ResolverCorreccionRequest {
  decision: 'APROBAR' | 'RECHAZAR';
  motivo?: string | null;
}
