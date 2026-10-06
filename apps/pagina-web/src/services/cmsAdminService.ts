import {
  getAuthHeaders,
  refreshAccessToken,
  isAuthenticated,
  AuthError
} from './authService';

import type {
  ApiError,
  CmsProyecto,
  CmsProyectoRequest,
  Multimedia,
  MultimediaAsignacion,
  Pagina,
  PaginaRequest,
  Seccion,
  SeccionItem,
  SeccionItemRequest,
  SeccionRequest
} from '../types/cms';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8082';

// ---------------------------------------------------------------------------
// Fetch autenticado con renovacion automatica de token
// ---------------------------------------------------------------------------

async function fetchAuth(
  url: string,
  options: RequestInit = {}
): Promise<Response> {

  const headers = {
    Accept: 'application/json',
    ...getAuthHeaders(),
    ...options.headers
  };

  let response = await fetch(url, { ...options, headers });

  if (response.status === 401 && isAuthenticated()) {
    try {
      const nuevoToken = await refreshAccessToken();

      response = await fetch(url, {
        ...options,
        headers: {
          ...headers,
          Authorization: `Bearer ${nuevoToken}`
        }
      });
    } catch {
      throw new AuthError('La sesion ha expirado', 401);
    }
  }

  return response;
}

async function fetchJson<T>(
  url: string,
  options: RequestInit = {}
): Promise<T> {

  const response = await fetchAuth(url, options);

  if (!response.ok) {
    const body: ApiError = await response.json().catch(() => ({
      timestamp: new Date().toISOString(),
      status: response.status,
      error: response.statusText,
      message: `Error del servidor (${response.status})`
    }));

    if (response.status === 401) {
      throw new AuthError(body.message, 401);
    }
    if (response.status === 403) {
      throw new AuthError(
        'No tienes permisos para realizar esta accion',
        403
      );
    }

    const err = new Error(body.message) as Error & {
      status: number;
      validationErrors?: Record<string, string>;
    };
    err.status = body.status;
    err.validationErrors = body.validationErrors;
    throw err;
  }

  const text = await response.text();
  return text ? JSON.parse(text) : ({} as T);
}

// ---------------------------------------------------------------------------
// Paginas (CRUD)
// ---------------------------------------------------------------------------

export function listarPaginas(): Promise<Pagina[]> {
  return fetchJson(`${API_BASE}/api/cms/paginas`);
}

export function crearPagina(
  request: PaginaRequest
): Promise<Pagina> {

  return fetchJson(`${API_BASE}/api/cms/paginas`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request)
  });
}

