import { ApiError } from './apiClient';

/** El cliente nunca consulta funciones financieras con la clave pública de Supabase. */
const coreBaseUrl =
  import.meta.env.VITE_CORE_API_URL ?? 'http://localhost:8083/api/core';

async function portalCoreRequest<T>(
  path: string, method: 'GET' | 'POST',
  body?: Record<string, unknown>, signal?: AbortSignal
): Promise<T> {
  const token = localStorage.getItem('monolithe_access_token')
    ?? sessionStorage.getItem('monolithe_access_token');

  if (!token) throw new ApiError(401, 'Inicie sesión como cliente.');

  const response = await fetch(`${coreBaseUrl}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
      'Cache-Control': 'no-store',
      ...(body ? { 'Content-Type': 'application/json' } : {})
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
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
          ? 'Su cuenta no tiene acceso autorizado a esta operación.'
          : response.status === 409
            ? 'No se pudo registrar: verifique el saldo, número de operación o archivo cargado.'
            : response.status === 400
              ? 'Revise los datos del comprobante y vuelva a intentarlo.'
              : 'No fue posible completar la solicitud. Inténtelo nuevamente.',
      data
    );
  }
  return data as T;
}

export async function portalCoreGet<T>(
  path: string, signal?: AbortSignal
): Promise<T> {
  return portalCoreRequest<T>(path, 'GET', undefined, signal);
}

export async function portalCorePost<T>(
  path: string, body: Record<string, unknown>
): Promise<T> {
  return portalCoreRequest<T>(path, 'POST', body);
}
