import type { CatalogosTrabajadorResponse } from '../types/workers';
import { getPeruTodayDateString } from '../components/Workers/workerDateUtils';

type DocumentType = CatalogosTrabajadorResponse['tiposDocumento'][number];

/** El alta admite únicamente DNI y carné de extranjería del catálogo. */
export function isNewWorkerDocumentAllowed(type: DocumentType): boolean {
  const code = type.codigo.trim().toUpperCase();
  return ['DNI', '01', '1', 'CE', '04', '4'].includes(code);
}

/** Conserva los documentos personales admitidos para una nueva alta. */
export function getNewWorkerDocumentTypes(types: DocumentType[]): DocumentType[] {
  return types.filter(isNewWorkerDocumentAllowed);
}

/** Limita la entrada a nueve dígitos sin cambiar la edición de trabajadores. */
export function filterNewWorkerPhone(value: string): string {
  return value.replace(/\D/g, '').slice(0, 9);
}

/** El teléfono sigue siendo opcional; si se informa, debe ser un celular válido. */
export function validateNewWorkerPhone(value: string): string | undefined {
  if (!value.trim()) return undefined;
  return /^9[0-9]{8}$/.test(value.trim())
    ? undefined : 'El teléfono debe tener 9 dígitos y comenzar con 9.';
}

/** Valida una fecha real de ingreso desde el día actual de Perú. */
export function validateNewWorkerStartDate(
  value: string,
  today = getPeruTodayDateString()
): string | undefined {
  if (!value) return 'La fecha de ingreso es obligatoria.';
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || value.startsWith('0000')) {
    return 'Ingresa una fecha de ingreso válida.';
  }
  const parsed = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== value) {
    return 'Ingresa una fecha de ingreso válida.';
  }
  return value < today ? 'La fecha de ingreso debe ser hoy o una fecha posterior.' : undefined;
}
