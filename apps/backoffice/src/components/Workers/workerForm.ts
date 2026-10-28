import type {
  ActualizarTrabajadorRequest,
  CatalogosTrabajadorResponse
} from '../../types/workers';
import { CORRECTION_EVIDENCE_MAX_SIZE, CORRECTION_EVIDENCE_MIME_TYPES } from './correctionDocumentUtils';
import { normalizeEmailAddress } from '../../lib/emailAddress';

export type WorkerDocumentType = CatalogosTrabajadorResponse['tiposDocumento'][number];

export function createInitialWorkerForm() {
  return {
    idTipoDocumento: '',
    numeroDocumento: '',
    nombres: '',
    apellidoPaterno: '',
    apellidoMaterno: '',
    fechaNacimiento: '',
    correoElectronico: '',
    telefono: '',
    direccion: '',
    referencia: '',
    idPais: null as number | null,
    pais: '',
    idDepartamento: null as number | null,
    codigoDepartamento: '',
    departamento: '',
    idProvincia: null as number | null,
    codigoProvincia: '',
    provincia: '',
    idDistrito: null as number | null,
    codigoDistrito: '',
    distrito: '',
    idArea: '',
    idCargo: '',
    idHorario: '',
    idTipoVinculoLaboral: '',
    fechaIngreso: '',
    observaciones: ''
  };
}

export type WorkerFormState = ReturnType<typeof createInitialWorkerForm>;
export type WorkerFormKey = keyof WorkerFormState;
export type WorkerFormErrors = Partial<Record<WorkerFormKey, string>>;
export type WorkerTouchedFields = Partial<Record<WorkerFormKey, boolean>>;

export interface EditableWorkerFormState extends WorkerFormState {
  idEstadoTrabajador: string;
  fechaCese: string;
  motivoCambioEstado: string;
}

export function changedWorkerFields<T extends object>(current: T, initial: T): Set<keyof T> {
  const keys = Object.keys(current) as (keyof T)[];
  return new Set(keys.filter((key) => current[key] !== initial[key]));
}

export function getManualWorkerStates(
  states: CatalogosTrabajadorResponse['estadosTrabajador']
): CatalogosTrabajadorResponse['estadosTrabajador'] {
  const codes = new Set(['ACTIVO', 'INACTIVO', 'SUSPENDIDO', 'CESADO']);
  return states.filter((state) => codes.has(state.codigo));
}

export function buildWorkerUpdatePayload(
  form: EditableWorkerFormState,
  changed: Set<keyof EditableWorkerFormState>,
  catalogs: CatalogosTrabajadorResponse
): ActualizarTrabajadorRequest {
  const personal: NonNullable<ActualizarTrabajadorRequest['informacionPersonal']> = {};
  const labor: NonNullable<ActualizarTrabajadorRequest['informacionLaboral']> = {};
  const fields: [WorkerFormKey, keyof NonNullable<ActualizarTrabajadorRequest['informacionPersonal']>][] = [
    ['nombres', 'nombres'], ['apellidoPaterno', 'apellidoPaterno'],
    ['apellidoMaterno', 'apellidoMaterno'], ['fechaNacimiento', 'fechaNacimiento'],
    ['telefono', 'telefono'], ['direccion', 'direccion'], ['referencia', 'referencia'],
    ['departamento', 'departamento'], ['provincia', 'provincia'], ['distrito', 'distrito']
  ];
  for (const [formKey, payloadKey] of fields) {
    if (!changed.has(formKey)) continue;
    const value = String(form[formKey] ?? '');
    (personal as Record<string, unknown>)[payloadKey] =
      formKey === 'fechaNacimiento' ? value || null : value.trim() || null;
  }

  if (changed.has('idCargo')) labor.idCargo = Number(form.idCargo);
  if (changed.has('idHorario')) labor.idHorario = form.idHorario ? Number(form.idHorario) : null;
  if (changed.has('idTipoVinculoLaboral')) labor.idTipoVinculoLaboral = Number(form.idTipoVinculoLaboral);
  if (changed.has('fechaIngreso')) labor.fechaIngreso = form.fechaIngreso;
  if (changed.has('observaciones')) labor.observaciones = form.observaciones.trim() || null;

  const statusChanged = changed.has('idEstadoTrabajador');
  const cessationChanged = changed.has('fechaCese');
  if (statusChanged || cessationChanged) {
    const status = catalogs.estadosTrabajador.find(
      (item) => String(item.idEstadoTrabajador) === form.idEstadoTrabajador
    );
    if (statusChanged) labor.idEstadoTrabajador = Number(form.idEstadoTrabajador);
    labor.motivoCambioEstado = form.motivoCambioEstado.trim();
    if (status?.codigo === 'CESADO') labor.fechaCese = form.fechaCese;
    else if (statusChanged) labor.fechaCese = null;
  }

  const payload: ActualizarTrabajadorRequest = {};
  if (Object.keys(personal).length > 0) payload.informacionPersonal = personal;
  if (Object.keys(labor).length > 0) payload.informacionLaboral = labor;
  return payload;
}

