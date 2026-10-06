import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { FieldLabel, Input, Select } from '../ui/Field';
import { ApiError } from '../../lib/apiClient';
import { coreService } from '../../services/coreService';
import type {
  ManzanaRequest,
  ManzanaResponse,
  EtapaResponse,
  ProyectoResponse,
  CatalogoResponse
} from '../../types/core';

interface Props {
  open: boolean;
  onClose: () => void;
  onSuccess: (targetEtapaId: number) => Promise<void>;
  project: ProyectoResponse;
  stages: EtapaResponse[];
  initialStageId?: number;
  block?: ManzanaResponse | null;
}

interface FormState {
  idEtapa: string;
  codigoEstadoManzana: string;
  codigo: string;
  nombre: string;
  descripcion: string;
  numeroOrden: string;
  activo: boolean;
}

type FieldErrors = Partial<Record<keyof FormState | 'general', string>>;

type BackendErrorData = {
  errores?: Record<string, unknown>;
  mensaje?: unknown;
  message?: unknown;
};

function initForm(
  initialStageId?: number,
  stages?: EtapaResponse[],
  block?: ManzanaResponse | null
): FormState {
  if (!block) {
    const defaultStageId = initialStageId ?? (stages && stages.length > 0 ? stages[0].idEtapa : 0);
    return {
      idEtapa: defaultStageId ? String(defaultStageId) : '',
      codigoEstadoManzana: '',
      codigo: '',
      nombre: '',
      descripcion: '',
      numeroOrden: '1',
      activo: true
    };
  }

  return {
    idEtapa: String(block.idEtapa),
    codigoEstadoManzana: block.codigoEstadoManzana ?? '',
    codigo: block.codigo ?? '',
    nombre: block.nombre ?? '',
    descripcion: block.descripcion ?? '',
    numeroOrden: block.numeroOrden != null ? String(block.numeroOrden) : '1',
    activo: block.activo ?? true
  };
}

function parseOptionalNumber(value: string): number | null {
  const trimmed = value.trim();
  if (trimmed === '') return null;
  const num = Number(trimmed);
  return Number.isNaN(num) ? null : num;
}

function parseOptionalString(value: string): string | null {
  const trimmed = value.trim();
  return trimmed === '' ? null : trimmed;
}

function buildRequest(form: FormState): ManzanaRequest {
  return {
    idEtapa: Number(form.idEtapa),
    codigoEstadoManzana: form.codigoEstadoManzana.trim(),
    codigo: form.codigo.trim(),
    nombre: parseOptionalString(form.nombre),
    descripcion: parseOptionalString(form.descripcion),
    numeroOrden: parseOptionalNumber(form.numeroOrden),
    activo: form.activo
  };
}

function validate(form: FormState): FieldErrors {
  const errors: FieldErrors = {};

  if (!form.idEtapa || Number(form.idEtapa) <= 0) {
    errors.idEtapa = 'Debes seleccionar una etapa.';
  }

  if (!form.codigoEstadoManzana.trim()) {
    errors.codigoEstadoManzana = 'El estado de la manzana es obligatorio.';
  } else if (form.codigoEstadoManzana.trim().length > 30) {
    errors.codigoEstadoManzana = 'El estado no debe superar 30 caracteres.';
  }

  const codigo = form.codigo.trim();
  if (!codigo) {
    errors.codigo = 'El código es obligatorio.';
  } else if (codigo.length > 30) {
    errors.codigo = 'El código no debe superar 30 caracteres.';
  }

  if (form.nombre.trim().length > 100) {
    errors.nombre = 'El nombre no debe superar 100 caracteres.';
  }

  if (form.descripcion.trim().length > 255) {
    errors.descripcion = 'La descripción no debe superar 255 caracteres.';
  }

  if (form.numeroOrden.trim() !== '') {
    const orden = Number(form.numeroOrden);
    if (Number.isNaN(orden) || !Number.isInteger(orden) || orden < 1) {
      errors.numeroOrden = 'Debe ser un número entero mayor o igual a 1.';
    }
  }

  return errors;
}

function getBackendErrorData(data: unknown): BackendErrorData | undefined {
  if (!data || typeof data !== 'object') {
    return undefined;
  }
  return data as BackendErrorData;
}

