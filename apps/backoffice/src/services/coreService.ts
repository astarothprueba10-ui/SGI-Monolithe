import { coreApi } from '../lib/apiClient';
import type {
  TrabajadorResponse,
  CatalogosTrabajadorResponse,
  ActualizarTrabajadorRequest,
  SolicitudCambioCorreoResponse,
  SolicitudCorreccionDocumentoRequest,
  SolicitudCorreccionDocumentoResponse,
  CorreccionDocumentalItem,
  ResolverCorreccionRequest,
  ProgramarSuspensionRequest,
  CesarTrabajadorRequest,
  SolicitarReincorporacionRequest,
  ListarReincorporacionesResponse,
  ResolverReincorporacionRequest,
  ResolverReincorporacionResponse,
  MetricasTrabajadoresResponse,
  ListarHistorialLaboralResponse
} from '../types/workers';
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
  LoteGeometriaRequest,
  UbicacionGeograficaResponse
} from '../types/core';

export type { UbicacionGeograficaResponse };

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

export interface PersonaIdentificadaResponse {
  idPersona: number;
  nombres: string;
  apellidoPaterno: string;
  apellidoMaterno: string | null;
  fechaNacimiento: string | null;
  documentoVerificado: boolean;
  correoElectronico: string | null;
  correoVerificado: boolean;
}

