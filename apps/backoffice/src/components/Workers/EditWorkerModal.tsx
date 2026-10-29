import { useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import { AlertCircleIcon, FileImageIcon, UploadIcon } from 'lucide-react';
import { ApiError } from '../../lib/apiClient';
import { coreService } from '../../services/coreService';
import type {
  CatalogosTrabajadorResponse,
  TrabajadorResponse
} from '../../types/workers';
import { GeoLocationSelector, type GeoLocationValue } from '../geo/GeoLocationSelector';
import { Alert } from '../ui/Feedback';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { FieldLabel, Input, Select } from '../ui/Field';
import { Modal } from '../ui/Modal';
import { SuspendWorkerModal } from './SuspendWorkerModal';
import { CesarWorkerModal } from './CesarWorkerModal';
import { ReincorporarWorkerModal } from './ReincorporarWorkerModal';
import {
  clearIncompleteCorrection,
  CORRECTION_EVIDENCE_MAX_SIZE,
  CORRECTION_EVIDENCE_MIME_TYPES,
  readIncompleteCorrection,
  saveIncompleteCorrection,
  type IncompleteCorrectionRequest
} from './correctionDocumentUtils';
import {
  buildWorkerUpdatePayload,
  changedWorkerFields,
  createInitialWorkerForm,
  esTipoSoloNumerico,
  filtrarCaracteresDocumento,
  filtrarCaracteresNombre,
  filtrarTelefono,
  getManualWorkerStates,
  validarCorreo,
  validarDocumento,
  validarNombreCampo,
  validarTelefono,
  validateCorrectionRequest,
  type EditableWorkerFormState,
  type WorkerFormErrors,
} from './workerForm';

interface EditWorkerModalProps {
  open: boolean;
  workerId: number | null;
  onClose: () => void;
  onSuccess: () => void;
  onPartialUpdate?: () => void;
}

type EditFormState = EditableWorkerFormState;

interface CorrectionDraft {
  idTipoDocumento: string;
  numeroDocumento: string;
  motivo: string;
  archivo: File | null;
}

const EMPTY_CORRECTION: CorrectionDraft = {
  idTipoDocumento: '',
  numeroDocumento: '',
  motivo: '',
  archivo: null
};

function fieldError(message?: string) {
  return message ? <p className="mt-1 text-xs text-rose-600">{message}</p> : null;
}

function localDate(value: string | null | undefined): string {
  return value?.slice(0, 10) ?? '';
}

function toEditForm(worker: TrabajadorResponse): EditFormState {
  const personal = worker.informacionPersonal;
  const labor = worker.informacionLaboral;
  return {
    ...createInitialWorkerForm(),
    idTipoDocumento: personal.idTipoDocumento === null ? '' : String(personal.idTipoDocumento),
    numeroDocumento: personal.numeroDocumento ?? '',
    nombres: personal.nombres ?? '',
    apellidoPaterno: personal.apellidoPaterno ?? '',
    apellidoMaterno: personal.apellidoMaterno ?? '',
    fechaNacimiento: localDate(personal.fechaNacimiento),
    correoElectronico: personal.correoElectronico ?? '',
    telefono: personal.telefono ?? '',
    direccion: personal.direccion ?? '',
    referencia: personal.referencia ?? '',
    idPais: personal.idPais ?? null,
    pais: personal.pais ?? '',
    idDepartamento: personal.idDepartamento ?? null,
    codigoDepartamento: personal.codigoDepartamento ?? '',
    departamento: personal.departamento ?? '',
    idProvincia: personal.idProvincia ?? null,
    codigoProvincia: personal.codigoProvincia ?? '',
    provincia: personal.provincia ?? '',
    idDistrito: personal.idDistrito ?? null,
    codigoDistrito: personal.codigoDistrito ?? '',
    distrito: personal.distrito ?? '',
    idArea: String(labor.idArea),
    idCargo: String(labor.idCargo),
    idHorario: labor.idHorario === null ? '' : String(labor.idHorario),
    idTipoVinculoLaboral: String(labor.idTipoVinculoLaboral),
    fechaIngreso: localDate(labor.fechaIngreso),
    observaciones: labor.observaciones ?? '',
    idEstadoTrabajador: String(labor.idEstadoTrabajador),
    fechaCese: localDate(labor.fechaCese),
    motivoCambioEstado: ''
  };
}

function validateChanges(
  form: EditFormState,
  initial: EditFormState,
  changed: Set<keyof EditFormState>,
  catalogs: CatalogosTrabajadorResponse
): WorkerFormErrors & { idEstadoTrabajador?: string; fechaCese?: string; motivoCambioEstado?: string } {
  const errors: WorkerFormErrors & {
    idEstadoTrabajador?: string;
    fechaCese?: string;
    motivoCambioEstado?: string;
  } = {};
  const documentType = catalogs.tiposDocumento.find(
    (item) => String(item.idTipoDocumento) === form.idTipoDocumento
  );
  if (changed.has('nombres')) {
    const message = validarNombreCampo(form.nombres, 'Los nombres', true);
    if (message) errors.nombres = message;
  }
  if (changed.has('apellidoPaterno')) {
    const message = validarNombreCampo(form.apellidoPaterno, 'El apellido paterno', false);
    if (message) errors.apellidoPaterno = message;
  }
  if (changed.has('apellidoMaterno')) {
    const message = validarNombreCampo(form.apellidoMaterno, 'El apellido materno', false);
    if (message) errors.apellidoMaterno = message;
  }
  if (changed.has('fechaNacimiento') && form.fechaNacimiento > new Date().toISOString().slice(0, 10)) {
    errors.fechaNacimiento = 'La fecha de nacimiento no puede ser futura.';
  }
  if (changed.has('correoElectronico')) {
    const message = form.correoElectronico.trim()
      ? validarCorreo(form.correoElectronico)
      : 'El correo principal no se puede quitar desde este formulario.';

    if (message) {
      errors.correoElectronico = message;
    }
  }
  if (changed.has('telefono')) {
    const message = validarTelefono(form.telefono);
    if (message) errors.telefono = message;
  }
  if (changed.has('direccion') && !form.direccion.trim()) {
    errors.direccion = 'La dirección es obligatoria.';
  }
  const geoKeys: (keyof EditFormState)[] = ['pais', 'departamento', 'provincia', 'distrito'];
  if (geoKeys.some((key) => changed.has(key))) {
    if (!form.idPais || !form.pais.trim()) errors.pais = 'Selecciona un país.';
    if (!form.idDepartamento || !form.departamento.trim()) errors.departamento = 'Selecciona un departamento.';
    if (!form.idProvincia || !form.provincia.trim()) errors.provincia = 'Selecciona una provincia.';
    if (!form.idDistrito || !form.distrito.trim()) errors.distrito = 'Selecciona un distrito.';
  }
  if (changed.has('idArea') || changed.has('idCargo')) {
    const selectedCargo = catalogs.cargos.find(
      (item) => String(item.idCargo) === form.idCargo
    );
    if (!selectedCargo || String(selectedCargo.idArea) !== form.idArea) {
      errors.idCargo = 'Selecciona un cargo válido para el área elegida.';
    }
  }
  if (changed.has('idTipoVinculoLaboral') && !form.idTipoVinculoLaboral) {
    errors.idTipoVinculoLaboral = 'Selecciona el tipo de vínculo laboral.';
  }
  if (changed.has('fechaIngreso') && !form.fechaIngreso) {
    errors.fechaIngreso = 'La fecha de ingreso es obligatoria.';
  }
  if (changed.has('idEstadoTrabajador') && form.idEstadoTrabajador === initial.idEstadoTrabajador) {
    errors.idEstadoTrabajador = 'Selecciona un estado laboral.';
  }
  if (changed.has('idEstadoTrabajador') || changed.has('fechaCese')) {
    const selectedStatus = catalogs.estadosTrabajador.find(
      (item) => String(item.idEstadoTrabajador) === form.idEstadoTrabajador
    );
    if (!selectedStatus || !getManualWorkerStates(catalogs.estadosTrabajador).some(
      (state) => state.codigo === selectedStatus.codigo
    )) {
      errors.idEstadoTrabajador = 'El estado seleccionado no admite cambios manuales.';
    }
    if (form.motivoCambioEstado.trim().length < 10) {
      errors.motivoCambioEstado = 'Indica el motivo del cambio (mínimo 10 caracteres).';
    }
    if (selectedStatus?.codigo === 'CESADO') {
      if (!form.fechaCese) errors.fechaCese = 'La fecha de cese es obligatoria.';
      if (form.fechaCese && form.fechaIngreso && form.fechaCese < form.fechaIngreso) {
        errors.fechaCese = 'La fecha de cese no puede ser anterior a la fecha de ingreso.';
      }
    }
  }
  if (changed.has('numeroDocumento') || changed.has('idTipoDocumento')) {
    const message = validarDocumento(form.numeroDocumento, documentType);
    if (message) errors.numeroDocumento = message;
  }
  return errors;
}

export function EditWorkerModal({
  open,
  workerId,
  onClose,
  onSuccess,
  onPartialUpdate
}: EditWorkerModalProps) {
  const [worker, setWorker] = useState<TrabajadorResponse | null>(null);
  const [catalogs, setCatalogs] = useState<CatalogosTrabajadorResponse | null>(null);
  const [form, setForm] = useState<EditFormState | null>(null);
  const [baseline, setBaseline] = useState<EditFormState | null>(null);
  const [draft, setDraft] = useState<CorrectionDraft>(EMPTY_CORRECTION);
  const [pendingCorrection, setPendingCorrection] = useState<IncompleteCorrectionRequest | null>(null);
  const [correoSolicitudEnviada, setCorreoSolicitudEnviada] = useState<string | null>(null);
  const [motivoCorreo, setMotivoCorreo] = useState('');
  const [expandedCorrection, setExpandedCorrection] = useState(false);
  const [confirmClose, setConfirmClose] = useState(false);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errors, setErrors] = useState<WorkerFormErrors & {
    idEstadoTrabajador?: string;
    fechaCese?: string;
    motivoCambioEstado?: string;
    correction?: string;
    correoMotivo?: string;
  }>({});
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [showSuspendModal, setShowSuspendModal] = useState(false);
  const [showCesarModal, setShowCesarModal] = useState(false);
  const [showReincorporarModal, setShowReincorporarModal] = useState(false);
  const [reincorporacionPendiente, setReincorporacionPendiente] = useState(false);
  const submitLock = useRef(false);

  useEffect(() => {
    if (!open || workerId === null) return;
    let active = true;
    setLoading(true);
    setError(null);
    setWorker(null);
    setForm(null);
    setBaseline(null);
    setErrors({});
    setPendingCorrection(null);
    setCorreoSolicitudEnviada(null);
    setMotivoCorreo('');

    Promise.all([
      coreService.getWorker(workerId),
      coreService.getWorkerCatalogs(),
      coreService.listarReincorporaciones({ estado: 'PENDIENTE', idTrabajador: workerId }).catch(() => ({
        solicitudes: [],
        totalMostrado: 0
      }))
    ])
      .then(([workerData, catalogsData, reincData]) => {
        if (!active) return;
        const initialForm = toEditForm(workerData);
        setWorker(workerData);
        setCatalogs(catalogsData);
        setForm(initialForm);
        setBaseline(initialForm);
        setReincorporacionPendiente(Array.isArray(reincData?.solicitudes) && reincData.solicitudes.length > 0);
        const pending = readIncompleteCorrection(workerId);
        if (pending) {
          setPendingCorrection(pending);
          setExpandedCorrection(true);
          setDraft({
            ...EMPTY_CORRECTION,
            idTipoDocumento: String(pending.idTipoDocumento),
            numeroDocumento: pending.numeroDocumento
          });
        } else {
          setExpandedCorrection(false);
          setDraft(EMPTY_CORRECTION);
        }
      })
      .catch((reason: unknown) => {
        if (active) setError(reason instanceof Error ? reason.message : 'No se pudo cargar el trabajador.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [open, workerId]);

  useEffect(() => {
    if (!draft.archivo) {
      setPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(draft.archivo);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [draft.archivo]);

  const changed = useMemo(
    () => form && baseline ? changedWorkerFields(form, baseline) : new Set<keyof EditFormState>(),
    [form, baseline]
  );
  const hasCorrectionDraft = expandedCorrection && (
    Boolean(pendingCorrection) ||
    Boolean(draft.idTipoDocumento || draft.numeroDocumento || draft.motivo || draft.archivo)
  );
  const hasUnsavedChanges = changed.size > 0 || hasCorrectionDraft;
  const pendingEvidenceRecovery = pendingCorrection !== null;
  const currentType = catalogs?.tiposDocumento.find(
    (item) => String(item.idTipoDocumento) === worker?.informacionPersonal.idTipoDocumento?.toString()
  );
  const manualStatuses = getManualWorkerStates(catalogs?.estadosTrabajador ?? []);
  const currentStatus = catalogs?.estadosTrabajador.find(
    (item) => String(item.idEstadoTrabajador) === form?.idEstadoTrabajador
  );
  const selectedDocumentType = catalogs?.tiposDocumento.find(
    (item) => String(item.idTipoDocumento) === draft.idTipoDocumento
  );
  const availablePositions = catalogs?.cargos.filter(
    (item) => String(item.idArea) === form?.idArea
  ) ?? [];

  const isGerenteGeneral = useMemo(() => {
    if (!worker) return false;
    const cargo = worker.informacionLaboral.cargo?.toLowerCase() || '';
    return cargo.includes('gerente general') || cargo === 'gg';
  }, [worker]);

  function handleSelectEstado(targetValue: string) {
    const selected = catalogs?.estadosTrabajador.find(
      (item) => String(item.idEstadoTrabajador) === targetValue
    );
    if (selected?.codigo === 'SUSPENDIDO') {
      setShowSuspendModal(true);
      return;
    }
    if (selected?.codigo === 'CESADO') {
      setShowCesarModal(true);
      return;
    }
    setFormValue('idEstadoTrabajador', targetValue);
  }

  async function handleSpecialOperationSuccess() {
    if (!worker) return;
    try {
      const refreshed = await coreService.getWorker(worker.idTrabajador);
      updateBaseline(refreshed);
      onPartialUpdate?.();
    } catch {
      onPartialUpdate?.();
    }
  }

  function handleReincorporacionSuccess() {
    if (!worker) return;
    setReincorporacionPendiente(true);
    onPartialUpdate?.();
  }

  function setFormValue<K extends keyof EditFormState>(key: K, value: EditFormState[K]) {
    setForm((current) => current ? { ...current, [key]: value } : current);
    setErrors((current) => ({ ...current, [key]: undefined }));
  }

  function requestClose() {
    if (submitting) return;
    if (confirmClose) return;
    if (hasUnsavedChanges) {
      setConfirmClose(true);
      return;
    }
    onClose();
  }

  function updateGeo(value: GeoLocationValue) {
    setForm((current) => current ? {
      ...current,
      idPais: value.idPais ?? null,
      pais: value.pais ?? '',
      idDepartamento: value.idDepartamento ?? null,
      codigoDepartamento: value.codigoDepartamento ?? '',
      departamento: value.departamento ?? '',
      idProvincia: value.idProvincia ?? null,
      codigoProvincia: value.codigoProvincia ?? '',
      provincia: value.provincia ?? '',
      idDistrito: value.idDistrito ?? null,
      codigoDistrito: value.codigoDistrito ?? '',
      distrito: value.distrito ?? ''
    } : current);
    setErrors((current) => ({
      ...current,
      pais: undefined,
      departamento: undefined,
      provincia: undefined,
      distrito: undefined
    }));
  }

  function toggleCorrection() {
    if (pendingEvidenceRecovery) return;
    if (expandedCorrection) {
      setExpandedCorrection(false);
      setDraft(EMPTY_CORRECTION);
      setErrors((current) => ({ ...current, correction: undefined }));
      return;
    }
    setExpandedCorrection(true);
  }

  function handleEvidenceChange(file: File | undefined) {
    if (!file) return;
    if (!CORRECTION_EVIDENCE_MIME_TYPES.includes(file.type)) {
      setErrors((current) => ({ ...current, correction: 'Solo se admiten archivos JPG, PNG o WebP.' }));
      return;
    }
    if (file.size > CORRECTION_EVIDENCE_MAX_SIZE) {
      setErrors((current) => ({ ...current, correction: 'La evidencia no puede superar los 5 MB.' }));
      return;
    }
    setDraft((current) => ({ ...current, archivo: file }));
    setErrors((current) => ({ ...current, correction: undefined }));
  }

  function updateBaseline(updated: TrabajadorResponse, emailValue?: string) {
    const next = toEditForm(updated);
    setWorker(updated);
    setBaseline(next);
    setForm({ ...next, correoElectronico: emailValue ?? next.correoElectronico });
  }

  async function guardar() {
    if (!worker || !form || !baseline || !catalogs || submitLock.current) return;
    submitLock.current = true;

    const currentChanges = changedWorkerFields(form, baseline);
    const correctionOnlyRetry = pendingEvidenceRecovery;
    if (correctionOnlyRetry && !draft.archivo) {
      setErrors((current) => ({ ...current, correction: 'Adjunta la evidencia para completar la solicitud ya registrada.' }));
      submitLock.current = false;
      return;
    }
    if (!correctionOnlyRetry) {
      const validationErrors = validateChanges(form, baseline, currentChanges, catalogs);
      if (currentChanges.has('correoElectronico') &&
        (motivoCorreo.trim().length < 10 || motivoCorreo.trim().length > 1000)) {
        validationErrors.correoElectronico = 'Indica el motivo del cambio de correo (10 a 1000 caracteres).';
      }
      const firstError = Object.values(validationErrors).find(
        (message) =>
          typeof message === 'string' &&
          message.trim().length > 0
      );

      if (firstError) {
        setErrors((current) => ({
          ...current,
          ...validationErrors
        }));

        toast.error(firstError);

        submitLock.current = false;
        return;
      }
      if (expandedCorrection) {
        const correctionError = validateCorrectionRequest(draft, worker.informacionPersonal, catalogs);
        if (correctionError) {
          setErrors((current) => ({ ...current, correction: correctionError }));
          toast.error(correctionError);
          submitLock.current = false;
          return;
        }
      }
      if (currentChanges.size === 0 && !hasCorrectionDraft) {
        toast.info('No hay cambios por guardar.');
        submitLock.current = false;
        return;
      }
    }

    setSubmitting(true);
    setErrors((current) => ({ ...current, correction: undefined }));
    const completed: string[] = [];
    try {
      if (!correctionOnlyRetry) {
        const nonEmailChanges = new Set(currentChanges);
        nonEmailChanges.delete('correoElectronico');
        const targetStatus = catalogs.estadosTrabajador.find(
          (item) => String(item.idEstadoTrabajador) === form.idEstadoTrabajador
        );
        if (targetStatus?.codigo === 'SUSPENDIDO' || targetStatus?.codigo === 'CESADO') {
          nonEmailChanges.delete('idEstadoTrabajador');
          nonEmailChanges.delete('fechaCese');
          nonEmailChanges.delete('motivoCambioEstado');
        }
        const updatePayload = buildWorkerUpdatePayload(form, nonEmailChanges, catalogs);
        if (updatePayload.informacionPersonal || updatePayload.informacionLaboral) {
          await coreService.updateWorker(worker.idTrabajador, updatePayload);
          completed.push('los cambios personales o laborales');
          const preserveEmail = currentChanges.has('correoElectronico') || correoSolicitudEnviada
            ? form.correoElectronico
            : undefined;
          try {
            const refreshed = await coreService.getWorker(worker.idTrabajador);
            updateBaseline(refreshed, preserveEmail);
          } catch {
            setBaseline({ ...form, correoElectronico: baseline.correoElectronico });
          }
        }

        const emailChanged = currentChanges.has('correoElectronico') &&
          form.correoElectronico.trim() !== correoSolicitudEnviada;
        if (emailChanged) {
          const response = await coreService.solicitarCambioCorreoTrabajador(
            worker.idTrabajador,
            form.correoElectronico.trim(),
            motivoCorreo.trim()
          );
          completed.push('la solicitud de aprobación del nuevo correo');
          setCorreoSolicitudEnviada(form.correoElectronico.trim());
          setBaseline((current) => current ? {
            ...current,
            correoElectronico: form.correoElectronico.trim()
          } : current);
          toast.info(response.mensaje || 'La solicitud queda pendiente de aprobación por Gerencia o Administración.');
        }
      }

      if (expandedCorrection || correctionOnlyRetry) {
        let request = pendingCorrection;
        let recoveryStored = Boolean(pendingCorrection);
        if (!request) {
          const response = await coreService.solicitarCorreccionDocumento(worker.idTrabajador, {
            idTipoDocumento: Number(draft.idTipoDocumento),
            numeroDocumento: draft.numeroDocumento.trim(),
            motivo: draft.motivo.trim()
          });
          request = {
            idSolicitud: response.idSolicitud,
            idTrabajador: worker.idTrabajador,
            idTipoDocumento: Number(draft.idTipoDocumento),
            numeroDocumento: draft.numeroDocumento.trim(),
            timestamp: Date.now()
          };
          completed.push(`la solicitud documental #${request.idSolicitud}`);
          setPendingCorrection(request);
          try {
            saveIncompleteCorrection(request);
            recoveryStored = true;
          } catch {
            recoveryStored = false;
          }
        }

        try {
          await coreService.adjuntarEvidenciaCorreccion(request.idSolicitud, draft.archivo as File);
          completed.push('la evidencia documental');
          try {
            clearIncompleteCorrection(worker.idTrabajador);
          } catch {
            toast.warning('La evidencia se adjuntó, pero no se pudo limpiar la referencia local de recuperación.');
          }
        } catch (reason) {
          const message = reason instanceof ApiError
            ? reason.message
            : 'La solicitud quedó registrada, pero no se pudo adjuntar la evidencia.';
          const recoveryMessage = recoveryStored
            ? 'Puedes reintentar la carga desde este formulario o abrirlo de nuevo.'
            : 'El navegador no pudo guardar la referencia de recuperación; mantén este formulario abierto para reintentar.';
          setErrors((current) => ({ ...current, correction: message }));
          toast.error(`${completed.join(', ')} se completaron; la evidencia de la solicitud #${request.idSolicitud} sigue pendiente. ${recoveryMessage} ${message}`);
          onPartialUpdate?.();
          return;
        }
      }

      const confirmation = completed.length > 0
        ? `Se completaron ${completed.join(', ')}.`
        : 'No había cambios por guardar.';
      toast.success('Trabajador actualizado', { description: confirmation });
      onSuccess();
      onClose();
    } catch (reason) {
      const message = reason instanceof ApiError
        ? reason.message
        : reason instanceof Error
          ? reason.message
          : 'Ocurrió un error al guardar los cambios.';
      const partial = completed.length > 0
        ? ` Se completaron ${completed.join(', ')}; la siguiente operación no se completó.`
        : '';
      toast.error(`No se pudo completar el guardado. ${message}${partial}`);
      if (completed.length > 0) onPartialUpdate?.();
    } finally {
      setSubmitting(false);
      submitLock.current = false;
    }
  }

  const disabledFields = submitting || loading || pendingEvidenceRecovery;
  const statusIsSystemManaged = currentStatus?.codigo === 'EN_VERIFICACION';
  const currentTypeName = currentType?.nombre ?? 'Tipo no disponible';

  return (
    <>
      <Modal
        open={open}
        onClose={requestClose}
        title="Editar trabajador"
        description="Actualiza la información autorizada y conserva los flujos de identidad y correo."
        width="max-w-3xl"
        footer={(
          <div className="flex items-center justify-end gap-2">
            <Button variant="secondary" onClick={requestClose} disabled={submitting}>Cancelar</Button>
            <Button
              variant="primary"
              onClick={() => void guardar()}
              disabled={loading || submitting || !form || !baseline || (!hasUnsavedChanges) || (pendingEvidenceRecovery && !draft.archivo)}
            >
              {submitting ? 'Guardando...' : pendingEvidenceRecovery ? 'Adjuntar evidencia' : 'Guardar cambios'}
            </Button>
          </div>
        )}
      >
        {loading ? (
          <p className="py-8 text-center text-sm text-brand-500">Cargando trabajador y catálogos...</p>
        ) : error ? (
          <Alert tone="danger" title="No se pudo cargar el trabajador">{error}</Alert>
        ) : form && worker && catalogs ? (
          <form className="space-y-6" onSubmit={(event) => { event.preventDefault(); void guardar(); }}>
            {pendingEvidenceRecovery ? (
              <Alert tone="warning" title={`Solicitud #${pendingCorrection?.idSolicitud} pendiente de evidencia`}>
                La solicitud ya está registrada. Adjunta la fotografía para completarla; las demás modificaciones están bloqueadas mientras se resuelve.
              </Alert>
            ) : null}

            <section>
              <h3 className="mb-4 border-b border-brand-100 pb-2 text-sm font-semibold text-brand-900">
                1. Documento de identidad
              </h3>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <FieldLabel htmlFor="documentoActualTipo">Tipo de documento actual</FieldLabel>
                  <Input id="documentoActualTipo" value={currentTypeName} readOnly disabled />
                </div>
                <div>
                  <FieldLabel htmlFor="documentoActualNumero">Número de documento actual</FieldLabel>
                  <Input id="documentoActualNumero" value={worker.informacionPersonal.numeroDocumento ?? ''} readOnly disabled />
                </div>
              </div>
              <div className="mt-4">
                <Button
                  variant="secondary"
                  icon={UploadIcon}
                  onClick={toggleCorrection}
                  disabled={submitting || pendingEvidenceRecovery}
                  aria-expanded={expandedCorrection}
                >
                  {expandedCorrection ? 'Cancelar corrección documental' : 'Solicitar corrección de documento'}
                </Button>
              </div>
              {expandedCorrection ? (
                <div className="mt-4 space-y-4 rounded-md border border-brand-100 bg-brand-50/40 p-4">
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                      <FieldLabel htmlFor="documentoPropuestoTipo">Nuevo tipo de documento *</FieldLabel>
                      <Select
                        id="documentoPropuestoTipo"
                        value={draft.idTipoDocumento}
                        onChange={(event) => setDraft((current) => ({ ...current, idTipoDocumento: event.target.value }))}
                        disabled={disabledFields}
                      >
                        <option value="">Seleccionar tipo</option>
                        {catalogs.tiposDocumento.map((item) => (
                          <option key={item.idTipoDocumento} value={item.idTipoDocumento}>{item.nombre}</option>
                        ))}
                      </Select>
                    </div>
                    <div>
                      <FieldLabel htmlFor="documentoPropuestoNumero">Nuevo número de documento *</FieldLabel>
                      <Input
                        id="documentoPropuestoNumero"
                        value={draft.numeroDocumento}
                        onChange={(event) => setDraft((current) => ({
                          ...current,
                          numeroDocumento: filtrarCaracteresDocumento(event.target.value, esTipoSoloNumerico(selectedDocumentType))
                        }))}
                        maxLength={selectedDocumentType?.longitudMaxima ?? undefined}
                        inputMode={esTipoSoloNumerico(selectedDocumentType) ? 'numeric' : 'text'}
                        disabled={disabledFields || !draft.idTipoDocumento}
                        autoComplete="off"
                      />
                    </div>
                  </div>
                  <div>
                    <FieldLabel htmlFor="motivoCorreccion">Motivo de la corrección *</FieldLabel>
                    <textarea
                      id="motivoCorreccion"
                      value={draft.motivo}
                      onChange={(event) => setDraft((current) => ({ ...current, motivo: event.target.value }))}
                      disabled={disabledFields || pendingEvidenceRecovery}
                      maxLength={1000}
                      rows={3}
                      className="w-full resize-y rounded-md border border-brand-200 bg-white px-3 py-2 text-[13px] text-brand-800 focus:border-brand-500 focus:outline-none disabled:bg-brand-50"
                    />
                  </div>
                  <div>
                    <FieldLabel htmlFor="evidenciaCorreccion">Evidencia fotográfica (JPG, PNG o WebP; máximo 5 MB) *</FieldLabel>
                    <input
                      id="evidenciaCorreccion"
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      onChange={(event) => handleEvidenceChange(event.target.files?.[0])}
                      disabled={submitting}
                      className="block w-full text-sm text-brand-600 file:mr-3 file:rounded-md file:border-0 file:bg-brand-100 file:px-3 file:py-2 file:text-xs file:font-medium file:text-brand-800"
                    />
                    {draft.archivo ? (
                      <div className="mt-2 flex items-center gap-2 text-xs text-brand-600">
                        <FileImageIcon className="h-4 w-4" aria-hidden="true" />
                        <span>{draft.archivo.name} ({Math.ceil(draft.archivo.size / 1024)} KB)</span>
                      </div>
                    ) : null}
                    {previewUrl ? <img src={previewUrl} alt="Vista previa de la evidencia" className="mt-3 max-h-40 rounded border border-brand-200 object-contain" /> : null}
                  </div>
                  {errors.correction ? (
                    <div className="flex items-start gap-2 rounded-md border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700">
                      <AlertCircleIcon className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                      <span>{errors.correction}</span>
                    </div>
                  ) : null}
                </div>
              ) : null}
            </section>

            <section>
              <h3 className="mb-4 border-b border-brand-100 pb-2 text-sm font-semibold text-brand-900">
                2. Información personal
              </h3>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <FieldLabel htmlFor="editNombres">Nombres *</FieldLabel>
                  <Input id="editNombres" value={form.nombres} onChange={(event) => setFormValue('nombres', filtrarCaracteresNombre(event.target.value))} disabled={disabledFields} />
                  {fieldError(errors.nombres)}
                </div>
                <div>
                  <FieldLabel htmlFor="editApellidoPaterno">Apellido paterno</FieldLabel>
                  <Input id="editApellidoPaterno" value={form.apellidoPaterno} onChange={(event) => setFormValue('apellidoPaterno', filtrarCaracteresNombre(event.target.value))} disabled={disabledFields} />
                  {fieldError(errors.apellidoPaterno)}
                </div>
                <div>
                  <FieldLabel htmlFor="editApellidoMaterno">Apellido materno</FieldLabel>
                  <Input id="editApellidoMaterno" value={form.apellidoMaterno} onChange={(event) => setFormValue('apellidoMaterno', filtrarCaracteresNombre(event.target.value))} disabled={disabledFields} />
                  {fieldError(errors.apellidoMaterno)}
                </div>
                <div>
                  <FieldLabel htmlFor="editFechaNacimiento">Fecha de nacimiento</FieldLabel>
                  <Input id="editFechaNacimiento" type="date" value={form.fechaNacimiento} onChange={(event) => setFormValue('fechaNacimiento', event.target.value)} disabled={disabledFields} max={new Date().toISOString().slice(0, 10)} />
                  {fieldError(errors.fechaNacimiento)}
                </div>
                <div>
                  <FieldLabel htmlFor="editCorreo">Correo electrónico</FieldLabel>
                  <Input id="editCorreo" type="email" value={form.correoElectronico} onChange={(event) => setFormValue('correoElectronico', event.target.value)} disabled={disabledFields} autoComplete="email" />
                  <p className="mt-1 text-[11px] text-brand-400">El cambio requiere aprobación de Gerencia o Administración y confirmación desde el nuevo correo. El correo actual se conserva mientras tanto.</p>
                  {changed.has('correoElectronico') ? (
                    <div className="mt-3">
                      <FieldLabel htmlFor="editMotivoCorreo">Motivo del cambio de correo *</FieldLabel>
                      <textarea id="editMotivoCorreo" rows={3} maxLength={1000} value={motivoCorreo}
                        onChange={(event) => { setMotivoCorreo(event.target.value); setErrors((v) => ({ ...v, correoElectronico: undefined })); }}
                        disabled={disabledFields} placeholder="Describe el motivo para Gerencia o Administración (mínimo 10 caracteres)."
                        className="w-full rounded-md border border-brand-200 px-3 py-2 text-[13px] text-brand-800 focus:border-brand-500 focus:outline-none disabled:bg-brand-50" />
                    </div>
                  ) : null}
                  {fieldError(errors.correoElectronico)}
                </div>
                <div>
                  <FieldLabel htmlFor="editTelefono">Teléfono</FieldLabel>
                  <Input id="editTelefono" value={form.telefono} onChange={(event) => setFormValue('telefono', filtrarTelefono(event.target.value))} inputMode="numeric" disabled={disabledFields} />
                  {fieldError(errors.telefono)}
                </div>
                <div className="sm:col-span-2">
                  <FieldLabel htmlFor="editDireccion">Dirección *</FieldLabel>
                  <Input id="editDireccion" value={form.direccion} onChange={(event) => setFormValue('direccion', event.target.value)} disabled={disabledFields} />
                  {fieldError(errors.direccion)}
                </div>
                <div className="sm:col-span-2">
                  <FieldLabel htmlFor="editReferencia">Referencia del domicilio</FieldLabel>
                  <Input id="editReferencia" value={form.referencia} onChange={(event) => setFormValue('referencia', event.target.value)} disabled={disabledFields} />
                </div>
                <div className="sm:col-span-2">
                  <GeoLocationSelector
                    value={{
                      idPais: form.idPais,
                      pais: form.pais,
                      idDepartamento: form.idDepartamento,
                      codigoDepartamento: form.codigoDepartamento,
                      departamento: form.departamento,
                      idProvincia: form.idProvincia,
                      codigoProvincia: form.codigoProvincia,
                      provincia: form.provincia,
                      idDistrito: form.idDistrito,
                      codigoDistrito: form.codigoDistrito,
                      distrito: form.distrito
                    }}
                    onChange={updateGeo}
                    disabled={disabledFields}
                    defaultCountryName=""
                    errors={{
                      pais: errors.pais,
                      departamento: errors.departamento,
                      provincia: errors.provincia,
                      distrito: errors.distrito
                    }}
                  />
                  {!form.idDepartamento && form.departamento ? (
                    <p className="mt-1 text-[11px] text-brand-400">La ubicación se conserva tal como está registrada. Para cambiarla, selecciona nuevamente sus opciones oficiales.</p>
                  ) : null}
                </div>
              </div>
            </section>

            <section>
              <h3 className="mb-4 border-b border-brand-100 pb-2 text-sm font-semibold text-brand-900">
                3. Información laboral
              </h3>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <FieldLabel htmlFor="editArea">Área *</FieldLabel>
                  <Select id="editArea" value={form.idArea} onChange={(event) => {
                    setForm((current) => current ? { ...current, idArea: event.target.value, idCargo: '' } : current);
                    setErrors((current) => ({ ...current, idCargo: undefined }));
                  }} disabled={disabledFields}>
                    <option value="">Seleccionar área</option>
                    {catalogs.areas.map((item) => <option key={item.idArea} value={item.idArea}>{item.nombre}</option>)}
                  </Select>
                </div>
                <div>
                  <FieldLabel htmlFor="editCargo">Cargo *</FieldLabel>
                  <Select id="editCargo" value={form.idCargo} onChange={(event) => setFormValue('idCargo', event.target.value)} disabled={disabledFields || !form.idArea}>
                    <option value="">Seleccionar cargo</option>
                    {availablePositions.map((item) => <option key={item.idCargo} value={item.idCargo}>{item.nombre}</option>)}
                  </Select>
                  {fieldError(errors.idCargo)}
                </div>
                <div>
                  <FieldLabel htmlFor="editVinculo">Tipo de vínculo laboral *</FieldLabel>
                  <Select id="editVinculo" value={form.idTipoVinculoLaboral} onChange={(event) => setFormValue('idTipoVinculoLaboral', event.target.value)} disabled={disabledFields}>
                    <option value="">Seleccionar vínculo</option>
                    {catalogs.tiposVinculoLaboral.map((item) => <option key={item.idTipoVinculoLaboral} value={item.idTipoVinculoLaboral}>{item.nombre}</option>)}
                  </Select>
                  {fieldError(errors.idTipoVinculoLaboral)}
                </div>
                <div>
                  <FieldLabel htmlFor="editHorario">Horario</FieldLabel>
                  <Select id="editHorario" value={form.idHorario} onChange={(event) => setFormValue('idHorario', event.target.value)} disabled={disabledFields || catalogs.horarios.length === 0}>
                    <option value="">Sin asignar</option>
                    {catalogs.horarios.map((item) => <option key={item.idHorario} value={item.idHorario}>{item.nombre}</option>)}
                  </Select>
                </div>
                <div>
                  <FieldLabel htmlFor="editFechaIngreso">Fecha de ingreso *</FieldLabel>
                  <Input id="editFechaIngreso" type="date" value={form.fechaIngreso} onChange={(event) => setFormValue('fechaIngreso', event.target.value)} disabled={disabledFields} />
                  {fieldError(errors.fechaIngreso)}
                </div>
                <div>
                  <FieldLabel htmlFor="editEstado">Estado laboral *</FieldLabel>
                  {statusIsSystemManaged ? (
                    <Input id="editEstado" value={currentStatus?.nombre ?? worker.informacionLaboral.estadoTrabajador} readOnly disabled />
                  ) : currentStatus?.codigo === 'CESADO' ? (
                    <div className="space-y-2">
                      <Input id="editEstado" value="Cesado" readOnly disabled />
                      {reincorporacionPendiente ? (
                        <div className="rounded-md border border-amber-200 bg-amber-50 p-2.5">
                          <Badge tone="accent">Reincorporación pendiente</Badge>
                          <p className="mt-1 text-[11px] text-amber-800">
                            El trabajador permanece en estado CESADO hasta la evaluación administrativa.
                          </p>
                        </div>
                      ) : (
                        <Button
                          type="button"
                          variant="secondary"
                          size="sm"
                          onClick={() => setShowReincorporarModal(true)}
                          disabled={disabledFields || isGerenteGeneral}
                        >
                          Solicitar reincorporación
                        </Button>
                      )}
                    </div>
                  ) : (
                    <div>
                      <Select
                        id="editEstado"
                        value={form.idEstadoTrabajador}
                        onChange={(event) => handleSelectEstado(event.target.value)}
                        disabled={disabledFields || isGerenteGeneral}
                      >
                        <option value="">Seleccionar estado</option>
                        {manualStatuses.map((item) => (
                          <option key={item.idEstadoTrabajador} value={item.idEstadoTrabajador}>
                            {item.nombre}
                          </option>
                        ))}
                      </Select>
                      <div className="mt-2 flex flex-wrap gap-2">
                        <Button
                          type="button"
                          variant="secondary"
                          size="sm"
                          onClick={() => setShowSuspendModal(true)}
                          disabled={disabledFields || isGerenteGeneral}
                        >
                          Suspender trabajador...
                        </Button>
                        <Button
                          type="button"
                          variant="secondary"
                          size="sm"
                          onClick={() => setShowCesarModal(true)}
                          disabled={disabledFields || isGerenteGeneral}
                        >
                          Cesar trabajador...
                        </Button>
                      </div>
                    </div>
                  )}
                  {statusIsSystemManaged ? <p className="mt-1 text-[11px] text-amber-700">Este estado lo administra la resolución de corrección documental.</p> : null}
                  {isGerenteGeneral ? <p className="mt-1 text-[11px] text-brand-500">El Gerente General es un usuario protegido del sistema.</p> : null}
                  {fieldError(errors.idEstadoTrabajador)}
                </div>
                {currentStatus?.codigo === 'CESADO' ? (
                  <div>
                    <FieldLabel htmlFor="editFechaCese">Fecha de cese</FieldLabel>
                    <Input id="editFechaCese" type="date" value={form.fechaCese} readOnly disabled />
                  </div>
                ) : null}
                {changed.has('idEstadoTrabajador') && !pendingEvidenceRecovery && form.idEstadoTrabajador !== baseline?.idEstadoTrabajador ? (
                  <div className="sm:col-span-2">
                    <FieldLabel htmlFor="editMotivoEstado">Motivo del cambio de estado *</FieldLabel>
                    <textarea id="editMotivoEstado" value={form.motivoCambioEstado} onChange={(event) => setFormValue('motivoCambioEstado', event.target.value)} maxLength={1000} rows={2} disabled={disabledFields} className="w-full rounded-md border border-brand-200 px-3 py-2 text-[13px] text-brand-800 focus:border-brand-500 focus:outline-none disabled:bg-brand-50" />
                    {fieldError(errors.motivoCambioEstado)}
                  </div>
                ) : null}
                <div className="sm:col-span-2">
                  <FieldLabel htmlFor="editObservaciones">Observaciones</FieldLabel>
                  <textarea id="editObservaciones" value={form.observaciones} onChange={(event) => setFormValue('observaciones', event.target.value)} rows={3} disabled={disabledFields} className="w-full resize-none rounded-md border border-brand-200 px-3 py-2 text-[13px] text-brand-800 focus:border-brand-500 focus:outline-none disabled:bg-brand-50" />
                </div>
              </div>
            </section>
          </form>
        ) : null}
      </Modal>

      <Modal
        open={confirmClose}
        onClose={() => setConfirmClose(false)}
        title="Descartar cambios sin guardar"
        description="Hay cambios que todavía no se han guardado."
        width="max-w-md"
        footer={(
          <div className="flex items-center justify-end gap-2">
            <Button variant="secondary" onClick={() => setConfirmClose(false)}>Seguir editando</Button>
            <Button variant="danger" onClick={() => { setConfirmClose(false); onClose(); }}>Cerrar sin guardar</Button>
          </div>
        )}
      >
        <p className="text-sm text-brand-600">
          {pendingEvidenceRecovery
            ? `La solicitud #${pendingCorrection?.idSolicitud} ya existe y quedará pendiente de evidencia para recuperarla después.`
            : 'Las modificaciones y la solicitud documental todavía no enviada se descartarán.'}
        </p>
      </Modal>

      <SuspendWorkerModal
        open={showSuspendModal}
        worker={worker}
        onClose={() => setShowSuspendModal(false)}
        onSuccess={handleSpecialOperationSuccess}
      />

      <CesarWorkerModal
        open={showCesarModal}
        worker={worker}
        onClose={() => setShowCesarModal(false)}
        onSuccess={handleSpecialOperationSuccess}
      />

      <ReincorporarWorkerModal
        open={showReincorporarModal}
        worker={worker}
        onClose={() => setShowReincorporarModal(false)}
        onSuccess={handleReincorporacionSuccess}
      />
    </>
  );
}
