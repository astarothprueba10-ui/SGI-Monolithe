import { coreApi } from '../lib/apiClient';
import type { ConfiguracionComercial, ConfiguracionProyectoResponse, SimulacionComercialResponse } from '../types/projectConfiguration';

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
  guardar(idProyecto: number, version: number, datos: ConfiguracionComercial) {
    return coreApi.put<ConfiguracionProyectoResponse>(ruta(idProyecto), { version, datos });
  }
};
