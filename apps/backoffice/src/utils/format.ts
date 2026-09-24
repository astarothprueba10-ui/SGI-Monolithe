export function currency(value: number, compact = false): string {
  if (compact && Math.abs(value) >= 1000) {
    const millions = value / 1_000_000;
    if (Math.abs(value) >= 1_000_000) return `S/ ${millions.toFixed(millions >= 10 ? 1 : 2)}M`;
    return `S/ ${(value / 1000).toFixed(0)}K`;
  }
  return new Intl.NumberFormat('es-PE', {
    style: 'currency',
    currency: 'PEN',
    maximumFractionDigits: 0
  }).format(value);
}

export function number(value: number): string {
  return new Intl.NumberFormat('es-PE').format(value);
}

export function percent(value: number, digits = 1): string {
  return `${value.toFixed(digits)}%`;
}

export function area(value: number): string {
  return `${number(value)} m²`;
}