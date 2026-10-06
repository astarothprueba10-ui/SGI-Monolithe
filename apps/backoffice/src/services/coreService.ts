import { coreApi } from '../lib/apiClient';
import type {
  ProyectoResponse,
  ProyectoRequest,
  EtapaResponse,
  EtapaRequest,
  ZonaResponse,
  ZonaRequest,
  ManzanaResponse,
  ManzanaRequest,
  LoteResponse,
  LoteRequest,
  CatalogoResponse,
  EstadoLoteResponse,
  MonedaResponse,
  LoteFiltroRequest,
  CambiarEstadoLoteRequest,
  CambioEstadoLoteResponse,
  LoteHistorialEstadoResponse,
  PlanoInteractivoResponse,
  PlanoInteractivoDetalleResponse,
  PlanoInteractivoRequest,
  LoteGeometriaResponse,
  LoteGeometriaRequest
} from '../types/core';

function buildLotSearchParams(filters: LoteFiltroRequest): string {
  const params = new URLSearchParams();
  if (filters.idProyecto !== undefined && filters.idProyecto !== null) {
    params.append('idProyecto', String(filters.idProyecto));
  }
  if (filters.idEtapa !== undefined && filters.idEtapa !== null) {
    params.append('idEtapa', String(filters.idEtapa));
  }
  if (filters.idZona !== undefined && filters.idZona !== null) {
    params.append('idZona', String(filters.idZona));
  }
  if (filters.idManzana !== undefined && filters.idManzana !== null) {
    params.append('idManzana', String(filters.idManzana));
  }
  if (filters.idEstadoLote !== undefined && filters.idEstadoLote !== null) {
    params.append('idEstadoLote', String(filters.idEstadoLote));
  }
  if (filters.idTipoLote !== undefined && filters.idTipoLote !== null) {
    params.append('idTipoLote', String(filters.idTipoLote));
  }
  if (filters.texto !== undefined && filters.texto !== null && filters.texto.trim() !== '') {
    params.append('texto', filters.texto.trim());
  }
  if (filters.areaMin !== undefined && filters.areaMin !== null) {
    params.append('areaMin', String(filters.areaMin));
  }
  if (filters.areaMax !== undefined && filters.areaMax !== null) {
    params.append('areaMax', String(filters.areaMax));
  }
  if (filters.activo !== undefined && filters.activo !== null) {
    params.append('activo', String(filters.activo));
  }
  const str = params.toString();
  return str ? `/lotes/buscar?${str}` : '/lotes/buscar';
}

