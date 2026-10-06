import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { FieldLabel, Input, Select } from '../ui/Field';
import { ApiError } from '../../lib/apiClient';
import { coreService } from '../../services/coreService';
import type {
  LoteRequest,
  LoteResponse,
  EtapaResponse,
  ManzanaResponse,
  ZonaResponse,
  CatalogoResponse,
  EstadoLoteResponse,
  ProyectoResponse
} from '../../types/core';

interface Props {
  open: boolean;
  onClose: () => void;
  onSuccess: () => Promise<void>;
  project: ProyectoResponse;
  stages: EtapaResponse[];
  zones: ZonaResponse[];
  lotStatuses: EstadoLoteResponse[];
  lotTypes: CatalogoResponse[];
  lot?: LoteResponse | null;
}

interface FormState {
  idEtapa: string;
  idManzana: string;
  idZona: string;
  codigoTipoLote: string;
  codigoEstadoLote: string;
  codigo: string;
  numero: string;
  areaM2: string;
  frenteM: string;
  fondoM: string;
  lateralDerechoM: string;
  lateralIzquierdoM: string;
  observaciones: string;
}

type FieldErrors = Partial<Record<keyof FormState | 'general', string>>;

type BackendErrorData = {
  errores?: Record<string, unknown>;
  mensaje?: unknown;
  message?: unknown;
};

function initForm(
  lot?: LoteResponse | null,
  defaultStatusCodigo?: string
): FormState {
  if (!lot) {
    return {
      idEtapa: '',
      idManzana: '',
      idZona: '',
      codigoTipoLote: '',
      codigoEstadoLote: defaultStatusCodigo ?? '',
      codigo: '',
      numero: '',
      areaM2: '',
      frenteM: '',
      fondoM: '',
      lateralDerechoM: '',
      lateralIzquierdoM: '',
      observaciones: ''
    };
  }

  return {
    idEtapa: lot.idEtapa ? String(lot.idEtapa) : '',
    idManzana: lot.idManzana ? String(lot.idManzana) : '',
    idZona: lot.idZona ? String(lot.idZona) : '',
    codigoTipoLote: lot.codigoTipoLote ?? '',
    codigoEstadoLote: lot.codigoEstadoLote ?? '',
    codigo: lot.codigo ?? '',
    numero: lot.numero ?? '',
    areaM2: lot.areaM2 != null ? String(lot.areaM2) : '',
    frenteM: lot.frenteM != null ? String(lot.frenteM) : '',
    fondoM: lot.fondoM != null ? String(lot.fondoM) : '',
    lateralDerechoM: lot.lateralDerechoM != null ? String(lot.lateralDerechoM) : '',
    lateralIzquierdoM: lot.lateralIzquierdoM != null ? String(lot.lateralIzquierdoM) : '',
    observaciones: lot.observaciones ?? ''
  };
}

function parsePositiveFloat(value: string): number | null {
  const trimmed = value.trim();
  if (trimmed === '') return null;
  const n = parseFloat(trimmed);
  return Number.isNaN(n) ? null : n;
}

function parseOptionalString(value: string): string | null {
  const trimmed = value.trim();
  return trimmed === '' ? null : trimmed;
}

function buildRequest(form: FormState, isEditing: boolean, lot: LoteResponse | null | undefined): LoteRequest {
  return {
    idManzana: Number(form.idManzana),
    idZona: form.idZona ? Number(form.idZona) : null,
    codigoTipoLote: parseOptionalString(form.codigoTipoLote),
    codigoEstadoLote: isEditing && lot ? (lot.codigoEstadoLote ?? form.codigoEstadoLote) : form.codigoEstadoLote.trim(),
    codigo: form.codigo.trim(),
    numero: form.numero.trim(),
    areaM2: parsePositiveFloat(form.areaM2) ?? 0,
    frenteM: parsePositiveFloat(form.frenteM),
    fondoM: parsePositiveFloat(form.fondoM),
    lateralDerechoM: parsePositiveFloat(form.lateralDerechoM),
    lateralIzquierdoM: parsePositiveFloat(form.lateralIzquierdoM),
    observaciones: parseOptionalString(form.observaciones),
    activo: isEditing && lot ? lot.activo : true
  };
}

