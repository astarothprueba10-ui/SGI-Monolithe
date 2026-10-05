import {
  clearStoredSession,
  getAccessToken,
  getRefreshToken,
  updateStoredTokens
} from './authSession';

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly data?: unknown
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

interface ApiClientOptions extends Omit<RequestInit, 'body'> {
  body?: BodyInit | Record<string, unknown> | null;
}

type RefreshTokenResponse = {
  accessToken: string;
  refreshToken: string;
  tokenType: string;
  expiresIn: number;
  mensaje: string;
};

let refreshPromise: Promise<boolean> | null = null;

function createApiClient(
  baseUrl: string,
  authenticated = false
) {
  async function request<T>(
    path: string,
    options: ApiClientOptions = {},
    allowRefresh = true
  ): Promise<T> {
    const headers = new Headers(options.headers);

    if (authenticated && !headers.has('Authorization')) {
      const accessToken = getAccessToken();

      if (accessToken) {
        headers.set(
          'Authorization',
          `Bearer ${accessToken}`
        );
      }
    }

    let body = options.body;

    if (
      body &&
      typeof body === 'object' &&
      !(body instanceof FormData) &&
      !(body instanceof Blob) &&
      !(body instanceof URLSearchParams)
    ) {
      headers.set('Content-Type', 'application/json');
      body = JSON.stringify(body);
    }

    const response = await fetch(`${baseUrl}${path}`, {
      ...options,
      headers,
      body: body as BodyInit | null | undefined
    });
    if (
      response.status === 401 &&
      authenticated &&
      allowRefresh
    ) {
      const refreshed = await refreshSession();

      if (refreshed) {
        return request<T>(
          path,
          options,
          false
        );
      }

      clearStoredSession();
      window.location.replace('/login');

      throw new ApiError(
        401,
        'Tu sesión ha expirado. Inicia sesión nuevamente.'
      );
    }

    const contentType =
      response.headers.get('content-type') ?? '';

    const data = contentType.includes('application/json')
      ? await response.json()
      : await response.text();

    if (!response.ok) {
      const message =
        typeof data === 'object' &&
          data !== null &&
          'message' in data &&
          typeof data.message === 'string'
          ? data.message
          : `Error HTTP ${response.status}`;

      throw new ApiError(
        response.status,
        message,
        data
      );
    }

    return data as T;
  }

  return {
    get: <T>(
      path: string,
      options?: ApiClientOptions
    ) =>
      request<T>(path, {
        ...options,
        method: 'GET'
      }),

    post: <T>(
      path: string,
      body?: ApiClientOptions['body'],
      options?: ApiClientOptions
    ) =>
      request<T>(path, {
        ...options,
        method: 'POST',
        body
      }),

    put: <T>(
      path: string,
      body?: ApiClientOptions['body'],
      options?: ApiClientOptions
    ) =>
      request<T>(path, {
        ...options,
        method: 'PUT',
        body
      }),

    patch: <T>(
      path: string,
      body?: ApiClientOptions['body'],
      options?: ApiClientOptions
    ) =>
      request<T>(path, {
        ...options,
        method: 'PATCH',
        body
      }),

    delete: <T>(
      path: string,
      options?: ApiClientOptions
    ) =>
      request<T>(path, {
        ...options,
        method: 'DELETE'
      })
  };
}

const authApiUrl =
  import.meta.env.VITE_AUTH_API_URL ??
  'http://localhost:8081/api/auth';

const cmsApiUrl =
  import.meta.env.VITE_CMS_API_URL ??
  'http://localhost:8082/api';

const coreApiUrl =
  import.meta.env.VITE_CORE_API_URL ??
  'http://localhost:8083/api/core';

async function refreshSession(): Promise<boolean> {
  if (refreshPromise) {
    return refreshPromise;
  }

  refreshPromise = (async () => {
    const refreshToken = getRefreshToken();

    if (!refreshToken) {
      return false;
    }

    try {
      const response = await fetch(`${authApiUrl}/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          refreshToken
        })
      });

      if (!response.ok) {
        return false;
      }

      const data =
        (await response.json()) as RefreshTokenResponse;

      return updateStoredTokens(
        data.accessToken,
        data.refreshToken
      );
    } catch {
      return false;
    } finally {
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

export const authApi =
  createApiClient(authApiUrl);

export const cmsApi =
  createApiClient(cmsApiUrl, true);

export const coreApi =
  createApiClient(coreApiUrl, true);