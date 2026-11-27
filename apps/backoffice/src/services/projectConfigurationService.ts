import { coreApi } from '../lib/apiClient';
import type { ConfiguracionComercial, ConfiguracionProyectoResponse, SimulacionComercialResponse, PublicacionComercialResponse, GestionComercialResponse, EventoComercial, TarifaComercial, ReglaEtapaComercial } from '../types/projectConfiguration';

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
    return coreApi.get<{ version: number; lotesRegistrados: number; importacionRealizada: number }>(`${ruta(idProyecto)}/publicacion`);
  },
  revisarPublicacion(idProyecto: number, version: number, etapasHabilitar: string[]) {
    return coreApi.post<PublicacionComercialResponse>(`${ruta(idProyecto)}/publicacion/validar`, { version, etapasHabilitar });
  },
  publicar(idProyecto: number, version: number, etapasHabilitar: string[], huella: string) {
    return coreApi.post<PublicacionComercialResponse>(`${ruta(idProyecto)}/publicacion`, { version, etapasHabilitar, huella });
  },
  gestion(idProyecto: number) {
    return coreApi.get<GestionComercialResponse>(`${ruta(idProyecto)}/gestion`);
  },
  historial(idProyecto: number) {
    return coreApi.get<EventoComercial[]>(`${ruta(idProyecto)}/gestion/historial`);
  },
  guardarDisponibilidad(idProyecto: number, revision: number, etapasHabilitadas: string[]) {
    return coreApi.put<GestionComercialResponse>(`${ruta(idProyecto)}/gestion/disponibilidad`, { revision, etapasHabilitadas });
  },
  guardarEtapas(idProyecto: number, revision: number, etapas: ReglaEtapaComercial[]) {
    return coreApi.put<GestionComercialResponse>(`${ruta(idProyecto)}/gestion/etapas`, { revision, etapas });
  },
  guardarTarifa(idProyecto: number, revision: number, tarifa: TarifaComercial) {
    return coreApi.put<GestionComercialResponse>(`${ruta(idProyecto)}/gestion/tarifa`, { revision, tarifa });
  },
  guardar(idProyecto: number, version: number, datos: ConfiguracionComercial) {
    return coreApi.put<ConfiguracionProyectoResponse>(ruta(idProyecto), { version, datos });
  }
};
