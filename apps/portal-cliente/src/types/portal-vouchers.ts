/** 5.4.4: lecturas y escrituras del Portal Cliente, exclusivamente por Core JWT. */
export type DestinoVoucher = 'CUOTA' | 'INICIAL';
export type EstadoVoucher = 'PENDIENTE' | 'APROBADO' | 'RECHAZADO';

export interface PortalOpcionCuota {
  idCuota: number;
  numero: number;
  fechaVencimiento: string;
  saldo: number;
}
export interface PortalOpcionOperacion {
  idVenta: number;
  codigoVenta: string;
  proyecto: string;
  manzana: string | null;
  numeroLote: string;
  planActivo: boolean;
  saldoInicial: number;
  cuotas: PortalOpcionCuota[];
}
export interface PortalMetodoPago {
  idMetodoPago: number;
  nombre: string;
  codigo: string;
}
export interface PortalVoucher {
  idVoucher: number;
  codigoVoucher: string;
  idVenta: number;
  codigoVenta: string;
  destino: DestinoVoucher;
  numeroCuota: number | null;
  monto: number;
  metodoPago: string;
  fechaOperacion: string;
  fechaRegistro: string;
  fechaRevision: string | null;
  estadoVoucher: EstadoVoucher;
  estadoPago: string;
  montoAplicado: number;
  numeroOperacion: string | null;
  nombreArchivo: string;
  motivoRechazo: string | null;
}
export interface PortalVouchersResponse {
  operaciones: PortalOpcionOperacion[];
  metodos: PortalMetodoPago[];
  comprobantes: PortalVoucher[];
  total: number;
  moneda: 'PEN';
  advertencia: string;
}
export interface PortalPrepararVoucherInput {
  idVenta: number;
  destino: DestinoVoucher;
  idCuota: number | null;
  monto: number;
  idMetodoPago: number;
  fechaOperacion: string;
  numeroOperacion: string | null;
  nombreArchivo: string;
  tipoMime: string;
  tamanioBytes: number;
}
export interface PortalCargaVoucher {
  idCarga: string;
  bucket: 'vouchers-ventas-private';
  claveArchivo: string;
  urlCarga: string;
  tipoMime: string;
  maxBytes: number;
  expiresInSeconds: number;
}
export interface PortalRegistroVoucher {
  idPago: number;
  idVoucher: number;
  destino: DestinoVoucher;
  estadoPago: string;
  estadoVoucher: EstadoVoucher;
  reutilizado: boolean;
  saldoAplicado: number;
}
