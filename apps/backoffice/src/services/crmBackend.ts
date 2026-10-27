/** CRM Sprint 3 — cliente HTTP exclusivo del Core Service. No utiliza Supabase JS directo. */
import { coreApi } from '../lib/apiClient';

export type CrmCategory = 'TODOS' | 'LEAD' | 'POTENCIAL' | 'COMPRADOR' | 'CERRADO';

export interface CrmProspect {
  id_prospecto: number;
  id_persona: number;
  codigo: string;
  nombre_completo: string;
  telefono: string;
  email: string;
  interes: string;
  origen_codigo: string;
  origen_nombre: string;
  estado_codigo: string;
  estado_nombre: string;
  categoria: Exclude<CrmCategory, 'TODOS'>;
  puntuacion: string;
  id_asesor: number | null;
  asesor_nombre: string;
  fecha_registro: string;
  ultimo_contacto: string;
  observaciones: string | null;
  numero_documento?: string;
  dni?: string;
}
export interface CrmPage<T> {
  items: T[];
  total: number;
  pagina: number;
  tamano: number;
  paginas?: number;
}
export interface CrmCatalogItem { id: number; codigo: string; nombre: string; final?: boolean }
export interface CrmProject extends CrmCatalogItem { distrito?: string | null; provincia?: string | null }
export interface CrmCatalogs {
  estados: CrmCatalogItem[];
  origenes: CrmCatalogItem[];
  tiposSeguimiento: CrmCatalogItem[];
  proyectos: CrmProject[];
  turnosVisita: string[];
  zonaHorariaVisitas: string;
}
export interface CrmAdvisor {
  id_asesor: number;
  codigo: string;
  nombre_completo: string;
  email: string;
  telefono: string;
  activo: boolean;
  leads_activos: number | string;
}
export interface CrmBuyer {
  id_cliente: number;
  codigo_cliente: string;
  nombre_completo: string;
  codigo_venta: string;
  codigo_contrato: string;
  estado_contrato: string;
  codigo_lote: string;
  precio_venta: number;
  fecha_venta: string;
}
export interface CrmSummary {
  total: number;
  leads: number;
  potenciales: number;
  compradores: number;
  cerrados: number;
  sinAsesor: number;
}
export interface CrmDetail {
  prospecto: CrmProspect;
  documentoPrincipal: { tipoCodigo: string; numero: string; verificado: boolean } | null;
  contactos: { tipoCodigo: string; valor: string; principal: boolean; verificado: boolean }[];
  intereses: { idInteres: number; idProyecto: number; proyecto: string }[];
  totalSeguimientos: number;
  totalVisitas: number;
  esComprador: boolean;
}
export interface CrmAssignment {
  id_asignacion: number;
  id_asesor: number;
  asesor_nombre: string;
  fecha_asignacion: string;
  fecha_fin: string | null;
  motivo_asignacion: string | null;
  motivo_cierre: string | null;
  vigente: boolean;
}
export interface CrmVisit {
  id_visita: number;
  fecha_visita: string;
  turno: string;
  estado: string;
  punto_encuentro: string;
  observaciones: string | null;
  id_prospecto: number;
  id_asesor: number;
  id_proyecto: number;
}

export interface CrmScheduleVisit {
  idProyecto: number;
  fechaVisita: string;
  turno: '11:00' | '15:00';
  puntoEncuentro?: string;
  observaciones?: string;
}

export interface CrmUpdateVisitStatus {
  estadoCodigo: 'CONFIRMADA' | 'REALIZADA' | 'CANCELADA';
  observaciones?: string;
}

export interface CrmFollowUpCreate {
  tipoCodigo: string;
  asunto: string;
  detalle: string;
  resultado?: string;
  requiereSeguimiento: boolean;
  fechaProximoSeguimiento?: string | null;
}

export interface CrmFollowUpItem {
  id_seguimiento: number;
  id_prospecto?: number;
  tipo_codigo?: string;
  tipo_nombre?: string;
  asunto: string;
  detalle?: string | null;
  resultado?: string | null;
  requiere_seguimiento?: boolean;
  fecha_proximo_seguimiento?: string | null;
  fecha_seguimiento?: string;
  usuario_nombre?: string;
  asesor_nombre?: string;
}

