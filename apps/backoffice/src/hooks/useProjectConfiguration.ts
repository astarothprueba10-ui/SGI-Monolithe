import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { projectConfigurationService } from '../services/projectConfigurationService';
import { validarConfiguracion } from '../lib/projectConfiguration';
import type { ConfiguracionComercial, ConfiguracionProyectoResponse } from '../types/projectConfiguration';

export function useProjectConfiguration(idProyecto: number) {
  const [respuesta, setRespuesta] = useState<ConfiguracionProyectoResponse | null>(null);
  const [lotesRegistrados, setLotesRegistrados] = useState<number | null>(null);
  const [publicada, setPublicada] = useState<number | null>(null);
  const [datos, setDatos] = useState<ConfiguracionComercial | null>(null);
  const [error, setError] = useState('');
  const [intento, setIntento] = useState(0);
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    let vigente = true;
    setRespuesta(null); setDatos(null); setPublicada(null); setLotesRegistrados(null); setError('');
    Promise.all([projectConfigurationService.obtener(idProyecto), projectConfigurationService.versionPublicada(idProyecto)]).then(([r, p]) => {
      if (vigente) { setRespuesta(r); setDatos(r.datos); setPublicada(p.version); setLotesRegistrados(p.lotesRegistrados); }
    }).catch((e: unknown) => {
      if (vigente) setError(e instanceof Error ? e.message : 'No se pudo cargar la configuración.');
    });
    return () => { vigente = false; };
  }, [idProyecto, intento]);

  async function guardar(nuevosDatos: ConfiguracionComercial | null = datos, propagarError = false): Promise<boolean> {
    if (!datos || !respuesta || guardando || publicada !== 0 || !nuevosDatos) return false;
    const fallo = validarConfiguracion(nuevosDatos);
    if (fallo) { setError(fallo); if (propagarError) throw new Error(fallo); return false; }
    setGuardando(true); setError('');
    try {
      const r = await projectConfigurationService.guardar(idProyecto, respuesta.version, nuevosDatos);
      setRespuesta(r); setDatos(r.datos);
      toast.success(`Borrador comercial v${r.version} guardado.`);
      return true;
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'No se pudo guardar el borrador.');
      if (propagarError) throw e;
      return false;
    } finally { setGuardando(false); }
  }

  return { respuesta, publicada, lotesRegistrados, datos, setDatos, error, guardando, guardar, recargar: () => setIntento(n => n + 1) };
}
