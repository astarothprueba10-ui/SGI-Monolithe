import { useEffect, useState } from 'react';
import { coreService } from '../services/coreService';
import { getUbigeos } from '../services/ubigeoService';
import type { CatalogoResponse } from '../types/core';
import type { Ubigeo } from '../types/projectForm';

const EMPTY = { statuses: [] as CatalogoResponse[], ubigeos: [] as Ubigeo[], loading: true, error: '' };

/** Carga ambos catálogos, descarta respuestas de modales cerrados y permite reintentar. */
export function useProjectCatalogs(open: boolean) {
  const [state, setState] = useState(EMPTY);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    if (!open) return;
    let active = true;
    setState((previous) => ({ ...previous, loading: true, error: '' }));
    Promise.all([coreService.getProjectStatuses(), getUbigeos()]).then(([statuses, ubigeos]) => {
      if (!statuses.length || !ubigeos.length) throw new Error('Catálogo vacío');
      if (active) setState({ statuses, ubigeos, loading: false, error: '' });
    }).catch(() => {
      if (active) setState({ ...EMPTY, loading: false, error: 'No se pudieron cargar las listas. Vuelve a intentarlo.' });
    });
    return () => { active = false; };
  }, [open, attempt]);
  return { ...state, retry: () => setAttempt((value) => value + 1) };
}
