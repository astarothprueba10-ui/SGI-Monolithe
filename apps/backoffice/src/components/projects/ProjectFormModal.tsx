import { useEffect, useReducer, useRef, useState } from 'react';
import { toast } from 'sonner';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { FieldLabel, Input, Select } from '../ui/Field';
import { ApiError } from '../../lib/apiClient';
import { coreService } from '../../services/coreService';
import type { ProyectoRequest, ProyectoResponse, CatalogoResponse } from '../../types/core';

// ---------- tipos ----------

interface Props {
  open: boolean;
  onClose: () => void;
  onSuccess: () => Promise<void>;
  project?: ProyectoResponse | null;
}

interface FormState {
  codigoEstadoProyecto: string;
  codigo: string;
  nombre: string;
  descripcion: string;
  direccion: string;
  ubicacionReferencia: string;
  distrito: string;
  provincia: string;
  departamento: string;
  pais: string;
  latitud: string;
  longitud: string;
  areaTotalM2: string;
  fechaInicio: string;
  fechaFinEstimada: string;
  activo: boolean;
}

type FieldErrors = Partial<Record<keyof FormState | 'general', string>>;

function initForm(project?: ProyectoResponse | null): FormState {
  if (!project) {
    return {
      codigoEstadoProyecto: '',
      codigo: '',
      nombre: '',
      descripcion: '',
      direccion: '',
      ubicacionReferencia: '',
      distrito: '',
      provincia: '',
      departamento: '',
      pais: 'Perú',
      latitud: '',
      longitud: '',
      areaTotalM2: '',
      fechaInicio: '',
      fechaFinEstimada: '',
      activo: true
    };
  }
  return {
    codigoEstadoProyecto: project.codigoEstadoProyecto ?? '',
    codigo: project.codigo ?? '',
    nombre: project.nombre ?? '',
    descripcion: project.descripcion ?? '',
    direccion: project.direccion ?? '',
    ubicacionReferencia: project.ubicacionReferencia ?? '',
    distrito: project.distrito ?? '',
    provincia: project.provincia ?? '',
    departamento: project.departamento ?? '',
    pais: project.pais ?? 'Perú',
    latitud: project.latitud != null ? String(project.latitud) : '',
    longitud: project.longitud != null ? String(project.longitud) : '',
    areaTotalM2: project.areaTotalM2 != null ? String(project.areaTotalM2) : '',
    fechaInicio: project.fechaInicio ?? '',
    fechaFinEstimada: project.fechaFinEstimada ?? '',
    activo: project.activo ?? true
  };
}

function parseOptionalNumber(value: string): number | null {
  const trimmed = value.trim();
  if (trimmed === '') return null;
  const n = Number(trimmed);
  return isNaN(n) ? null : n;
}

function parseOptionalString(value: string): string | null {
  const trimmed = value.trim();
  return trimmed === '' ? null : trimmed;
}

function buildRequest(form: FormState): ProyectoRequest {
  return {
    codigoEstadoProyecto: form.codigoEstadoProyecto.trim(),
    codigo: form.codigo.trim(),
    nombre: form.nombre.trim(),
    descripcion: parseOptionalString(form.descripcion),
    direccion: parseOptionalString(form.direccion),
    ubicacionReferencia: parseOptionalString(form.ubicacionReferencia),
    distrito: parseOptionalString(form.distrito),
    provincia: parseOptionalString(form.provincia),
    departamento: parseOptionalString(form.departamento),
    pais: parseOptionalString(form.pais),
    latitud: parseOptionalNumber(form.latitud),
    longitud: parseOptionalNumber(form.longitud),
    areaTotalM2: parseOptionalNumber(form.areaTotalM2),
    fechaInicio: parseOptionalString(form.fechaInicio),
    fechaFinEstimada: parseOptionalString(form.fechaFinEstimada),
    activo: form.activo
  };
}

