import type { PersonaIdentificadaResponse } from '../services/coreService';
import { validarDocumento, validarNombreCampo, type WorkerFormState, type WorkerDocumentType } from '../components/Workers/workerForm';
import { formatPersonName } from './personName';

/** Resultado de la consulta de RRHH; el proveedor externo no asigna idPersona. */
export interface WorkerIdentityResponse {
  idTipoDocumento: number; numeroDocumento: string; estado: 'ENCONTRADO' | 'NO_ENCONTRADO' | 'NO_DISPONIBLE';
  fuente: string; persona: { nombres: string; apellidoPaterno: string | null; apellidoMaterno: string | null } | null;
  personaRegistrada: PersonaIdentificadaResponse | null; mensaje: string;
}
/** Valores de identidad completados automáticamente que pueden retirarse al cambiar documento. */
export type AutomaticWorkerIdentity = Partial<Pick<WorkerFormState, 'nombres' | 'apellidoPaterno' | 'apellidoMaterno' | 'fechaNacimiento' | 'correoElectronico'>>;

/** Identifica la solicitud y conserva ceros iniciales del documento. */
export function workerDocumentKey(form: { idTipoDocumento: string | number; numeroDocumento: string }): string {
  return `${form.idTipoDocumento}:${form.numeroDocumento}`;
}

/** Consulta únicamente DNI o carné completos y permitidos por el catálogo. */
export function canLookupWorker(form: WorkerFormState, type?: WorkerDocumentType): boolean {
  const code = type?.codigo?.toUpperCase() ?? '';
  const pattern = ['DNI', '01', '1'].includes(code) ? /^[0-9]{8}$/ : ['CE', '04', '4'].includes(code) ? /^[0-9]{9,12}$/ : undefined;
  return Boolean(form.idTipoDocumento && pattern?.test(form.numeroDocumento) && !validarDocumento(form.numeroDocumento, type));
}

/** Verifica correspondencia del documento y el formato de los nombres recuperados. */
export function validateWorkerIdentity(form: WorkerFormState, response: WorkerIdentityResponse): void {
  if (workerDocumentKey(form) !== workerDocumentKey(response)) throw new Error('Documento de respuesta incorrecto.');
  if (!['ENCONTRADO', 'NO_ENCONTRADO', 'NO_DISPONIBLE'].includes(response.estado)) throw new Error('Respuesta de identidad inválida.');
  if (response.estado !== 'ENCONTRADO') return;
  const names = response.persona;
  if (!names || !names.nombres || validarNombreCampo(names.nombres.normalize('NFC'), 'Nombres', true)
    || validarNombreCampo(names.apellidoPaterno ?? '', 'Apellido', false) || validarNombreCampo(names.apellidoMaterno ?? '', 'Apellido', false)) throw new Error('Datos de identidad inválidos.');
  if (response.personaRegistrada && !(response.personaRegistrada.idPersona > 0)) throw new Error('Persona registrada inválida.');
}

/** Completa espacios vacíos conservando cualquier corrección escrita durante la consulta. */
export function automaticWorkerNames(form: WorkerFormState, automatic: AutomaticWorkerIdentity, response: WorkerIdentityResponse): AutomaticWorkerIdentity {
  if (workerDocumentKey(form) !== workerDocumentKey(response)) return {};
  validateWorkerIdentity(form, response);
  if (response.estado !== 'ENCONTRADO' || !response.persona || response.personaRegistrada) return {};
  return Object.fromEntries((['nombres', 'apellidoPaterno', 'apellidoMaterno'] as const)
    .filter(field => !form[field].trim() || form[field] === automatic[field])
    .map(field => [field, formatPersonName(response.persona![field])]));
}

/** Retira únicamente los datos automáticos del documento anterior. */
export function clearAutomaticWorkerIdentity(form: WorkerFormState, automatic: AutomaticWorkerIdentity): WorkerFormState {
  const next = { ...form };
  for (const field of Object.keys(automatic) as (keyof AutomaticWorkerIdentity)[]) if (next[field] === automatic[field]) next[field] = '';
  return next;
}
