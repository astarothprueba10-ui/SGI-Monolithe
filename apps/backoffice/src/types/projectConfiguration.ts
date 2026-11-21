export type DisponibilidadComercial = 'PROMOCION' | 'REGULAR' | 'ANTICIPADA' | 'BLOQUEADA';
export type TipoDescuentoComercial = 'NINGUNO' | 'PORCENTAJE' | 'MONTO_FIJO';

export interface ReglaEtapaComercial {
  codigo: string;
  nombre: string;
  disponibilidad: DisponibilidadComercial;
  tipoDescuento: TipoDescuentoComercial;
  descuento: number;
}

export interface AsignacionComercial {
  id: number;
  codigoEtapa: string;
}

export interface TarifaComercial {
  codigoZona: string;
  codigoEtapa: string;
  moneda: string;
  tipoTarifa: 'POR_M2' | 'MONTO_FIJO';
  valor: number;
  vigenteDesde: string;
  vigenteHasta: string | null;
}

export interface ConfiguracionComercial {
  etapas: ReglaEtapaComercial[];
  manzanas: AsignacionComercial[];
  lotes: AsignacionComercial[];
  tarifas?: TarifaComercial[];
}

export interface ConfiguracionProyectoResponse {
  version: number;
  zonas: string[];
  monedas: string[];
  datos: ConfiguracionComercial;
  manzanas: { id: number; codigo: string; nombre: string }[];
  lotes: { id: number; idManzana: number; codigo: string }[];
}

export interface SimulacionComercialResponse {
  version: number;
  idLote: number;
  codigoLote: string;
  estadoInventario: string;
  codigoZona: string | null;
  codigoEtapa: string | null;
  disponibilidad: DisponibilidadComercial | null;
  moneda: string;
  fecha: string;
  resultado: string;
  mensaje: string;
  precioBase: number | null;
  ajusteTipo: number | null;
  descuento: number | null;
  precioSimulado: number | null;
}
