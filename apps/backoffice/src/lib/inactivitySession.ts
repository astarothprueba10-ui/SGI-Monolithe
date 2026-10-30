import { clearStoredSession, getAccessToken, getRefreshToken, getStoredAuthUser } from './authSession';
import { InactivityTimer, remainingInactivity, type SessionActivity } from './inactivityTimer';

export const SESSION_ID_KEY = 'monolithe_session_id';
export const ACTIVITY_PREFIX = 'monolithe_activity:';
type RevokeSession = (refreshToken: string) => Promise<void>;
const fallbackActivity = new Map<string, SessionActivity>();

function authStorage(): Storage {
  return localStorage.getItem('monolithe_refresh_token') !== null ? localStorage : sessionStorage;
}

function createSessionId(): string {
  if (typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  return Array.from(crypto.getRandomValues(new Uint8Array(16)), value => value.toString(16).padStart(2, '0')).join('');
}

/** Obtiene un identificador de sesión que permanece estable al renovar los tokens. */
export function getInactivitySessionId(): string | null {
  return authStorage().getItem(SESSION_ID_KEY);
}

/** Inicia el plazo de una sesión nueva sin reutilizar la actividad de otra cuenta. */
export function beginSessionActivity(storage: Storage): string {
  localStorage.removeItem(SESSION_ID_KEY);
  sessionStorage.removeItem(SESSION_ID_KEY);
  const sessionId = createSessionId();
  storage.setItem(SESSION_ID_KEY, sessionId);
  writeSessionActivity(sessionId, { lastActivity: Date.now(), closed: false });
  return sessionId;
}

/** Lee la actividad compartida sin guardar tokens ni datos personales. */
export function readSessionActivity(sessionId: string): SessionActivity | null {
  try {
    const raw = localStorage.getItem(ACTIVITY_PREFIX + sessionId);
    if (raw === null) return fallbackActivity.get(sessionId) ?? null;
    const value: unknown = JSON.parse(raw);
    if (typeof value === 'object' && value !== null && 'lastActivity' in value && 'closed' in value
      && typeof value.lastActivity === 'number' && typeof value.closed === 'boolean') {
      return { lastActivity: value.lastActivity, closed: value.closed };
    }
    return { lastActivity: 0, closed: true };
  } catch {
    return fallbackActivity.get(sessionId) ?? { lastActivity: 0, closed: true };
  }
}

/** Persiste actividad y mantiene el control local si el navegador limita el almacenamiento. */
export function writeSessionActivity(sessionId: string, activity: SessionActivity): void {
  fallbackActivity.set(sessionId, activity);
  try {
    localStorage.setItem(ACTIVITY_PREFIX + sessionId, JSON.stringify(activity));
  } catch {
    fallbackActivity.set(sessionId, activity);
  }
}

/** Limpia las credenciales antes de redirigir; la revocación no retrasa el cierre local. */
export function expireInactiveSession(sessionId: string, revoke: RevokeSession): void {
  if (getInactivitySessionId() !== sessionId) return;
  const refreshToken = getRefreshToken();
  writeSessionActivity(sessionId, { lastActivity: Date.now(), closed: true });
  clearStoredSession();
  if (refreshToken) {
    void revoke(refreshToken).catch(() => console.warn('No fue posible revocar la sesión inactiva en el servidor.'));
  }
  window.location.replace('/login?motivo=inactividad');
}

/** Impide nuevas peticiones autenticadas cuando ya venció el plazo de inactividad. */
export function expireSessionIfInactive(revoke: RevokeSession): boolean {
  const sessionId = getInactivitySessionId();
  const activity = sessionId ? readSessionActivity(sessionId) : null;
  if (!sessionId || !activity || (!activity.closed && remainingInactivity(activity.lastActivity, Date.now()) > 0)) return false;
  expireInactiveSession(sessionId, revoke);
  return true;
}

const ACTIVITY_EVENTS = ['pointerdown', 'pointermove', 'keydown', 'click', 'wheel', 'touchstart', 'input'];
const CANCELABLE_EVENTS = new Set(['pointerdown', 'keydown', 'click']);

class BrowserInactivitySession {
  private readonly timer: InactivityTimer;

  constructor(private readonly sessionId: string, revoke: RevokeSession) {
    this.timer = new InactivityTimer({
      now: Date.now,
      read: () => readSessionActivity(sessionId),
      write: activity => writeSessionActivity(sessionId, activity),
      schedule: (callback, delay) => window.setTimeout(callback, delay),
      cancel: timer => window.clearTimeout(timer),
      expire: () => expireInactiveSession(sessionId, revoke)
    });
  }

  start(): () => void {
    ACTIVITY_EVENTS.forEach(name => window.addEventListener(name, this.onActivity,
      { capture: true, passive: !CANCELABLE_EVENTS.has(name) }));
    window.addEventListener('storage', this.onStorage);
    window.addEventListener('focus', this.onResume);
    window.addEventListener('pageshow', this.onResume);
    document.addEventListener('visibilitychange', this.onResume);
    this.timer.start();
    return this.stop;
  }

  private stop = (): void => {
    this.timer.stop();
    ACTIVITY_EVENTS.forEach(name => window.removeEventListener(name, this.onActivity, true));
    window.removeEventListener('storage', this.onStorage);
    window.removeEventListener('focus', this.onResume);
    window.removeEventListener('pageshow', this.onResume);
    document.removeEventListener('visibilitychange', this.onResume);
  };

  private onActivity = (event: Event): void => {
    if (!event.isTrusted || document.hidden) return;
    if (!this.timer.activity()) {
      if (event.cancelable && CANCELABLE_EVENTS.has(event.type)) event.preventDefault();
      event.stopImmediatePropagation();
    }
  };

  private onResume = (): void => {
    this.timer.check();
  };

  private onStorage = (event: StorageEvent): void => {
    if (event.key !== null && event.key !== ACTIVITY_PREFIX + this.sessionId
      && !['monolithe_access_token', 'monolithe_refresh_token', SESSION_ID_KEY].includes(event.key)) return;
    if (getInactivitySessionId() !== this.sessionId) {
      this.stop();
      if (getAccessToken()) window.location.reload();
      else window.location.replace(readSessionActivity(this.sessionId)?.closed ? '/login?motivo=inactividad' : '/login');
      return;
    }
    this.timer.check();
  };
}

/** Observa interacción real y comprueba el vencimiento al volver a una pestaña. */
export function watchSessionInactivity(revoke: RevokeSession): (() => void) | undefined {
  if (!getAccessToken() || !getRefreshToken() || !getStoredAuthUser()) return undefined;
  const sessionId = getInactivitySessionId() ?? beginSessionActivity(authStorage());
  return new BrowserInactivitySession(sessionId, revoke).start();
}
