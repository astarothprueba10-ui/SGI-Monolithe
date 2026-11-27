export interface PortalSessionUser {
  idUsuario: number;
  usuario: string;
  nombreMostrar?: string | null;
  iniciales?: string | null;
  autoridades: string[];
  requiereCambioPassword: boolean;
}

export function getPortalSessionUser(): PortalSessionUser | null {
  const raw =
    localStorage.getItem('monolithe_user') ??
    sessionStorage.getItem('monolithe_user');

  if (!raw) return null;

  try {
    const data: unknown = JSON.parse(raw);

    if (
      typeof data !== 'object' ||
      data === null ||
      !('idUsuario' in data) ||
      typeof data.idUsuario !== 'number' ||
      !('autoridades' in data) ||
      !Array.isArray(data.autoridades) ||
      !data.autoridades.every((role) => typeof role === 'string') ||
      !('requiereCambioPassword' in data) ||
      typeof data.requiereCambioPassword !== 'boolean'
    ) {
      return null;
    }

    return data as PortalSessionUser;
  } catch {
    return null;
  }
}

export function getPortalVisualIdentity() {
  const user = getPortalSessionUser();

  return {
    nombreMostrar: user?.nombreMostrar?.trim() || 'Cliente',
    iniciales: user?.iniciales?.trim().toUpperCase() || 'CL'
  };
}
/** El JWT y el usuario deben pertenecer a la misma ubicación de almacenamiento. */
export function getPortalAccessToken(): string | null {
  return localStorage.getItem('monolithe_access_token') ??
    sessionStorage.getItem('monolithe_access_token');
}

export function getPortalRefreshToken(): string | null {
  return localStorage.getItem('monolithe_refresh_token') ??
    sessionStorage.getItem('monolithe_refresh_token');
}

/** Conserva la sesión actual si una renovación termina después de salir. */
export function updatePortalTokens(next: { accessToken: string; refreshToken: string }, previous: string): boolean {
  if (getPortalRefreshToken() !== previous) return false;
  const storage = localStorage.getItem('monolithe_refresh_token') !== null ? localStorage : sessionStorage;
  storage.setItem('monolithe_access_token', next.accessToken);
  storage.setItem('monolithe_refresh_token', next.refreshToken);
  return true;
}

export function clearPortalSession(): void {
  for (const key of [
    'monolithe_access_token',
    'monolithe_refresh_token',
    'monolithe_user',
    'monolithe_session_id'
  ]) {
    localStorage.removeItem(key);
    sessionStorage.removeItem(key);
  }
}

export type PortalAuthState =
  | 'unauthenticated'
  | 'password-change-required'
  | 'authenticated';

/** Falla cerrado ante sesiones corruptas o que no tienen el rol CLIENTE. */
export function getPortalAuthState(): PortalAuthState {
  if (!getPortalAccessToken()) return 'unauthenticated';
  const user = getPortalSessionUser();
  if (!user || !user.autoridades.includes('ROLE_CLIENTE')) return 'unauthenticated';
  return user.requiereCambioPassword ? 'password-change-required' : 'authenticated';
}
