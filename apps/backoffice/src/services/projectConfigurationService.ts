import { commercialMutation } from './commercialMfaService';
import { coreApi } from '../lib/apiClient';
import type { ConfiguracionComercial, ConfiguracionProyectoResponse, SimulacionComercialResponse, PublicacionComercialResponse, GestionComercialResponse, EventoComercial, TarifaComercial, ReglaEtapaComercial, AlcanceMatriz } from '../types/projectConfiguration';

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
    return commercialMutation<PublicacionComercialResponse>(idProyecto,'PUBLICACION',`${ruta(idProyecto)}/publicacion`,'POST', { version, etapasHabilitar, huella });
  },
  gestion(idProyecto: number) {
    return coreApi.get<GestionComercialResponse>(`${ruta(idProyecto)}/gestion`);
  },
  historial(idProyecto: number) {
    return coreApi.get<EventoComercial[]>(`${ruta(idProyecto)}/gestion/historial`);
  },
  guardarDisponibilidad(idProyecto: number, revision: number, etapasHabilitadas: string[]) {
    return commercialMutation<GestionComercialResponse>(idProyecto,'DISPONIBILIDAD',`${ruta(idProyecto)}/gestion/disponibilidad`,'PUT', { revision, etapasHabilitadas });
  },
  guardarAsignacion(idProyecto: number, revision: number, tipo: 'manzanas'|'lotes', id: number, codigoEtapa: string) {
    return coreApi.put<GestionComercialResponse>(`${ruta(idProyecto)}/gestion/asignacion`, { revision, tipo, id, codigoEtapa });
  },
  guardarEtapas(idProyecto: number, revision: number, etapas: ReglaEtapaComercial[]) {
    return commercialMutation<GestionComercialResponse>(idProyecto,'ETAPAS',`${ruta(idProyecto)}/gestion/etapas`,'PUT', { revision, etapas });
  },
  guardarMatriz(idProyecto:number, revision:number, precioBase:number, recargos:Record<string,number>, vigenteDesde:string, vigenteHasta:string|null, alcance:AlcanceMatriz='GENERAL', codigoEtapa:string|null=null) {
    return commercialMutation<GestionComercialResponse>(idProyecto,'MATRIZ',`${ruta(idProyecto)}/gestion/matriz`,'PUT', {revision,precioBase,recargos,vigenteDesde,vigenteHasta,alcance,codigoEtapa});
  },
  guardarTarifa(idProyecto: number, revision: number, tarifa: TarifaComercial) {
    return commercialMutation<GestionComercialResponse>(idProyecto,'TARIFA',`${ruta(idProyecto)}/gestion/tarifa`,'PUT', { revision, tarifa });
  },
  guardar(idProyecto: number, version: number, datos: ConfiguracionComercial, confirmarEtapas = false) {
    if (confirmarEtapas) return commercialMutation<ConfiguracionProyectoResponse>(idProyecto,'ETAPAS',ruta(idProyecto),'PUT',{version,datos});
    return coreApi.put<ConfiguracionProyectoResponse>(ruta(idProyecto), { version, datos });
  }
};
