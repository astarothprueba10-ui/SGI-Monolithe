import type {
  CuotaEstado,
  DocumentoEstado,
  VoucherEstado } from
'../types/portal';
import type { StatusTone } from '../components/ui/StatusBadge';

export const cuotaEstadoLabel: Record<CuotaEstado, string> = {
  pagada: 'Pagada',
  en_validacion: 'En validación',
  pendiente: 'Pendiente',
  vencida: 'Vencida'
};

export const cuotaEstadoTone: Record<CuotaEstado, StatusTone> = {
  pagada: 'success',
  en_validacion: 'warn',
  pendiente: 'neutral',
  vencida: 'danger'
};

export const voucherEstadoLabel: Record<VoucherEstado, string> = {
  validado: 'Validado',
  en_revision: 'En revisión',
  rechazado: 'Rechazado'
};

export const voucherEstadoTone: Record<VoucherEstado, StatusTone> = {
  validado: 'success',
  en_revision: 'warn',
  rechazado: 'danger'
};

export const documentoEstadoLabel: Record<DocumentoEstado, string> = {
  firmado: 'Firmado',
  disponible: 'Disponible',
  pendiente_firma: 'Pendiente de firma'
};

export const documentoEstadoTone: Record<DocumentoEstado, StatusTone> = {
  firmado: 'success',
  disponible: 'info',
  pendiente_firma: 'warn'
};