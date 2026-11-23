import { coreApi } from '../lib/apiClient';
import type { SolicitudImportacion, RespuestaImportacion } from '../types/projectImport';

export const projectImportService = {
  validar(id: number, solicitud: SolicitudImportacion) {
    return coreApi.post<RespuestaImportacion>(`/proyectos/${id}/importacion/validar`, { ...solicitud });
  },
  confirmar(id: number, solicitud: SolicitudImportacion, huella: string) {
    return coreApi.post<RespuestaImportacion>(`/proyectos/${id}/importacion/confirmar`, { ...solicitud, huella });
  }
};
