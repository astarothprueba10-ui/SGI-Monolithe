import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { projectConfigurationService } from '../services/projectConfigurationService';
import { validarConfiguracion } from '../lib/projectConfiguration';
import type { ConfiguracionComercial, ConfiguracionProyectoResponse } from '../types/projectConfiguration';

export function useProjectConfiguration(idProyecto: number) {
  const [respuesta, setRespuesta] = useState<ConfiguracionProyectoResponse | null>(null);
  const [publicada, setPublicada] = useState<number | null>(null);
  const [datos, setDatos] = useState<ConfiguracionComercial | null>(null);
  const [error, setError] = useState('');
  const [intento, setIntento] = useState(0);
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    let vigente = true;
    setRespuesta(null); setDatos(null); setPublicada(null); setError('');
    Promise.all([projectConfigurationService.obtener(idProyecto), projectConfigurationService.versionPublicada(idProyecto)]).then(([r, p]) => {
      if (vigente) { setRespuesta(r); setDatos(r.datos); setPublicada(p.version); }
    }).catch((e: unknown) => {
      if (vigente) setError(e instanceof Error ? e.message : 'No se pudo cargar la configuración.');
    });
    return () => { vigente = false; };
  }, [idProyecto, intento]);

  async function guardar() {
    if (!datos || !respuesta || guardando || publicada !== 0) return;
    const fallo = validarConfiguracion(datos);
    if (fallo) { setError(fallo); return; }
    setGuardando(true); setError('');
    try {
      const r = await projectConfigurationService.guardar(idProyecto, respuesta.version, datos);
      setRespuesta(r); setDatos(r.datos);
      toast.success(`Borrador comercial v${r.version} guardado.`);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'No se pudo guardar el borrador.');
    } finally { setGuardando(false); }
  }

  return { respuesta, publicada, datos, setDatos, error, guardando, guardar, recargar: () => setIntento(n => n + 1) };
}
