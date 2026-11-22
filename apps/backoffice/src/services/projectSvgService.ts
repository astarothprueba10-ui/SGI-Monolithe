import { coreApi } from '../lib/apiClient';
import type { PlanoSvgDocumento, PlanoSvgProyectoResponse } from '../types/projectSvg';
import type { ArchivoCadInfo } from '../types/projectSvg';

export const projectSvgService = {
  listarOriginales(proyecto: number): Promise<ArchivoCadInfo[]> {
    return coreApi.get<ArchivoCadInfo[]>(`/planos/proyecto/${proyecto}/archivos`);
  },
  subirOriginal(proyecto: number, archivo: File): Promise<ArchivoCadInfo> {
    const form = new FormData();
    form.append('archivo', archivo, archivo.name);
    return coreApi.post<ArchivoCadInfo>(`/planos/proyecto/${proyecto}/archivos`, form);
  },
  enlaceDescarga(proyecto: number, id: number): Promise<{url:string;caducaSegundos:number;nombre:string}> {
    return coreApi.get(`/planos/proyecto/${proyecto}/archivos/${id}/enlace`);
  },
  obtener(proyecto: number): Promise<PlanoSvgProyectoResponse | null> {
    return coreApi.get<PlanoSvgProyectoResponse | null>(`/planos/proyecto/${proyecto}/svg`);
  },
  guardar(proyecto: number, documento: PlanoSvgDocumento): Promise<PlanoSvgProyectoResponse> {
    return coreApi.put<PlanoSvgProyectoResponse>(`/planos/proyecto/${proyecto}/svg`, documento);
  }
};
