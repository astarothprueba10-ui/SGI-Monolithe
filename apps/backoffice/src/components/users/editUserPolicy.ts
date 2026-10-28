import { normalizeEmailAddress } from '../../lib/emailAddress';

/** Detecta cambios del correo ignorando espacios exteriores y mayúsculas. */
export function userEmailChanged(current: string, original: string | null): boolean {
  const normalized = normalizeEmailAddress(current) ?? current.trim();
  const previous = normalizeEmailAddress(original ?? '') ?? (original ?? '').trim();
  return normalized.toLowerCase() !== previous.toLowerCase();
}

/** Valida el nuevo correo sin bloquear la edición de cuentas sin correo previo. */
export function editedUserEmailError(current: string, original: string | null): string | undefined {
  if (!userEmailChanged(current, original)) return undefined;
  const normalized = normalizeEmailAddress(current);
  if (!normalized) return 'Ingresa un correo válido, por ejemplo persona@empresa.com.pe.';
  if (normalized.length > 180) return 'El correo no puede superar los 180 caracteres.';
  return undefined;
}

/** Devuelve el correo normalizado únicamente cuando se modificó. */
export function changedUserEmail(current: string, original: string | null): string | undefined {
  if (!userEmailChanged(current, original)) return undefined;
  const error = editedUserEmailError(current, original);
  if (error) throw new Error(error);
  return normalizeEmailAddress(current) ?? undefined;
}