function validate(form: FormState): FieldErrors {
  const errors: FieldErrors = {};

  if (!form.codigoEstadoProyecto.trim()) {
    errors.codigoEstadoProyecto = 'El estado es obligatorio.';
  }

  const codigo = form.codigo.trim();

  if (!codigo) {
    errors.codigo = 'El código del proyecto es obligatorio.';
  } else if (codigo.length < 5 || codigo.length > 12) {
    errors.codigo = 'El código debe tener entre 5 y 12 caracteres.';
  }

  const nombre = form.nombre.trim();

  if (!nombre) {
    errors.nombre = 'El nombre es obligatorio.';
  } else if (nombre.length > 150) {
    errors.nombre = 'El nombre no puede superar los 150 caracteres.';
  }

  if (form.latitud.trim() !== '') {
    const lat = Number(form.latitud);

    if (Number.isNaN(lat) || lat < -90 || lat > 90) {
      errors.latitud = 'La latitud debe estar entre -90 y 90.';
    }
  }

  if (form.longitud.trim() !== '') {
    const lng = Number(form.longitud);

    if (Number.isNaN(lng) || lng < -180 || lng > 180) {
      errors.longitud = 'La longitud debe estar entre -180 y 180.';
    }
  }

  if (form.areaTotalM2.trim() !== '') {
    const area = Number(form.areaTotalM2);

    if (Number.isNaN(area) || area <= 0) {
      errors.areaTotalM2 = 'El área debe ser mayor a 0.';
    }
  }

  if (
    form.fechaInicio &&
    form.fechaFinEstimada &&
    form.fechaFinEstimada < form.fechaInicio
  ) {
    errors.fechaFinEstimada =
      'La fecha fin no puede ser anterior a la fecha inicio.';
  }

  return errors;
}

const SectionLabel = ({ children }: { children: string }) => (
  <p className="col-span-full mb-1 mt-4 border-l-2 border-[#4cbb17] pl-2 text-[11px] font-semibold uppercase tracking-widest text-brand-500 first:mt-0">
    {children}
  </p>
);

const Field = ({
  id,
  label,
  required,
  children,
  error
}: {
  id: string;
  label: string;
  required?: boolean;
  children: React.ReactNode;
  error?: string;
}) => (
  <div className="flex flex-col gap-1">
    <FieldLabel htmlFor={id}>
      {label}
      {required && <span className="ml-1 text-rose-500">*</span>}
    </FieldLabel>
    {children}
    {error && <p className="text-[11px] text-rose-600">{error}</p>}
  </div>
);

// ---------- componente ----------

