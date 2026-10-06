export interface ProyectoResponse {
  idProyecto: number;
  idEstadoProyecto?: number;
  codigoEstadoProyecto?: string;
  nombreEstadoProyecto?: string;
  codigo: string;
  nombre: string;
  descripcion?: string;
  direccion?: string;
  ubicacionReferencia?: string;
  distrito?: string;
  provincia?: string;
  departamento?: string;
  pais?: string;
  latitud?: number;
  longitud?: number;
  areaTotalM2?: number;
  fechaInicio?: string;
  fechaFinEstimada?: string;
  activo: boolean;
}

export type ProyectoRequest = {
  codigoEstadoProyecto: string;
  codigo: string;
  nombre: string;
  descripcion?: string | null;
  direccion?: string | null;
  ubicacionReferencia?: string | null;
  distrito?: string | null;
  provincia?: string | null;
  departamento?: string | null;
  pais?: string | null;
  latitud?: number | null;
  longitud?: number | null;
  areaTotalM2?: number | null;
  fechaInicio?: string | null;
  fechaFinEstimada?: string | null;
  activo?: boolean | null;
};


export interface EtapaResponse {
  idEtapa: number;
  idProyecto: number;
  codigoProyecto?: string;
  nombreProyecto?: string;
  idEstadoEtapa?: number;
  codigoEstadoEtapa?: string;
  nombreEstadoEtapa?: string;
  codigo: string;
  nombre: string;
  descripcion?: string;
  numeroOrden?: number;
  fechaInicio?: string;
  fechaFinEstimada?: string;
  activo: boolean;
}

export type EtapaRequest = {
  idProyecto: number;
  codigoEstadoEtapa: string;
  codigo: string;
  nombre: string;
  descripcion?: string | null;
  numeroOrden?: number | null;
  fechaInicio?: string | null;
  fechaFinEstimada?: string | null;
  activo?: boolean | null;
};

export interface ZonaResponse {
  idZona: number;
  idProyecto: number;
  codigoProyecto?: string;
  nombreProyecto?: string;
  codigo: string;
  nombre: string;
  descripcion?: string;
  numeroOrden?: number;
  activo: boolean;
}

export type ZonaRequest = {
  idProyecto: number;
  codigo: string;
  nombre: string;
  descripcion?: string | null;
  numeroOrden?: number | null;
  activo?: boolean | null;
};

export interface ManzanaResponse {
  idManzana: number;
  idEtapa: number;
  codigoEtapa?: string;
  nombreEtapa?: string;
  idProyecto?: number;
  codigoProyecto?: string;
  nombreProyecto?: string;
  idEstadoManzana?: number;
  codigoEstadoManzana?: string;
  nombreEstadoManzana?: string;
  codigo: string;
  nombre: string;
  descripcion?: string;
  numeroOrden?: number;
  activo: boolean;
}

export type ManzanaRequest = {
  idEtapa: number;
  codigoEstadoManzana: string;
  codigo: string;
  nombre?: string | null;
  descripcion?: string | null;
  numeroOrden?: number | null;
  activo?: boolean | null;
};

export interface LoteResponse {
  idLote: number;
  idProyecto?: number;
  codigoProyecto?: string;
  nombreProyecto?: string;
  idManzana?: number;
  codigoManzana?: string;
  nombreManzana?: string;
  idEtapa?: number;
  codigoEtapa?: string;
  nombreEtapa?: string;
  idZona?: number;
  codigoZona?: string;
  nombreZona?: string;
  idTipoLote?: number;
  codigoTipoLote?: string;
  nombreTipoLote?: string;
  idEstadoLote?: number;
  codigoEstadoLote?: string;
  nombreEstadoLote?: string;
  codigo: string;
  numero?: string;
  areaM2?: number;
  frenteM?: number;
  fondoM?: number;
  lateralDerechoM?: number;
  lateralIzquierdoM?: number;
  observaciones?: string;
  activo: boolean;
}

