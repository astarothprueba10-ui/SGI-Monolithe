import type { ProjectFormErrors, ProjectFormValues } from '../types/projectForm';

/** Reconoce fechas reales ISO con años del 0001 al 9999, sin conversiones de zona horaria. */
export function isValidProjectDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || value.startsWith('0000')) return false;
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(0);
  date.setUTCFullYear(year, month - 1, day);
  return date.toISOString().slice(0, 10) === value;
}

/** Conserva las fechas opcionales y permite que inicio y fin coincidan. */
export function validateProjectDates(form: ProjectFormValues, minimumStartDate?: string): ProjectFormErrors {
  const errors: ProjectFormErrors = {};
  for (const field of ['fechaInicio', 'fechaFinEstimada'] as const) {
    if (form[field] && !isValidProjectDate(form[field])) errors[field] = 'Ingresa una fecha válida (año 0001 a 9999).';
  }
  for (const field of ['fechaInicio', 'fechaFinEstimada'] as const) {
    if (minimumStartDate && form[field] && !errors[field] && form[field] < minimumStartDate)
      errors[field] = field === 'fechaInicio' ? 'La fecha de inicio debe ser hoy o una fecha posterior.'
        : 'La fecha de fin estimada no puede ser anterior al día de registro.';
  }
  if (!errors.fechaInicio && !errors.fechaFinEstimada && form.fechaInicio && form.fechaFinEstimada &&
      form.fechaInicio > form.fechaFinEstimada) {
    errors.fechaInicio = 'La fecha de inicio no puede ser posterior a la fecha de fin estimada.';
    errors.fechaFinEstimada = 'La fecha de fin estimada no puede ser anterior a la fecha de inicio.';
  }
  return errors;
}

/** Limita ambos calendarios con fechas válidas y aplica el día de registro únicamente al alta. */
export function projectDateLimits(form: ProjectFormValues, field: 'fechaInicio' | 'fechaFinEstimada', minimumStartDate?: string) {
  const floor = minimumStartDate ?? '0001-01-01';
  const start = isValidProjectDate(form.fechaInicio) && form.fechaInicio >= floor ? form.fechaInicio : floor;
  const end = isValidProjectDate(form.fechaFinEstimada) && form.fechaFinEstimada >= floor ? form.fechaFinEstimada : '9999-12-31';
  return field === 'fechaInicio' ? { min: floor, max: end } : { min: start, max: '9999-12-31' };
}
