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

/** Días restantes desde la fecha de referencia del prototipo. */
const TODAY = new Date(2026, 7, 27);

export function daysUntil(iso: string): number {
  const [year, month, day] = iso.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  return Math.round((date.getTime() - TODAY.getTime()) / 86_400_000);
}

export function formatArea(m2: number): string {
  return `${new Intl.NumberFormat('es-PE', {
    maximumFractionDigits: 2
  }).format(m2)} m²`;
}