export function actualizarPagina(
  idPagina: number,
  request: PaginaRequest
): Promise<Pagina> {

  return fetchJson(`${API_BASE}/api/cms/paginas/${idPagina}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request)
  });
}

export function publicarPagina(
  idPagina: number
): Promise<Pagina> {

  return fetchJson(
    `${API_BASE}/api/cms/paginas/${idPagina}/publicar`,
    { method: 'PATCH' }
  );
}

export function volverABorradorPagina(
  idPagina: number
): Promise<Pagina> {

  return fetchJson(
    `${API_BASE}/api/cms/paginas/${idPagina}/borrador`,
    { method: 'PATCH' }
  );
}

// ---------------------------------------------------------------------------
// Secciones (CRUD)
// ---------------------------------------------------------------------------

export function listarSecciones(
  idPagina: number,
  incluirInactivos = false
): Promise<Seccion[]> {

  const params = incluirInactivos ? '?incluirInactivos=true' : '';

  return fetchJson(
    `${API_BASE}/api/cms/paginas/${idPagina}/secciones${params}`
  );
}

export function crearSeccion(
  idPagina: number,
  request: SeccionRequest
): Promise<Seccion> {

  return fetchJson(
    `${API_BASE}/api/cms/paginas/${idPagina}/secciones`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request)
    }
  );
}

export function actualizarSeccion(
  idSeccion: number,
  request: SeccionRequest
): Promise<Seccion> {

  return fetchJson(
    `${API_BASE}/api/cms/secciones/${idSeccion}`,
    {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request)
    }
  );
}

export function cambiarVisibilidadSeccion(
  idSeccion: number,
  visible: boolean
): Promise<Seccion> {

  return fetchJson(
    `${API_BASE}/api/cms/secciones/${idSeccion}/visibilidad?visible=${visible}`,
    { method: 'PATCH' }
  );
}

export function cambiarEstadoSeccion(
  idSeccion: number,
  activo: boolean
): Promise<Seccion> {

  return fetchJson(
    `${API_BASE}/api/cms/secciones/${idSeccion}/estado?activo=${activo}`,
    { method: 'PATCH' }
  );
}

export async function eliminarSeccion(
  idSeccion: number
): Promise<void> {

  const response = await fetchAuth(
    `${API_BASE}/api/cms/secciones/${idSeccion}`,
    { method: 'DELETE' }
  );

  if (!response.ok && response.status !== 204) {
    const body = await response.json().catch(() => null);
    throw new Error(
      body?.message || `Error al eliminar seccion (${response.status})`
    );
  }
}

// ---------------------------------------------------------------------------
// Items de seccion (CRUD)
// ---------------------------------------------------------------------------

export function listarItems(
  idSeccion: number,
  incluirInactivos = false
): Promise<SeccionItem[]> {

  const params = incluirInactivos ? '?incluirInactivos=true' : '';

  return fetchJson(
    `${API_BASE}/api/cms/secciones/${idSeccion}/items${params}`
  );
}

export function crearItem(
  idSeccion: number,
  request: SeccionItemRequest
): Promise<SeccionItem> {

  return fetchJson(
    `${API_BASE}/api/cms/secciones/${idSeccion}/items`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request)
    }
  );
}

export function actualizarItem(
  idSeccionItem: number,
  request: SeccionItemRequest
): Promise<SeccionItem> {

  return fetchJson(
    `${API_BASE}/api/cms/seccion-items/${idSeccionItem}`,
    {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request)
    }
  );
}

export function cambiarVisibilidadItem(
  idSeccionItem: number,
  visible: boolean
): Promise<SeccionItem> {

  return fetchJson(
    `${API_BASE}/api/cms/seccion-items/${idSeccionItem}/visibilidad?visible=${visible}`,
    { method: 'PATCH' }
  );
}

export function cambiarEstadoItem(
  idSeccionItem: number,
  activo: boolean
): Promise<SeccionItem> {

  return fetchJson(
    `${API_BASE}/api/cms/seccion-items/${idSeccionItem}/estado?activo=${activo}`,
    { method: 'PATCH' }
  );
}

export async function eliminarItem(
  idSeccionItem: number
): Promise<void> {

  const response = await fetchAuth(
    `${API_BASE}/api/cms/seccion-items/${idSeccionItem}`,
    { method: 'DELETE' }
  );

  if (!response.ok && response.status !== 204) {
    const body = await response.json().catch(() => null);
    throw new Error(
      body?.message || `Error al eliminar item (${response.status})`
    );
  }
}

// ---------------------------------------------------------------------------
// Multimedia (CRUD)
// ---------------------------------------------------------------------------

export function listarMultimedia(): Promise<Multimedia[]> {
  return fetchJson(`${API_BASE}/api/cms/multimedia`);
}

export async function subirMultimedia(
  formData: FormData
): Promise<Multimedia> {

  const response = await fetchAuth(
    `${API_BASE}/api/cms/multimedia`,
    { method: 'POST', body: formData }
  );

  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new Error(
      body?.message || `Error al subir archivo (${response.status})`
    );
  }

  return response.json();
}

export async function eliminarMultimedia(
  idMultimedia: number
): Promise<void> {

  const response = await fetchAuth(
    `${API_BASE}/api/cms/multimedia/${idMultimedia}`,
    { method: 'DELETE' }
  );

  if (!response.ok && response.status !== 204) {
    const body = await response.json().catch(() => null);
    throw new Error(
      body?.message || `Error al eliminar multimedia (${response.status})`
    );
  }
}

// ---------------------------------------------------------------------------
// Asignacion de multimedia
// ---------------------------------------------------------------------------

export function listarAsignaciones(
  entidad: 'pagina' | 'seccion' | 'seccion-item',
  idEntidad: number
): Promise<MultimediaAsignacion[]> {

  const pathMap = {
    pagina: `paginas/${idEntidad}`,
    seccion: `secciones/${idEntidad}`,
    'seccion-item': `seccion-items/${idEntidad}`
  };

  return fetchJson(
    `${API_BASE}/api/cms/multimedia/asignaciones/${pathMap[entidad]}`
  );
}

// ---------------------------------------------------------------------------
// Proyectos CMS
// ---------------------------------------------------------------------------

export function listarProyectosCms(): Promise<CmsProyecto[]> {
  return fetchJson(`${API_BASE}/api/cms/proyectos`);
}

export function crearProyectoCms(
  request: CmsProyectoRequest
): Promise<CmsProyecto> {

  return fetchJson(`${API_BASE}/api/cms/proyectos`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request)
  });
}
