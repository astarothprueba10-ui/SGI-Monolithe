// Almacenamiento local de solicitudes de reincorporacion pendientes de aprobacion

const STORAGE_KEY = 'monolithe_reincorporaciones_pendientes';

function getStoredIds(): Set<number> {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? new Set(parsed.map(Number)) : new Set();
  } catch {
    return new Set();
  }
}

export function isReincorporacionPendiente(idTrabajador: number): boolean {
  if (!idTrabajador) return false;
  return getStoredIds().has(idTrabajador);
}

export function markReincorporacionPendiente(idTrabajador: number): void {
  if (!idTrabajador) return;
  const set = getStoredIds();
  set.add(idTrabajador);
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(set)));
  } catch {
    // Si sessionStorage no esta disponible, continua sin fallar
  }
}
