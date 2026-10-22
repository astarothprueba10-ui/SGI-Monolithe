import type { ProyectoRequest, ProyectoResponse } from './core';

/** Valores editables del formulario de proyectos antes de convertirlos a la API. */
export type ProjectFormValues = {
  [Key in Exclude<keyof ProyectoRequest, 'activo'>]-?: string;
} & { activo: boolean };

/** Errores por campo, incluidos los errores generales de la API. */
export type ProjectFormErrors = Partial<Record<keyof ProjectFormValues | 'general', string>>;

/** Fila del catálogo UBIGEO oficial; el código conserva sus ceros iniciales. */
export interface Ubigeo {
  codigo: string;
  departamento: string;
  provincia: string;
  distrito: string;
}

/** Niveles dependientes de la ubicación peruana. */
export type LocationField = 'departamento' | 'provincia' | 'distrito';

/** Contrato del modal utilizado tanto para crear como para editar. */
export interface ProjectFormProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => Promise<void>;
  project?: ProyectoResponse | null;
}
