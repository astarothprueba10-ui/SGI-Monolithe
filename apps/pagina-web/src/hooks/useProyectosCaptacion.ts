import { useCallback, useEffect, useState } from 'react';
import { obtenerProyectosCaptacion, type ProyectoCaptacion } from '../services/api';

export function useProyectosCaptacion() {
  const [projects, setProjects] = useState<ProyectoCaptacion[]>([]);
  const [projectsLoading, setLoading] = useState(true);
  const [projectsError, setError] = useState('');
  const reloadProjects = useCallback(async () => {
    setLoading(true); setError('');
    try { setProjects(await obtenerProyectosCaptacion()); }
    catch (error) { setProjects([]); setError(error instanceof Error ? error.message : 'No se pudo cargar el catálogo.'); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { void reloadProjects(); }, [reloadProjects]);
  return { projects, projectsLoading, projectsError, reloadProjects };
}
