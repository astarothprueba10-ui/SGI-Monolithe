import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { ApiError } from '../lib/apiClient';
import { changeProjectField, initialProjectForm, projectRequest } from '../lib/projectForm';
import { validateProjectForm } from '../lib/projectFormValidation';
import { validateProjectDates } from '../lib/projectDateValidation';
import { coreService } from '../services/coreService';
import type { ProjectFormErrors, ProjectFormProps, ProjectFormValues, Ubigeo } from '../types/projectForm';
import { useProjectCatalogs } from './useProjectCatalogs';

function useProjectEditor(props: ProjectFormProps, rows: Ubigeo[]) {
  const { open, project } = props;
  const [state, setState] = useState({ form: initialProjectForm(project), errors: {} as ProjectFormErrors });
  useEffect(() => {
    if (open) setState({ form: initialProjectForm(project), errors: {} });
  }, [open, project]);
  const setErrors = (errors: ProjectFormErrors) => setState((previous) => ({ ...previous, errors }));
  const change = (field: keyof ProjectFormValues, value: string | boolean) =>
    setState((previous) => changeProjectField(previous.form, previous.errors, field, value, rows));
  const invalidate = (field: keyof ProjectFormValues) => setState((previous) => ({ ...previous, errors: {
    ...previous.errors, ...validateProjectDates(previous.form),
    [field]: validateProjectForm(previous.form, rows)[field] ??
      (field.startsWith('fecha') ? 'Ingresa una fecha válida (año 0001 a 9999).' : 'Revisa este campo.')
  } }));
  return { ...state, setErrors, change, invalidate };
}

function apiErrors(error: unknown): ProjectFormErrors {
  if (!(error instanceof ApiError)) return { general: 'No se pudo guardar el proyecto. Vuelve a intentarlo.' };
  const data = error.data as { errores?: Record<string, string>; message?: string } | null;
  return { ...data?.errores, general: data?.message ?? error.message };
}

async function persistProject(props: ProjectFormProps, form: ProjectFormValues, rows: Ubigeo[]) {
  const request = projectRequest(form, rows);
  if (props.project) await coreService.updateProject(props.project.idProyecto, request);
  else await coreService.createProject(request);
  toast.success(props.project ? 'Proyecto actualizado correctamente.' : 'Proyecto creado correctamente.');
}

function useProjectSubmit(props: ProjectFormProps, editor: ReturnType<typeof useProjectEditor>,
  catalogs: ReturnType<typeof useProjectCatalogs>) {
  const [submitting, setSubmitting] = useState(false);
  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (submitting || catalogs.loading || catalogs.error) return;
    const errors = validateProjectForm(editor.form, catalogs.ubigeos);
    editor.setErrors(errors);
    if (Object.keys(errors).length) return;
    setSubmitting(true);
    try {
      await persistProject(props, editor.form, catalogs.ubigeos);
      props.onClose();
      await props.onSuccess();
    } catch (error: unknown) { editor.setErrors(apiErrors(error)); }
    finally { setSubmitting(false); }
  };
  return { submitting, submit };
}

/** Coordina edición, catálogos y envío compartidos por crear y editar proyectos. */
export function useProjectForm(props: ProjectFormProps) {
  const catalogs = useProjectCatalogs(props.open);
  const editor = useProjectEditor(props, catalogs.ubigeos);
  const submission = useProjectSubmit(props, editor, catalogs);
  return { ...editor, ...submission, catalogs, isEdit: props.project != null };
}

/** Estado y acciones que consumen los campos del formulario. */
export type ProjectFormModel = ReturnType<typeof useProjectForm>;
