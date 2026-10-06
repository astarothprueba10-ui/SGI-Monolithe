import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { FieldLabel, Input, Select } from '../ui/Field';
import { ApiError } from '../../lib/apiClient';
import { coreService } from '../../services/coreService';
import type { EtapaRequest, EtapaResponse, CatalogoResponse, ProyectoResponse } from '../../types/core';

interface Props {
  open: boolean;
  onClose: () => void;
  onSuccess: () => Promise<void>;
  project: ProyectoResponse;
  stage?: EtapaResponse | null;
}

interface FormState {
  codigoEstadoEtapa: string;
  codigo: string;
  nombre: string;
  descripcion: string;
  numeroOrden: string;
  fechaInicio: string;
  fechaFinEstimada: string;
  activo: boolean;
}

type FieldErrors = Partial<Record<keyof FormState | 'general', string>>;

function initForm(stage?: EtapaResponse | null): FormState {
  if (!stage) {
    return {
      codigoEstadoEtapa: '',
      codigo: '',
      nombre: '',
      descripcion: '',
      numeroOrden: '',
      fechaInicio: '',
      fechaFinEstimada: '',
      activo: true
    };
  }
  return {
    codigoEstadoEtapa: stage.codigoEstadoEtapa ?? '',
    codigo: stage.codigo ?? '',
    nombre: stage.nombre ?? '',
    descripcion: stage.descripcion ?? '',
    numeroOrden: stage.numeroOrden != null ? String(stage.numeroOrden) : '',
    fechaInicio: stage.fechaInicio ?? '',
    fechaFinEstimada: stage.fechaFinEstimada ?? '',
    activo: stage.activo ?? true
  };
}

function parseOptionalNumber(value: string): number | null {
  const trimmed = value.trim();
  if (trimmed === '') return null;
  const n = Number(trimmed);
  return Number.isNaN(n) ? null : n;
}

function parseOptionalString(value: string): string | null {
  const trimmed = value.trim();
  return trimmed === '' ? null : trimmed;
}

function buildRequest(idProyecto: number, form: FormState): EtapaRequest {
  return {
    idProyecto,
    codigoEstadoEtapa: form.codigoEstadoEtapa.trim(),
    codigo: form.codigo.trim(),
    nombre: form.nombre.trim(),
    descripcion: parseOptionalString(form.descripcion),
    numeroOrden: parseOptionalNumber(form.numeroOrden),
    fechaInicio: parseOptionalString(form.fechaInicio),
    fechaFinEstimada: parseOptionalString(form.fechaFinEstimada),
    activo: form.activo
  };
}

