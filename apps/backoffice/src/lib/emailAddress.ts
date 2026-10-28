const LOCAL_PART = /^[A-Za-z0-9!#$%&'*+/=?^_`{|}~.-]+$/;
const DOMAIN_LABEL = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/i;

/** Normaliza el dominio de un correo sin limitar los proveedores admitidos. */
export function normalizeEmailAddress(value: string): string | null {
  const parts = value.trim().split('@');
  if (parts.length !== 2 || !validLocalPart(parts[0])) return null;
  const domain = normalizeDomain(parts[1]);
  const address = domain ? `${parts[0]}@${domain}` : '';
  return address && address.length <= 254 ? address : null;
}

function validLocalPart(value: string): boolean {
  return value.length <= 64 && LOCAL_PART.test(value)
    && !value.startsWith('.') && !value.endsWith('.') && !value.includes('..');
}

function normalizeDomain(value: string): string | null {
  if (!/^[\p{L}\p{N}.-]+$/u.test(value)) return null;
  try {
    const domain = new URL(`https://${value}`).hostname.toLowerCase();
    const labels = domain.split('.');
    return labels.length >= 2 && labels.every((label) => DOMAIN_LABEL.test(label))
      && !/^\d+$/.test(labels[labels.length - 1]) ? domain : null;
  } catch {
    return null;
  }
}
