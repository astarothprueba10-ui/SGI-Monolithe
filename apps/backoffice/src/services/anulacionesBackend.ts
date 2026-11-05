import { coreApi } from '../lib/apiClient';
import { supabase } from '../lib/supabase';

export type TipoOperacion = 'VENTA' | 'SEPARACION';
export type EstadoSolicitud =
  | 'SOLICITADA' | 'EN_REVISION' | 'PENDIENTE_FINANZAS' | 'PENDIENTE_LEGAL'
  | 'APROBADA' | 'RECHAZADA' | 'EJECUTADA' | 'CANCELADA';
export type ResultadoRevision = 'CONFORME' | 'OBSERVADA' | 'NO_PROCEDE';
export type AccionGerencia =
  'INICIAR_REVISION' | 'DERIVAR_FINANZAS' | 'DERIVAR_LEGAL' | 'APROBAR' | 'RECHAZAR';
export type CategoriaMotivo =
  'DESISTIMIENTO_CLIENTE' | 'MUTUO_ACUERDO' | 'ERROR_COMERCIAL' | 'INCUMPLIMIENTO' | 'OTRO';
export type TipoDocumentoLegal =
  'INFORME_LEGAL' | 'ACUERDO_RESOLUCION' | 'CARTA_NOTARIAL' | 'OTRO_SUSTENTO';

export interface Pagina<T> {
  items: T[];
  total: number;
  pagina: number;
  tamano: number;
  paginas: number;
}
export interface SolicitudAnulacion {
  idSolicitud: number;
  tipoOperacion: TipoOperacion;
  idOperacion: number;
  codigoOperacion: string;
  codigoLote: string;
  categoriaMotivo: CategoriaMotivo;
  motivo: string;
  estado: EstadoSolicitud;
  requiereRevisionFinanciera: boolean;
  requiereRevisionLegal: boolean;
  idUsuarioSolicitante: number;
  idUsuarioDecision: number | null;
  idUsuarioEjecucion: number | null;
  justificacionDecision: string | null;
  fechaSolicitud: string;
  fechaDecision: string | null;
  fechaEjecucion: string | null;
  version: number;
}
export interface EventoAnulacion {
  idHistorial: number;
  idSolicitud: number;
  tipoOperacion: TipoOperacion;
  idOperacion: number;
  codigoOperacion: string;
  codigoLote: string;
  evento: string;
  origen: string;
  idUsuarioActor: number | null;
  motivo: string | null;
  estadosAntes: Record<string, unknown> | null;
  estadosDespues: Record<string, unknown> | null;
  fechaEvento: string;
}
export interface CasoLegal {
  idSolicitud: number;
  idVenta: number;
  codigoOperacion: string;
  categoriaMotivo: string;
  motivo: string;
  estado: 'PENDIENTE_LEGAL';
  version: number;
  requiereRevisionFinanciera: boolean;
  documentosRegistrados: number;
  ultimaRevisionLegal: string | null;
  fechaSolicitud: string;
}
export interface EvidenciaLegal {
  idEvidencia: number;
  idSolicitud: number;
  tipoDocumento: TipoDocumentoLegal;
  nombreOriginal: string;
  tamanoBytes: number;
  fechaRegistro: string;
  idUsuarioRegistro: number;
  archivoDisponible: boolean;
}
export interface EvidenciasLegalesResponse {
  idSolicitud: number;
  estadoSolicitud: EstadoSolicitud;
  tipoOperacion: TipoOperacion;
  total: number;
  items: EvidenciaLegal[];
}
export interface ResultadoMutacion {
  success: boolean;
  idSolicitud: number;
  estadoSolicitud?: EstadoSolicitud;
  version?: number;
  mensaje?: string;
  estado?: string;
  idEvidencia?: number;
}

interface EnlaceCargaLegal {
  bucket: string;
  claveArchivo: string;
  urlCarga: string;
  tipoMime: string;
  maxBytes: number;
  expiresInSeconds: number;
}
export interface EnlaceLecturaLegal {
  idSolicitud: number;
  idEvidencia: number;
  nombreOriginal: string;
  urlLectura: string;
  expiresInSeconds: number;
}

const bucketLegal = 'anulaciones-legales-private';
const maxBytes = 10 * 1024 * 1024;
const rutaBase = '/crm/anulaciones';
const esId = (id: number) => Number.isSafeInteger(id) && id > 0;
const query = (filtros: Record<string, string | number | undefined>) => {
  const p = new URLSearchParams();
  Object.entries(filtros).forEach(([k, v]) => {
    if (v !== undefined && v !== '') p.set(k, String(v));
  });
  const t = p.toString();
  return t ? `?${t}` : '';
};

function validarUrlPrivada(raw: string, idSolicitud: number, operacion: 'upload' | 'sign'): URL {
  let url: URL;
  try { url = new URL(raw); } catch { throw new Error('Enlace privado inválido.'); }
  const configurada = import.meta.env.VITE_SUPABASE_URL;
  if (!configurada) throw new Error('Falta configurar VITE_SUPABASE_URL.');
  const origin = new URL(configurada).origin;
  const modo = operacion === 'upload' ? 'upload/sign' : 'sign';
  const prefijo = `/storage/v1/object/${modo}/${bucketLegal}/expedientes/${idSolicitud}/`;
  const uuidPdf = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.pdf$/;
  if (url.origin !== origin || url.username || url.password || !url.pathname.startsWith(prefijo) ||
      !uuidPdf.test(url.pathname.slice(prefijo.length)) ||
      !url.searchParams.has('token') || Array.from(url.searchParams.keys()).length !== 1 || url.hash) {
    throw new Error('El enlace no corresponde al Storage privado autorizado.');
  }
  return url;
}

