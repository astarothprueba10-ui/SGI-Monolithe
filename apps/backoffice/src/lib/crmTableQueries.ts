import { crmBackend, type CrmSearch } from '../services/crmBackend';

/** Filtros de cartera compartidos por la tabla y sus contadores. */
export type LeadTableFilters = CrmSearch & { idProyecto?: number };
/** null representa todo el historial; undefined indica un rango incompleto. */
export type TableRange = { desde: string; hastaExclusivo: string } | null | undefined;
/** Totales conocidos; un fallo de consulta no se representa como cero. */
export type CrmTableCounts = Partial<Record<'leads' | 'potenciales' | 'compradores', number>>;

/** Consulta la cartera sin heredar las fechas del resumen comercial. */
export function queryLeadTable(filters: LeadTableFilters, range: TableRange) {
  if (range === undefined) return Promise.reject(new Error('Complete las fechas de la tabla.'));
  return range ? crmBackend.buscarPeriodo({ ...filters, ...range }) : crmBackend.buscarSinPeriodo(filters);
}

function total(result: PromiseSettledResult<{ total: number }>): number | undefined {
  return result.status === 'fulfilled' && Number.isFinite(result.value?.total) && result.value.total >= 0 ? result.value.total : undefined;
}

/** Obtiene totales paginados del servidor con los mismos filtros de cada listado. */
export async function loadCrmTableCounts(filters: LeadTableFilters, range: TableRange, buyerQuery: string): Promise<CrmTableCounts> {
  const [leads, potentials, buyers] = await Promise.allSettled([
    queryLeadTable({ ...filters, categoria: 'LEAD', pagina: 1, tamano: 1 }, range),
    queryLeadTable({ ...filters, categoria: 'POTENCIAL', pagina: 1, tamano: 1 }, range),
    crmBackend.compradores(buyerQuery.trim(), 1, 1)
  ]);
  return { leads: total(leads), potenciales: total(potentials), compradores: total(buyers) };
}
