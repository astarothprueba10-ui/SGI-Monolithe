import { coreApi } from '../lib/apiClient';
import type { PlanoSvgDocumento, PlanoSvgProyectoResponse } from '../types/projectSvg';

export const projectSvgService = {
  obtener(proyecto: number): Promise<PlanoSvgProyectoResponse | null> {
    return coreApi.get<PlanoSvgProyectoResponse | null>(`/planos/proyecto/${proyecto}/svg`);
  },
  guardar(proyecto: number, documento: PlanoSvgDocumento): Promise<PlanoSvgProyectoResponse> {
    return coreApi.put<PlanoSvgProyectoResponse>(`/planos/proyecto/${proyecto}/svg`, documento);
  }
};