export function ProjectFormModal({ open, onClose, onSuccess, project }: Props) {
  const isEdit = project != null;
  const [form, setForm] = useReducer(
    (prev: FormState, patch: Partial<FormState>) => ({ ...prev, ...patch }),
    initForm(project)
  );
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  
  const [submitting, setSubmitting] = useReducer((_: boolean, v: boolean) => v, false);
  const [statuses, setStatuses] = useReducer(
    (_: CatalogoResponse[], v: CatalogoResponse[]) => v,
    [] as CatalogoResponse[]
  );
  const statusesLoadedRef = useRef(false);

  // Reiniciar formulario cuando cambia el proyecto o se abre el modal
  useEffect(() => {
    if (open) {
      setForm(initForm(project));
      setFieldErrors({} as FieldErrors);
      setSubmitting(false);

      if (!statusesLoadedRef.current || statuses.length === 0) {
        coreService.getProjectStatuses().then((res) => {
          setStatuses(res);
          statusesLoadedRef.current = true;
        }).catch(() => { });
      }
    }
  }, [open, project]);

  const set = (field: keyof FormState) =>
    (
      e: React.ChangeEvent<
        HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
      >
    ) => {
      const nextForm = {
        ...form,
        [field]: e.target.value
      };

      setForm({ [field]: e.target.value } as Partial<FormState>);

      const nextErrors = validate(nextForm);

      setFieldErrors({
        [field]: nextErrors[field]
      } as FieldErrors);

      // Las fechas dependen una de la otra
      if (field === 'fechaInicio' || field === 'fechaFinEstimada') {
        setFieldErrors({
          fechaFinEstimada: nextErrors.fechaFinEstimada
        } as FieldErrors);
      }
    };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const errors = validate(form);
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    const payload = buildRequest(form);
    setSubmitting(true);
    setFieldErrors({} as FieldErrors);

    try {
      if (isEdit) {
        await coreService.updateProject(project!.idProyecto, payload);
        toast.success('Proyecto actualizado correctamente.');
      } else {
        await coreService.createProject(payload);
        toast.success('Proyecto creado correctamente.');
      }
      await onSuccess();
      onClose();
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        const data = err.data as any;
        if (data?.errores && typeof data.errores === 'object') {
          const mapped: FieldErrors = {};
          for (const [campo, msg] of Object.entries(data.errores)) {
            const key = campo as keyof FormState;
            mapped[key] = String(msg);
          }
          mapped.general = data.message ?? 'Existen errores de validación.';
          setFieldErrors(mapped);
        } else {
          const msg = data?.message ?? err.message ?? 'Error desconocido.';
          setFieldErrors({ general: msg } as FieldErrors);
        }
      } else {
        setFieldErrors({ general: 'Ocurrió un error inesperado.' } as FieldErrors);
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={submitting ? () => { } : onClose}
      title={isEdit ? 'Editar proyecto' : 'Nuevo proyecto'}
      description={
        isEdit
          ? `Modificando: ${project!.nombre}`
          : 'Completa los datos del nuevo proyecto inmobiliario.'
      }
      width="max-w-3xl"
      footer={
        <>
          <Button
            type="button"
            variant="ghost"
            onClick={onClose}
            disabled={submitting}
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            form="project-form"
            disabled={submitting}
            className="bg-brand-900 text-white hover:bg-brand-800 border border-[#4cbb17]/40 shadow-sm disabled:opacity-60"
          >
            {submitting
              ? isEdit ? 'Guardando...' : 'Creando...'
              : isEdit ? 'Guardar cambios' : 'Crear proyecto'}
          </Button>
        </>
      }
    >
      <form
        id="project-form"
        onSubmit={handleSubmit}
        className="grid grid-cols-1 gap-x-5 gap-y-3 sm:grid-cols-2"
      >
        {fieldErrors.general && (
          <div className="col-span-full rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {fieldErrors.general}
          </div>
        )}

        <SectionLabel>Información general</SectionLabel>

        <Field id="codigo" label="Código" required error={fieldErrors.codigo}>
          <Input
            id="codigo"
            value={form.codigo}
            onChange={set('codigo')}
            maxLength={30}
            placeholder="Ej. PROJ-001"
          />
        </Field>

        <Field id="nombre" label="Nombre" required error={fieldErrors.nombre}>
          <Input
            id="nombre"
            value={form.nombre}
            onChange={set('nombre')}
            maxLength={150}
            placeholder="Nombre del proyecto"
          />
        </Field>

        <Field
          id="codigoEstadoProyecto"
          label="Estado"
          required
          error={fieldErrors.codigoEstadoProyecto}
        >
          <Select
            id="codigoEstadoProyecto"
            value={form.codigoEstadoProyecto}
            onChange={set('codigoEstadoProyecto')}
          >
            <option value="">Selecciona un estado</option>
            {statuses.map((s) => (
              <option key={s.codigo} value={s.codigo}>
                {s.nombre}
              </option>
            ))}
          </Select>
        </Field>

        <Field id="activo" label="Activo">
          <Select
            id="activo"
            value={form.activo ? 'true' : 'false'}
            onChange={(e) => setForm({ activo: e.target.value === 'true' })}
          >
            <option value="true">Sí</option>
            <option value="false">No</option>
          </Select>
        </Field>

        <div className="col-span-full">
          <Field id="descripcion" label="Descripción" error={fieldErrors.descripcion}>
            <textarea
              id="descripcion"
              rows={3}
              value={form.descripcion}
              onChange={set('descripcion')}
              className="w-full rounded-md border border-brand-200 bg-white px-3 py-2 text-[13px] text-brand-800 placeholder:text-brand-300 transition-colors duration-150 hover:border-brand-300 focus:border-brand-500 focus:outline-none resize-none"
              placeholder="Descripción del proyecto (opcional)"
            />
          </Field>
        </div>

        <SectionLabel>Ubicación</SectionLabel>

        <div className="col-span-full">
          <Field id="direccion" label="Dirección" error={fieldErrors.direccion}>
            <Input
              id="direccion"
              value={form.direccion}
              onChange={set('direccion')}
              maxLength={255}
              placeholder="Dirección exacta"
            />
          </Field>
        </div>

        <div className="col-span-full">
          <Field
            id="ubicacionReferencia"
            label="Referencia de ubicación"
            error={fieldErrors.ubicacionReferencia}
          >
            <Input
              id="ubicacionReferencia"
              value={form.ubicacionReferencia}
              onChange={set('ubicacionReferencia')}
              maxLength={255}
              placeholder="Ej. Frente al mercado central"
            />
          </Field>
        </div>

        <Field id="distrito" label="Distrito" error={fieldErrors.distrito}>
          <Input
            id="distrito"
            value={form.distrito}
            onChange={set('distrito')}
            maxLength={100}
          />
        </Field>

        <Field id="provincia" label="Provincia" error={fieldErrors.provincia}>
          <Input
            id="provincia"
            value={form.provincia}
            onChange={set('provincia')}
            maxLength={100}
          />
        </Field>

        <Field id="departamento" label="Departamento" error={fieldErrors.departamento}>
          <Input
            id="departamento"
            value={form.departamento}
            onChange={set('departamento')}
            maxLength={100}
          />
        </Field>

        <Field id="pais" label="País" error={fieldErrors.pais}>
          <Input
            id="pais"
            value={form.pais}
            onChange={set('pais')}
            maxLength={100}
          />
        </Field>

        <SectionLabel>Dimensiones y coordenadas</SectionLabel>

        <Field id="areaTotalM2" label="Área total (m²)" error={fieldErrors.areaTotalM2}>
          <Input
            id="areaTotalM2"
            type="text"
            inputMode="decimal"
            value={form.areaTotalM2}
            onChange={set('areaTotalM2')}
            placeholder="Ej. 50000"
          />
        </Field>

        <div className="sm:col-span-1" />

        <Field id="latitud" label="Latitud" error={fieldErrors.latitud}>
          <Input
            id="latitud"
            type="text"
            inputMode="decimal"
            value={form.latitud}
            onChange={set('latitud')}
            placeholder="-90 a 90"
          />
        </Field>

        <Field id="longitud" label="Longitud" error={fieldErrors.longitud}>
          <Input
            id="longitud"
            type="text"
            inputMode="decimal"
            value={form.longitud}
            onChange={set('longitud')}
            placeholder="-180 a 180"
          />
        </Field>

        <SectionLabel>Fechas</SectionLabel>

        <Field id="fechaInicio" label="Fecha de inicio" error={fieldErrors.fechaInicio}>
          <Input
            id="fechaInicio"
            type="date"
            value={form.fechaInicio}
            onChange={set('fechaInicio')}
          />
        </Field>

        <Field
          id="fechaFinEstimada"
          label="Fecha fin estimada"
          error={fieldErrors.fechaFinEstimada}
        >
          <Input
            id="fechaFinEstimada"
            type="date"
            value={form.fechaFinEstimada}
            onChange={set('fechaFinEstimada')}
          />
        </Field>
      </form>
    </Modal>
  );
}
