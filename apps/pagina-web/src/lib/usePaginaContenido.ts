import { useCallback, useEffect, useState } from 'react';
import type { PaginaContenido } from '../types/cms';
import {
  obtenerContenidoPorCodigo,
  obtenerContenidoPorRuta
} from '../services/cmsPublicService';

interface UsePaginaContenidoResult {
  data: PaginaContenido | null;
  loading: boolean;
  error: string | null;
  reload: () => void;
}

/**
 * Hook para obtener contenido completo de una pagina publica
 * del CMS (secciones + multimedia).
 *
 * Acepta busqueda por `codigo` o por `ruta`.
 */
export function usePaginaContenido(
  params: { codigo: string } | { ruta: string }
): UsePaginaContenidoResult {

  const [data, setData] = useState<PaginaContenido | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  const key = 'codigo' in params
    ? params.codigo
    : params.ruta;

  const reload = useCallback(
    () => setTick((t) => t + 1),
    []
  );

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    const fetcher = 'codigo' in params
      ? obtenerContenidoPorCodigo(params.codigo)
      : obtenerContenidoPorRuta(params.ruta);

    fetcher
      .then((result) => {
        if (!cancelled) setData(result);
      })
      .catch((err) => {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : 'Error desconocido'
          );
          setData(null);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [key, tick]);

  return { data, loading, error, reload };
}
