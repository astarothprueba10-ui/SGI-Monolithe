const currencyFormatter = new Intl.NumberFormat('es-PE', {
  style: 'currency',
  currency: 'PEN',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2
});

export function formatCurrency(value: number): string {
  return currencyFormatter.format(value);
}

export function formatDate(iso: string): string {
  const [year, month, day] = iso.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  return date.toLocaleDateString('es-PE', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });
}

export function formatLongDate(iso: string): string {
  const [year, month, day] = iso.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  return date.toLocaleDateString('es-PE', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });
}

/** Corte del día actual en Peru, no del prototipo. */
function hoyLima(): Date {
  const p = new Intl.DateTimeFormat('es-PE', {
    timeZone: 'America/Lima', year: 'numeric', month: '2-digit', day: '2-digit'
  }).formatToParts(new Date());
  const v = (t: string) => Number(p.find(x => x.type === t)?.value ?? 0);
  return new Date(v('year'), v('month') - 1, v('day'));
}

export function daysUntil(iso: string): number {
  const [year, month, day] = iso.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  return Math.round((date.getTime() - hoyLima().getTime()) / 86_400_000);
}

export function formatArea(m2: number): string {
  return `${new Intl.NumberFormat('es-PE', {
    maximumFractionDigits: 2
  }).format(m2)} m²`;
}