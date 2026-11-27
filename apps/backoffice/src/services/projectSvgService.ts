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
  eliminarOriginal(proyecto:number,id:number):Promise<{vistaEliminada:boolean}> {
    return coreApi.delete(`/planos/proyecto/${proyecto}/archivos/${id}`);
  },
  enlaceDescarga(proyecto: number, id: number): Promise<{url:string;caducaSegundos:number;nombre:string}> {
    return coreApi.get(`/planos/proyecto/${proyecto}/archivos/${id}/enlace`);
  },
  obtener(proyecto: number): Promise<PlanoSvgProyectoResponse | null> {
    return coreApi.get<PlanoSvgProyectoResponse | null>(`/planos/proyecto/${proyecto}/svg`);
  },
  guardarAsociaciones(proyecto:number, revision:string, cambios:{indice:number;codigoLote:string|null}[]):Promise<{fechaActualizacion:string}> {
    return coreApi.put(`/planos/proyecto/${proyecto}/svg/asociaciones`,{revision,cambios});
  },
  guardar(proyecto: number, documento: PlanoSvgDocumento): Promise<PlanoSvgProyectoResponse> {
    return coreApi.put<PlanoSvgProyectoResponse>(`/planos/proyecto/${proyecto}/svg`, {...documento});
  }
};
