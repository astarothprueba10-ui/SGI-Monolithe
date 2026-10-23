export const CORRECTION_EVIDENCE_MAX_SIZE = 5 * 1024 * 1024;
export const CORRECTION_EVIDENCE_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
export const INCOMPLETE_CORRECTION_STORAGE_PREFIX = 'sgi_correccion_incompleta_';

export interface IncompleteCorrectionRequest {
  idSolicitud: number;
  idTrabajador: number;
  idTipoDocumento: number;
  numeroDocumento: string;
  timestamp: number;
}

export function correctionStorageKey(idTrabajador: number): string {
  return `${INCOMPLETE_CORRECTION_STORAGE_PREFIX}${idTrabajador}`;
}

export function readIncompleteCorrection(idTrabajador: number): IncompleteCorrectionRequest | null {
  const saved = localStorage.getItem(correctionStorageKey(idTrabajador));
  if (!saved) return null;
  try {
    const parsed = JSON.parse(saved) as Partial<IncompleteCorrectionRequest>;
    if (
      parsed.idTrabajador === idTrabajador &&
      Number.isInteger(parsed.idSolicitud) &&
      Number.isInteger(parsed.idTipoDocumento) &&
      typeof parsed.numeroDocumento === 'string'
    ) {
      return parsed as IncompleteCorrectionRequest;
    }
  } catch {
    localStorage.removeItem(correctionStorageKey(idTrabajador));
  }
  return null;
}

export function saveIncompleteCorrection(request: IncompleteCorrectionRequest): void {
  localStorage.setItem(correctionStorageKey(request.idTrabajador), JSON.stringify(request));
}

export function clearIncompleteCorrection(idTrabajador: number): void {
  localStorage.removeItem(correctionStorageKey(idTrabajador));
}