export const coreService = {
  // RECURSOS HUMANOS - TRABAJADORES
  getWorkers(): Promise<TrabajadorResponse[]> {
    return coreApi.get<TrabajadorResponse[]>('/trabajadores');
  },

  getWorker(idTrabajador: number): Promise<TrabajadorResponse> {
    return coreApi.get<TrabajadorResponse>(`/trabajadores/${idTrabajador}`);
  },

  updateWorker(
    idTrabajador: number,
    data: ActualizarTrabajadorRequest
  ): Promise<unknown> {
    return coreApi.put<unknown>(`/trabajadores/${idTrabajador}`, { ...data });
  },

  solicitarCambioCorreoTrabajador(
    idTrabajador: number,
    correoNuevo: string,
    motivo: string
  ): Promise<SolicitudCambioCorreoResponse> {
    return coreApi.post<SolicitudCambioCorreoResponse>(
      `/trabajadores/${idTrabajador}/solicitar-cambio-correo`,
      { correoNuevo, motivo }
    );
  },

  programarSuspension(
    idTrabajador: number,
    data: ProgramarSuspensionRequest
  ): Promise<unknown> {
    return coreApi.post<unknown>(
      `/trabajadores/${idTrabajador}/suspensiones`,
      { ...data }
    );
  },

  cesarTrabajador(
    idTrabajador: number,
    data: CesarTrabajadorRequest
  ): Promise<unknown> {
    return coreApi.post<unknown>(
      `/trabajadores/${idTrabajador}/cesar`,
      { ...data }
    );
  },

  solicitarReincorporacion(
    idTrabajador: number,
    data: SolicitarReincorporacionRequest
  ): Promise<unknown> {
    return coreApi.post<unknown>(
      `/trabajadores/${idTrabajador}/reincorporaciones`,
      { ...data }
    );
  },

  listarReincorporaciones(params?: {
    estado?: string;
    idTrabajador?: number;
  }): Promise<ListarReincorporacionesResponse> {
    const query = new URLSearchParams();
    if (params?.estado) query.set('estado', params.estado);
    if (params?.idTrabajador) query.set('idTrabajador', String(params.idTrabajador));
    const qs = query.toString();
    return coreApi.get<ListarReincorporacionesResponse>(
      qs ? `/reincorporaciones?${qs}` : '/reincorporaciones'
    );
  },

  resolverReincorporacion(
    idSolicitud: number,
    data: ResolverReincorporacionRequest
  ): Promise<ResolverReincorporacionResponse> {
    return coreApi.post<ResolverReincorporacionResponse>(
      `/reincorporaciones/${idSolicitud}/resolver`,
      { ...data }
    );
  },

  getWorkerCatalogs(): Promise<CatalogosTrabajadorResponse> {
    return coreApi.get<CatalogosTrabajadorResponse>(
      '/trabajadores/catalogos'
    );
  },

  getMetricasTrabajadores(): Promise<MetricasTrabajadoresResponse> {
    return coreApi.get<MetricasTrabajadoresResponse>('/trabajadores/metricas');
  },

  getHistorialTrabajadores(params?: {
    idTrabajador?: number;
    tipoEvento?: string;
    fechaDesde?: string;
    fechaHasta?: string;
  }): Promise<ListarHistorialLaboralResponse> {
    const query = new URLSearchParams();
    if (params?.idTrabajador) query.set('idTrabajador', String(params.idTrabajador));
    if (params?.tipoEvento && params.tipoEvento !== 'TODOS') query.set('tipoEvento', params.tipoEvento);
    if (params?.fechaDesde) query.set('fechaDesde', params.fechaDesde);
    if (params?.fechaHasta) query.set('fechaHasta', params.fechaHasta);
    const qs = query.toString();
    return coreApi.get<ListarHistorialLaboralResponse>(
      qs ? `/trabajadores/historial?${qs}` : '/trabajadores/historial'
    );
  },

  identifyWorkerPerson(
    idTipoDocumento: number,
    numeroDocumento: string
  ): Promise<PersonaIdentificadaResponse> {
    return coreApi.post<PersonaIdentificadaResponse>(
      '/trabajadores/identificar-persona',
      {
        idTipoDocumento,
        numeroDocumento
      }
    );
  },


  createWorker(data: Record<string, unknown>): Promise<unknown> {
    return coreApi.post<unknown>(
      '/trabajadores',
      { ...data }
    );
  },

  // CORRECCION DOCUMENTAL
  solicitarCorreccionDocumento(
    idTrabajador: number,
    data: SolicitudCorreccionDocumentoRequest
  ): Promise<SolicitudCorreccionDocumentoResponse> {
    return coreApi.post<SolicitudCorreccionDocumentoResponse>(
      `/correcciones-documento/trabajadores/${idTrabajador}`,
      { ...data }
    );
  },

  adjuntarEvidenciaCorreccion(
    idSolicitud: number,
    archivo: File
  ): Promise<unknown> {
    const formData = new FormData();
    formData.append('archivo', archivo);
    return coreApi.post<unknown>(
      `/correcciones-documento/${idSolicitud}/evidencia`,
      formData
    );
  },

  listarCorreccionesDocumentales(): Promise<CorreccionDocumentalItem[]> {
    return coreApi.get<CorreccionDocumentalItem[]>('/correcciones-documento');
  },

  obtenerDetalleCorreccionDocumental(
    idSolicitud: number
  ): Promise<CorreccionDocumentalItem> {
    return coreApi.get<CorreccionDocumentalItem>(
      `/correcciones-documento/${idSolicitud}`
    );
  },

  obtenerUrlFirmadaEvidencia(
    idSolicitud: number
  ): Promise<{ url: string }> {
    return coreApi.get<{ url: string }>(
      `/correcciones-documento/${idSolicitud}/evidencia/url-firmada`
    );
  },

  resolverCorreccionDocumental(
    idSolicitud: number,
    data: ResolverCorreccionRequest
  ): Promise<unknown> {
    return coreApi.post<unknown>(
      `/correcciones-documento/${idSolicitud}/resolver`,
      { ...data }
    );
  },

  // UBICACIONES GEOGRAFICAS
  getUbicaciones(padreId?: number | null): Promise<UbicacionGeograficaResponse[]> {
    const query = padreId !== undefined && padreId !== null ? `?padreId=${padreId}` : '';
    return coreApi.get<UbicacionGeograficaResponse[]>(`/ubicaciones${query}`);
  },

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
