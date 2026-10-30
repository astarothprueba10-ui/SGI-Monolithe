export const INACTIVITY_TIMEOUT_MS = 10 * 60 * 1000;

export interface SessionActivity {
  lastActivity: number;
  closed: boolean;
}

export interface InactivityPorts {
  now: () => number;
  read: () => SessionActivity | null;
  write: (activity: SessionActivity) => void;
  schedule: (callback: () => void, delay: number) => number;
  cancel: (timer: number) => void;
  expire: () => void;
}

/** Calcula el plazo restante sin prolongar registros inválidos o futuros. */
export function remainingInactivity(lastActivity: number, now: number): number {
  if (!Number.isFinite(lastActivity) || lastActivity <= 0 || lastActivity > now) return 0;
  return Math.max(0, INACTIVITY_TIMEOUT_MS - (now - lastActivity));
}

/** Controla el vencimiento por actividad y permite sustituir reloj y almacenamiento. */
export class InactivityTimer {
  private timer: number | null = null;
  private stopped = false;
  private lastActivity: number;

  constructor(private readonly ports: InactivityPorts) {
    this.lastActivity = ports.now();
  }

  /** Conserva el plazo existente al montar o recargar. */
  start(): void {
    if (!this.ports.read()) this.ports.write({ lastActivity: this.lastActivity, closed: false });
    this.check();
  }

  /** Comprueba la hora real y cierra una sola vez cuando vence el plazo. */
  check = (): boolean => {
    if (this.stopped) return true;
    const activity = this.ports.read() ?? { lastActivity: this.lastActivity, closed: false };
    const remaining = remainingInactivity(activity.lastActivity, this.ports.now());
    if (activity.closed || remaining === 0) {
      this.expire();
      return true;
    }
    this.schedule(remaining);
    return false;
  };

  /** Registra actividad únicamente cuando la sesión todavía no venció. */
  activity = (): boolean => {
    if (this.check()) return false;
    this.lastActivity = this.ports.now();
    this.ports.write({ lastActivity: this.lastActivity, closed: false });
    this.schedule(INACTIVITY_TIMEOUT_MS);
    return true;
  };

  /** Retira el temporizador sin cerrar una sesión durante el desmontaje. */
  stop = (): void => {
    this.stopped = true;
    if (this.timer !== null) this.ports.cancel(this.timer);
    this.timer = null;
  };

  private schedule(delay: number): void {
    if (this.timer !== null) this.ports.cancel(this.timer);
    this.timer = this.ports.schedule(this.check, delay);
  }

  private expire(): void {
    this.stop();
    this.ports.write({ lastActivity: this.lastActivity, closed: true });
    this.ports.expire();
  }
}