function validate(form: FormState, isEditing: boolean): FieldErrors {
  const errors: FieldErrors = {};

  if (!form.idEtapa) {
    errors.idEtapa = 'Debes seleccionar una etapa.';
  }

  if (!form.idManzana) {
    errors.idManzana = 'Debes seleccionar una manzana.';
  }

  if (!isEditing && !form.codigoEstadoLote.trim()) {
    errors.codigoEstadoLote = 'El estado inicial es obligatorio.';
  }

  const codigo = form.codigo.trim();
  if (!codigo) {
    errors.codigo = 'El código es obligatorio.';
  } else if (codigo.length > 40) {
    errors.codigo = 'El código no debe superar 40 caracteres.';
  }

  const numero = form.numero.trim();
  if (!numero) {
    errors.numero = 'El número es obligatorio.';
  } else if (numero.length > 20) {
    errors.numero = 'El número no debe superar 20 caracteres.';
  }

  if (!form.areaM2.trim()) {
    errors.areaM2 = 'El área es obligatoria.';
  } else {
    const area = parsePositiveFloat(form.areaM2);
    if (area === null || area <= 0) {
      errors.areaM2 = 'El área debe ser un número mayor a 0.';
    }
  }

  const checkOptionalPositive = (value: string, field: keyof FormState) => {
    if (value.trim() !== '') {
      const n = parsePositiveFloat(value);
      if (n === null || n <= 0) {
        errors[field] = 'Debe ser un número mayor a 0.';
      }
    }
  };

  checkOptionalPositive(form.frenteM, 'frenteM');
  checkOptionalPositive(form.fondoM, 'fondoM');
  checkOptionalPositive(form.lateralDerechoM, 'lateralDerechoM');
  checkOptionalPositive(form.lateralIzquierdoM, 'lateralIzquierdoM');

  return errors;
}

function getBackendErrorData(data: unknown): BackendErrorData | undefined {
  if (!data || typeof data !== 'object') return undefined;
  return data as BackendErrorData;
}

function mapBackendFieldErrors(backendErrors: Record<string, unknown>): FieldErrors {
  const mapped: FieldErrors = {};
  const allowed: Array<keyof FormState> = [
    'idManzana', 'idZona', 'codigoTipoLote', 'codigoEstadoLote',
    'codigo', 'numero', 'areaM2', 'frenteM', 'fondoM',
    'lateralDerechoM', 'lateralIzquierdoM', 'observaciones'
  ];

  for (const field of allowed) {
    const value = backendErrors[field];
    if (typeof value === 'string') {
      mapped[field] = value;
    }
  }

  return mapped;
}

