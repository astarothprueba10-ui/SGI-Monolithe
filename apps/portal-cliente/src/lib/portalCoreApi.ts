import { ApiError } from './apiClient';

/**
 * Toda consulta de Portal Cliente se hace a Core Service con JWT.
 * Nunca usar IDs fijos ni llamar procedimientos financieros desde Supabase JS.
 */
const coreBaseUrl =
  import.meta.env.VITE_CORE_API_URL ?? 'http://localhost:8083/api/core';

export async function portalCoreGet<T>(
  path: string,
  signal?: AbortSignal
): Promise<T> {
  const token = localStorage.getItem('monolithe_access_token')
    ?? sessionStorage.getItem('monolithe_access_token');

  if (!token) throw new ApiError(401, 'Inicie sesión como cliente.');

  const response = await fetch(`${coreBaseUrl}${path}`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
      'Cache-Control': 'no-store'
    },
    signal,
    cache: 'no-store',
    credentials: 'omit'
  });

  const contentType = response.headers.get('content-type') ?? '';
  const data: unknown = contentType.includes('application/json')
    ? await response.json()
    : await response.text();

  if (!response.ok) {
    throw new ApiError(
      response.status,
      response.status === 401
        ? 'La sesión expiró. Ingrese nuevamente.'
        : response.status === 403
          ? 'Su cuenta no tiene acceso autorizado al Portal Cliente.'
          : 'No fue posible consultar los datos de su operación.',
      data
    );
  }

  return data as T;
}
