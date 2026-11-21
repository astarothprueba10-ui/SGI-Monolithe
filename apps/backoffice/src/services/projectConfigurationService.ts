import { coreApi } from '../lib/apiClient';
import type { ConfiguracionComercial, ConfiguracionProyectoResponse, SimulacionComercialResponse, PublicacionComercialResponse } from '../types/projectConfiguration';

function ruta(idProyecto: number) {
  return `/proyectos/${idProyecto}/configuracion-comercial`;
}

export const projectConfigurationService = {
  obtener(idProyecto: number) {
    return coreApi.get<ConfiguracionProyectoResponse>(ruta(idProyecto));
  },
  simular(idProyecto: number, idLote: number, version: number, moneda: string) {
    return coreApi.get<SimulacionComercialResponse>(`${ruta(idProyecto)}/simulacion?idLote=${idLote}&version=${version}&moneda=${encodeURIComponent(moneda)}`);
  },
  versionPublicada(idProyecto: number) {
    return coreApi.get<{ version: number }>(`${ruta(idProyecto)}/publicacion`);
  },
  revisarPublicacion(idProyecto: number, version: number, habilitarNoDisponibles: boolean) {
    return coreApi.post<PublicacionComercialResponse>(`${ruta(idProyecto)}/publicacion/validar`, { version, habilitarNoDisponibles });
  },
  publicar(idProyecto: number, version: number, habilitarNoDisponibles: boolean, huella: string) {
    return coreApi.post<PublicacionComercialResponse>(`${ruta(idProyecto)}/publicacion`, { version, habilitarNoDisponibles, huella });
  },
  guardar(idProyecto: number, version: number, datos: ConfiguracionComercial) {
    return coreApi.put<ConfiguracionProyectoResponse>(ruta(idProyecto), { version, datos });
  }
};
