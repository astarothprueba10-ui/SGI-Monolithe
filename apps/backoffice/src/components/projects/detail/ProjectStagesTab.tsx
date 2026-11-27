import { Card } from '../../ui/Card';
import { Button } from '../../ui/Button';
import { CommercialStageEditor } from './CommercialStageEditor';
import { useProjectConfiguration } from '../../../hooks/useProjectConfiguration';
import type { ProyectoResponse } from '../../../types/core';

export function ProjectStagesTab({ project }: { project: ProyectoResponse }) {
  const model = useProjectConfiguration(project.idProyecto);
  const { datos, respuesta, publicada, error } = model;
  if (!datos || !respuesta || publicada === null) return <Card className="p-5">
    <p className="text-sm text-brand-700">{error || 'Cargando etapas comerciales…'}</p>
    {error && <Button onClick={model.recargar}>Reintentar</Button>}
  </Card>;
  return <Card className="p-5 space-y-4">
    {publicada > 0 ? <p className="text-sm text-brand-600">Proyecto publicado. Consulta las etapas de la configuración inicial.</p>
      : <p className="text-sm text-brand-600">Borrador comercial. Los cambios se guardan sin publicar precios ni liberar lotes.</p>}
    {error && <p role="alert" className="rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</p>}
    <CommercialStageEditor datos={datos} catalogos={respuesta} projectName={project.nombre}
      readOnly={!project.activo || publicada > 0} onChange={next => model.guardar(next, true)}/>
  </Card>;
}
