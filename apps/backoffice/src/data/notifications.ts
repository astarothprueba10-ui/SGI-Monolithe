import type { CrmAlertaCuota } from '../services/crmBackend';
import { currency } from '../utils/format';

/** Solo avisos derivados de las cuotas que el backend autoriza al actor autenticado. */
export interface Notification {
  id: string;
  title: string;
  description: string;
  time: string;
  module: 'financing';
  to: string;
  tone: 'warning' | 'danger';
}

function fecha(vencimiento: string): string {
  const dia = vencimiento.slice(0,10);
  const fecha = new Date(`${dia}T12:00:00Z`);
  return Number.isNaN(fecha.getTime())
    ? dia
    : new Intl.DateTimeFormat('es-PE',{
        timeZone:'UTC',day:'2-digit',month:'2-digit',year:'numeric'
      }).format(fecha);
}

/**
 * Identidad estable de la alerta. Pasar de PRÓXIMA a VENCIDA es un aviso nuevo.
 * Nunca almacenamos el nombre, DNI o importe de la deuda en almacenamiento local.
 */
export function notificationFromFinancialAlert(a: CrmAlertaCuota): Notification {
  const vencida = a.tipoAlerta === 'CUOTA_VENCIDA';
  return {
    id: `cuota:${a.idCuota}:${a.tipoAlerta}`,
    title: vencida ? 'Cuota vencida con saldo' : 'Cuota próxima a vencer',
    description: `${a.codigoVenta} · Cuota N.º ${a.numeroCuota} · Saldo ${currency(a.saldoCuota)}`,
    time: vencida
      ? `Venció el ${fecha(a.fechaVencimiento)} · ${a.diasMora} días de atraso`
      : `Vence el ${fecha(a.fechaVencimiento)} · ${a.diasParaVencer} días restantes`,
    module: 'financing',
    to: '/financiamiento?tab=alertas',
    tone: vencida ? 'danger' : 'warning'
  };
}
