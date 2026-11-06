import type { Sale } from '../types';

export interface FiltrosSeparaciones {
  busqueda: string;
  metodoPago: string;
  asesor: string;
  proyecto: string;
  desde: string;
  hasta: string;
  estado: string;
}

export const FILTROS_SEPARACIONES_INICIALES: FiltrosSeparaciones = {
  busqueda: '',
  metodoPago: 'all',
  asesor: 'all',
  proyecto: 'all',
  desde: '',
  hasta: '',
  estado: 'all'
};

/** La fecha de negocio se interpreta en America/Lima, no en UTC ni en el navegador. */
export function fechaCalendarioLima(iso: string | null | undefined): string {
  if (!iso) return '';
  const date = new Date(iso);
  if (!Number.isFinite(date.getTime())) return '';
  const partes = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Lima',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).formatToParts(date);
  const get = (tipo: string) => partes.find((parte) => parte.type === tipo)?.value ?? '';
  return [get('year'), get('month'), get('day')].join('-');
}

function normalizar(valor: string | null | undefined): string {
  return (valor ?? '').toLocaleLowerCase('es-PE').normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '').trim();
}

export function filtrarSeparaciones(items: Sale[], f: FiltrosSeparaciones): Sale[] {
  const busqueda = normalizar(f.busqueda);
  return items.filter((op) => {
    if (op.type !== 'Separación') return false;
    const fecha = fechaCalendarioLima(op.dateIso);
    return (
      (!busqueda || [op.code, op.buyer, op.document, op.project, op.lot, op.advisor]
        .some((v) => normalizar(v).includes(busqueda))) &&
      (f.metodoPago === 'all' || op.paymentMethod === f.metodoPago) &&
      (f.asesor === 'all' || (f.asesor === '__sin_asesor__'
        ? !op.advisor?.trim()
        : op.advisor === f.asesor)) &&
      (f.proyecto === 'all' || op.project === f.proyecto) &&
      (!f.desde || (fecha.length > 0 && fecha >= f.desde)) &&
      (!f.hasta || (fecha.length > 0 && fecha <= f.hasta)) &&
      (f.estado === 'all' || op.status.toUpperCase() === f.estado)
    );
  });
}

/** Solo las separaciones abiertas presentan cuenta regresiva. */
export function leyendaVencimiento(
  fechaIso: string | null | undefined,
  estado: string,
  ahora: number
): string | null {
  const codigo = estado.toUpperCase();
  if (codigo === 'VENCIDA') return 'Vencida';
  if (!['PENDIENTE', 'VIGENTE'].includes(codigo)) return null;
  if (!fechaIso) return null;
  const limite = Date.parse(fechaIso);
  if (!Number.isFinite(limite)) return null;
  const diferencia = limite - ahora;
  if (diferencia <= 0) return 'Vencida';
  const dias = Math.ceil(diferencia / 86_400_000);
  return `Vence en ${dias} ${dias === 1 ? 'día' : 'días'}`;
}

export function opcionesUnicasSeparaciones(
  items: Sale[],
  campo: 'advisor' | 'project' | 'paymentMethod'
): string[] {
  return Array.from(new Set(
    items.filter((o) => o.type === 'Separación')
      .map((o) => campo === 'advisor' ? o.advisor : campo === 'project' ? o.project : o.paymentMethod)
      .filter((valor): valor is string => Boolean(valor?.trim()))
  )).sort((a, b) => a.localeCompare(b, 'es-PE'));
}
