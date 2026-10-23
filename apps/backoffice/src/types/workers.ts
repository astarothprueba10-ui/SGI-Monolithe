
export interface TrabajadorResponse {
  idTrabajador: number;
  codigo: string;
  fechaCreacion?: string | null;
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
  correoVerificado?: boolean | null;
  documentoVerificado?: boolean | null;
  telefono: string | null;
  direccion: string | null;
  referencia: string | null;
  idPais?: number | null;
  pais?: string | null;
  idDepartamento?: number | null;
  codigoDepartamento?: string | null;
  departamento: string | null;
  idProvincia?: number | null;
  codigoProvincia?: string | null;
  provincia: string | null;
  idDistrito?: number | null;
  codigoDistrito?: string | null;
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

export interface ActualizarTrabajadorRequest {
  informacionPersonal?: Partial<Pick<
    InformacionPersonalTrabajador,
    | 'nombres'
    | 'apellidoPaterno'
    | 'apellidoMaterno'
    | 'fechaNacimiento'
    | 'telefono'
    | 'direccion'
    | 'referencia'
    | 'departamento'
    | 'provincia'
    | 'distrito'
  >>;
  informacionLaboral?: Partial<Pick<
    InformacionLaboralTrabajador,
    | 'idCargo'
    | 'idHorario'
    | 'idTipoVinculoLaboral'
    | 'fechaIngreso'
    | 'fechaCese'
    | 'observaciones'
  >> & {
    idEstadoTrabajador?: number;
    motivoCambioEstado?: string;
  };
}

export interface SolicitudCambioCorreoResponse {
  mensaje: string;
  minutosExpiracion: number;
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
  idPersona: number;
  idTrabajador: number | null;
  codigoTrabajador: string | null;
  nombreCompleto: string;
  tipoDocumentoActual: string | null;
  numeroDocumentoActual: string | null;
  tipoDocumentoPropuesto: string | null;
  numeroDocumentoPropuesto: string | null;
  valorAnterior: string | null;
  valorPropuesto: string | null;
  motivo: string;
  fechaSolicitud: string;
  estado: string;
  tieneEvidencia: boolean;
}

export interface ResolverCorreccionRequest {
  decision: 'APROBAR' | 'RECHAZAR';
  motivo?: string | null;
}

export interface ProgramarSuspensionRequest {
  fechaInicio: string;
  fechaFin: string;
  motivo: string;
}

export interface CesarTrabajadorRequest {
  fechaCese: string;
  motivo: string;
}

export interface SolicitarReincorporacionRequest {
  nuevaFechaIngreso: string;
  motivo: string;
}

export interface SolicitudReincorporacionItem {
  idSolicitud: number;
  idTrabajador: number;
  codigoTrabajador: string;
  nombreTrabajador: string;
  estadoLaboral: string;
  nuevaFechaIngreso: string;
  motivo: string;
  estado: string;
  fechaSolicitud: string;
  fechaResolucion: string | null;
  motivoResolucion: string | null;
  puedeResolver: boolean;
}

export interface ListarReincorporacionesResponse {
  solicitudes: SolicitudReincorporacionItem[];
  totalMostrado: number;
}

export interface ResolverReincorporacionRequest {
  decision: 'APROBAR' | 'RECHAZAR';
  motivoResolucion?: string | null;
}

export interface ResolverReincorporacionResponse {
  mensaje?: string;
  idSolicitud?: number;
  estado?: string;
  requiereRevisionUsuario?: boolean;
}

export interface MetricasTrabajadoresResponse {
  nuevosTrabajadores: number;
  reincorporacionesAprobadas: number;
  suspendidosActuales: number;
  cesesRegistrados: number;
  periodoDias?: number;
  fechaCorte?: string;
}

export interface MovimientoHistorialItem {
  idEvento: number;
  idTrabajador: number;
  codigoTrabajador: string;
  nombreTrabajador: string;
  tipoEvento: string;
  fechaEvento: string;
  estadoAnterior: string | null;
  estadoNuevo: string | null;
  responsable: string | null;
  motivo: string | null;
  idUsuarioResponsable?: number | null;
}

export interface ListarHistorialLaboralResponse {
  movimientos: MovimientoHistorialItem[];
  total: number;
  totalMostrado: number;
  limite?: number;
  zonaHoraria?: string;
}