export const coreService = {
  // Proyectos
  getProjects(): Promise<ProyectoResponse[]> {
    return coreApi.get<ProyectoResponse[]>('/proyectos');
  },
  getActiveProjects(): Promise<ProyectoResponse[]> {
    return coreApi.get<ProyectoResponse[]>('/proyectos/activos');
  },
  getProjectById(idProyecto: number): Promise<ProyectoResponse> {
    return coreApi.get<ProyectoResponse>(`/proyectos/${idProyecto}`);
  },
  createProject(data: ProyectoRequest): Promise<ProyectoResponse> {
    return coreApi.post<ProyectoResponse>('/proyectos', data);
  },
  updateProject(idProyecto: number, data: ProyectoRequest): Promise<ProyectoResponse> {
    return coreApi.put<ProyectoResponse>(`/proyectos/${idProyecto}`, data);
  },

  // Etapas
  getStagesByProject(idProyecto: number): Promise<EtapaResponse[]> {
    return coreApi.get<EtapaResponse[]>(`/etapas/proyecto/${idProyecto}`);
  },
  getActiveStagesByProject(idProyecto: number): Promise<EtapaResponse[]> {
    return coreApi.get<EtapaResponse[]>(`/etapas/proyecto/${idProyecto}/activas`);
  },
  getStageById(idEtapa: number): Promise<EtapaResponse> {
    return coreApi.get<EtapaResponse>(`/etapas/${idEtapa}`);
  },
  createStage(data: EtapaRequest): Promise<EtapaResponse> {
    return coreApi.post<EtapaResponse>('/etapas', data);
  },
  updateStage(idEtapa: number, data: EtapaRequest): Promise<EtapaResponse> {
    return coreApi.put<EtapaResponse>(`/etapas/${idEtapa}`, data);
  },

  // Zonas
  getZonesByProject(idProyecto: number): Promise<ZonaResponse[]> {
    return coreApi.get<ZonaResponse[]>(`/zonas/proyecto/${idProyecto}`);
  },
  getActiveZonesByProject(idProyecto: number): Promise<ZonaResponse[]> {
    return coreApi.get<ZonaResponse[]>(`/zonas/proyecto/${idProyecto}/activas`);
  },
  getZoneById(idZona: number): Promise<ZonaResponse> {
    return coreApi.get<ZonaResponse>(`/zonas/${idZona}`);
  },
  createZone(data: ZonaRequest): Promise<ZonaResponse> {
    return coreApi.post<ZonaResponse>('/zonas', data);
  },
  updateZone(idZona: number, data: ZonaRequest): Promise<ZonaResponse> {
    return coreApi.put<ZonaResponse>(`/zonas/${idZona}`, data);
  },

  // Manzanas
  getBlocksByStage(idEtapa: number): Promise<ManzanaResponse[]> {
    return coreApi.get<ManzanaResponse[]>(`/manzanas/etapa/${idEtapa}`);
  },
  getActiveBlocksByStage(idEtapa: number): Promise<ManzanaResponse[]> {
    return coreApi.get<ManzanaResponse[]>(`/manzanas/etapa/${idEtapa}/activas`);
  },
  getBlockById(idManzana: number): Promise<ManzanaResponse> {
    return coreApi.get<ManzanaResponse>(`/manzanas/${idManzana}`);
  },
  createBlock(data: ManzanaRequest): Promise<ManzanaResponse> {
    return coreApi.post<ManzanaResponse>('/manzanas', data);
  },
  updateBlock(idManzana: number, data: ManzanaRequest): Promise<ManzanaResponse> {
    return coreApi.put<ManzanaResponse>(`/manzanas/${idManzana}`, data);
  },

  // Lotes
  getLotsByBlock(idManzana: number): Promise<LoteResponse[]> {
    return coreApi.get<LoteResponse[]>(`/lotes/manzana/${idManzana}`);
  },
  getActiveLotsByBlock(idManzana: number): Promise<LoteResponse[]> {
    return coreApi.get<LoteResponse[]>(`/lotes/manzana/${idManzana}/activos`);
  },
  getLotById(idLote: number): Promise<LoteResponse> {
    return coreApi.get<LoteResponse>(`/lotes/${idLote}`);
  },
  searchLots(filters: LoteFiltroRequest = {}): Promise<LoteResponse[]> {
    return coreApi.get<LoteResponse[]>(buildLotSearchParams(filters));
  },
  createLot(data: LoteRequest): Promise<LoteResponse> {
    return coreApi.post<LoteResponse>('/lotes', data);
  },
  updateLot(idLote: number, data: LoteRequest): Promise<LoteResponse> {
    return coreApi.put<LoteResponse>(`/lotes/${idLote}`, data);
  },
  changeLotStatus(
    idLote: number,
    data: CambiarEstadoLoteRequest
  ): Promise<CambioEstadoLoteResponse> {
    return coreApi.patch<CambioEstadoLoteResponse>(
      `/lotes/${idLote}/estado`,
      data
    );
  },
  getLotStatusHistory(
    idLote: number
  ): Promise<LoteHistorialEstadoResponse[]> {
    return coreApi.get<LoteHistorialEstadoResponse[]>(
      `/lotes/${idLote}/historial-estados`
    );
  },

  // Catálogos
  getProjectStatuses(): Promise<CatalogoResponse[]> {
    return coreApi.get<CatalogoResponse[]>('/catalogos/estados-proyecto');
  },
  getStageStatuses(): Promise<CatalogoResponse[]> {
    return coreApi.get<CatalogoResponse[]>('/catalogos/estados-etapa');
  },
  getBlockStatuses(): Promise<CatalogoResponse[]> {
    return coreApi.get<CatalogoResponse[]>('/catalogos/estados-manzana');
  },
  getLotStatuses(): Promise<EstadoLoteResponse[]> {
    return coreApi.get<EstadoLoteResponse[]>('/catalogos/estados-lote');
  },
  getLotTypes(): Promise<CatalogoResponse[]> {
    return coreApi.get<CatalogoResponse[]>('/catalogos/tipos-lote');
  },
  getCurrencies(): Promise<MonedaResponse[]> {
    return coreApi.get<MonedaResponse[]>('/catalogos/monedas');
  },
  getTariffTypes(): Promise<CatalogoResponse[]> {
    return coreApi.get<CatalogoResponse[]>('/catalogos/tipos-tarifa');
  },
  getPriceAdjustmentTypes(): Promise<CatalogoResponse[]> {
    return coreApi.get<CatalogoResponse[]>('/catalogos/tipos-ajuste-precio');
  },

  // Planos Interactivos
  getPlansByProject(idProyecto: number): Promise<PlanoInteractivoResponse[]> {
    return coreApi.get<PlanoInteractivoResponse[]>(`/planos/proyecto/${idProyecto}`);
  },
  getCurrentPlan(idProyecto: number, idEtapa?: number): Promise<PlanoInteractivoResponse> {
    const query = idEtapa !== undefined && idEtapa !== null ? `?idEtapa=${idEtapa}` : '';
    return coreApi.get<PlanoInteractivoResponse>(`/planos/proyecto/${idProyecto}/vigente${query}`);
  },
  getCurrentPlanDetail(idProyecto: number, idEtapa?: number): Promise<PlanoInteractivoDetalleResponse> {
    const query = idEtapa !== undefined && idEtapa !== null ? `?idEtapa=${idEtapa}` : '';
    return coreApi.get<PlanoInteractivoDetalleResponse>(`/planos/proyecto/${idProyecto}/detalle-vigente${query}`);
  },
  createPlanVersion(data: PlanoInteractivoRequest): Promise<PlanoInteractivoResponse> {
    return coreApi.post<PlanoInteractivoResponse>('/planos', data);
  },
  saveLotGeometry(data: LoteGeometriaRequest): Promise<LoteGeometriaResponse> {
    return coreApi.put<LoteGeometriaResponse>('/planos/geometrias', data);
  },
  deleteLotGeometry(id: number): Promise<void> {
    return coreApi.delete<void>(`/planos/geometrias/${id}`);
  }
};
