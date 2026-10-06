// ---------------------------------------------------------------------------
// Tipos publicos -- mapean PaginaPublicResponse, SeccionPublicResponse, etc.
// ---------------------------------------------------------------------------

export interface MultimediaPublica {
  idMultimedia: number;
  idUsoMultimedia: number;
  usoMultimediaCodigo: string;
  codigo: string;
  nombre: string;
  descripcion?: string;
  claveArchivo?: string;
  urlExterna?: string;
  urlPublica?: string;
  tipoMime?: string;
  textoAlternativo?: string;
  anchoPx?: number;
  altoPx?: number;
  duracionSegundos?: number;
  orden: number;
}

export interface SeccionItemPublica {
  idSeccionItem: number;
  codigo: string;
  titulo?: string;
  subtitulo?: string;
  contenido?: string;
  textoEnlace?: string;
  urlEnlace?: string;
  configuracion?: string;
  orden: number;
  multimedia: MultimediaPublica[];
}

export interface SeccionPublica {
  idSeccion: number;
  idTipoSeccion: number;
  tipoSeccionCodigo: string;
  codigo: string;
  titulo?: string;
  subtitulo?: string;
  contenido?: string;
  configuracion?: string;
  orden: number;
  multimedia: MultimediaPublica[];
  items: SeccionItemPublica[];
}

export interface PaginaContenido {
  idPagina: number;
  codigo: string;
  slug: string;
  titulo: string;
  descripcion?: string;
  tituloSeo?: string;
  descripcionSeo?: string;
  orden: number;
  mostrarMenu: boolean;
  fechaPublicacion?: string;
  multimedia: MultimediaPublica[];
  secciones: SeccionPublica[];
}

// ---------------------------------------------------------------------------
// Tipos administrativos -- mapean entidades y requests del CMS protegido
// ---------------------------------------------------------------------------

export interface Pagina {
  idPagina: number;
  idEstadoPublicacion: number;
  idUsuarioRegistro?: number;
  idUsuarioPublicacion?: number;
  codigo: string;
  slug: string;
  titulo: string;
  descripcion?: string;
  tituloSeo?: string;
  descripcionSeo?: string;
  orden: number;
  mostrarMenu: boolean;
  activo: boolean;
  fechaPublicacion?: string;
}

export interface PaginaRequest {
  codigo: string;
  ruta: string;
  titulo: string;
  descripcion?: string;
  tituloSeo?: string;
  descripcionSeo?: string;
  orden?: number;
  mostrarMenu?: boolean;
}

export interface Seccion {
  idSeccion: number;
  idPagina: number;
  idTipoSeccion: number;
  idUsuarioRegistro?: number;
  codigo: string;
  titulo?: string;
  subtitulo?: string;
  contenido?: string;
  configuracion?: string;
  orden: number;
  visible: boolean;
  activo: boolean;
  fechaDesde?: string;
  fechaHasta?: string;
}

export interface SeccionRequest {
  idTipoSeccion: number;
  codigo: string;
  titulo?: string;
  subtitulo?: string;
  contenido?: string;
  configuracion?: string;
  orden?: number;
  visible?: boolean;
  fechaDesde?: string;
  fechaHasta?: string;
}

export interface SeccionItem {
  idSeccionItem: number;
  idSeccion: number;
  idUsuarioRegistro?: number;
  codigo: string;
  titulo?: string;
  subtitulo?: string;
  contenido?: string;
  textoEnlace?: string;
  urlEnlace?: string;
  configuracion?: string;
  orden: number;
  visible: boolean;
  activo: boolean;
  fechaDesde?: string;
  fechaHasta?: string;
}

export interface SeccionItemRequest {
  codigo: string;
  titulo?: string;
  subtitulo?: string;
  contenido?: string;
  textoEnlace?: string;
  urlEnlace?: string;
  configuracion?: string;
  orden?: number;
  visible?: boolean;
  fechaDesde?: string;
  fechaHasta?: string;
}

export interface Multimedia {
  idMultimedia: number;
  idTipoMultimedia: number;
  idUsuarioRegistro?: number;
  codigo: string;
  nombre: string;
  descripcion?: string;
  claveArchivo?: string;
  urlExterna?: string;
  tipoMime?: string;
  textoAlternativo?: string;
  anchoPx?: number;
  altoPx?: number;
  duracionSegundos?: number;
  tamanoBytes?: number;
  activo: boolean;
}

export interface MultimediaAsignacion {
  idMultimediaAsignacion: number;
  idMultimedia: number;
  idPagina?: number;
  idSeccion?: number;
  idSeccionItem?: number;
  idUsoMultimedia: number;
  orden: number;
  visible: boolean;
  activo: boolean;
  fechaDesde?: string;
  fechaHasta?: string;
}

// ---------------------------------------------------------------------------
// Tipos de autenticacion -- mapean LoginResponse y RefreshTokenResponse
// ---------------------------------------------------------------------------

export interface LoginPayload {
  usuario: string;
  contrasena: string;
}

export interface LoginResponse {
  idUsuario: number;
  usuario: string;
  autoridades: string[];
  requiereCambioPassword: boolean;
  accessToken: string;
  refreshToken: string;
  tokenType: string;
  expiresIn: number;
  mensaje: string;
}

export interface RefreshResponse {
  accessToken: string;
  refreshToken: string;
  tokenType: string;
  expiresIn: number;
  mensaje: string;
}

export interface SessionUser {
  idUsuario: number;
  usuario: string;
  autoridades: string[];
}

// ---------------------------------------------------------------------------
// Tipos de error del backend
// ---------------------------------------------------------------------------

export interface ApiError {
  timestamp: string;
  status: number;
  error: string;
  message: string;
  validationErrors?: Record<string, string>;
}

// ---------------------------------------------------------------------------
// CMS Proyecto (CmsProyectoController)
// ---------------------------------------------------------------------------

export interface CmsProyecto {
  idCmsProyecto: number;
  idProyecto: number;
  idEstadoPublicacion: number;
  idUsuarioRegistro?: number;
  idUsuarioPublicacion?: number;
  activo: boolean;
  fechaPublicacion?: string;
}

export interface CmsProyectoRequest {
  idProyecto: number;
}
