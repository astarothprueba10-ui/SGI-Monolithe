import { useState } from 'react';
import { SaveIcon, FileSpreadsheetIcon, LayersIcon, MapPinnedIcon, TablePropertiesIcon, ShieldCheckIcon } from 'lucide-react';
import { Button } from '../../ui/Button';
import { Card } from '../../ui/Card';
import { useProjectConfiguration } from '../../../hooks/useProjectConfiguration';
import { CommercialStageEditor } from './CommercialStageEditor';
import { CommercialAssignmentEditor } from './CommercialAssignmentEditor';
import { ProjectImportPreparation } from './ProjectImportPreparation';
import { CommercialTariffEditor } from './CommercialTariffEditor';
import { CommercialPublicationPanel } from './CommercialPublicationPanel';
import type { ProyectoResponse } from '../../../types/core';

type Seccion = 'excel' | 'etapas' | 'asignaciones' | 'tarifas' | 'publicacion';

const SECCIONES = [
  { id: 'excel', nombre: 'Importar Excel', icono: FileSpreadsheetIcon },
  { id: 'etapas', nombre: 'Etapas comerciales', icono: LayersIcon },
  { id: 'asignaciones', nombre: 'Manzanas y lotes', icono: MapPinnedIcon },
  { id: 'tarifas', nombre: 'Matriz de tarifas', icono: TablePropertiesIcon },
  { id: 'publicacion', nombre: 'Publicación', icono: ShieldCheckIcon }
] as const;

export function ProjectConfigurationTab({ project }: { project: ProyectoResponse }) {
  const model = useProjectConfiguration(project.idProyecto);
  const [seccion, setSeccion] = useState<Seccion>('excel');
  const [importacionReciente, setImportacionReciente] = useState(false);
  const { datos, respuesta, publicada, error, guardando } = model;

  if (!datos || !respuesta || publicada === null) return <Card className="p-5">
    <p className="text-sm text-brand-700">{error || 'Cargando configuración comercial…'}</p>
    {error && <Button onClick={model.recargar}>Reintentar</Button>}
  </Card>;

  const hayCambios = JSON.stringify(datos) !== JSON.stringify(respuesta.datos);
  const esPublicado = publicada > 0;
  const bloqueado = guardando || !project.activo || esPublicado;
  const seccionVisible = esPublicado && seccion === 'excel' ? 'etapas' : seccion;
  const secciones = SECCIONES.filter(s => !esPublicado || s.id !== 'excel');

  function importado() {
    model.recargar();
    setImportacionReciente(true);
    setSeccion('etapas');
  }

  function navegar(id: Seccion) {
    setSeccion(id);
    setImportacionReciente(false);
  }

  return <Card className="p-5 space-y-5">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div className="space-y-1">
        <h2 className="text-lg font-semibold text-brand-900">Configuración del proyecto</h2>
        <p className="text-sm text-brand-600">{esPublicado ? 'Proyecto publicado' : `Borrador ${respuesta.version ? `v${respuesta.version}` : 'sin guardar'}`}
          {' · '}{respuesta.lotes.length} lotes{' · '}{datos.etapas.length} etapas comerciales
          {' · '}{(datos.tarifas ?? []).length} tarifas</p>
        <p className="text-xs text-brand-500">{esPublicado ? 'Configuración inicial cerrada. Realiza ajustes mediante los CRUD.' : 'Revisa las etapas, asignaciones y tarifas antes de publicar.'}</p>
      </div>
      {!esPublicado && <div className="flex items-center gap-2">
        {hayCambios && <span className="text-xs text-amber-800">Cambios sin guardar</span>}
        <Button variant="primary" icon={SaveIcon} disabled={bloqueado || !hayCambios}
          onClick={() => void model.guardar()}>
          {guardando ? 'Guardando…' : 'Guardar cambios'}
        </Button>
      </div>}
    </div>

    <nav aria-label="Secciones de configuración comercial" className="grid grid-cols-2 gap-2 md:grid-cols-3 xl:grid-cols-5">
      {secciones.map(({ id, nombre, icono: Icono }) =>
        <button key={id} type="button" aria-current={seccionVisible === id ? 'page' : undefined}
          onClick={() => navegar(id)}
          className={`flex min-h-12 items-center justify-center gap-2 rounded-lg border px-3 py-2 text-xs font-semibold transition-colors ${seccionVisible === id
            ? 'border-[#4cbb17] bg-[#4cbb17]/10 text-brand-900 shadow-sm'
            : 'border-brand-200 bg-white text-brand-600 hover:bg-brand-50'}`}>
          <Icono className="h-4 w-4 shrink-0" aria-hidden="true"/>{nombre}
        </button>)}
    </nav>

    {importacionReciente && <div role="status" className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900">
      <span>Importación registrada. Las etapas, lotes y tarifas se han consultado nuevamente; revisa la información antes de publicar.</span>
      <Button size="sm" onClick={() => navegar('publicacion')}>Preparar publicación</Button>
    </div>}

    {error && <div role="alert" className="flex flex-wrap items-center justify-between gap-2 rounded-md bg-red-50 p-3 text-sm text-red-700">
      {error}<Button size="sm" onClick={model.recargar} disabled={guardando}>Volver a consultar</Button>
    </div>}

    <div className="min-w-0">
      {seccionVisible === 'excel' && <ProjectImportPreparation project={project} disabledByDraft={hayCambios}
        onImportCompleted={importado}/>}
      {seccionVisible === 'etapas' && <fieldset disabled={bloqueado}>
        <CommercialStageEditor datos={datos} catalogos={respuesta} projectName={project.nombre} readOnly={bloqueado} onChange={model.setDatos}/>
      </fieldset>}
      {seccionVisible === 'asignaciones' && <fieldset disabled={bloqueado}>
        <CommercialAssignmentEditor datos={datos} catalogos={respuesta} onChange={model.setDatos}/>
      </fieldset>}
      {seccionVisible === 'tarifas' && <fieldset disabled={bloqueado}>
        <CommercialTariffEditor datos={datos} catalogos={respuesta} onChange={model.setDatos}/>
      </fieldset>}
      {seccionVisible === 'publicacion' && <CommercialPublicationPanel project={project}
        config={respuesta} dirty={hayCambios || guardando} onPublished={model.recargar}/>}
    </div>
    <p className="rounded-lg bg-brand-50 px-3 py-2 text-xs text-brand-600">
      {esPublicado ? 'La importación masiva y las nuevas publicaciones están cerradas. La configuración inicial se conserva como referencia histórica.' : 'La importación y los cambios manuales preparan un borrador. Solo «Publicación» aplica la configuración inicial.'}
    </p>
  </Card>;
}
