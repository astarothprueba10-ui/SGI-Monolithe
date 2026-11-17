/** Soles exactos a céntimos; no usar currency() que redondea a enteros. */
export function formatSoles(value: number | null | undefined): string {
  const n = Number(value ?? 0);
  return 'S/ ' + (Number.isFinite(n) ? n : 0).toLocaleString('en-US', {
    minimumFractionDigits: 2, maximumFractionDigits: 2
  });
}