function validate(form: FormState): FieldErrors {
  const errors: FieldErrors = {};

  if (!form.codigoEstadoEtapa.trim()) {
    errors.codigoEstadoEtapa = 'El estado es obligatorio.';
  }

  const codigo = form.codigo.trim();
  if (!codigo) {
    errors.codigo = 'El código es obligatorio.';
  } else if (codigo.length > 30) {
    errors.codigo = 'Máximo 30 caracteres.';
  }

  const nombre = form.nombre.trim();
  if (!nombre) {
    errors.nombre = 'El nombre es obligatorio.';
  } else if (nombre.length > 100) {
    errors.nombre = 'Máximo 100 caracteres.';
  }

  if (form.numeroOrden.trim() !== '') {
    const orden = Number(form.numeroOrden);
    if (Number.isNaN(orden) || orden < 1 || !Number.isInteger(orden)) {
      errors.numeroOrden = 'El número de orden debe ser un entero mayor o igual a 1.';
    }
  }

  if (form.fechaInicio && form.fechaFinEstimada && form.fechaFinEstimada < form.fechaInicio) {
    errors.fechaFinEstimada = 'La fecha fin no puede ser anterior a la fecha inicio.';
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

export function StageFormModal({ open, onClose, onSuccess, project, stage }: Props) {
  const isEdit = stage != null;
  const [form, setForm] = useState<FormState>(initForm(stage));
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [statuses, setStatuses] = useState<CatalogoResponse[]>([]);
  const statusesLoadedRef = useRef(false);

  useEffect(() => {
    if (open) {
      setForm(initForm(stage));
      setFieldErrors({});
      setSubmitting(false);

      if (!statusesLoadedRef.current || statuses.length === 0) {
        coreService.getStageStatuses().then((res) => {
          setStatuses(res);
          statusesLoadedRef.current = true;
        }).catch(() => {});
      }
    }
  }, [open, stage]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>,
    field: keyof FormState
  ) => {
    const value = e.target.type === 'checkbox' ? (e.target as HTMLInputElement).checked : e.target.value;
    
    const nextForm = { ...form, [field]: value };
    setForm(nextForm as any);

    const nextErrors = validate(nextForm as any);

    setFieldErrors(prev => ({
      ...prev,
      [field]: nextErrors[field]
    }));

    if (field === 'fechaInicio' || field === 'fechaFinEstimada') {
      setFieldErrors(prev => ({
        ...prev,
        fechaFinEstimada: nextErrors.fechaFinEstimada
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const errors = validate(form);
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    const payload = buildRequest(project.idProyecto, form);
    setSubmitting(true);
    setFieldErrors({});

    try {
      if (isEdit) {
        await coreService.updateStage(stage!.idEtapa, payload);
        toast.success('Etapa actualizada correctamente.');
      } else {
        await coreService.createStage(payload);
        toast.success('Etapa creada correctamente.');
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
          setFieldErrors({ general: msg });
        }
      } else {
        setFieldErrors({ general: 'Ocurrió un error inesperado.' });
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={submitting ? () => {} : onClose}
      title={isEdit ? 'Editar etapa' : 'Nueva etapa'}
      description={
        isEdit
          ? `Modificando: ${stage!.nombre}`
          : 'Completa los datos de la nueva etapa.'
      }
      width="max-w-2xl"
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
            form="stage-form"
            disabled={submitting}
            className="bg-brand-900 text-white hover:bg-brand-800 border border-[#4cbb17]/40 shadow-sm disabled:opacity-60"
          >
            {submitting
              ? isEdit ? 'Guardando...' : 'Creando...'
              : isEdit ? 'Guardar cambios' : 'Crear etapa'}
          </Button>
        </>
      }
    >
      <form
        id="stage-form"
        onSubmit={handleSubmit}
        className="grid grid-cols-1 gap-x-5 gap-y-3 sm:grid-cols-2"
      >
        <div className="col-span-full rounded-md border border-brand-200 bg-brand-50 p-3 text-sm">
          <p className="font-semibold text-brand-900">Proyecto:</p>
          <p className="text-brand-700">{project.nombre} ({project.codigo})</p>
        </div>

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
            onChange={(e) => handleChange(e, 'codigo')}
            maxLength={30}
            placeholder="Ej. ET-001"
          />
        </Field>

        <Field id="nombre" label="Nombre" required error={fieldErrors.nombre}>
          <Input
            id="nombre"
            value={form.nombre}
            onChange={(e) => handleChange(e, 'nombre')}
            maxLength={100}
            placeholder="Nombre de la etapa"
          />
        </Field>

        <Field
          id="codigoEstadoEtapa"
          label="Estado"
          required
          error={fieldErrors.codigoEstadoEtapa}
        >
          <Select
            id="codigoEstadoEtapa"
            value={form.codigoEstadoEtapa}
            onChange={(e) => handleChange(e, 'codigoEstadoEtapa')}
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
            onChange={(e) => handleChange(e, 'activo')}
          >
            <option value="true">Sí</option>
            <option value="false">No</option>
          </Select>
        </Field>

        <Field id="numeroOrden" label="Número de orden" error={fieldErrors.numeroOrden}>
          <Input
            id="numeroOrden"
            type="number"
            min="1"
            step="1"
            value={form.numeroOrden}
            onChange={(e) => handleChange(e, 'numeroOrden')}
            placeholder="Ej. 1"
          />
        </Field>

        <div className="col-span-full">
          <Field id="descripcion" label="Descripción" error={fieldErrors.descripcion}>
            <textarea
              id="descripcion"
              rows={3}
              value={form.descripcion}
              onChange={(e) => handleChange(e, 'descripcion')}
              className="w-full rounded-md border border-brand-200 bg-white px-3 py-2 text-[13px] text-brand-800 placeholder:text-brand-300 transition-colors duration-150 hover:border-brand-300 focus:border-brand-500 focus:outline-none resize-none"
              placeholder="Descripción de la etapa (opcional)"
            />
          </Field>
        </div>

        <SectionLabel>Fechas</SectionLabel>

        <Field id="fechaInicio" label="Fecha de inicio" error={fieldErrors.fechaInicio}>
          <Input
            id="fechaInicio"
            type="date"
            value={form.fechaInicio}
            onChange={(e) => handleChange(e, 'fechaInicio')}
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
            onChange={(e) => handleChange(e, 'fechaFinEstimada')}
          />
        </Field>
      </form>
    </Modal>
  );
}