export interface CrmLeadCreate {
  idSolicitud: string;
  nombres: string;
  apellidoPaterno: string;
  apellidoMaterno?: string;
  correo: string;
  telefono: string;
  idProyecto: number;
  origenCodigo: string;
  motivoContacto: string;
  mensaje?: string;
  idAsesor?: number;
  idPersona?: number;
  tipoDocumento?: string;
  numeroDocumento?: string;
  [key: string]: unknown;
}

export interface CrmSearch {
  consulta?: string;
  etapa?: string;
  origen?: string;
  idAsesor?: number;
  sinAsignar?: boolean;
  categoria?: CrmCategory;
  pagina?: number;
  tamano?: number;
}

function qs(filters: Record<string, string | number | boolean | null | undefined>) {
  const p = new URLSearchParams();
  for (const [key, value] of Object.entries(filters)) {
    if (value !== null && value !== undefined && value !== '') p.set(key, String(value));
  }
  const query = p.toString();
  return query ? `?${query}` : '';
}

export const crmBackend = {
  catalogos: () => coreApi.get<CrmCatalogs>('/crm/catalogos'),
  resumen: () => coreApi.get<CrmSummary>('/crm/resumen'),
  asesores: () => coreApi.get<CrmAdvisor[]>('/crm/asesores'),
  prospectos: () => coreApi.get<CrmProspect[]>('/crm/prospectos'),
  buscar: (f: CrmSearch) => coreApi.get<CrmPage<CrmProspect>>(`/crm/prospectos/buscar${qs({
    consulta: f.consulta?.trim(), etapa: f.etapa, origen: f.origen,
    idAsesor: f.idAsesor, sinAsignar: f.sinAsignar,
    categoria: f.categoria ?? 'TODOS', pagina: f.pagina ?? 1, tamano: f.tamano ?? 20
  })}`),
  detalle: (id: number) => coreApi.get<CrmDetail>(`/crm/prospectos/${id}`),
  crear: (data: CrmLeadCreate) => coreApi.post<Record<string, unknown>>('/crm/prospectos', data as Record<string, unknown>),
  actualizar: (id: number, body: { origenCodigo?: string; observaciones?: string; idProyectoInteres?: number }) =>
    coreApi.patch<Record<string, unknown>>(`/crm/prospectos/${id}/ficha`, body as Record<string, unknown>),
  etapa: (id: number, estadoCodigo: string, observacion?: string) =>
    coreApi.patch<Record<string, unknown>>(`/crm/prospectos/${id}/etapa`, { estadoCodigo, observacion: observacion ?? null }),
  asesor: (id: number, idAsesor: number, motivo?: string) =>
    coreApi.put<Record<string, unknown>>(`/crm/prospectos/${id}/asesor`, { idAsesor, motivo: motivo ?? null }),
  desactivar: (id: number, motivo: string) => coreApi.delete<Record<string, unknown>>(
    `/crm/prospectos/${id}${qs({ motivo })}`),
  compradores: (consulta: string, pagina: number, tamano: number) =>
    coreApi.get<CrmPage<CrmBuyer>>(`/crm/compradores${qs({ consulta, pagina, tamano })}`),
  visitas: (idProspecto: number) => coreApi.get<CrmVisit[]>(`/crm/prospectos/${idProspecto}/visitas`),
  agendarVisita: (idProspecto: number, body: CrmScheduleVisit) =>
    coreApi.post<Record<string, unknown>>(`/crm/prospectos/${idProspecto}/visitas`, body as unknown as Record<string, unknown>),
  actualizarEstadoVisita: (idVisita: number, body: CrmUpdateVisitStatus) =>
    coreApi.patch<Record<string, unknown>>(`/crm/visitas/${idVisita}/estado`, body as unknown as Record<string, unknown>),
  registrarSeguimiento: (id: number, body: CrmFollowUpCreate) =>
    coreApi.post<Record<string, unknown>>(`/crm/prospectos/${id}/seguimientos`, body as unknown as Record<string, unknown>),
  listarSeguimientos: (id: number, limite = 100) =>
    coreApi.get<CrmFollowUpItem[]>(`/crm/prospectos/${id}/seguimientos?limite=${limite}`),
  exportarCsv: (consulta?: string, etapa?: string, categoria = 'TODOS', limite = 5000) =>
    coreApi.get<string>(`/crm/exportaciones/prospectos.csv${qs({ consulta, etapa, categoria, limite })}`),
  listarAsignaciones: (id: number) =>
    coreApi.get<CrmAssignment[]>(`/crm/prospectos/${id}/asignaciones`),
};
