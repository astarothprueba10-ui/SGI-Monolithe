/** Comprueba fechas de calendario reales expresadas como YYYY-MM-DD. */
function isCalendarDate(value: string): boolean {
  if (!/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(value) || value.startsWith('0000')) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

/** Obtiene el día de registro en Perú; las fechas sin zona ya representan un día local. */
export function getWorkerRegistrationDate(value: string | null | undefined): string | null {
  if (!value || !isCalendarDate(value.slice(0, 10))) return null;
  if (value.length === 10) return value;
  if (!/^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})?$/i.test(value)) return null;
  const zoned = /(?:Z|[+-]\d{2}:\d{2})$/i.test(value);
  const date = new Date(`${value.replace(' ', 'T')}${zoned ? '' : 'Z'}`);
  if (Number.isNaN(date.getTime())) return null;
  if (!zoned) return value.slice(0, 10);
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Lima', year: 'numeric', month: '2-digit', day: '2-digit'
  }).formatToParts(date);
  const get = (type: string) => parts.find((part) => part.type === type)?.value;
  return `${get('year')}-${get('month')}-${get('day')}`;
}

/** Valida cambios de ingreso desde el registro y conserva valores históricos sin modificar. */
export function validateEditedWorkerStartDate(
  value: string, original: string, registrationDate: string | null
): string | undefined {
  if (value === original) return undefined;
  if (!isCalendarDate(value)) return 'Ingresa una fecha de ingreso válida.';
  if (!registrationDate || !isCalendarDate(registrationDate)) {
    return 'No se pudo determinar la fecha de registro. Vuelve a cargar el trabajador.';
  }
  return value < registrationDate
    ? 'La fecha de ingreso debe ser el día de registro del trabajador o una fecha posterior.' : undefined;
}

/** RRHH con permiso de edición puede gestionar el estado laboral de cualquier cargo. */
export function isWorkerEmploymentProtected(
  isGeneralManager: boolean, roles: readonly string[], canEdit: boolean
): boolean {
  return isGeneralManager && !(canEdit && roles.includes('RRHH'));
}
