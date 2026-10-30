import { cmsApi } from '../lib/apiClient';
import type { SeccionCmsPreview } from './cmsPreview';
import type { CambioTextoCms } from './cmsSlideDraft';
import { solicitudPublicacion, type PublicacionTextosRespuesta } from './cmsPublicacionTextos';

export interface BorradorCms {
  idBorrador: number;
  idPagina: number | null;
  idProyecto: number | null;
  tipoObjetivo: 'PAGINA' | 'VISIBILIDAD_PROYECTO';
  contenidoPendiente: Record<string, unknown>;
  revisionBase: number;
  revisionEdicion: number;
  estado: 'EN_EDICION' | 'PUBLICADO' | 'DESCARTADO';
}

export interface ProyectoVisibilidadCms {
  idProyecto: number;
  codigo: string;
  nombre: string;
  visiblePublico: boolean;
  revisionPublicada: number;
}

export interface PublicacionVisibilidadRespuesta {
  idHistorial: number;
  idBorrador: number;
  idProyecto: number;
  revisionAnterior: number;
  revisionNueva: number;
  visiblePublico: boolean;
}

const endpoint = '/cms/borradores';

export const webContentDraftService = {
  listar: () => cmsApi.get<BorradorCms[]>(endpoint),
  listarProyectosVisibilidad: () =>
    cmsApi.get<ProyectoVisibilidadCms[]>(`${endpoint}/visibilidades/proyectos`),
  crearVisibilidad: (idProyecto: number, visiblePublico: boolean) =>
    cmsApi.post<BorradorCms>(`${endpoint}/visibilidades`, { idProyecto, visiblePublico }),
  actualizarVisibilidad: (idBorrador: number, revisionEsperada: number, visiblePublico: boolean) =>
    cmsApi.put<BorradorCms>(`${endpoint}/${idBorrador}/visibilidades`, { revisionEsperada, visiblePublico }),
  descartarVisibilidad: (idBorrador: number, revisionEsperada: number) =>
    cmsApi.patch<BorradorCms>(`${endpoint}/${idBorrador}/visibilidades/descartar`, { revisionEsperada }),
  publicarVisibilidad: (borrador: BorradorCms) =>
    cmsApi.post<PublicacionVisibilidadRespuesta>(`${endpoint}/${borrador.idBorrador}/visibilidades/publicar`, {
      revisionEditorialEsperada: borrador.revisionEdicion,
      revisionPublicadaEsperada: borrador.revisionBase
    }),
  listarSecciones: (idPagina: number) =>
    cmsApi.get<SeccionCmsPreview[]>(`/cms/paginas/${idPagina}/secciones`),
  crearPagina: (idPagina: number, secciones: CambioTextoCms[]) =>
    cmsApi.post<BorradorCms>(`${endpoint}/paginas`, { idPagina, secciones }),
  actualizarPagina: (idBorrador: number, revisionEsperada: number, secciones: CambioTextoCms[]) =>
    cmsApi.put<BorradorCms>(`${endpoint}/${idBorrador}/paginas`, { revisionEsperada, secciones }),
  descartarPagina: (idBorrador: number, revisionEsperada: number) =>
    cmsApi.patch<BorradorCms>(`${endpoint}/${idBorrador}/paginas/descartar`, { revisionEsperada }),
  /** Publica los textos y fondos guardados del borrador, sin enviar datos del publicador. */
  publicarContenido: (borrador: BorradorCms) =>
    cmsApi.post<PublicacionTextosRespuesta>(
      `${endpoint}/${borrador.idBorrador}/paginas/publicar-contenido`,
      { ...solicitudPublicacion(borrador) }
    ),
  /** 3E.3: publica solo textos; nunca incluye idUsuario ni imágenes en el cuerpo. */
  publicarTextos: (borrador: BorradorCms) =>
    cmsApi.post<PublicacionTextosRespuesta>(
      `${endpoint}/${borrador.idBorrador}/paginas/publicar`, { ...solicitudPublicacion(borrador) }
    )
};