export function LotFormModal({
  open,
  onClose,
  onSuccess,
  project,
  stages,
  zones,
  lotStatuses,
  lotTypes,
  lot
}: Props) {
  const isEditing = Boolean(lot);

  const defaultStatus = lotStatuses.find((s) => s.codigo === 'DISPONIBLE') ?? lotStatuses[0];
  const [form, setForm] = useState<FormState>(() =>
    initForm(lot, defaultStatus?.codigo)
  );
  const [stageBlocks, setStageBlocks] = useState<ManzanaResponse[]>([]);
  const [blocksLoading, setBlocksLoading] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [submitting, setSubmitting] = useState(false);

  // Load blocks when stage changes
  useEffect(() => {
    if (!open) return;
    const stageId = Number(form.idEtapa);
    if (!stageId) {
      setStageBlocks([]);
      return;
    }

    let mounted = true;
    setBlocksLoading(true);

    coreService.getBlocksByStage(stageId).then((data) => {
      if (!mounted) return;
      setStageBlocks(data);
    }).catch(() => {
      if (mounted) setStageBlocks([]);
    }).finally(() => {
      if (mounted) setBlocksLoading(false);
    });

    return () => {
      mounted = false;
    };
  }, [form.idEtapa, open]);

  // Reset form when modal opens
  useEffect(() => {
    if (!open) return;
    const defStatus = lotStatuses.find((s) => s.codigo === 'DISPONIBLE') ?? lotStatuses[0];
    setForm(initForm(lot, defStatus?.codigo));
    setErrors({});
    setSubmitting(false);
    setStageBlocks([]);
  }, [open, lot, lotStatuses]);

  const handleChange = <K extends keyof FormState>(field: K, value: FormState[K]) => {
    setForm((prev) => {
      const next: FormState = { ...prev, [field]: value };

      // Reset manzana when etapa changes
      if (field === 'idEtapa') {
        next.idManzana = '';
      }

      const nextErrors = validate(next, isEditing);
      setErrors((prevErr) => ({
        ...prevErr,
        [field]: nextErrors[field],
        general: undefined
      }));

      return next;
    });
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const validationErrors = validate(form, isEditing);
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setSubmitting(true);
    setErrors({});

    try {
      const payload = buildRequest(form, isEditing, lot);

      if (isEditing && lot) {
        await coreService.updateLot(lot.idLote, payload);
        toast.success('Lote actualizado correctamente');
      } else {
        await coreService.createLot(payload);
        toast.success('Lote creado correctamente');
      }

      await onSuccess();
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
          generalMessage = 'Ya existe un lote con ese código o número en la manzana seleccionada.';
        } else if (err.status === 404) {
          generalMessage = 'La manzana, etapa o zona especificada no existe.';
        } else if (err.status === 400) {
          generalMessage = 'Los datos del lote no son válidos.';
        } else {
          generalMessage = err.message || 'Error al guardar el lote.';
        }

        setErrors({ ...fieldErrors, general: generalMessage });
      } else {
        setErrors({
          general: err instanceof Error ? err.message : 'Error al guardar el lote.'
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
      title={isEditing ? 'Editar lote' : 'Nuevo lote'}
      width="max-w-3xl"
    >
      <form onSubmit={handleSubmit} className="space-y-5">
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

        {/* Sección Ubicación */}
        <div>
          <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-brand-500">Ubicación</p>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div>
              <FieldLabel htmlFor="lot-etapa">Etapa *</FieldLabel>
              <Select
                id="lot-etapa"
                value={form.idEtapa}
                onChange={(e) => handleChange('idEtapa', e.target.value)}
                className={errors.idEtapa ? 'border-red-400 focus:border-red-500' : ''}
              >
                <option value="">Seleccionar etapa…</option>
                {stages.map((stg) => (
                  <option key={stg.idEtapa} value={String(stg.idEtapa)}>
                    {stg.codigo}
                  </option>
                ))}
              </Select>
              {errors.idEtapa && <p className="mt-1 text-xs text-red-600">{errors.idEtapa}</p>}
            </div>

            <div>
              <FieldLabel htmlFor="lot-manzana">Manzana *</FieldLabel>
              <Select
                id="lot-manzana"
                value={form.idManzana}
                onChange={(e) => handleChange('idManzana', e.target.value)}
                disabled={!form.idEtapa || blocksLoading}
                className={errors.idManzana ? 'border-red-400 focus:border-red-500' : ''}
              >
                <option value="">
                  {blocksLoading ? 'Cargando...' : 'Seleccionar manzana…'}
                </option>
                {stageBlocks.map((blk) => (
                  <option key={blk.idManzana} value={String(blk.idManzana)}>
                    {blk.codigo}{blk.nombre ? ` — ${blk.nombre}` : ''}
                  </option>
                ))}
              </Select>
              {errors.idManzana && <p className="mt-1 text-xs text-red-600">{errors.idManzana}</p>}
            </div>

            <div>
              <FieldLabel htmlFor="lot-zona">Zona</FieldLabel>
              <Select
                id="lot-zona"
                value={form.idZona}
                onChange={(e) => handleChange('idZona', e.target.value)}
              >
                <option value="">Sin zona</option>
                {zones.filter((z) => z.activo).map((zn) => (
                  <option key={zn.idZona} value={String(zn.idZona)}>
                    {zn.nombre} ({zn.codigo})
                  </option>
                ))}
              </Select>
            </div>
          </div>
        </div>

        {/* Sección Clasificación */}
        <div>
          <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-brand-500">Clasificación</p>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <FieldLabel htmlFor="lot-tipo">Tipo de lote</FieldLabel>
              <Select
                id="lot-tipo"
                value={form.codigoTipoLote}
                onChange={(e) => handleChange('codigoTipoLote', e.target.value)}
              >
                <option value="">Sin tipo</option>
                {lotTypes.filter((t) => t.activo).map((tp) => (
                  <option key={tp.codigo} value={tp.codigo}>
                    {tp.nombre}
                  </option>
                ))}
              </Select>
            </div>

            <div>
              <FieldLabel htmlFor="lot-estado">
                {isEditing ? 'Estado actual' : 'Estado inicial *'}
              </FieldLabel>
              {isEditing ? (
                <div className="flex h-9 items-center rounded-md border border-brand-200 bg-brand-50 px-3 text-sm text-brand-700">
                  {lot?.nombreEstadoLote ?? lot?.codigoEstadoLote ?? '—'}
                </div>
              ) : (
                <>
                  <Select
                    id="lot-estado"
                    value={form.codigoEstadoLote}
                    onChange={(e) => handleChange('codigoEstadoLote', e.target.value)}
                    className={errors.codigoEstadoLote ? 'border-red-400 focus:border-red-500' : ''}
                  >
                    <option value="">Seleccionar estado…</option>
                    {lotStatuses.filter((s) => s.activo).map((st) => (
                      <option key={st.codigo} value={st.codigo}>
                        {st.nombre}
                      </option>
                    ))}
                  </Select>
                  {errors.codigoEstadoLote && (
                    <p className="mt-1 text-xs text-red-600">{errors.codigoEstadoLote}</p>
                  )}
                </>
              )}
            </div>
          </div>
        </div>

        {/* Sección Identificación */}
        <div>
          <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-brand-500">Identificación</p>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <FieldLabel htmlFor="lot-codigo">Código *</FieldLabel>
              <Input
                id="lot-codigo"
                value={form.codigo}
                onChange={(e) => handleChange('codigo', e.target.value)}
                placeholder="LOT-MZA-01"
                maxLength={40}
                autoComplete="off"
                className={errors.codigo ? 'border-red-400 focus:border-red-500' : ''}
              />
              {errors.codigo && <p className="mt-1 text-xs text-red-600">{errors.codigo}</p>}
            </div>

            <div>
              <FieldLabel htmlFor="lot-numero">Número *</FieldLabel>
              <Input
                id="lot-numero"
                value={form.numero}
                onChange={(e) => handleChange('numero', e.target.value)}
                placeholder="01"
                maxLength={20}
                autoComplete="off"
                className={errors.numero ? 'border-red-400 focus:border-red-500' : ''}
              />
              {errors.numero && <p className="mt-1 text-xs text-red-600">{errors.numero}</p>}
            </div>
          </div>
        </div>

        {/* Sección Dimensiones */}
        <div>
          <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-brand-500">Dimensiones</p>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
            <div className="col-span-2 md:col-span-1">
              <FieldLabel htmlFor="lot-area">Área m² *</FieldLabel>
              <Input
                id="lot-area"
                type="number"
                min={0}
                step="0.01"
                value={form.areaM2}
                onChange={(e) => handleChange('areaM2', e.target.value)}
                placeholder="450.00"
                className={errors.areaM2 ? 'border-red-400 focus:border-red-500' : ''}
              />
              {errors.areaM2 && <p className="mt-1 text-xs text-red-600">{errors.areaM2}</p>}
            </div>

            <div>
              <FieldLabel htmlFor="lot-frente">Frente m</FieldLabel>
              <Input
                id="lot-frente"
                type="number"
                min={0}
                step="0.01"
                value={form.frenteM}
                onChange={(e) => handleChange('frenteM', e.target.value)}
                placeholder="0.00"
                className={errors.frenteM ? 'border-red-400 focus:border-red-500' : ''}
              />
              {errors.frenteM && <p className="mt-1 text-xs text-red-600">{errors.frenteM}</p>}
            </div>

            <div>
              <FieldLabel htmlFor="lot-fondo">Fondo m</FieldLabel>
              <Input
                id="lot-fondo"
                type="number"
                min={0}
                step="0.01"
                value={form.fondoM}
                onChange={(e) => handleChange('fondoM', e.target.value)}
                placeholder="0.00"
                className={errors.fondoM ? 'border-red-400 focus:border-red-500' : ''}
              />
              {errors.fondoM && <p className="mt-1 text-xs text-red-600">{errors.fondoM}</p>}
            </div>

            <div>
              <FieldLabel htmlFor="lot-lat-der">Lat. der. m</FieldLabel>
              <Input
                id="lot-lat-der"
                type="number"
                min={0}
                step="0.01"
                value={form.lateralDerechoM}
                onChange={(e) => handleChange('lateralDerechoM', e.target.value)}
                placeholder="0.00"
                className={errors.lateralDerechoM ? 'border-red-400 focus:border-red-500' : ''}
              />
              {errors.lateralDerechoM && (
                <p className="mt-1 text-xs text-red-600">{errors.lateralDerechoM}</p>
              )}
            </div>

            <div>
              <FieldLabel htmlFor="lot-lat-izq">Lat. izq. m</FieldLabel>
              <Input
                id="lot-lat-izq"
                type="number"
                min={0}
                step="0.01"
                value={form.lateralIzquierdoM}
                onChange={(e) => handleChange('lateralIzquierdoM', e.target.value)}
                placeholder="0.00"
                className={errors.lateralIzquierdoM ? 'border-red-400 focus:border-red-500' : ''}
              />
              {errors.lateralIzquierdoM && (
                <p className="mt-1 text-xs text-red-600">{errors.lateralIzquierdoM}</p>
              )}
            </div>
          </div>
        </div>

        {/* Observaciones */}
        <div>
          <FieldLabel htmlFor="lot-observaciones">Observaciones</FieldLabel>
          <textarea
            id="lot-observaciones"
            value={form.observaciones}
            onChange={(e) => handleChange('observaciones', e.target.value)}
            placeholder="Observaciones opcionales..."
            rows={2}
            className="w-full rounded-md border border-brand-200 px-3 py-2 text-sm text-brand-900 transition-colors focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
          />
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
            {submitting ? 'Guardando...' : isEditing ? 'Guardar cambios' : 'Crear lote'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