export interface CorrectionEvidenceFile {
  type: string;
  size: number;
}

export function validateCorrectionRequest(
  draft: { idTipoDocumento: string; numeroDocumento: string; motivo: string; archivo: CorrectionEvidenceFile | null },
  currentDocument: { idTipoDocumento: number | null; numeroDocumento: string | null },
  catalogs: CatalogosTrabajadorResponse
): string | null {
  if (!draft.idTipoDocumento) return 'Selecciona el tipo de documento propuesto.';
  const selectedType = catalogs.tiposDocumento.find(
    (item) => String(item.idTipoDocumento) === draft.idTipoDocumento
  );
  const documentError = validarDocumento(draft.numeroDocumento, selectedType);
  if (documentError) return documentError;
  if (
    draft.idTipoDocumento === String(currentDocument.idTipoDocumento) &&
    draft.numeroDocumento.trim() === currentDocument.numeroDocumento?.trim()
  ) {
    return 'El documento propuesto debe diferir del documento actual.';
  }
  if (draft.motivo.trim().length < 10 || draft.motivo.trim().length > 1000) {
    return 'El motivo de la corrección debe contener entre 10 y 1000 caracteres.';
  }
  if (!draft.archivo) return 'Adjunta la evidencia fotográfica del documento.';
  if (!CORRECTION_EVIDENCE_MIME_TYPES.includes(draft.archivo.type)) {
    return 'Solo se admiten archivos JPG, PNG o WebP.';
  }
  if (draft.archivo.size > CORRECTION_EVIDENCE_MAX_SIZE) {
    return 'La evidencia no puede superar los 5 MB.';
  }
  return null;
}

const RE_SOLO_NOMBRE = /^[A-Za-z\u00C0-\u024F\s-]*$/;
const RE_SOLO_NUMEROS = /^\d*$/;
const RE_ALFANUMERICO = /^[A-Za-z0-9]*$/;

export function esTipoSoloNumerico(tipo: WorkerDocumentType | undefined): boolean {
  if (!tipo) return false;
  const codigo = (tipo.codigo || '').toUpperCase();
  const nombre = (tipo.nombre || '').toLowerCase();
  if (codigo === 'DNI' || codigo === '01' || codigo === 'RUC' || codigo === '06') return true;
  if (codigo === 'CE' || codigo === '04' || nombre.includes('extranjer')) return true;
  return Boolean(tipo.soloNumerico);
}

export function filtrarCaracteresDocumento(valor: string, soloNumerico: boolean): string {
  return soloNumerico ? valor.replace(/\D/g, '') : valor.replace(/[^A-Za-z0-9]/g, '');
}

export function filtrarCaracteresNombre(valor: string): string {
  return valor.replace(/[^A-Za-z\u00C0-\u024F\s-]/g, '');
}

export function filtrarTelefono(valor: string): string {
  return valor.replace(/\D/g, '').slice(0, 15);
}

export function validarDocumento(valor: string, tipo: WorkerDocumentType | undefined): string | undefined {
  if (!valor.trim()) return 'El numero de documento es obligatorio.';
  if (!tipo) return undefined;
  const doc = valor.trim();
  const soloNum = esTipoSoloNumerico(tipo);
  if (soloNum && !RE_SOLO_NUMEROS.test(doc)) {
    return `El documento ${tipo.nombre} solo admite digitos numericos.`;
  }
  if (!soloNum && !RE_ALFANUMERICO.test(doc)) {
    return `El documento ${tipo.nombre} solo admite letras y numeros, sin espacios.`;
  }
  if (tipo.longitudMinima !== null && doc.length < tipo.longitudMinima) {
    return `El documento debe tener al menos ${tipo.longitudMinima} caracteres.`;
  }
  if (tipo.longitudMaxima !== null && doc.length > tipo.longitudMaxima) {
    return `El documento no puede superar ${tipo.longitudMaxima} caracteres.`;
  }
  return undefined;
}

export function validarNombreCampo(valor: string, etiqueta: string, requerido: boolean): string | undefined {
  if (requerido && !valor.trim()) return `${etiqueta} es obligatorio.`;
  if (valor.trim() && !RE_SOLO_NOMBRE.test(valor)) {
    return `${etiqueta} solo debe contener letras, tildes, ñ y guiones.`;
  }
  return undefined;
}

export function validarCorreo(valor: string): string | undefined {
  if (!valor.trim()) return undefined;
  if (!normalizeEmailAddress(valor)) {
    return 'Ingresa un correo valido (ej: persona@correo.com).';
  }
  return undefined;
}

export function validarTelefono(valor: string): string | undefined {
  if (!valor.trim()) return undefined;
  if (!/^\d{7,15}$/.test(valor.trim())) {
    return 'El telefono debe contener entre 7 y 15 digitos.';
  }
  return undefined;
}

export function formatWorkerDate(value: string | null | undefined): string {
  if (!value) return '—';
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  if (match) return `${match[3]}/${match[2]}/${match[1]}`;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '—' : new Intl.DateTimeFormat('es-PE').format(date);
}
