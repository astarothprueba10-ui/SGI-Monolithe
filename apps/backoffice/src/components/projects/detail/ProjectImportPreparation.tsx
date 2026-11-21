import { useState } from 'react';
import { useAuth } from '../../../contexts/AuthContext';
import { useProjectImport } from '../../../hooks/useProjectImport';
import { ProjectImportPreview } from './ProjectImportPreview';
import { DownloadIcon } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '../../ui/Button';
import { descargarPlantillaConfiguracion } from '../../../utils/projectConfigurationExcel';
import type { ProyectoResponse } from '../../../types/core';

export function ProjectImportPreparation({ project }: { project: ProyectoResponse }) {
  const [descargando, setDescargando] = useState(false);
  const { can } = useAuth();
  const model = useProjectImport(project);
  const puedeImportar = project.activo && can('lots.edit');
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
    <p className="text-xs text-brand-500">Importación habilitada para EtapasFisicas, Zonas, Manzanas y Lotes. Deja vacías las hojas comerciales y de tarifas hasta integrar su carga. Los registros existentes no se modifican.</p>
    {puedeImportar && <div className="space-y-3">
      <label className="block text-sm font-medium text-brand-800">Seleccionar Excel para validar
        <input type="file" accept=".xlsx" disabled={model.ocupado} className="mt-2 block w-full text-sm"
          onChange={event => { const file = event.target.files?.[0]; if (file) void model.validar(file); event.target.value = ''; }}/>
      </label>
      {model.ocupado && !model.resultado && <p className="text-sm text-brand-500">Validando archivo...</p>}
      {model.error && <p role="alert" className="text-sm text-red-700">{model.error}</p>}
      {model.resultado && <ProjectImportPreview resultado={model.resultado} ocupado={model.ocupado}
        aceptado={model.aceptado} setAceptado={model.setAceptado} confirmar={model.confirmar}/>}
    </div>}
    {!puedeImportar && <p className="text-xs text-brand-500">Necesitas permiso de edición de lotes y un proyecto habilitado para importar.</p>}
  </section>;
}
