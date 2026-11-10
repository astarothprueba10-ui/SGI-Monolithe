import { useEffect, useRef, useState } from 'react';

/** Detecta tablas desplazables al cambiar el ancho del contenedor o del contenido. */
export function useHorizontalOverflow() {
  const ref = useRef<HTMLDivElement>(null); const [overflow, setOverflow] = useState(false);
  useEffect(() => {
    const element = ref.current; if (!element) return;
    const measure = () => setOverflow(element.scrollWidth > element.clientWidth + 1);
    measure();
    const observer = typeof ResizeObserver === 'undefined' ? undefined : new ResizeObserver(measure);
    observer?.observe(element); if (element.firstElementChild) observer?.observe(element.firstElementChild);
    window.addEventListener('resize', measure);
    return () => { observer?.disconnect(); window.removeEventListener('resize', measure); };
  }, []);
  return { ref, overflow };
}
