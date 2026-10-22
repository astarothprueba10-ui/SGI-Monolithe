import type { ProyectoRequest, ProyectoResponse } from '../types/core';
import type { ProjectFormErrors, ProjectFormValues, Ubigeo } from '../types/projectForm';
import { resolveUbigeo } from './ubigeo';
import { validateProjectForm } from './projectFormValidation';
import { canChangeProjectNumber, isProjectNumberField, normalizeProjectNumber } from './projectNumberValidation';

const DEFAULTS: ProjectFormValues = {
  codigoEstadoProyecto: '', codigo: '', nombre: '', descripcion: '', direccion: '', ubicacionReferencia: '',
  departamento: '', provincia: '', distrito: '', pais: 'Perú', latitud: '', longitud: '', areaTotalM2: '',
  fechaInicio: '', fechaFinEstimada: '', activo: true
};
const OPTIONAL_TEXT = ['descripcion', 'direccion', 'ubicacionReferencia', 'departamento', 'provincia',
  'distrito', 'fechaInicio', 'fechaFinEstimada'] as const;
const DEPENDENCIES: Partial<Record<keyof ProjectFormValues, (keyof ProjectFormValues)[]>> = {
  departamento: ['provincia', 'distrito'], provincia: ['distrito'],
  fechaInicio: ['fechaFinEstimada'], fechaFinEstimada: ['fechaInicio']
};

/** Inicializa ambos modos sin reutilizar valores del proyecto abierto anteriormente. */
export function initialProjectForm(project?: ProyectoResponse | null): ProjectFormValues {
  const form = { ...DEFAULTS };
  for (const field of Object.keys(DEFAULTS) as (keyof ProjectFormValues)[]) {
    if (field !== 'activo' && field !== 'pais') form[field] = String(project?.[field] ?? DEFAULTS[field]);
  }
  return { ...form, activo: project?.activo ?? true };
}

/** Construye el contrato existente de la API con nombres oficiales y país fijo. */
export function projectRequest(form: ProjectFormValues, rows: Ubigeo[]): ProyectoRequest {
  const location = resolveUbigeo(rows, form);
  const values = { ...form, ...location };
  const optional = Object.fromEntries(OPTIONAL_TEXT.map((field) => [field, values[field].trim() || null]));
  return {
    ...optional, codigoEstadoProyecto: form.codigoEstadoProyecto.trim(), codigo: form.codigo.trim(),
    nombre: form.nombre.trim(), pais: 'Perú', activo: form.activo,
    latitud: form.latitud.trim() ? Number(form.latitud) : null,
    longitud: form.longitud.trim() ? Number(form.longitud) : null,
    areaTotalM2: form.areaTotalM2.trim() ? Number(form.areaTotalM2) : null
  };
}

/** Actualiza los errores relacionados sin borrar errores pendientes de otros campos. */
export function changeProjectField(form: ProjectFormValues, previous: ProjectFormErrors,
  field: keyof ProjectFormValues, value: string | boolean, rows: Ubigeo[]) {
  if (isProjectNumberField(field) && typeof value === 'string') {
    value = normalizeProjectNumber(value);
    if (!canChangeProjectNumber(field, form[field], value)) return { form, errors: previous };
  }
  const next = { ...form, [field]: value };
  const related = DEPENDENCIES[field] ?? [];
  if (field === 'departamento') next.provincia = '';
  if (field === 'departamento' || field === 'provincia') next.distrito = '';
  const errors = { ...previous, general: undefined };
  const validated = validateProjectForm(next, rows);
  for (const key of [field, ...related]) errors[key] = validated[key];
  return { form: next, errors };
}
