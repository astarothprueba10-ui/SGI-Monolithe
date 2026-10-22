import { coreApi } from '../lib/apiClient';
import type { Ubigeo } from '../types/projectForm';

let catalog: Promise<Ubigeo[]> | undefined;

/** Comparte el catálogo local del servidor y permite reintentar después de un error de red. */
export function getUbigeos(): Promise<Ubigeo[]> {
  catalog ??= coreApi.get<Ubigeo[]>('/ubigeos').catch((error: unknown) => {
    catalog = undefined;
    throw error;
  });
  return catalog;
}
