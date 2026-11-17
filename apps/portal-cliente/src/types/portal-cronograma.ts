import type { PortalFinanciamientoReal } from './portal-resumen';

/** Contrato de GET /api/core/portal-cliente/cronograma (5.4.3). */
export type EstadoCuotaReal = 'PENDIENTE' | 'PARCIAL' | 'VENCIDA' | 'PAGADA' | 'ANULADA';

export interface PortalCuotaReal {
  idCuota: number;
  numero: number;
  fechaVencimiento: string;
  capital: number;
  interes: number;
  montoCuota: number;
  abonadoConfirmado: number;
  saldoCuota: number;
  estadoCalculado: EstadoCuotaReal;
  estadoRegistrado: string;
  estadoDifiereRegistro: boolean;
  cuotaAtrasada: boolean;
  diasMora: number;
  proxima7Dias: boolean;
}
export interface PortalResumenEstados {
  cantidad: number;
  pendientes: number;
  parciales: number;
  vencidas: number;
  pagadas: number;
  anuladas: number;
  atrasadas: number;
  proximas7Dias: number;
  montoAtrasado: number;
  montoProximo: number;
  discrepanciasRegistro: number;
}
export interface PortalMovimientoConfirmado {
  idAplicacion: number;
  codigoPago: string | null;
  tipo: 'CUOTA' | 'INICIAL';
  numeroCuota: number | null;
  fechaOperacion: string | null;
  fechaAplicacion: string | null;
  montoAplicado: number;
}
export interface PortalCronogramaOperacion {
  idVenta: number;
  codigoVenta: string;
  proyecto: string;
  manzana: string | null;
  numeroLote: string;
  financiamiento: PortalFinanciamientoReal | null;
  cuotas: PortalCuotaReal[];
  resumenEstados: PortalResumenEstados;
  movimientosConfirmados: PortalMovimientoConfirmado[];
}
export interface PortalCronogramaResponse {
  items: PortalCronogramaOperacion[];
  total: number;
  moneda: 'PEN';
  fechaCorte: string;
  fuente: 'APLICACIONES_CONFIRMADAS';
  advertenciaInicial: string;
  advertenciaPagos: string;
}