export type LoteRequest = {
  idManzana: number;
  idZona?: number | null;
  codigoTipoLote?: string | null;
  codigoEstadoLote: string;
  codigo: string;
  numero: string;
  areaM2: number;
  frenteM?: number | null;
  fondoM?: number | null;
  lateralDerechoM?: number | null;
  lateralIzquierdoM?: number | null;
  observaciones?: string | null;
  activo?: boolean | null;
};

export interface CatalogoResponse {
  id: number;
  codigo: string;
  nombre: string;
  descripcion?: string;
  activo: boolean;
  orden?: number;
}

export interface EstadoLoteResponse {
  id: number;
  codigo: string;
  nombre: string;
  descripcion?: string;
  permiteReserva?: boolean;
  permiteVenta?: boolean;
  activo: boolean;
  orden?: number;
}

export interface MonedaResponse {
  id: number;
  codigo: string;
  nombre: string;
  simbolo: string;
  activo: boolean;
}

export interface LoteFiltroRequest {
  idProyecto?: number;
  idEtapa?: number;
  idZona?: number;
  idManzana?: number;
  idEstadoLote?: number;
  idTipoLote?: number;
  texto?: string;
  areaMin?: number;
  areaMax?: number;
  activo?: boolean;
}

export type CambiarEstadoLoteRequest = {
  codigoNuevoEstado: string;
  motivo: string;
};

export type CambioEstadoLoteResponse = {
  success: boolean;
  message?: string | null;
  idLote?: number | null;
  nuevoEstado?: string | null;
};

export interface LoteHistorialEstadoResponse {
  idHistorial: number;

  idLote: number;
  codigoLote?: string | null;
  numeroLote?: string | null;

  idEstadoAnterior?: number | null;
  codigoEstadoAnterior?: string | null;
  nombreEstadoAnterior?: string | null;

  idEstadoNuevo: number;
  codigoEstadoNuevo?: string | null;
  nombreEstadoNuevo?: string | null;

  motivo?: string | null;
  fechaCambio: string;
  idUsuario?: number | null;
}

export type PuntoPlano = { x: number; y: number };

export interface PlanoInteractivoResponse {
  idPlanoInteractivo: number;
  idProyecto: number;
  codigoProyecto?: string | null;
  nombreProyecto?: string | null;
  idEtapa?: number | null;
  codigoEtapa?: string | null;
  nombreEtapa?: string | null;
  codigo: string;
  nombre: string;
  descripcion?: string | null;
  numeroVersion: number;
  claveArchivo: string;
  nombreArchivoOriginal?: string | null;
  tipoMime?: string | null;
  hashArchivo?: string | null;
  anchoReferencia: number;
  altoReferencia: number;
  vigente: boolean;
  fechaDesde: string;
  fechaHasta?: string | null;
  observaciones?: string | null;
}

export interface LoteGeometriaResponse {
  idLoteGeometria: number;
  idProyecto: number;
  idPlanoInteractivo: number;
  codigoPlano?: string | null;
  nombrePlano?: string | null;
  idLote: number;
  codigoLote: string;
  numeroLote?: string | null;
  puntos: PuntoPlano[];
  etiquetaX?: number | null;
  etiquetaY?: number | null;
  rotacionEtiqueta?: number | null;
  ordenCapa?: number | null;
  visible: boolean;
  interactivo: boolean;
  observaciones?: string | null;
  activo: boolean;
}

export interface PlanoInteractivoDetalleResponse {
  plano: PlanoInteractivoResponse;
  lotes: LoteGeometriaResponse[];
}

export type PlanoInteractivoRequest = {
  idProyecto: number;
  idEtapa?: number | null;
  codigo: string;
  nombre: string;
  descripcion?: string | null;
  claveArchivo: string;
  nombreArchivoOriginal?: string | null;
  tipoMime?: string | null;
  hashArchivo?: string | null;
  anchoReferencia: number;
  altoReferencia: number;
  observaciones?: string | null;
};

export type LoteGeometriaRequest = {
  idPlanoInteractivo: number;
  idLote: number;
  puntos: PuntoPlano[];
  etiquetaX?: number | null;
  etiquetaY?: number | null;
  rotacionEtiqueta?: number | null;
  ordenCapa?: number | null;
  visible?: boolean | null;
  interactivo?: boolean | null;
  observaciones?: string | null;
};

