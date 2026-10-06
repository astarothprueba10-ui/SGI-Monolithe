import { useEffect, useState } from 'react';
import { toast } from 'sonner';

import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { FieldLabel, Input } from '../ui/Field';

import { ApiError } from '../../lib/apiClient';
import { coreService } from '../../services/coreService';

import type {
  ZonaRequest,
  ZonaResponse,
  ProyectoResponse
} from '../../types/core';

interface Props {
  open: boolean;
  onClose: () => void;
  onSuccess: () => Promise<void>;
  project: ProyectoResponse;
  zone?: ZonaResponse | null;
}

interface FormState {
  codigo: string;
  nombre: string;
  descripcion: string;
  numeroOrden: string;
  activo: boolean;
}

type FieldErrors = Partial<
  Record<keyof FormState | 'general', string>
>;

type BackendErrorData = {
  errores?: Record<string, unknown>;
  mensaje?: unknown;
  message?: unknown;
};

function initForm(
  zone?: ZonaResponse | null
): FormState {
  if (!zone) {
    return {
      codigo: '',
      nombre: '',
      descripcion: '',
      numeroOrden: '1',
      activo: true
    };
  }

  return {
    codigo: zone.codigo ?? '',
    nombre: zone.nombre ?? '',
    descripcion: zone.descripcion ?? '',
    numeroOrden:
      zone.numeroOrden != null
        ? String(zone.numeroOrden)
        : '1',
    activo: zone.activo ?? true
  };
}

function parseOptionalNumber(
  value: string
): number | null {
  const trimmed = value.trim();

  if (trimmed === '') {
    return null;
  }

  const numberValue = Number(trimmed);

  return Number.isNaN(numberValue)
    ? null
    : numberValue;
}

function parseOptionalString(
  value: string
): string | null {
  const trimmed = value.trim();

  return trimmed === ''
    ? null
    : trimmed;
}

function buildRequest(
  idProyecto: number,
  form: FormState
): ZonaRequest {
  return {
    idProyecto,
    codigo: form.codigo.trim(),
    nombre: form.nombre.trim(),
    descripcion: parseOptionalString(
      form.descripcion
    ),
    numeroOrden: parseOptionalNumber(
      form.numeroOrden
    ),
    activo: form.activo
  };
}

function validate(
  form: FormState
): FieldErrors {
  const errors: FieldErrors = {};

  const codigo = form.codigo.trim();

  if (!codigo) {
    errors.codigo =
      'El código es obligatorio.';
  } else if (codigo.length > 30) {
    errors.codigo =
      'El código no debe superar 30 caracteres.';
  }

  const nombre = form.nombre.trim();

  if (!nombre) {
    errors.nombre =
      'El nombre es obligatorio.';
  } else if (nombre.length > 100) {
    errors.nombre =
      'El nombre no debe superar 100 caracteres.';
  }

  if (
    form.descripcion.length > 255
  ) {
    errors.descripcion =
      'La descripción no debe superar 255 caracteres.';
  }

  if (
    form.numeroOrden.trim() !== ''
  ) {
    const orden = Number(
      form.numeroOrden
    );

    if (
      Number.isNaN(orden) ||
      !Number.isInteger(orden) ||
      orden < 1
    ) {
      errors.numeroOrden =
        'Debe ser un número entero mayor o igual a 1.';
    }
  }

  return errors;
}

function getBackendErrorData(
  data: unknown
): BackendErrorData | undefined {
  if (
    !data ||
    typeof data !== 'object'
  ) {
    return undefined;
  }

  return data as BackendErrorData;
}

function mapBackendFieldErrors(
  backendErrors: Record<string, unknown>
): FieldErrors {
  const mapped: FieldErrors = {};

  const allowedFields: Array<
    keyof FormState
  > = [
    'codigo',
    'nombre',
    'descripcion',
    'numeroOrden',
    'activo'
  ];

  for (
    const field of allowedFields
  ) {
    const value =
      backendErrors[field];

    if (
      typeof value === 'string'
    ) {
      mapped[field] = value;
    }
  }

  return mapped;
}

