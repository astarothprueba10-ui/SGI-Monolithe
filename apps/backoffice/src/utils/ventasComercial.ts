import type { Sale } from '../types';
import { fechaCalendarioLima } from './separacionesFiltros';

export interface FiltrosVentas {
  busqueda: string;
  modalidad: string;
  asesor: string;
  proyecto: string;
  estado: string;
  desde: string;
  hasta: string;
}
export const FILTROS_VENTAS_INICIALES: FiltrosVentas = {
  busqueda: '', modalidad: 'all', asesor: 'all', proyecto: 'all',
  estado: 'all', desde: '', hasta: ''
};
export type ModoPeriodoComercial = 'tres_meses' | 'hoy' | 'semana' | 'mes' | 'anio' | 'rango';
export interface PeriodoComercial {
  modo: ModoPeriodoComercial;
  desde: string;
  hasta: string;
}
const MESES = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'];
const iso = (year: number, month: number, day: number): string =>
  [String(year).padStart(4, '0'),String(month).padStart(2, '0'),String(day).padStart(2, '0')].join('-');
function fechaUtc(a: string): Date {
  return new Date(a + 'T00:00:00.000Z');
}

/** Días calendario interpretados en Lima, sin depender del huso horario del navegador. */
export function crearPeriodoComercial(
  modo: ModoPeriodoComercial, ahora: Date = new Date()
): PeriodoComercial {
  const hoy = fechaCalendarioLima(ahora.toISOString());
  const [anio, mes, dia] = hoy.split('-').map(Number);
  if (modo === 'hoy') return {modo, desde: hoy, hasta: hoy};
  if (modo === 'mes') return {modo, desde: iso(anio,mes,1), hasta: hoy};
  if (modo === 'anio') return {modo, desde: iso(anio,1,1), hasta: hoy};
  if (modo === 'semana') {
    const d = fechaUtc(hoy);
    const retroceder = (d.getUTCDay() + 6) % 7;
    d.setUTCDate(d.getUTCDate() - retroceder);
    return {modo, desde: iso(d.getUTCFullYear(),d.getUTCMonth()+1,d.getUTCDate()), hasta:hoy};
  }
  if (modo === 'rango') return {modo,desde:hoy,hasta:hoy};
  const primero = new Date(Date.UTC(anio,mes-3,1));
  return {modo:'tres_meses', desde:iso(
    primero.getUTCFullYear(),primero.getUTCMonth()+1,1),hasta:hoy};
}

export function periodoValido(p: PeriodoComercial): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(p.desde)
    && /^\d{4}-\d{2}-\d{2}$/.test(p.hasta) && p.desde <= p.hasta
    && !Number.isNaN(fechaUtc(p.desde).getTime())
    && !Number.isNaN(fechaUtc(p.hasta).getTime());
}

export function limitarPorPeriodo(items: Sale[], periodo: PeriodoComercial): Sale[] {
  if (!periodoValido(periodo)) return [];
  return items.filter(op => {
    const fecha = fechaCalendarioLima(op.dateIso);
    return fecha !== '' && fecha >= periodo.desde && fecha <= periodo.hasta;
  });
}
const normalizar = (x?: string | null): string =>
  (x ?? '').toLocaleLowerCase('es-PE').normalize('NFD')
    .replace(/[\u0300-\u036f]/g,'').trim();

export function filtrarVentas(items: Sale[], f: FiltrosVentas): Sale[] {
  const busqueda = normalizar(f.busqueda);
  return items.filter(op => {
    if (op.type !== 'Venta') return false;
    const fecha = fechaCalendarioLima(op.dateIso);
    return (!busqueda || [op.buyer,op.document,op.code,op.lot,op.project,op.advisor]
      .some(x => normalizar(x).includes(busqueda)))
      && (f.modalidad === 'all' || op.modality === f.modalidad)
      && (f.asesor === 'all' || (f.asesor === '__sin_asesor__'
        ? !op.advisor?.trim() : op.advisor === f.asesor))
      && (f.proyecto === 'all' || op.project === f.proyecto)
      && (f.estado === 'all' || op.status.toUpperCase() === f.estado)
      && (!f.desde || (fecha !== '' && fecha >= f.desde))
      && (!f.hasta || (fecha !== '' && fecha <= f.hasta));
  });
}

export function opcionesUnicasVentas(
  items: Sale[], campo: 'advisor' | 'project' | 'status'
): string[] {
  return [...new Set(items.filter(x => x.type === 'Venta').map(op =>
    campo === 'advisor' ? op.advisor : campo === 'project' ? op.project : op.status.toUpperCase())
    .filter((x): x is string => Boolean(x?.trim())))].sort((a,b)=>a.localeCompare(b,'es-PE'));
}
export interface ResumenMensualComercial {
  mes: string;
  separaciones: number;
  ventas: number;
}
export function resumenMensualComercial(
  items: Sale[], periodo: PeriodoComercial
): ResumenMensualComercial[] {
  if (!periodoValido(periodo)) return [];
  const start = fechaUtc(periodo.desde);
  const end = fechaUtc(periodo.hasta);
  const porMes = new Map<string,ResumenMensualComercial>();
  let cur = new Date(Date.UTC(start.getUTCFullYear(),start.getUTCMonth(),1));
  for (let i = 0; cur <= end && i < 240; i++) {
    const key = iso(cur.getUTCFullYear(),cur.getUTCMonth()+1,1).slice(0,7);
    porMes.set(key,{
      mes: MESES[cur.getUTCMonth()]+' '+String(cur.getUTCFullYear()).slice(-2),
      separaciones:0,ventas:0
    });
    cur = new Date(Date.UTC(cur.getUTCFullYear(),cur.getUTCMonth()+1,1));
  }
  for (const op of limitarPorPeriodo(items,periodo)) {
    const bucket = porMes.get(fechaCalendarioLima(op.dateIso).slice(0,7));
    if (!bucket) continue;
    if (op.type === 'Separación') bucket.separaciones++;
    else if (op.type === 'Venta') bucket.ventas++;
  }
  return [...porMes.values()];
}
