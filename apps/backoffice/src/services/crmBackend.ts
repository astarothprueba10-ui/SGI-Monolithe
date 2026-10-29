import { coreApi } from '../lib/apiClient';
import { supabase } from '../lib/supabase';

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

export type CrmAsesorPeriodo = CrmAdvisor & {
  asignaciones_periodo: number;
};

export interface CrmAsesoresPeriodo {
  total: number;
  items: CrmAsesorPeriodo[];
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

export interface CrmEvolucionMes {
  mes: string;
  leads: number;
  potenciales: number;
  compradores: number;
}

export interface CrmEvolucionMensual {
  items: CrmEvolucionMes[];
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

export interface CrmVisitaPeriodo extends CrmVisit {
  prospecto_codigo: string;
  prospecto_nombre: string;
  proyecto_nombre: string;
  asesor_nombre: string;
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
  direccion?: string;
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

export interface CrmSearchPeriodo extends CrmSearch {
  idProyecto?: number;
  desde: string;
  hastaExclusivo: string;
}

export interface CrmSaleValidationInput {
  idProspecto: number;
  idLote: number;
  modalidad: 'CONTADO' | 'FINANCIADA';
  montoTotal: number;
  montoInicial?: number | null;
  numeroCuotas?: number | null;
  observaciones?: string | null;
}

export interface CrmSaleValidationResult {
  elegible: boolean;
  idProspecto: number;
  codigoProspecto: string;
  idPersona: number;
  idAsesor: number;
  idLote: number;
  codigoLote: string;
  idProyecto: number;
  modalidad: 'CONTADO' | 'FINANCIADA';
  precioVigente: number;
  idMoneda: number;
  mensaje: string;
}

export interface CrmBuyerVerification {
  idProspecto: number;
  codigoProspecto: string;
  esComprador: boolean;
  mensaje: string;
  compra: {
    idCliente: number;
    codigoCliente: string;
    idVenta: number;
    codigoVenta: string;
    estadoVenta: string;
    idContrato: number;
    codigoContrato: string;
    estadoContrato: string;
    idLote: number;
    codigoLote: string;
    precioVenta: number;
    fechaVenta: string;
  } | null;
}

export interface CrmPendingSaleResult {
  success: boolean;
  idVenta: number;
  codigoVenta: string;
  idContrato: number;
  codigoContrato: string;
  idProspecto: number;
  idPersona: number;
  idAsesor: number;
  idLote: number;
  idProyecto: number;
  idPlanPago: number | null;
  codigoPlanPago: string | null;
  estadoVenta: 'PENDIENTE';
  estadoContrato: 'PENDIENTE_FIRMA';
  estadoLote: 'RESERVADO';
  esComprador: boolean;
  modalidad: 'CONTADO' | 'FINANCIADA';
  montoTotal: number;
  mensaje: string;
}

export interface CrmCancelPendingSaleResult {
  success: boolean;
  idVenta: number;
  codigoVenta: string;
  codigoContrato: string;
  estadoVenta: 'ANULADA';
  estadoContrato: 'ANULADO';
  estadoLote: 'DISPONIBLE' | 'RESERVADO';
  motivo: string;
  mensaje: string;
}

function qs(filters: Record<string, string | number | boolean | null | undefined>) {
  const p = new URLSearchParams();
  for (const [key, value] of Object.entries(filters)) {
    if (value !== null && value !== undefined && value !== '') p.set(key, String(value));
  }
  const query = p.toString();
  return query ? `?${query}` : '';
}


export interface CrmContractUpload {
  bucket: string;
  claveArchivo: string;
  urlCarga: string;
  tipoMime: string;
  maxBytes: number;
  expiresInSeconds: number;
}

export interface CrmContractEvidence {
  success: boolean;
  idContrato: number;
  idContratoArchivo: number;
  codigoArchivo: string;
  numeroVersion: number;
  claveArchivo: string;
  tamanoBytes: number;
  tipoMime: string;
  firmaValidada: boolean;
  contratoVigente: boolean;
  mensaje: string;
}


export interface CrmPendingContract {
  idContrato: number;
  codigoContrato: string;
  idVenta: number;
  codigoVenta: string;
  fechaVenta: string;
  montoVenta: number;
  idLote: number;
  codigoLote: string;
  idProyecto: number;
  nombreProyecto: string;
  comprador: string;
  estadoContrato: 'PENDIENTE_FIRMA';
  estadoVenta: 'PENDIENTE';
  tieneEvidencia: boolean;
  idArchivoVigente: number | null;
  nombreArchivoVigente: string | null;
}

export interface CrmPendingContractsPage {
  items: CrmPendingContract[];
  total: number;
  pagina: number;
  tamano: number;
}

export interface CrmContractReadUrl {
  idContrato: number;
  idContratoArchivo: number;
  nombreOriginal: string;
  urlLectura: string;
  expiresInSeconds: number;
}


export interface CrmAprobarFirmaRequest {
  idContratoArchivo: number;
  fechaFirma: string;
  firmaRevisada: boolean;
  observaciones: string;
}

export interface CrmAprobarFirmaResponse {
  success: boolean;
  idContrato: number;
  codigoContrato: string;
  idVenta: number;
  codigoVenta: string;
  idContratoArchivo: number;
  idAprobacion: number;
  idProspecto: number;
  idLote: number;
  estadoContrato: string;
  estadoVenta: string;
  estadoLote: string;
  esComprador: boolean;
  idPlanPago: number | null;
  cuotasGeneradas: number;
  mensaje: string;
}

export interface CrmFuentePeriodo {
  codigo: string;
  nombre: string;
  total: number;
  activos: number;
  convertidos: number;
  participacion: number;
}

export interface CrmFuentesPeriodo {
  total: number;
  items: CrmFuentePeriodo[];
}


export const crmBackend = {
  catalogos: () => coreApi.get<CrmCatalogs>('/crm/catalogos'),
  resumen: () => coreApi.get<CrmSummary>('/crm/resumen'),

  resumenPeriodo: (desde: string, hastaExclusivo: string) =>
    coreApi.get<CrmSummary>(
      `/crm/resumen/periodo${qs({
        desde,
        hastaExclusivo
      })}`
    ),

  evolucionMensual: (desde: string, hastaExclusivo: string) =>
    coreApi.get<CrmEvolucionMensual>(
      `/crm/evolucion-mensual${qs({
        desde,
        hastaExclusivo
      })}`
    ),

  asesores: () => coreApi.get<CrmAdvisor[]>('/crm/asesores'),
  prospectos: () => coreApi.get<CrmProspect[]>('/crm/prospectos'),
  buscar: (f: CrmSearch) => coreApi.get<CrmPage<CrmProspect>>(`/crm/prospectos/buscar${qs({
    consulta: f.consulta?.trim(), etapa: f.etapa, origen: f.origen,
    idAsesor: f.idAsesor, sinAsignar: f.sinAsignar,
    categoria: f.categoria ?? 'TODOS', pagina: f.pagina ?? 1, tamano: f.tamano ?? 20
  })}`),

  buscarPeriodo: (f: CrmSearchPeriodo) =>
    coreApi.get<CrmPage<CrmProspect>>(
      `/crm/prospectos/buscar-periodo${qs({
        consulta: f.consulta?.trim(),
        etapa: f.etapa,
        origen: f.origen,
        idAsesor: f.idAsesor,
        sinAsignar: f.sinAsignar,
        categoria: f.categoria ?? 'TODOS',
        pagina: f.pagina ?? 1,
        tamano: f.tamano ?? 20,
        idProyecto: f.idProyecto,
        desde: f.desde,
        hastaExclusivo: f.hastaExclusivo
      })}`
    ),

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

  compradoresPeriodo: (
    consulta: string | undefined,
    pagina: number,
    tamano: number,
    desde: string,
    hastaExclusivo: string
  ) =>
    coreApi.get<CrmPage<CrmBuyer>>(
      `/crm/compradores/periodo${qs({
        consulta: consulta?.trim(),
        pagina,
        tamano,
        desde,
        hastaExclusivo
      })}`
    ),

  fuentesPeriodo: (
    desde: string,
    hastaExclusivo: string
  ) =>
    coreApi.get<CrmFuentesPeriodo>(
      `/crm/fuentes/periodo${qs({
        desde,
        hastaExclusivo
      })}`
    ),

  asesoresPeriodo: (
    desde: string,
    hastaExclusivo: string
  ) =>
    coreApi.get<CrmAsesoresPeriodo>(
      `/crm/asesores/periodo${qs({
        desde,
        hastaExclusivo
      })}`
    ),

  validarVenta: (body: CrmSaleValidationInput) =>
    coreApi.post<CrmSaleValidationResult>(
      '/crm/ventas/validar',
      {
        idProspecto: body.idProspecto,
        idLote: body.idLote,
        modalidad: body.modalidad,
        montoTotal: body.montoTotal,
        montoInicial: body.montoInicial ?? null,
        numeroCuotas: body.numeroCuotas ?? null,
        observaciones: body.observaciones ?? null
      }
    ),

  registrarVentaPendiente: (body: CrmSaleValidationInput) =>
    coreApi.post<CrmPendingSaleResult>(
      '/crm/ventas/pendientes',
      {
        idProspecto: body.idProspecto,
        idLote: body.idLote,
        modalidad: body.modalidad,
        montoTotal: body.montoTotal,
        montoInicial: body.montoInicial ?? null,
        numeroCuotas: body.numeroCuotas ?? null,
        observaciones: body.observaciones ?? null
      }
    ),
  cancelarVentaPendiente: (
    idVenta: number,
    motivo: string
  ) =>
    coreApi.post<CrmCancelPendingSaleResult>(
      `/crm/ventas/${idVenta}/cancelar`,
      { motivo: motivo.trim() }
    ),
  verificarCompra: (idProspecto: number) =>
    coreApi.get<CrmBuyerVerification>(
      `/crm/prospectos/${idProspecto}/verificar-compra`
    ),
  listarContratosPendientes: (
    busqueda = '',
    pagina = 1,
    tamano = 20
  ): Promise<CrmPendingContractsPage> =>
    coreApi.get<CrmPendingContractsPage>(
      `/crm/contratos/pendientes${qs({
        busqueda: busqueda.trim(),
        pagina,
        tamano
      })}`
    ),

  aprobarFirmaContrato: (
    idContrato: number,
    body: CrmAprobarFirmaRequest
  ) =>
    coreApi.post<CrmAprobarFirmaResponse>(
      `/crm/contratos/${idContrato}/aprobar-firma`,
      {
        idContratoArchivo: body.idContratoArchivo,
        fechaFirma: body.fechaFirma,
        firmaRevisada: body.firmaRevisada,
        observaciones: body.observaciones
      }
    ),

  visitas: (idProspecto: number) => coreApi.get<CrmVisit[]>(`/crm/prospectos/${idProspecto}/visitas`),

  visitasPeriodo: (desde: string, hastaExclusivo: string, idProspecto?: number, pagina = 1, tamano = 15) =>
    coreApi.get<CrmPage<CrmVisitaPeriodo>>(`/crm/visitas/periodo${qs({ desde, hastaExclusivo, idProspecto, pagina, tamano })}`),
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
  prepararLecturaContrato: (
    idContrato: number,
    idContratoArchivo: number
  ) =>
    coreApi.post<CrmContractReadUrl>(
      `/crm/contratos/${idContrato}/evidencias/${idContratoArchivo}/preparar-lectura`
    ),

  subirEvidenciaContrato: async (
    idContrato: number,
    archivo: File
  ): Promise<CrmContractEvidence> => {

    const maxBytes = 10 * 1024 * 1024;

    if (!Number.isSafeInteger(idContrato) || idContrato <= 0) {
      throw new Error('El contrato seleccionado no es válido.');
    }

    if (
      archivo.type !== 'application/pdf' ||
      !/\.pdf$/i.test(archivo.name)
    ) {
      throw new Error('Solo se permiten documentos PDF.');
    }

    if (archivo.size <= 0 || archivo.size > maxBytes) {
      throw new Error('El PDF debe tener un tamaño máximo de 10 MB.');
    }

    const cabecera = await archivo.slice(0, 5).text();

    if (cabecera !== '%PDF-') {
      throw new Error('El archivo no tiene una cabecera PDF válida.');
    }

    const carga = await coreApi.post<CrmContractUpload>(
      `/crm/contratos/${idContrato}/evidencias/preparar-carga`
    );

    if (
      carga.bucket !== 'contratos-firmados-private' ||
      carga.tipoMime !== 'application/pdf' ||
      carga.maxBytes !== maxBytes ||
      !carga.claveArchivo.startsWith(`contratos/${idContrato}/`)
    ) {
      throw new Error('La configuración de carga no es válida.');
    }

    const token = new URL(carga.urlCarga).searchParams.get('token');

    if (!token) {
      throw new Error('No se recibió un token válido de carga.');
    }

    const { error } = await supabase.storage
      .from(carga.bucket)
      .uploadToSignedUrl(
        carga.claveArchivo,
        token,
        archivo,
        {
          contentType: 'application/pdf',
          upsert: false
        }
      );

    if (error) {
      throw new Error(
        `No se pudo subir el documento: ${error.message}`
      );
    }

    return coreApi.post<CrmContractEvidence>(
      `/crm/contratos/${idContrato}/evidencias`,
      {
        claveArchivo: carga.claveArchivo,
        nombreOriginal: archivo.name
      }
    );
  },

};
