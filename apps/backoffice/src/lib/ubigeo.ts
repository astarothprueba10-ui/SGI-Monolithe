import type { LocationField, ProjectFormValues, Ubigeo } from '../types/projectForm';

const collator = new Intl.Collator('es');

/** Compara nombres anteriores sin distinguir mayúsculas, tildes o espacios repetidos. */
export function normalizeLocation(value: string): string {
  return value.normalize('NFD').replace(/\p{M}/gu, '').trim().replace(/\s+/g, ' ').toUpperCase();
}

/** Obtiene los nombres oficiales disponibles dentro de los niveles seleccionados. */
export function locationOptions(rows: Ubigeo[], form: ProjectFormValues, field: LocationField): string[] {
  const matches = rows.filter((row) =>
    (field === 'departamento' || normalizeLocation(row.departamento) === normalizeLocation(form.departamento)) &&
    (field !== 'distrito' || normalizeLocation(row.provincia) === normalizeLocation(form.provincia))
  );
  return [...new Set(matches.map((row) => row[field]))].sort(collator.compare);
}

/** Resuelve el valor guardado a su escritura oficial sin ocultar valores desconocidos. */
export function locationValue(options: string[], value: string): string {
  return options.find((option) => normalizeLocation(option) === normalizeLocation(value)) ?? value;
}

/** Busca una combinación completa en el catálogo, respetando toda la jerarquía. */
export function resolveUbigeo(rows: Ubigeo[], form: ProjectFormValues): Ubigeo | undefined {
  return rows.find((row) => (['departamento', 'provincia', 'distrito'] as const)
    .every((field) => normalizeLocation(row[field]) === normalizeLocation(form[field])));
}
