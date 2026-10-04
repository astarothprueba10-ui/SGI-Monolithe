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

function createApiClient(baseUrl: string) {
  async function request<T>(
    path: string,
    options: ApiClientOptions = {}
  ): Promise<T> {
    const headers = new Headers(options.headers);

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

    const contentType = response.headers.get('content-type') ?? '';

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

      throw new ApiError(response.status, message, data);
    }

    return data as T;
  }

  return {
    get: <T>(path: string, options?: ApiClientOptions) =>
      request<T>(path, { ...options, method: 'GET' }),

    post: <T>(
      path: string,
      body?: ApiClientOptions['body'],
      options?: ApiClientOptions
    ) => request<T>(path, { ...options, method: 'POST', body }),

    put: <T>(
      path: string,
      body?: ApiClientOptions['body'],
      options?: ApiClientOptions
    ) => request<T>(path, { ...options, method: 'PUT', body }),

    patch: <T>(
      path: string,
      body?: ApiClientOptions['body'],
      options?: ApiClientOptions
    ) => request<T>(path, { ...options, method: 'PATCH', body }),

    delete: <T>(path: string, options?: ApiClientOptions) =>
      request<T>(path, { ...options, method: 'DELETE' })
  };
}

const authApiUrl =
  import.meta.env.VITE_AUTH_API_URL ?? 'http://localhost:8081/api/auth';

export const authApi = createApiClient(authApiUrl);