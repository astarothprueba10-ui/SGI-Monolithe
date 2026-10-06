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
