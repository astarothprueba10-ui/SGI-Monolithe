import { useContext, useEffect } from 'react';
import { NavigationContext } from '../contexts/NavigationContext';

/** Publica el registro abierto sin conservar etiquetas de otras rutas. */
export function useNavigationDetail(label: string) {
  const setDetail = useContext(NavigationContext)?.setDetail;
  useEffect(() => { setDetail?.(label); }, [label, setDetail]);
}

/** Publica la pestaña seleccionada; también permite usar Tabs fuera del shell. */
export function useNavigationSection(label: string) {
  const setSection = useContext(NavigationContext)?.setSection;
  useEffect(() => { setSection?.(label); }, [label, setSection]);
}