export function ZoneFormModal({
  open,
  onClose,
  onSuccess,
  project,
  zone
}: Props) {
  const isEditing =
    Boolean(zone);

  const [form, setForm] =
    useState<FormState>(() =>
      initForm(zone)
    );

  const [errors, setErrors] =
    useState<FieldErrors>({});

  const [
    submitting,
    setSubmitting
  ] = useState(false);

  useEffect(() => {
    if (!open) {
      return;
    }

    setForm(
      initForm(zone)
    );

    setErrors({});
    setSubmitting(false);
  }, [open, zone]);

  const handleChange = <
    K extends keyof FormState
  >(
    field: K,
    value: FormState[K]
  ) => {
    setForm((previous) => {
      const next: FormState = {
        ...previous,
        [field]: value
      };

      const nextErrors =
        validate(next);

      setErrors(
        (previousErrors) => ({
          ...previousErrors,
          [field]:
            nextErrors[field],
          general: undefined
        })
      );

      return next;
    });
  };

  const handleSubmit = async (
    event: React.FormEvent
  ) => {
    event.preventDefault();

    const validationErrors =
      validate(form);

    if (
      Object.keys(
        validationErrors
      ).length > 0
    ) {
      setErrors(
        validationErrors
      );

      return;
    }

    setSubmitting(true);
    setErrors({});

    try {
      const payload =
        buildRequest(
          project.idProyecto,
          form
        );

      if (
        isEditing &&
        zone
      ) {
        await coreService.updateZone(
          zone.idZona,
          payload
        );

        toast.success(
          'Zona actualizada correctamente'
        );
      } else {
        await coreService.createZone(
          payload
        );

        toast.success(
          'Zona creada correctamente'
        );
      }

      await onSuccess();
      onClose();
    } catch (err: unknown) {
      if (
        err instanceof ApiError
      ) {
        const data =
          getBackendErrorData(
            err.data
          );

        const fieldErrors =
          data?.errores
            ? mapBackendFieldErrors(
                data.errores
              )
            : {};

        let generalMessage:
          string;

        if (
          typeof data?.mensaje ===
          'string'
        ) {
          generalMessage =
            data.mensaje;
        } else if (
          typeof data?.message ===
          'string'
        ) {
          generalMessage =
            data.message;
        } else if (
          err.status === 409
        ) {
          generalMessage =
            'Ya existe una zona con ese código en este proyecto.';
        } else if (
          err.status === 404
        ) {
          generalMessage =
            'No se encontró el recurso solicitado.';
        } else if (
          err.status === 400
        ) {
          generalMessage =
            'Los datos de la zona no son válidos.';
        } else {
          generalMessage =
            err.message ||
            'Error al guardar la zona.';
        }

        setErrors({
          ...fieldErrors,
          general:
            generalMessage
        });
      } else {
        setErrors({
          general:
            err instanceof Error
              ? err.message
              : 'Error al guardar la zona.'
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
      title={
        isEditing
          ? 'Editar zona'
          : 'Nueva zona'
      }
      width="max-w-2xl"
    >
      <form
        onSubmit={
          handleSubmit
        }
        className="space-y-4"
      >
        <div className="rounded-lg border border-brand-100 bg-brand-50/50 p-3 text-xs">
          <p className="font-medium text-brand-500">
            Proyecto
          </p>

          <p className="text-sm font-semibold text-brand-900">
            {project.nombre}
          </p>

          <p className="mt-0.5 font-mono text-brand-600">
            {project.codigo}
          </p>
        </div>

        {errors.general && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-xs font-medium text-red-700">
            {errors.general}
          </div>
        )}

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <FieldLabel htmlFor="zona-codigo">
              Código *
            </FieldLabel>

            <Input
              id="zona-codigo"
              value={
                form.codigo
              }
              onChange={(event) =>
                handleChange(
                  'codigo',
                  event.target
                    .value
                )
              }
              placeholder="ZONA-A"
              maxLength={30}
              autoComplete="off"
              className={
                errors.codigo
                  ? 'border-red-400 focus:border-red-500'
                  : ''
              }
            />

            {errors.codigo && (
              <p className="mt-1 text-xs text-red-600">
                {
                  errors.codigo
                }
              </p>
            )}
          </div>

          <div>
            <FieldLabel htmlFor="zona-nombre">
              Nombre *
            </FieldLabel>

            <Input
              id="zona-nombre"
              value={
                form.nombre
              }
              onChange={(event) =>
                handleChange(
                  'nombre',
                  event.target
                    .value
                )
              }
              placeholder="Zona Norte / Sector A"
              maxLength={100}
              autoComplete="off"
              className={
                errors.nombre
                  ? 'border-red-400 focus:border-red-500'
                  : ''
              }
            />

            {errors.nombre && (
              <p className="mt-1 text-xs text-red-600">
                {
                  errors.nombre
                }
              </p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <FieldLabel htmlFor="zona-numero-orden">
              Número de orden
            </FieldLabel>

            <Input
              id="zona-numero-orden"
              type="number"
              min={1}
              step={1}
              value={
                form.numeroOrden
              }
              onChange={(event) =>
                handleChange(
                  'numeroOrden',
                  event.target
                    .value
                )
              }
              placeholder="1"
              className={
                errors.numeroOrden
                  ? 'border-red-400 focus:border-red-500'
                  : ''
              }
            />

            {errors.numeroOrden && (
              <p className="mt-1 text-xs text-red-600">
                {
                  errors.numeroOrden
                }
              </p>
            )}
          </div>

          <div className="flex items-center pt-6">
            <label
              htmlFor="zona-activa"
              className="inline-flex cursor-pointer items-center gap-2 text-sm font-medium text-brand-800"
            >
              <input
                id="zona-activa"
                type="checkbox"
                checked={
                  form.activo
                }
                onChange={(
                  event
                ) =>
                  handleChange(
                    'activo',
                    event.target
                      .checked
                  )
                }
                className="h-4 w-4 rounded border-brand-300 text-brand-900 focus:ring-brand-500"
              />

              <span>
                Zona activa
              </span>
            </label>
          </div>
        </div>

        <div>
          <FieldLabel htmlFor="zona-descripcion">
            Descripción
          </FieldLabel>

          <textarea
            id="zona-descripcion"
            value={
              form.descripcion
            }
            onChange={(
              event
            ) =>
              handleChange(
                'descripcion',
                event.target
                  .value
              )
            }
            placeholder="Descripción opcional de la zona..."
            maxLength={255}
            rows={3}
            className={`w-full rounded-md border px-3 py-2 text-sm text-brand-900 transition-colors focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 ${
              errors.descripcion
                ? 'border-red-400'
                : 'border-brand-200'
            }`}
          />

          <div className="mt-1 flex items-center justify-between">
            <div>
              {errors.descripcion && (
                <p className="text-xs text-red-600">
                  {
                    errors.descripcion
                  }
                </p>
              )}
            </div>

            <span className="text-[11px] text-brand-400">
              {
                form
                  .descripcion
                  .length
              }
              /255
            </span>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-brand-100 pt-4">
          <Button
            type="button"
            variant="ghost"
            onClick={
              onClose
            }
            disabled={
              submitting
            }
          >
            Cancelar
          </Button>

          <Button
            type="submit"
            disabled={
              submitting
            }
            className="border border-[#4cbb17]/40 bg-brand-900 text-white shadow-sm hover:bg-brand-800"
          >
            {submitting
              ? 'Guardando...'
              : isEditing
                ? 'Guardar cambios'
                : 'Crear zona'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}