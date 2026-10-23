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
export function validateProjectDates(form: ProjectFormValues): ProjectFormErrors {
  const errors: ProjectFormErrors = {};
  for (const field of ['fechaInicio', 'fechaFinEstimada'] as const) {
    if (form[field] && !isValidProjectDate(form[field])) errors[field] = 'Ingresa una fecha válida (año 0001 a 9999).';
  }
  if (!errors.fechaInicio && !errors.fechaFinEstimada && form.fechaInicio && form.fechaFinEstimada &&
      form.fechaInicio > form.fechaFinEstimada) {
    errors.fechaInicio = 'La fecha de inicio no puede ser posterior a la fecha de fin estimada.';
    errors.fechaFinEstimada = 'La fecha de fin estimada no puede ser anterior a la fecha de inicio.';
  }
  return errors;
}

/** Limita el calendario con la otra fecha únicamente cuando esta es válida. */
export function projectDateLimits(form: ProjectFormValues, field: 'fechaInicio' | 'fechaFinEstimada') {
  const start = isValidProjectDate(form.fechaInicio) ? form.fechaInicio : '0001-01-01';
  const end = isValidProjectDate(form.fechaFinEstimada) ? form.fechaFinEstimada : '9999-12-31';
  return field === 'fechaInicio' ? { min: '0001-01-01', max: end } : { min: start, max: '9999-12-31' };
}
