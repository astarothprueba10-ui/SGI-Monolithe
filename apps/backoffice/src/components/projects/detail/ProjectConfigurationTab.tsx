import { useState } from 'react';
import { ArrowLeftIcon, ArrowRightIcon, CheckCircle2Icon, LockIcon } from 'lucide-react';
import { Button } from '../../ui/Button';
import { Card } from '../../ui/Card';
import { useAuth } from '../../../contexts/AuthContext';
import { useProjectConfiguration } from '../../../hooks/useProjectConfiguration';
import { projectConfigurationService } from '../../../services/projectConfigurationService';
import { CommercialStageEditor } from './CommercialStageEditor';
import { CommercialAssignmentEditor } from './CommercialAssignmentEditor';
import { ProjectImportPreparation } from './ProjectImportPreparation';
import { CommercialTariffEditor } from './CommercialTariffEditor';
import { CommercialStageReleaseSelector } from './CommercialStageReleaseSelector';
import { CommercialPublicationPanel } from './CommercialPublicationPanel';
import { CommercialZoneLegend } from './CommercialZoneLegend';
import { CommercialManagementPanel } from './CommercialManagementPanel';
import { PASOS_CONFIGURACION, validarPasoInicial, agruparIncidencias, filtrarSeleccion } from '../../../lib/projectSetupWizard';
import { seleccionInicial } from '../../../lib/commercialPresentation';
import type { ProyectoResponse } from '../../../types/core';

