import { useProjectForm, type ProjectFormModel } from '../../hooks/useProjectForm';
import type { ProjectFormProps } from '../../types/projectForm';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';
import { ProjectFormFields } from './ProjectFormFields';

function ProjectFooter({ model, onClose }: { model: ProjectFormModel; onClose: () => void }) {
  return <>
    <Button type="button" variant="ghost" onClick={onClose} disabled={model.submitting}>Cancelar</Button>
    <Button type="submit" form="project-form" disabled={model.submitting || model.catalogs.loading || Boolean(model.catalogs.error)}
      className="border border-[#4cbb17]/40 bg-brand-900 text-white shadow-sm hover:bg-brand-800 disabled:opacity-60">
      {model.submitting ? 'Guardando...' : model.isEdit ? 'Guardar cambios' : 'Crear proyecto'}
    </Button>
  </>;
}

function CatalogNotice({ model }: { model: ProjectFormModel }) {
  if (model.catalogs.loading) return <p className="col-span-full text-sm text-brand-500" role="status">Cargando listas de ubicación y estados...</p>;
  if (!model.catalogs.error) return null;
  return <div className="col-span-full rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700" role="alert">
    {model.catalogs.error}
    <button type="button" onClick={model.catalogs.retry} className="ml-2 font-semibold underline">Reintentar</button>
  </div>;
}

/** Crea y edita proyectos con catálogos oficiales y validación de fechas en ambos sentidos. */
export function ProjectFormModal(props: ProjectFormProps) {
  const model = useProjectForm(props);
  return <Modal open={props.open} onClose={model.submitting ? () => undefined : props.onClose}
    title={model.isEdit ? 'Editar proyecto' : 'Nuevo proyecto'} width="max-w-3xl"
    description={props.project ? `Modificando: ${props.project.nombre}` : 'Completa los datos del nuevo proyecto inmobiliario.'}
    footer={<ProjectFooter model={model} onClose={props.onClose} />}>
    <form id="project-form" onSubmit={model.submit} className="grid grid-cols-1 gap-x-5 gap-y-3 sm:grid-cols-2">
      <CatalogNotice model={model} />
      {model.errors.general && <p role="alert" className="col-span-full rounded-md bg-red-50 p-3 text-sm text-red-700">{model.errors.general}</p>}
      <fieldset disabled={model.submitting || model.catalogs.loading || Boolean(model.catalogs.error)} className="contents">
        <ProjectFormFields model={model} />
      </fieldset>
    </form>
  </Modal>;
}
