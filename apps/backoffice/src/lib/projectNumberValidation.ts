import type { ProjectFormErrors, ProjectFormValues } from '../types/projectForm';

/** El único número editable del proyecto es su área. */
export type ProjectNumberField = 'areaTotalM2';

export function isProjectNumberField(field: keyof ProjectFormValues): field is ProjectNumberField {
  return field === 'areaTotalM2';
}

export function normalizeProjectNumber(value: string): string {
  return value.replace(',', '.');
}

function digitCount(value: string): number {
  return value.replace(/\D/g, '').length;
}

/** Permite borrar datos antiguos excesivos sin truncar su valor inicial. */
export function canChangeProjectNumber(_field: ProjectNumberField, previous: string, value: string): boolean {
  const count = digitCount(value);
  return /^\d*(?:\.\d*)?$/.test(value) && (count <= 10 || (digitCount(previous) > 10 && count < digitCount(previous)));
}

export function validateProjectNumbers(form: ProjectFormValues): ProjectFormErrors {
  const value = form.areaTotalM2;
  if (!value) return {};
  if (!/^(?:\d+(?:\.\d*)?|\.\d+)$/.test(value))
    return { areaTotalM2: 'Ingresa un número válido, sin letras ni símbolos.' };
  if (digitCount(value) > 10)
    return { areaTotalM2: 'Máximo 10 dígitos, sin contar el separador decimal.' };
  if ((value.split('.')[1]?.length ?? 0) > 2)
    return { areaTotalM2: 'Se permiten como máximo 2 decimales.' };
  if (!Number.isFinite(Number(value)) || Number(value) <= 0)
    return { areaTotalM2: 'El área debe ser mayor a 0.' };
  return {};
}
