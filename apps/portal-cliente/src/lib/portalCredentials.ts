import { ApiError, authApi } from './apiClient';
import { expireSessionIfInactive, getInactivitySessionId } from './inactivitySession';
import { getPortalAccessToken, getPortalRefreshToken, updatePortalTokens } from './portalSession';

type Tokens = { accessToken: string; refreshToken: string };
let refreshing: { refreshToken: string; result: Promise<boolean> } | null = null;

/** Revoca la sesión aunque la vista se esté cerrando. */
export function revokePortalSession(refreshToken: string): Promise<void> {
  return authApi.post<void>('/logout', { refreshToken }, { keepalive: true });
}

async function rotate(refreshToken: string): Promise<boolean> {
  try {
    const next = await authApi.post<Tokens>('/refresh', { refreshToken });
    if (!next?.accessToken || !next.refreshToken) return false;
    if (updatePortalTokens(next, refreshToken)) return true;
    await revokePortalSession(next.refreshToken);
    return false;
  } catch {
    return false;
  }
}

function renew(accessToken: string, sessionId: string | null): Promise<boolean> {
  if (getInactivitySessionId() !== sessionId || expireSessionIfInactive(revokePortalSession)) {
    return Promise.resolve(false);
  }
  const current = getPortalAccessToken();
  if (current && current !== accessToken) return Promise.resolve(true);
  const refreshToken = getPortalRefreshToken();
  if (!refreshToken) return Promise.resolve(false);
  if (refreshing?.refreshToken === refreshToken) return refreshing.result;
  const result = rotate(refreshToken).finally(() => {
    if (refreshing?.result === result) refreshing = null;
  });
  refreshing = { refreshToken, result };
  return result;
}

/** Renueva el JWT cuando el servidor lo rechaza y repite la petición una vez. */
export async function withPortalCredentials<T>(request: (accessToken: string) => Promise<T>): Promise<T> {
  const token = getPortalAccessToken();
  const sessionId = getInactivitySessionId();
  if (!token || expireSessionIfInactive(revokePortalSession)) {
    throw new ApiError(401, 'Inicie sesión como cliente.');
  }
  try {
    return await request(token);
  } catch (error) {
    if (!(error instanceof ApiError) || error.status !== 401) throw error;
    const update = () => renew(token, sessionId);
    const renewed = await (navigator.locks ? navigator.locks.request('monolithe-portal-refresh', update) : update());
    const current = getPortalAccessToken();
    if (!renewed || !current || getInactivitySessionId() !== sessionId) throw error;
    return request(current);
  }
}
