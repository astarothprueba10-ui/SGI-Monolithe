import type {
  LoginPayload,
  LoginResponse,
  RefreshResponse,
  SessionUser
} from '../types/cms';

const AUTH_API = import.meta.env.VITE_AUTH_URL || 'http://localhost:8081';

const STORAGE_KEYS = {
  accessToken: 'sgi_access_token',
  refreshToken: 'sgi_refresh_token',
  user: 'sgi_user',
  expiresAt: 'sgi_expires_at'
} as const;

// ---------------------------------------------------------------------------
// Almacenamiento de sesion
// ---------------------------------------------------------------------------

function guardarSesion(response: LoginResponse): void {
  const expiresAt = Date.now() + response.expiresIn * 1000;

  localStorage.setItem(
    STORAGE_KEYS.accessToken,
    response.accessToken
  );
  localStorage.setItem(
    STORAGE_KEYS.refreshToken,
    response.refreshToken
  );
  localStorage.setItem(
    STORAGE_KEYS.expiresAt,
    String(expiresAt)
  );
  localStorage.setItem(
    STORAGE_KEYS.user,
    JSON.stringify({
      idUsuario: response.idUsuario,
      usuario: response.usuario,
      autoridades: response.autoridades
    })
  );
}

function limpiarSesion(): void {
  Object.values(STORAGE_KEYS).forEach((key) =>
    localStorage.removeItem(key)
  );
}

// ---------------------------------------------------------------------------
// Lectura de sesion
// ---------------------------------------------------------------------------

export function getAccessToken(): string | null {
  return localStorage.getItem(STORAGE_KEYS.accessToken);
}

export function getRefreshToken(): string | null {
  return localStorage.getItem(STORAGE_KEYS.refreshToken);
}

export function getSessionUser(): SessionUser | null {
  const raw = localStorage.getItem(STORAGE_KEYS.user);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as SessionUser;
  } catch {
    return null;
  }
}

export function isAuthenticated(): boolean {
  const token = getAccessToken();
  const expiresAt = localStorage.getItem(STORAGE_KEYS.expiresAt);
  if (!token || !expiresAt) return false;
  return Date.now() < Number(expiresAt);
}

export function getAuthHeaders(): HeadersInit {
  const token = getAccessToken();
  if (!token) return {};
  return { Authorization: `Bearer ${token}` };
}

export function hasRole(role: string): boolean {
  const user = getSessionUser();
  if (!user) return false;
  return user.autoridades.includes(role);
}

export function hasCmsAccess(): boolean {
  return (
    hasRole('ROLE_ADMINISTRADOR') ||
    hasRole('ROLE_MARKETING')
  );
}

// ---------------------------------------------------------------------------
// Operaciones de autenticacion
// ---------------------------------------------------------------------------

export async function login(
  payload: LoginPayload
): Promise<LoginResponse> {

  const response = await fetch(`${AUTH_API}/api/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json'
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const body = await response.json().catch(() => null);
    const msg =
      body?.message || `Error de autenticacion (${response.status})`;
    throw new AuthError(msg, response.status);
  }

  const data: LoginResponse = await response.json();
  guardarSesion(data);
  return data;
}

export async function refreshAccessToken(): Promise<string> {
  const currentRefresh = getRefreshToken();
  if (!currentRefresh) {
    limpiarSesion();
    throw new AuthError('No hay sesion activa', 401);
  }

  const response = await fetch(`${AUTH_API}/api/auth/refresh`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json'
    },
    body: JSON.stringify({ refreshToken: currentRefresh })
  });

  if (!response.ok) {
    limpiarSesion();
    throw new AuthError('La sesion ha expirado', 401);
  }

  const data: RefreshResponse = await response.json();

  localStorage.setItem(
    STORAGE_KEYS.accessToken,
    data.accessToken
  );
  localStorage.setItem(
    STORAGE_KEYS.refreshToken,
    data.refreshToken
  );

  const expiresAt = Date.now() + data.expiresIn * 1000;
  localStorage.setItem(
    STORAGE_KEYS.expiresAt,
    String(expiresAt)
  );

  return data.accessToken;
}

export async function logout(): Promise<void> {
  const refreshToken = getRefreshToken();

  if (refreshToken) {
    try {
      await fetch(`${AUTH_API}/api/auth/logout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json'
        },
        body: JSON.stringify({ refreshToken })
      });
    } catch {
      // Si falla el logout remoto, limpiamos local de todas formas
    }
  }

  limpiarSesion();
}

// ---------------------------------------------------------------------------
// Clase de error de autenticacion
// ---------------------------------------------------------------------------

export class AuthError extends Error {
  public readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'AuthError';
    this.status = status;
  }
}
