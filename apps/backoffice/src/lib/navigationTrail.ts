import { ALL_NAV_ITEMS } from '../data/navigation';

/** Segmento visible de la ubicación actual. */
export interface TrailItem { label: string; to?: string }

/** Resuelve el módulo, el registro abierto y su sección usando límites de ruta. */
export function navigationTrail(pathname: string, detail = '', section = ''): TrailItem[] {
  const path = pathname.replace(/\/+$/, '') || '/';
  const module = ALL_NAV_ITEMS.filter(item => item.to === path || (item.to !== '/' && path.startsWith(`${item.to}/`)))
    .sort((left, right) => right.to.length - left.to.length)[0];
  const label = module?.label ?? (path === '/no-autorizado' ? 'Acceso no autorizado' : 'Página no encontrada');
  const nested = Boolean(module && module.to !== path);
  return [{ label: 'SIGI', to: '/' }, { label, to: nested || section ? module?.to : undefined },
    ...(nested ? [{ label: detail || 'Detalle', to: section ? path : undefined }] : []),
    ...(section ? [{ label: section }] : [])];
}
