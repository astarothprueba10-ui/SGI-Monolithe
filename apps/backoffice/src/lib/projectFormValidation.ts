import type { ProjectFormErrors, ProjectFormValues, Ubigeo } from '../types/projectForm';
import { locationOptions, normalizeLocation } from './ubigeo';
import { validateProjectDates } from './projectDateValidation';
import { validateProjectNumbers } from './projectNumberValidation';

function validateIdentity(form: ProjectFormValues): ProjectFormErrors {
  const errors: ProjectFormErrors = {};
  if (!form.codigoEstadoProyecto.trim()) errors.codigoEstadoProyecto = 'El estado es obligatorio.';
  if (!form.codigo.trim()) errors.codigo = 'El código del proyecto es obligatorio.';
  else if (form.codigo.trim().length < 5 || form.codigo.trim().length > 12)
    errors.codigo = 'El código debe tener entre 5 y 12 caracteres.';
  if (!form.nombre.trim()) errors.nombre = 'El nombre es obligatorio.';
  else if (form.nombre.trim().length > 150) errors.nombre = 'El nombre no puede superar los 150 caracteres.';
  return errors;
}

function validateLocation(form: ProjectFormValues, rows: Ubigeo[]): ProjectFormErrors {
  const errors: ProjectFormErrors = {};
  if (normalizeLocation(form.pais) !== 'PERU') errors.pais = 'El país debe ser Perú.';
  if (![form.departamento, form.provincia, form.distrito].some((value) => value.trim())) return errors;
  for (const field of ['departamento', 'provincia', 'distrito'] as const) {
    const options = locationOptions(rows, form, field);
    if (!form[field].trim() || !options.some((value) => normalizeLocation(value) === normalizeLocation(form[field])))
      errors[field] = `Selecciona ${field === 'provincia' ? 'una provincia válida' : `un ${field} válido`} de la lista.`;
  }
  return errors;
}

/** Valida el formulario completo para crear o editar, incluyendo ubicación y fechas. */
export function validateProjectForm(form: ProjectFormValues, rows: Ubigeo[]): ProjectFormErrors {
  return { ...validateIdentity(form), ...validateProjectNumbers(form), ...validateLocation(form, rows), ...validateProjectDates(form) };
}