export const anulacionesBackend = {
  solicitar: (body: { tipoOperacion: TipoOperacion; idOperacion: number;
    categoriaMotivo: CategoriaMotivo; motivo: string }) =>
    coreApi.post<ResultadoMutacion>(`${rutaBase}/solicitudes`, body),

  listar: (params: {tipo?: string; estado?: string; busqueda?: string; pagina?: number; tamano?: number} = {}) =>
    coreApi.get<Pagina<SolicitudAnulacion>>(`${rutaBase}/solicitudes${query(params)}`),

  historial: (params: {tipo?: string; idOperacion?: number; pagina?: number; tamano?: number} = {}) =>
    coreApi.get<Pagina<EventoAnulacion>>(`${rutaBase}/historial${query(params)}`),

  decidir: (idSolicitud: number, body: {versionEsperada: number; accion: AccionGerencia; justificacion: string}) =>
    coreApi.post<ResultadoMutacion>(`${rutaBase}/solicitudes/${idSolicitud}/decision`, body),

  revisarFinanzas: (idSolicitud: number, body: {versionEsperada: number; resultado: ResultadoRevision; sustento: string}) =>
    coreApi.post<ResultadoMutacion>(`${rutaBase}/solicitudes/${idSolicitud}/revision-financiera`, body),

  listarCasosLegales: (pagina = 1, tamano = 20) =>
    coreApi.get<Pagina<CasoLegal>>(`${rutaBase}/revision-legal/pendientes${query({pagina,tamano})}`),

  revisarLegal: (idSolicitud: number, body: {versionEsperada: number; resultado: ResultadoRevision;
    sustento: string; idEvidencia: number | null}) =>
    coreApi.post<ResultadoMutacion>(`${rutaBase}/${idSolicitud}/revision-legal`, body),

  evidencias: (idSolicitud: number) =>
    coreApi.get<EvidenciasLegalesResponse>(`${rutaBase}/${idSolicitud}/evidencias-legales`),

  prepararLectura: async (idSolicitud: number, idEvidencia: number): Promise<EnlaceLecturaLegal> => {
    if (!esId(idSolicitud) || !esId(idEvidencia)) throw new Error('Expediente inválido.');
    const r = await coreApi.post<EnlaceLecturaLegal>(
      `${rutaBase}/${idSolicitud}/evidencias-legales/${idEvidencia}/preparar-lectura`);
    if (r.idSolicitud !== idSolicitud || r.idEvidencia !== idEvidencia || r.expiresInSeconds > 120) {
      throw new Error('Enlace de lectura inconsistente.');
    }
    validarUrlPrivada(r.urlLectura, idSolicitud, 'sign');
    return r;
  },

  subirEvidencia: async (idSolicitud: number, tipoDocumento: TipoDocumentoLegal, archivo: File) => {
    if (!esId(idSolicitud)) throw new Error('Solicitud inválida.');
    if (archivo.type !== 'application/pdf' || !/\.pdf$/i.test(archivo.name)
        || archivo.name.length > 240 || /[/\\]/.test(archivo.name)) {
      throw new Error('Selecciona un PDF con nombre válido (máx. 240 caracteres).');
    }
    if (!archivo.size || archivo.size > maxBytes || (await archivo.slice(0, 5).text()) !== '%PDF-') {
      throw new Error('El documento debe ser PDF y pesar como máximo 10 MB.');
    }
    const carga = await coreApi.post<EnlaceCargaLegal>(
      `${rutaBase}/${idSolicitud}/evidencias-legales/preparar-carga`);
    const prefijo = `expedientes/${idSolicitud}/`;
    if (carga.bucket !== bucketLegal || carga.tipoMime !== 'application/pdf' ||
        carga.maxBytes !== maxBytes || !carga.claveArchivo.startsWith(prefijo) ||
        !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.pdf$/.test(carga.claveArchivo.slice(prefijo.length))) {
      throw new Error('La respuesta de carga no coincide con el expediente.');
    }
    const url = validarUrlPrivada(carga.urlCarga, idSolicitud, 'upload');
    const token = url.searchParams.get('token');
    if (!token) throw new Error('Token de carga ausente.');
    const { error } = await supabase.storage.from(bucketLegal).uploadToSignedUrl(
      carga.claveArchivo, token, archivo, { contentType: 'application/pdf', upsert: false });
    if (error) throw new Error(`No fue posible subir el PDF: ${error.message}`);
    const r = await coreApi.post<ResultadoMutacion>(
      `${rutaBase}/${idSolicitud}/evidencias-legales`,
      { tipoDocumento, claveArchivo: carga.claveArchivo, nombreOriginal: archivo.name });
    if (!r.success) throw new Error(r.mensaje || 'El documento fue cargado, pero no se confirmó su registro.');
    return r;
  }
};
