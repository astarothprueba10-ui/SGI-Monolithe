/** Respuesta segura de /api/core/portal-cliente/resumen (5.4.1). */
export interface PortalProximaCuota {
  idCuota: number;
  numero: number;
  fechaVencimiento: string;
  monto: number;
  saldo: number;
  estado: 'PENDIENTE' | 'PARCIAL' | 'VENCIDA';
}
export interface PortalFinanciamientoReal {
  idPlanPago: number;
  codigoPlan: string;
  numeroCuotas: number;
  cuotasPagadas: number;
  montoVenta: number;
  inicialAdicionalPactada: number;
  reservaAcreditada: number;
  capitalFinanciado: number;
  interesTotalPactado: number;
  tasaInteresMensualPct: number;
  totalCuotasPactado: number;
  saldoInicial: number;
  saldoCuotas: number;
  totalAplicadoCuotas: number;
  saldoTotal: number;
  proximaCuota: PortalProximaCuota | null;
}
export interface PortalOperacionReal {
  id_venta: number;
  codigo_venta: string;
  estado_venta: string;
  proyecto: string;
  distrito: string | null;
  provincia: string | null;
  departamento: string | null;
  codigo_lote: string;
  numero_lote: string;
  manzana: string | null;
  etapa: string | null;
  area_m2: number;
  precio_venta: number;
  financiamiento: PortalFinanciamientoReal | null;
}
export interface PortalResumenReal {
  cliente: {nombreMostrar: string};
  moneda: 'PEN';
  fechaConsulta: string;
  operaciones: PortalOperacionReal[];
}
