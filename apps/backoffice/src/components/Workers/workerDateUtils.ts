// Utilidades de fecha y hora para operaciones laborales en zona horaria Peru (UTC-5)

const PERU_TIMEZONE = 'America/Lima';
const PERU_OFFSET = '-05:00';

function padTwo(num: number): string {
  return String(num).padStart(2, '0');
}

export function getPeruNowParts(): {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
} {
  const now = new Date();
  const dtf = new Intl.DateTimeFormat('en-US', {
    timeZone: PERU_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  });
  const parts = dtf.formatToParts(now);
  const map: Record<string, string> = {};
  for (const p of parts) map[p.type] = p.value;
  return {
    year: Number(map.year),
    month: Number(map.month),
    day: Number(map.day),
    hour: Number(map.hour === '24' ? 0 : map.hour),
    minute: Number(map.minute)
  };
}

export function getPeruNowInputString(): string {
  const p = getPeruNowParts();
  return `${p.year}-${padTwo(p.month)}-${padTwo(p.day)}T${padTwo(p.hour)}:${padTwo(p.minute)}`;
}

export function getPeruTodayDateString(): string {
  const p = getPeruNowParts();
  return `${p.year}-${padTwo(p.month)}-${padTwo(p.day)}`;
}

export function toPeruISOString(localDateTime: string): string {
  if (!localDateTime) return '';
  const clean = localDateTime.slice(0, 16);
  return `${clean}:00${PERU_OFFSET}`;
}

export function isSuspensionProgramada(fechaInicioIso: string): boolean {
  if (!fechaInicioIso) return false;
  const startMs = Date.parse(fechaInicioIso);
  const nowMs = Date.now();
  // Se considera programada si inicia con mas de 60 segundos en el futuro
  return startMs - nowMs > 60_000;
}

export function formatPeruDateTime(isoString: string): string {
  if (!isoString) return '—';
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return isoString;
    return new Intl.DateTimeFormat('es-PE', {
      timeZone: PERU_TIMEZONE,
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    }).format(d);
  } catch {
    return isoString;
  }
}

export function calcularFechaFinSuspension(
  fechaInicioLocal: string,
  modalidad: 'horas' | 'dias' | 'semanas' | 'rango',
  duracion: number,
  fechaFinManual: string
): string {
  if (modalidad === 'rango') return fechaFinManual;
  if (!fechaInicioLocal || duracion <= 0) return '';
  const date = new Date(`${fechaInicioLocal}:00${PERU_OFFSET}`);
  if (isNaN(date.getTime())) return '';

  if (modalidad === 'horas') {
    date.setHours(date.getHours() + duracion);
  } else if (modalidad === 'dias') {
    date.setDate(date.getDate() + duracion);
  } else if (modalidad === 'semanas') {
    date.setDate(date.getDate() + duracion * 7);
  }

  const dtf = new Intl.DateTimeFormat('en-US', {
    timeZone: PERU_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  });
  const parts = dtf.formatToParts(date);
  const map: Record<string, string> = {};
  for (const p of parts) map[p.type] = p.value;
  const h = map.hour === '24' ? '00' : map.hour;
  return `${map.year}-${map.month}-${map.day}T${h}:${map.minute}`;
}