function mapBackendFieldErrors(backendErrors: Record<string, unknown>): FieldErrors {
  const mapped: FieldErrors = {};
  const allowedFields: Array<keyof FormState> = [
    'idEtapa',
    'codigoEstadoManzana',
    'codigo',
    'nombre',
    'descripcion',
    'numeroOrden',
    'activo'
  ];

  for (const field of allowedFields) {
    const value = backendErrors[field];
    if (typeof value === 'string') {
      mapped[field] = value;
    }
  }

  return mapped;
}

export function BlockFormModal({
  open,
  onClose,
  onSuccess,
  project,
  stages,
  initialStageId,
  block
}: Props) {
  const isEditing = Boolean(block);

  const [form, setForm] = useState<FormState>(() =>
    initForm(initialStageId, stages, block)
  );
  const [statuses, setStatuses] = useState<CatalogoResponse[]>([]);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [submitting, setSubmitting] = useState(false);

  // Cargar catálogo de estados de manzana
  useEffect(() => {
    let mounted = true;
    async function loadStatuses() {
      try {
        const data = await coreService.getBlockStatuses();
        if (mounted) {
          setStatuses(data);
          // Si es nuevo y no tiene estado seleccionado, asignar el primero activo si existe
          setForm((prev) => {
            if (!prev.codigoEstadoManzana && data.length > 0) {
              return { ...prev, codigoEstadoManzana: data[0].codigo };
            }
            return prev;
          });
        }
      } catch {
        // Silencioso; se manejará validación de campo
      }
    }

    if (open) {
      loadStatuses();
    }

    return () => {
      mounted = false;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    setForm(initForm(initialStageId, stages, block));
    setErrors({});
    setSubmitting(false);
  }, [open, block, initialStageId, stages]);

  const handleChange = <K extends keyof FormState>(
    field: K,
    value: FormState[K]
  ) => {
    setForm((previous) => {
      const next: FormState = {
        ...previous,
        [field]: value
      };
      const nextErrors = validate(next);

      setErrors((previousErrors) => ({
        ...previousErrors,
        [field]: nextErrors[field],
        general: undefined
      }));

      return next;
    });
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const validationErrors = validate(form);
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setSubmitting(true);
    setErrors({});

    try {
      const payload = buildRequest(form);

      if (isEditing && block) {
        await coreService.updateBlock(block.idManzana, payload);
        toast.success('Manzana actualizada correctamente');
      } else {
        await coreService.createBlock(payload);
        toast.success('Manzana creada correctamente');
      }

      await onSuccess(payload.idEtapa);
      onClose();
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        const data = getBackendErrorData(err.data);
        const fieldErrors = data?.errores ? mapBackendFieldErrors(data.errores) : {};

        let generalMessage: string;
        if (typeof data?.mensaje === 'string') {
          generalMessage = data.mensaje;
        } else if (typeof data?.message === 'string') {
          generalMessage = data.message;
        } else if (err.status === 409) {
          generalMessage = 'Ya existe una manzana con ese código en la etapa seleccionada.';
        } else if (err.status === 404) {
          generalMessage = 'La etapa especificada no existe o fue desactivada.';
        } else if (err.status === 400) {
          generalMessage = 'Los datos de la manzana no son válidos.';
        } else {
          generalMessage = err.message || 'Error al guardar la manzana.';
        }

        setErrors({
          ...fieldErrors,
          general: generalMessage
        });
      } else {
        setErrors({
          general: err instanceof Error ? err.message : 'Error al guardar la manzana.'
        });
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEditing ? 'Editar manzana' : 'Nueva manzana'}
      width="max-w-2xl"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Contexto del proyecto */}
        <div className="rounded-lg border border-brand-100 bg-brand-50/50 p-3 text-xs">
          <p className="font-medium text-brand-500">Proyecto</p>
          <p className="text-sm font-semibold text-brand-900">{project.nombre}</p>
          <p className="mt-0.5 font-mono text-brand-600">{project.codigo}</p>
        </div>

        {errors.general && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-xs font-medium text-red-700">
            {errors.general}
          </div>
        )}

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <FieldLabel htmlFor="manzana-etapa">Etapa *</FieldLabel>
            <Select
              id="manzana-etapa"
              value={form.idEtapa}
              onChange={(event) => handleChange('idEtapa', event.target.value)}
              className={errors.idEtapa ? 'border-red-400 focus:border-red-500' : ''}
            >
              <option value="">Seleccionar etapa…</option>
              {stages.map((stg) => (
                <option key={stg.idEtapa} value={String(stg.idEtapa)}>
                  {stg.nombre} ({stg.codigo})
                </option>
              ))}
            </Select>
            {errors.idEtapa && <p className="mt-1 text-xs text-red-600">{errors.idEtapa}</p>}
          </div>

          <div>
            <FieldLabel htmlFor="manzana-estado">Estado *</FieldLabel>
            <Select
              id="manzana-estado"
              value={form.codigoEstadoManzana}
              onChange={(event) => handleChange('codigoEstadoManzana', event.target.value)}
              className={errors.codigoEstadoManzana ? 'border-red-400 focus:border-red-500' : ''}
            >
              <option value="">Seleccionar estado…</option>
              {statuses.map((st) => (
                <option key={st.id || st.codigo} value={st.codigo}>
                  {st.nombre}
                </option>
              ))}
            </Select>
            {errors.codigoEstadoManzana && (
              <p className="mt-1 text-xs text-red-600">{errors.codigoEstadoManzana}</p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <FieldLabel htmlFor="manzana-codigo">Código *</FieldLabel>
            <Input
              id="manzana-codigo"
              value={form.codigo}
              onChange={(event) => handleChange('codigo', event.target.value)}
              placeholder="MZ-A"
              maxLength={30}
              autoComplete="off"
              className={errors.codigo ? 'border-red-400 focus:border-red-500' : ''}
            />
            {errors.codigo && <p className="mt-1 text-xs text-red-600">{errors.codigo}</p>}
          </div>

          <div>
            <FieldLabel htmlFor="manzana-nombre">Nombre</FieldLabel>
            <Input
              id="manzana-nombre"
              value={form.nombre}
              onChange={(event) => handleChange('nombre', event.target.value)}
              placeholder="Manzana A"
              maxLength={100}
              autoComplete="off"
              className={errors.nombre ? 'border-red-400 focus:border-red-500' : ''}
            />
            {errors.nombre && <p className="mt-1 text-xs text-red-600">{errors.nombre}</p>}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <FieldLabel htmlFor="manzana-numero-orden">Número de orden</FieldLabel>
            <Input
              id="manzana-numero-orden"
              type="number"
              min={1}
              step={1}
              value={form.numeroOrden}
              onChange={(event) => handleChange('numeroOrden', event.target.value)}
              placeholder="1"
              className={errors.numeroOrden ? 'border-red-400 focus:border-red-500' : ''}
            />
            {errors.numeroOrden && (
              <p className="mt-1 text-xs text-red-600">{errors.numeroOrden}</p>
            )}
          </div>

          <div className="flex items-center pt-6">
            <label
              htmlFor="manzana-activa"
              className="inline-flex cursor-pointer items-center gap-2 text-sm font-medium text-brand-800"
            >
              <input
                id="manzana-activa"
                type="checkbox"
                checked={form.activo}
                onChange={(event) => handleChange('activo', event.target.checked)}
                className="h-4 w-4 rounded border-brand-300 text-brand-900 focus:ring-brand-500"
              />
              <span>Manzana activa</span>
            </label>
          </div>
        </div>

        <div>
          <FieldLabel htmlFor="manzana-descripcion">Descripción</FieldLabel>
          <textarea
            id="manzana-descripcion"
            value={form.descripcion}
            onChange={(event) => handleChange('descripcion', event.target.value)}
            placeholder="Descripción opcional de la manzana..."
            maxLength={255}
            rows={3}
            className={`w-full rounded-md border px-3 py-2 text-sm text-brand-900 transition-colors focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 ${
              errors.descripcion ? 'border-red-400' : 'border-brand-200'
            }`}
          />
          <div className="mt-1 flex items-center justify-between">
            <div>
              {errors.descripcion && (
                <p className="text-xs text-red-600">{errors.descripcion}</p>
              )}
            </div>
            <span className="text-[11px] text-brand-400">
              {form.descripcion.length}/255
            </span>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-brand-100 pt-4">
          <Button type="button" variant="ghost" onClick={onClose} disabled={submitting}>
            Cancelar
          </Button>
          <Button
            type="submit"
            disabled={submitting}
            className="border border-[#4cbb17]/40 bg-brand-900 text-white shadow-sm hover:bg-brand-800"
          >
            {submitting ? 'Guardando...' : isEditing ? 'Guardar cambios' : 'Crear manzana'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
