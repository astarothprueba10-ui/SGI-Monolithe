import { commercialMutation } from './commercialMfaService';
import { coreApi } from '../lib/apiClient';
import type { SolicitudImportacion, RespuestaImportacion } from '../types/projectImport';

export const projectImportService = {
  validar(id: number, solicitud: SolicitudImportacion) {
    return coreApi.post<RespuestaImportacion>(`/proyectos/${id}/importacion/validar`, { ...solicitud });
  },
  confirmar(id: number, solicitud: SolicitudImportacion, huella: string) {
    return commercialMutation<RespuestaImportacion>(id,'IMPORTACION',`/proyectos/${id}/importacion/confirmar`,'POST', { ...solicitud, huella });
  }
};
