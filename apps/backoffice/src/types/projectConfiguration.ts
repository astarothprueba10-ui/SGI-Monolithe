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

export interface ConfiguracionComercial {
  etapas: ReglaEtapaComercial[];
  manzanas: AsignacionComercial[];
  lotes: AsignacionComercial[];
}

export interface ConfiguracionProyectoResponse {
  version: number;
  datos: ConfiguracionComercial;
  manzanas: { id: number; codigo: string; nombre: string }[];
  lotes: { id: number; idManzana: number; codigo: string }[];
}
