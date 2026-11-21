import { SaveIcon } from 'lucide-react';
import { Button } from '../../ui/Button';
import { Card } from '../../ui/Card';
import { useProjectConfiguration } from '../../../hooks/useProjectConfiguration';
import { CommercialStageEditor } from './CommercialStageEditor';
import { CommercialAssignmentEditor } from './CommercialAssignmentEditor';
import { ProjectImportPreparation } from './ProjectImportPreparation';
import type { ProyectoResponse } from '../../../types/core';

export function ProjectConfigurationTab({ project }: { project: ProyectoResponse }) {
  const model = useProjectConfiguration(project.idProyecto);
  const { datos, respuesta, error, guardando } = model;
  if (!datos || !respuesta) return <Card className="p-5">
    <p className="text-sm">{error || 'Cargando configuración comercial...'}</p>
    {error && <Button onClick={model.recargar}>Reintentar</Button>}
  </Card>;
  return <Card className="p-5 space-y-5">
    <div className="flex flex-wrap justify-between items-start gap-3">
      <div><h2 className="text-lg font-semibold text-brand-900">Configuración del proyecto</h2>
        <p className="text-sm text-brand-600">Borrador comercial {respuesta.version ? `v${respuesta.version}` : 'sin guardar'}</p></div>
      <Button variant="primary" icon={SaveIcon} disabled={guardando || !project.activo} onClick={model.guardar}>
        {guardando ? 'Guardando...' : 'Guardar borrador'}</Button>
    </div>
    <p className="rounded-md bg-amber-50 border border-amber-200 p-3 text-sm text-amber-900">
      Modo borrador. Todavía no modifica disponibilidad, tarifas, separaciones ni ventas. No equivale a publicar una política comercial.
    </p>
    {error && <div role="alert" className="rounded-md bg-red-50 p-3 text-sm text-red-700 flex flex-wrap items-center justify-between gap-2">
      {error}<Button size="sm" onClick={model.recargar} disabled={guardando}>Recargar borrador guardado</Button>
    </div>}
    <ProjectImportPreparation project={project}/>
    <fieldset disabled={guardando || !project.activo} className="space-y-6">
      <CommercialStageEditor datos={datos} onChange={model.setDatos}/>
      <CommercialAssignmentEditor datos={datos} catalogos={respuesta} onChange={model.setDatos}/>
    </fieldset>
    <div className="rounded-lg border border-brand-100 p-3 text-sm text-brand-500">
      Carga de reglas comerciales desde Excel, tarifas promocionales, publicación y validación de operaciones: pendientes de integración.
    </div>
  </Card>;
}
