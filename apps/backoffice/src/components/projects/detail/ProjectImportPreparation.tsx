import { useState } from 'react';
import { DownloadIcon } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '../../ui/Button';
import { descargarPlantillaConfiguracion } from '../../../utils/projectConfigurationExcel';
import type { ProyectoResponse } from '../../../types/core';

export function ProjectImportPreparation({ project }: { project: ProyectoResponse }) {
  const [descargando, setDescargando] = useState(false);
  async function descargar() {
    if (descargando) return;
    setDescargando(true);
    try {
      await descargarPlantillaConfiguracion(project);
      toast.success('Plantilla descargada.');
    } catch {
      toast.error('No se pudo generar la plantilla. Vuelve a intentarlo.');
    } finally { setDescargando(false); }
  }
  return <section className="rounded-lg border border-brand-200 p-4 space-y-3">
    <div className="flex flex-wrap justify-between items-center gap-2">
      <div><h3 className="font-semibold text-brand-900">Importación masiva con Excel</h3>
      <p className="text-xs text-brand-500">Plantilla v1 del proyecto: estructura física, comercial, asignaciones y tarifas.</p></div>
      <Button icon={DownloadIcon} disabled={descargando} onClick={descargar}>
        {descargando ? 'Generando...' : 'Descargar plantilla'}</Button>
    </div>
    <p className="text-xs text-brand-500">La plantilla incluye las instrucciones y catálogos vigentes. La carga validada está pendiente de integración; aún no se registrarán datos desde un archivo.</p>
  </section>;
}
