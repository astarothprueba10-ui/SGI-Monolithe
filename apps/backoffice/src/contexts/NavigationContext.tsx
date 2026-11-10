import { createContext, useCallback, useState, type ReactNode } from 'react';
import { useLocation } from 'react-router-dom';

type LocationLabel = { pathname: string; label: string };
type NavigationState = { detail: string; section: string; setDetail: (label: string) => void; setSection: (label: string) => void };

/** Estado de navegación compartido por la cabecera y las secciones de cada módulo. */
export const NavigationContext = createContext<NavigationState | undefined>(undefined);

/** Aísla los nombres de registros y pestañas a la ruta que los publicó. */
export function NavigationProvider({ children }: { children: ReactNode }) {
  const { pathname } = useLocation();
  const [detail, updateDetail] = useState<LocationLabel>();
  const [section, updateSection] = useState<LocationLabel>();
  const setDetail = useCallback((label: string) => updateDetail({ pathname, label }), [pathname]);
  const setSection = useCallback((label: string) => updateSection({ pathname, label }), [pathname]);
  return <NavigationContext.Provider value={{ detail: detail?.pathname === pathname ? detail.label : '',
    section: section?.pathname === pathname ? section.label : '', setDetail, setSection }}>{children}</NavigationContext.Provider>;
}