export function ProjectConfigurationTab({ project }: { project: ProyectoResponse }) {
  const model = useProjectConfiguration(project.idProyecto);
  const { can } = useAuth();
  const [paso, setPaso] = useState(0);
  const [procesando, setProcesando] = useState(false);
  const [importando, setImportando] = useState(false);
  const [finalizando, setFinalizando] = useState(false);
  const [importadoSesion, setImportadoSesion] = useState(false);
  const [seleccion, setSeleccion] = useState<string[] | null>(null);
  const [aviso, setAviso] = useState('');
  const [incidencias, setIncidencias] = useState<ReturnType<typeof agruparIncidencias>>([]);
  const { datos, respuesta, publicada, lotesRegistrados, importacionRealizada, error, guardando } = model;

  if (!datos || !respuesta || publicada === null || lotesRegistrados === null) return <Card className="p-5">
    <p className="text-sm text-brand-700">{error || 'Cargando configuración comercial…'}</p>
    {error && <Button onClick={model.recargar}>Reintentar</Button>}
  </Card>;

  if (publicada > 0) return <CommercialManagementPanel config={respuesta} version={publicada} project={project}/>;

  const config = { ...respuesta, datos };
  const hayCambios = JSON.stringify(datos) !== JSON.stringify(respuesta.datos);
  const ocupado = guardando || procesando || importando || finalizando;
  const editable = project.activo && can('lots.edit');
  const bloqueado = ocupado || !editable;
  const importacionPermitida = lotesRegistrados < 10 && !importadoSesion && importacionRealizada === 0;
  const estructuraCerrada = !importacionPermitida;
  const etapasHabilitar = filtrarSeleccion(seleccion ?? seleccionInicial(config), config);

  function importado() {
    model.recargar();
    setImportadoSesion(true);
    setPaso(1);
    setAviso('');
    setIncidencias([]);
  }

  function volver(destino: number) {
    if (ocupado || destino >= paso || destino < 0) return;
    setPaso(destino); setAviso(''); setIncidencias([]);
  }

  async function continuar() {
    if (bloqueado || paso >= 5) return;
    setAviso(''); setIncidencias([]);
    const fallo = validarPasoInicial(paso, config);
    if (fallo) { setAviso(fallo); return; }
    setProcesando(true);
    try {
      let guardada = respuesta!;
      if (hayCambios || (paso === 3 && respuesta!.version === 0)) {
        const nueva = await model.guardarYObtener();
        if (!nueva) return;
        guardada = nueva;
      }
      if (paso === 3) {
        // Consulta de solo lectura: comprueba precios de todas las etapas, incluso las cerradas.
        const revision = await projectConfigurationService.revisarPublicacion(project.idProyecto, guardada.version, []);
        const grupos = agruparIncidencias(revision.lotes);
        if (grupos.length) {
          setIncidencias(grupos);
          setAviso('Corrige estas incidencias antes de continuar a Disponibilidad.');
          return;
        }
        setSeleccion(prev => filtrarSeleccion(prev ?? seleccionInicial(guardada), guardada));
      }
      setPaso(p => p + 1);
    } catch (e: unknown) {
      setAviso(e instanceof Error ? e.message : 'No se pudo validar este paso. Intenta nuevamente.');
    } finally { setProcesando(false); }
  }

  return <Card className="p-5 space-y-5">
    <header className="flex flex-wrap justify-between items-start gap-3">
      <div>
        <h2 className="text-lg font-semibold text-brand-900">Configuración inicial del proyecto</h2>
        <p className="text-sm text-brand-600">Completa los pasos una sola vez para iniciar la comercialización.</p>
        <p className="mt-1 text-xs text-brand-500">{respuesta.lotes.length} lotes activos · {datos.etapas.length} etapas · {(datos.tarifas ?? []).length} tarifas</p>
      </div>
      <span className="rounded-full bg-brand-50 px-3 py-1 text-sm font-medium text-brand-700">Paso {paso+1} de {PASOS_CONFIGURACION.length}</span>
    </header>
    <nav aria-label="Pasos de configuración inicial">
      <ol className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-6">
        {PASOS_CONFIGURACION.map((nombre, i) => <li key={nombre}>
          <button type="button" disabled={ocupado || i >= paso} onClick={() => volver(i)} aria-current={i === paso ? 'step' : undefined}
            className={`w-full min-h-16 rounded-lg border p-3 text-left text-xs ${i === paso ? 'border-[#4cbb17] bg-[#4cbb17]/10 text-brand-900' : i < paso ? 'border-brand-200 text-brand-700' : 'border-gray-200 bg-gray-50 text-gray-400'} disabled:cursor-default`}>
            <span className="flex items-center gap-2 font-semibold">{i < paso ? <CheckCircle2Icon className="h-4 w-4 text-emerald-600"/> : <span>{i+1}.</span>}{nombre}</span>
            <span className="mt-1 block">{i === paso ? 'En curso' : i < paso ? 'Revisado' : 'Pendiente'}</span>
          </button>
        </li>)}
      </ol>
    </nav>
    {!editable && <p role="status" className="text-sm text-brand-600">Se requiere un proyecto activo y permiso de edición de lotes para completar la configuración.</p>}
    {paso === 0 && <section className="space-y-4">
      <div className="rounded-lg border border-brand-200 p-4">
        <h3 className="font-semibold text-brand-900">Origen de los datos</h3>
        <p className="mt-1 text-sm text-brand-600">{lotesRegistrados ? `Se encontraron ${lotesRegistrados} lotes registrados. Puedes continuar con el inventario existente.` : 'Importa el inventario o regístralo desde los formularios del proyecto.'}</p>
      </div>
      {importacionPermitida ? <ProjectImportPreparation project={project} disabledByDraft={hayCambios} onImportCompleted={importado} onBusyChange={setImportando}/>
        : <div className="flex items-center gap-3 rounded-lg border border-gray-200 bg-gray-100 p-4 text-gray-500"><LockIcon className="h-5 w-5"/><div><p className="font-medium">Importar Excel</p><p className="text-xs">Carga masiva cerrada. Se conserva el inventario registrado.</p></div></div>}
    </section>}
    {paso === 1 && <section className="space-y-3">
      {estructuraCerrada && <p className="flex items-center gap-2 rounded-md bg-gray-100 p-3 text-sm text-gray-600"><LockIcon className="h-4 w-4"/> Solo consulta. Edita los datos desde la pestaña principal Etapas comerciales del proyecto.</p>}
      <fieldset disabled={bloqueado || estructuraCerrada}><CommercialStageEditor datos={datos} catalogos={respuesta} projectName={project.nombre} readOnly={bloqueado || estructuraCerrada} onChange={model.setDatos}/></fieldset>
    </section>}
    {paso === 2 && <fieldset disabled={bloqueado}>
      {estructuraCerrada ? <p className="mb-3 flex items-center gap-2 rounded-md bg-gray-100 p-3 text-sm text-gray-600"><LockIcon className="h-4 w-4"/> Solo consulta. Realiza las asignaciones desde las pestañas principales Manzanas y Lotes.</p> : <p className="mb-3 text-sm text-brand-600">Asigna cada manzana a una etapa de venta. Solo crea excepciones si un lote necesita otra etapa.</p>}
      <CommercialAssignmentEditor datos={datos} catalogos={respuesta} readOnly={estructuraCerrada} onChange={model.setDatos}/>
    </fieldset>}
    {paso === 3 && <fieldset disabled={bloqueado}>
      <CommercialZoneLegend projectId={project.idProyecto} codigos={respuesta.zonas}/>
      <CommercialTariffEditor datos={datos} catalogos={respuesta} onChange={model.setDatos}/>
      <p className="mt-3 text-xs text-brand-600">Al continuar se guardarán los cambios y el servidor validará los precios de los lotes antes de abrir etapas.</p>
    </fieldset>}
    {paso === 4 && <CommercialStageReleaseSelector config={config} seleccion={etapasHabilitar} disabled={bloqueado}
      onChange={(codigo, marcada) => setSeleccion(marcada ? [...etapasHabilitar.filter(c => c !== codigo),codigo] : etapasHabilitar.filter(c => c !== codigo))}/>}
    {paso === 5 && <CommercialPublicationPanel project={project} config={respuesta} dirty={hayCambios || guardando}
      etapasSeleccionadas={etapasHabilitar} onPublished={model.recargar} onReviewTariffs={() => volver(3)} onBusyChange={setFinalizando}/>}
    {error && <div role="alert" className="rounded-md bg-red-50 p-3 text-sm text-red-700">{error} <Button size="sm" disabled={ocupado} onClick={() => { if (!hayCambios || window.confirm('¿Descartar los cambios sin guardar y recargar?')) model.recargar(); }}>Recargar datos</Button></div>}
    {aviso && <p role="alert" className="rounded-md bg-amber-50 p-3 text-sm text-amber-900">{aviso}</p>}
    {incidencias.length > 0 && <div role="alert" className="space-y-2 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">
      {incidencias.map(g => <details key={g.mensaje}><summary className="cursor-pointer font-medium">{g.mensaje} ({g.lotes.length} lotes)</summary><p className="mt-1">{g.lotes.join(', ')}</p></details>)}
      <p>Si faltan zonas o existen ajustes de tipo incompatibles, corrige esos registros antes de continuar.</p>
    </div>}
    <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-brand-100 pt-4">
      <Button icon={ArrowLeftIcon} disabled={paso===0 || ocupado} onClick={() => volver(paso-1)}>Anterior</Button>
      <span className="text-xs text-brand-500">{hayCambios ? 'Cambios pendientes de guardar' : 'Los cambios se conservan al avanzar'}</span>
      {paso < 5 && <Button variant="primary" iconRight={ArrowRightIcon} disabled={bloqueado} onClick={() => void continuar()}>
        {procesando || guardando ? 'Validando…' : paso === 0 ? 'Continuar con inventario' : paso === 3 ? 'Validar precios y continuar' : estructuraCerrada && (paso===1 || paso===2) ? 'Continuar' : 'Guardar y continuar'}
      </Button>}
    </footer>
  </Card>;
}
