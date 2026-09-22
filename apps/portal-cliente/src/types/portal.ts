export type CuotaEstado = 'pagada' | 'en_validacion' | 'pendiente' | 'vencida';

export type Cuota = {
  numero: number;
  vencimiento: string;
  monto: number;
  estado: CuotaEstado;
  fechaPago: string | null;
  medio: string | null;
};

export type VoucherEstado = 'validado' | 'en_revision' | 'rechazado';

export type Pago = {
  id: string;
  cuota: number;
  fecha: string;
  monto: number;
  medio: string;
  operacion: string;
  voucher: VoucherEstado;
  motivoRechazo: string | null;
  archivo: string;
};

export type DocumentoEstado = 'firmado' | 'disponible' | 'pendiente_firma';

export type Documento = {
  id: string;
  nombre: string;
  tipo: string;
  fecha: string;
  estado: DocumentoEstado;
  peso: string;
};

export type AlertaNivel = 'critico' | 'atencion' | 'info';

export type Alerta = {
  id: string;
  nivel: AlertaNivel;
  titulo: string;
  detalle: string;
  accion: string;
  ruta: string;
};

export type Lote = {
  proyecto: string;
  ubicacion: string;
  etapa: string;
  manzana: string;
  numero: string;
  area: number;
  precio: number;
  estado: string;
  frente: number;
  fondo: number;
  uso: string;
  partida: string;
};

export type Financiamiento = {
  precioTotal: number;
  inicial: number;
  montoFinanciado: number;
  totalPagado: number;
  saldoPendiente: number;
  cuotasTotales: number;
  cuotasPagadas: number;
  tea: number;
};

export type Asesor = {
  nombre: string;
  cargo: string;
  telefono: string;
  correo: string;
  avatar: string;
  horario: string;
  oficina: string;
};

export type Cliente = {
  nombre: string;
  nombreCompleto: string;
  documento: string;
  correo: string;
  telefono: string;
  avatar: string;
  codigo: string;
};