import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { obtenerProyectosPublicos, type ProyectoDto } from '../services/api';

interface PublicProjectsState {
  proyectos: ProyectoDto[];
  cargando: boolean;
  error: boolean;
}

const Context = createContext<PublicProjectsState | null>(null);

export function PublicProjectsProvider({ children }: { children: ReactNode }) {
  const [proyectos, setProyectos] = useState<ProyectoDto[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let vigente = true;
    obtenerProyectosPublicos()
      .then((data) => { if (vigente) setProyectos(data); })
      .catch(() => { if (vigente) setError(true); })
      .finally(() => { if (vigente) setCargando(false); });
    return () => { vigente = false; };
  }, []);

  return <Context.Provider value={{ proyectos, cargando, error }}>{children}</Context.Provider>;
}

export function usePublicProjects() {
  const context = useContext(Context);
  if (!context) throw new Error('usePublicProjects requiere PublicProjectsProvider');
  return context;
}
