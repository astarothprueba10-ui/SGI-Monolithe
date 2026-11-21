export interface LoteBuscable {
  id: number;
  codigo: string;
}

export function buscarLotes<T extends LoteBuscable>(lotes: readonly T[], busqueda: string): T[] {
  const patron = busqueda.normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase();
  if (!patron) return [...lotes];
  return lotes.filter(lote => lote.codigo.normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '').toLowerCase().includes(patron));
}
