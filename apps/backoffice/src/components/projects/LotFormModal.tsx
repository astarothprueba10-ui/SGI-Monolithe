import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { FieldLabel, Input, Select } from '../ui/Field';
import { ApiError } from '../../lib/apiClient';
import { coreService } from '../../services/coreService';
import { useAuth } from '../../contexts/AuthContext';
import { getStoredAuthUser } from '../../lib/authSession';

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

type FieldErrors = Partial<Record<keyof FormState | 'general' | 'precio', string>>;

function validatePrecioManual(
  precioManual: string,
  estado: string
): string | undefined {
  const trimmed = precioManual.trim();
  if (!trimmed) {
    return estado === 'DISPONIBLE'
      ? 'El precio es obligatorio para lotes disponibles.'
      : undefined;
  }
  const num = Number(trimmed);
  if (Number.isNaN(num) || num <= 0) {
    return 'El precio debe ser un número mayor a 0.';
  }
  const parts = trimmed.split('.');
  if (parts[0].length > 12) {
    return 'El precio no puede exceder 12 dígitos enteros.';
  }
  if (parts.length > 1 && parts[1].length > 2) {
    return 'El precio admite un máximo de 2 decimales.';
  }
  if (!/^\d+(\.\d{1,2})?$/.test(trimmed)) {
    return 'Formato de precio inválido.';
  }
  return undefined;
}

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
  const { user, role, can } = useAuth();
  const storedUser = getStoredAuthUser();
  const isGerencia = Boolean(
    role === 'Gerencia' ||
    user?.primaryRole === 'Gerencia' ||
    user?.roles?.includes('Gerencia') ||
    storedUser?.autoridades?.includes('ROLE_GERENCIA')
  );
  const canEditPrice = isGerencia && can('lots.edit');
  const isLotSoldOrReserved = Boolean(
    lot && (lot.codigoEstadoLote === 'VENDIDO' || lot.codigoEstadoLote === 'RESERVADO')
  );

  const defaultStatus =
    lotStatuses.find((s) => s.codigo === 'DISPONIBLE') ??
    lotStatuses.find((s) => s.codigo === 'NO_DISPONIBLE') ??
    lotStatuses[0];
  const [form, setForm] = useState<FormState>(() =>
    initForm(lot, defaultStatus?.codigo)
  );
  const [stageBlocks, setStageBlocks] = useState<ManzanaResponse[]>([]);
  const [blocksLoading, setBlocksLoading] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [precioManual, setPrecioManual] = useState('');
  const [loadingPrice, setLoadingPrice] = useState(false);
  const [precioVigenteActual, setPrecioVigenteActual] = useState<number | null>(null);

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
    const defStatus =
      lotStatuses.find((s) => s.codigo === 'DISPONIBLE') ??
      lotStatuses.find((s) => s.codigo === 'NO_DISPONIBLE') ??
      lotStatuses[0];
    setForm(initForm(lot, defStatus?.codigo));
    if (lot) {
      let mounted = true;
      setLoadingPrice(true);
      coreService.getCurrentLotPrice(lot.idLote, 'PEN')
        .then((data) => {
          if (!mounted) return;
          const p = data?.precio ?? null;
          setPrecioVigenteActual(p);
          setPrecioManual(p != null ? String(p) : '');
        })
        .catch(() => {
          if (!mounted) return;
          setPrecioVigenteActual(null);
          setPrecioManual('');
        })
        .finally(() => {
          if (mounted) setLoadingPrice(false);
        });
      return () => {
        mounted = false;
      };
    } else {
      setPrecioVigenteActual(null);
      setPrecioManual('');
    }
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
        precio: field === 'codigoEstadoLote' ? undefined : prevErr.precio,
        general: undefined
      }));

      return next;
    });
  };

  const hasDimensionsChanged = (): boolean => {
    if (!lot) return false;
    if (parsePositiveFloat(form.areaM2) !== (lot.areaM2 ?? null)) return true;
    if (parsePositiveFloat(form.frenteM) !== (lot.frenteM ?? null)) return true;
    if (parsePositiveFloat(form.fondoM) !== (lot.fondoM ?? null)) return true;
    if (parsePositiveFloat(form.lateralDerechoM) !== (lot.lateralDerechoM ?? null)) return true;
    if (parsePositiveFloat(form.lateralIzquierdoM) !== (lot.lateralIzquierdoM ?? null)) return true;
    return false;
  };

  const hasGeneralChanges = (): boolean => {
    if (!lot) return true;
    if (form.idManzana !== (lot.idManzana ? String(lot.idManzana) : '')) return true;
    if (form.idZona !== (lot.idZona ? String(lot.idZona) : '')) return true;
    if ((form.codigoTipoLote || '') !== (lot.codigoTipoLote || '')) return true;
    if (form.codigo.trim() !== (lot.codigo || '').trim()) return true;
    if (form.numero.trim() !== (lot.numero || '').trim()) return true;
    if ((form.observaciones || '').trim() !== (lot.observaciones || '').trim()) return true;
    return hasDimensionsChanged();
  };

  const hasPriceChanges = (): boolean => {
    if (!isEditing) return precioManual.trim() !== '';
    const currentNum = precioVigenteActual;
    const newTrimmed = precioManual.trim();
    if (newTrimmed === '' && currentNum == null) return false;
    if (newTrimmed === '' && currentNum != null) return true;
    const newNum = Number(newTrimmed);
    if (Number.isNaN(newNum)) return true;
    return currentNum == null || currentNum !== newNum;
  };

  const validateEditingSubmit = (errs: FieldErrors): void => {
    const generalChanged = hasGeneralChanges();
    const priceChanged = hasPriceChanges();
    if (generalChanged && priceChanged) {
      errs.general = 'No es posible modificar simultaneamente los datos generales del lote y el precio de venta. Guarde primero los datos generales y luego actualice el precio.';
    }
    if (priceChanged) {
      if (isLotSoldOrReserved) {
        errs.precio = 'No se puede modificar el precio de un lote vendido o reservado.';
      } else if (!canEditPrice) {
        errs.precio = 'Solo los usuarios con rol Gerencia pueden modificar el precio oficial.';
      } else {
        const errorPrecio = validatePrecioManual(precioManual, lot?.codigoEstadoLote || 'DISPONIBLE');
        if (errorPrecio) errs.precio = errorPrecio;
      }
    }
  };

  const validateCreationSubmit = (errs: FieldErrors): void => {
    const estado = form.codigoEstadoLote.trim().toUpperCase();
    if (estado !== 'DISPONIBLE' && estado !== 'NO_DISPONIBLE') {
      errs.codigoEstadoLote = 'El lote nuevo debe iniciar como DISPONIBLE o NO_DISPONIBLE.';
    }
    const errorPrecio = validatePrecioManual(precioManual, estado);
    if (errorPrecio) errs.precio = errorPrecio;
  };

  const validateFormOnSubmit = (): FieldErrors => {
    const errs = validate(form, isEditing);
    if (isEditing) {
      validateEditingSubmit(errs);
    } else {
      validateCreationSubmit(errs);
    }
    return errs;
  };

  const executeSaveEditingLot = async (payload: LoteRequest): Promise<void> => {
    if (!lot) return;
    const generalChanged = hasGeneralChanges();
    const priceChanged = hasPriceChanges();

    if (priceChanged && !generalChanged) {
      const nuevoMonto = Number(precioManual.trim());
      await coreService.updateLotManualPrice(lot.idLote, {
        monto: nuevoMonto,
        observaciones: 'Actualizacion manual de precio por Gerencia'
      });
      toast.success('Precio oficial actualizado correctamente', {
        description: `Nuevo precio: S/ ${nuevoMonto.toFixed(2)}`
      });
      return;
    }

    if (generalChanged && !priceChanged) {
      await coreService.updateLot(lot.idLote, payload);
      toast.success('Lote actualizado correctamente');
      return;
    }

    if (!generalChanged && !priceChanged) {
      toast.info('No se detectaron cambios en el lote');
    }
  };

  const executeSaveCreatingLot = async (payload: LoteRequest): Promise<void> => {
    const tienePrecio = precioManual.trim() !== '';
    const precio = tienePrecio ? { monto: Number(precioManual.trim()) } : null;
    const res = await coreService.createLotWithPrice({ lote: payload, precio });
    toast.success('Lote creado correctamente', {
      description: precio
        ? `Lote ${res.codigo}: precio de S/ ${precio.monto.toFixed(2)} registrado.`
        : `Lote ${res.codigo}: registrado sin precio (NO_DISPONIBLE).`
    });
  };

  const executeSaveLot = async (payload: LoteRequest): Promise<void> => {
    if (isEditing) {
      await executeSaveEditingLot(payload);
    } else {
      await executeSaveCreatingLot(payload);
    }
  };

  const handleSaveError = (err: unknown) => {
    if (err instanceof ApiError) {
      const data = getBackendErrorData(err.data);
      const fieldErrors = data?.errores ? mapBackendFieldErrors(data.errores) : {};
      const msg = typeof data?.mensaje === 'string'
        ? data.mensaje
        : typeof data?.message === 'string'
        ? data.message
        : err.status === 409
        ? 'Ya existe un lote con ese código o número en la manzana.'
        : err.status === 404
        ? 'No se encontró el lote o la manzana solicitada.'
        : err.status === 400
        ? 'Revise los datos del lote y el precio de venta.'
        : err.message || 'Error al guardar el lote.';
      setErrors({ ...fieldErrors, general: msg });
    } else {
      setErrors({ general: err instanceof Error ? err.message : 'Error inesperado al guardar el lote.' });
    }
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const validationErrors = validateFormOnSubmit();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }
    setSubmitting(true);
    setErrors({});
    try {
      await executeSaveLot(buildRequest(form, isEditing, lot));
      await onSuccess();
      onClose();
    } catch (err: unknown) {
      handleSaveError(err);
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
                    {lotStatuses
                      .filter((s) => s.activo && (s.codigo === 'DISPONIBLE' || s.codigo === 'NO_DISPONIBLE'))
                      .map((st) => (
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


        {/* Seccion Precio de venta (Creacion y Edicion) */}
        <div className="rounded-lg border border-brand-200 bg-brand-50/50 p-4">
          <div className="flex items-center justify-between mb-1">
            <p className="text-xs font-semibold uppercase tracking-wide text-brand-600">
              Precio de venta {isEditing ? 'oficial (PEN)' : ''}
            </p>
            {isEditing && !canEditPrice && (
              <span className="inline-flex items-center rounded bg-amber-100 px-2 py-0.5 text-[11px] font-medium text-amber-800">
                Solo Gerencia
              </span>
            )}
            {isEditing && isLotSoldOrReserved && (
              <span className="inline-flex items-center rounded bg-gray-200 px-2 py-0.5 text-[11px] font-medium text-gray-700">
                Operacion activa
              </span>
            )}
          </div>

          <p className="mb-4 text-xs text-brand-500">
            {isEditing
              ? isLotSoldOrReserved
                ? `Este lote esta en estado ${lot?.nombreEstadoLote || lot?.codigoEstadoLote}. Su precio no puede ser modificado.`
                : !canEditPrice
                ? 'Modificacion restringida: Solo usuarios con rol Gerencia pueden modificar el precio oficial.'
                : 'Ingrese el nuevo precio oficial en soles (PEN). Al guardar, se cerrara la vigencia anterior y se conservara el historial.'
              : form.codigoEstadoLote === 'NO_DISPONIBLE'
              ? 'Ingrese el precio de venta en soles (PEN) o dejelo en blanco si aun no esta definido.'
              : 'Ingrese el precio de venta del lote en soles (PEN).'}
          </p>

          <div>
            <FieldLabel htmlFor="lot-precio-manual">
              Precio en soles (PEN){' '}
              {(!isEditing && form.codigoEstadoLote === 'DISPONIBLE') || isEditing ? '*' : '(Opcional)'}
            </FieldLabel>
            <Input
              id="lot-precio-manual"
              type="number"
              min={0}
              step="0.01"
              value={loadingPrice ? '' : precioManual}
              disabled={submitting || loadingPrice || (isEditing && (!canEditPrice || isLotSoldOrReserved))}
              onChange={(e) => {
                setPrecioManual(e.target.value);
                if (errors.precio) {
                  setErrors((prev) => ({ ...prev, precio: undefined, general: undefined }));
                }
              }}
              placeholder={loadingPrice ? 'Cargando precio...' : 'Ej. 30000.00'}
              className={errors.precio ? 'border-red-400 focus:border-red-500' : ''}
            />
            {errors.precio && (
              <p className="mt-1 text-xs text-red-600">{errors.precio}</p>
            )}
          </div>

          <div className="mt-4 rounded-md border border-brand-200 bg-white p-3">
            <p className="text-xs font-medium text-brand-600">
              Importe PEN
            </p>

            <p className="mt-1 text-xl font-bold text-brand-900">
              {loadingPrice
                ? 'Cargando...'
                : precioManual.trim() && !Number.isNaN(Number(precioManual)) && Number(precioManual) > 0
                ? new Intl.NumberFormat('es-PE', {
                    style: 'currency',
                    currency: 'PEN'
                  }).format(Number(precioManual))
                : 'S/ 0.00'}
            </p>
          </div>

          {!isEditing && form.codigoEstadoLote === 'NO_DISPONIBLE' && !precioManual.trim() && (
            <p className="mt-3 text-xs text-amber-700">
              El lote NO DISPONIBLE se creara sin precio mientras se define su valor comercial.
            </p>
          )}
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
