import type { ProjectFormErrors, ProjectFormValues } from '../types/projectForm';

const RULES = {
  areaTotalM2: { min: 0, max: Infinity, decimals: 2 },
  latitud: { min: -90, max: 90, decimals: 7 },
  longitud: { min: -180, max: 180, decimals: 7 }
} as const;

/** Campos numéricos del formulario de proyectos. */
export type ProjectNumberField = keyof typeof RULES;

/** Identifica exclusivamente los campos de dimensiones y coordenadas. */
export function isProjectNumberField(field: keyof ProjectFormValues): field is ProjectNumberField {
  return field === 'areaTotalM2' || field === 'latitud' || field === 'longitud';
}

/** Unifica la coma decimal del teclado con el separador utilizado por la API. */
export function normalizeProjectNumber(value: string): string {
  return value.replace(',', '.');
}

function digitCount(value: string): number {
  return value.replace(/\D/g, '').length;
}

/** Admite borrado y escritura parcial, rechazando caracteres o cifras adicionales sin truncar. */
export function canChangeProjectNumber(field: ProjectNumberField, previous: string, value: string): boolean {
  const pattern = field === 'areaTotalM2' ? /^\d*(?:\.\d*)?$/ : /^-?\d*(?:\.\d*)?$/;
  const count = digitCount(value);
  const previousCount = digitCount(previous);
  return pattern.test(value) && (count <= 10 || (previousCount > 10 && count < previousCount));
}

function numberError(field: ProjectNumberField, value: string): string | undefined {
  if (value === '') return undefined;
  const pattern = field === 'areaTotalM2' ? /^(?:\d+(?:\.\d*)?|\.\d+)$/ : /^-?(?:\d+(?:\.\d*)?|\.\d+)$/;
  if (!pattern.test(value)) return 'Ingresa un número válido, sin letras ni símbolos adicionales.';
  if (digitCount(value) > 10) return 'Se permiten como máximo 10 dígitos, sin contar el signo ni el separador decimal.';
  const rule = RULES[field];
  if ((value.split('.')[1]?.length ?? 0) > rule.decimals) return `Se permiten como máximo ${rule.decimals} decimales.`;
  const number = Number(value);
  if (!Number.isFinite(number) || number < rule.min || number > rule.max || (field === 'areaTotalM2' && number === 0))
    return field === 'areaTotalM2' ? 'El área debe ser mayor a 0.' : `El valor debe estar entre ${rule.min} y ${rule.max}.`;
  return undefined;
}

/** Valida formato, cantidad total de cifras, precisión y rangos antes de guardar. */
export function validateProjectNumbers(form: ProjectFormValues): ProjectFormErrors {
  const errors: ProjectFormErrors = {};
  for (const field of Object.keys(RULES) as ProjectNumberField[]) {
    const error = numberError(field, form[field]);
    if (error) errors[field] = error;
  }
  return errors;
}
