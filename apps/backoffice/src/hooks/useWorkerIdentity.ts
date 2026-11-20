import { useEffect, useRef, useState, type Dispatch, type MutableRefObject, type SetStateAction } from 'react';
import { coreApi, ApiError } from '../lib/apiClient';
import { automaticWorkerNames, canLookupWorker, clearAutomaticWorkerIdentity, validateWorkerIdentity, workerDocumentKey,
  type AutomaticWorkerIdentity, type WorkerIdentityResponse } from '../lib/workerIdentity';
import { formatPersonName } from '../lib/personName';
import type { PersonaIdentificadaResponse } from '../services/coreService';
import type { WorkerFormState, WorkerFormErrors, WorkerDocumentType } from '../components/Workers/workerForm';

type State = { key: string; pending: boolean; person: PersonaIdentificadaResponse | null; confirmed: number | null; error: string | null; info: string | null };
type Context = { latest: MutableRefObject<WorkerFormState>; automatic: MutableRefObject<AutomaticWorkerIdentity>; generation: MutableRefObject<number>;
  controller: MutableRefObject<AbortController | undefined>; setForm: Dispatch<SetStateAction<WorkerFormState>>;
  setErrors: Dispatch<SetStateAction<WorkerFormErrors>>; setState: Dispatch<SetStateAction<State>> };
const emptyState = (key = ''): State => ({ key, pending: false, person: null, confirmed: null, error: null, info: null });

function stop(context: Context) { context.generation.current += 1; context.controller.current?.abort(); }

function clearIdentity(context: Context) {
  stop(context); const automatic = context.automatic.current; context.automatic.current = {};
  context.setForm(previous => clearAutomaticWorkerIdentity(previous, automatic)); context.setState(emptyState());
}

function clearNameErrors(context: Context) {
  context.setErrors(previous => ({ ...previous, nombres: undefined, apellidoPaterno: undefined, apellidoMaterno: undefined }));
}

function applyResult(context: Context, response: WorkerIdentityResponse) {
  validateWorkerIdentity(context.latest.current, response);
  const previousAutomatic = context.automatic.current;
  const patch = automaticWorkerNames(context.latest.current, previousAutomatic, response);
  context.automatic.current = { ...previousAutomatic, ...patch };
  context.setForm(previous => ({ ...previous, ...automaticWorkerNames(previous, previousAutomatic, response) }));
  if (Object.keys(patch).length) clearNameErrors(context);
  context.setState({ ...emptyState(workerDocumentKey(response)), person: response.personaRegistrada ?? null, info: response.mensaje });
}

function requestError(context: Context, key: string, error: unknown) {
  const blocked = error instanceof ApiError && [400, 401, 403, 409].includes(error.status);
  context.setState({ ...emptyState(key), error: blocked ? error.message : null,
    info: blocked ? null : 'No se pudo consultar el documento. Puedes completar los datos manualmente.' });
}

async function lookup(context: Context) {
  stop(context); const generation = context.generation.current; const form = context.latest.current;
  const key = workerDocumentKey(form); const controller = new AbortController(); context.controller.current = controller;
  context.setState({ ...emptyState(key), pending: true });
  try {
    const response = await coreApi.post<WorkerIdentityResponse>('/trabajadores/personas/consultar',
      { idTipoDocumento: Number(form.idTipoDocumento), numeroDocumento: form.numeroDocumento }, { signal: controller.signal });
    if (!controller.signal.aborted && generation === context.generation.current && key === workerDocumentKey(context.latest.current)) applyResult(context, response);
  } catch (error) {
    if (!controller.signal.aborted && generation === context.generation.current) requestError(context, key, error);
  }
}

function confirmPerson(context: Context, person: PersonaIdentificadaResponse | null) {
  if (!person) return;
  const patch = { nombres: formatPersonName(person.nombres), apellidoPaterno: formatPersonName(person.apellidoPaterno),
    apellidoMaterno: formatPersonName(person.apellidoMaterno), fechaNacimiento: person.fechaNacimiento || '',
    correoElectronico: person.correoElectronico ?? context.latest.current.correoElectronico };
  context.automatic.current = { ...patch, ...(person.correoElectronico ? {} : { correoElectronico: undefined }) };
  context.setForm(previous => ({ ...previous, ...patch }));
  context.setState(previous => ({ ...previous, confirmed: person.idPersona })); clearNameErrors(context);
  context.setErrors(previous => ({ ...previous, fechaNacimiento: undefined, correoElectronico: undefined }));
}

function useLookup(context: Context, open: boolean, form: WorkerFormState, type?: WorkerDocumentType) {
  useEffect(() => {
    if (!open) { clearIdentity(context); return; }
    if (!canLookupWorker(form, type)) return;
    const timer = window.setTimeout(() => { void lookup(context); }, 500);
    return () => { window.clearTimeout(timer); stop(context); };
  }, [open, form.idTipoDocumento, form.numeroDocumento, type]);
}

/** Autocompleta DNI válidos y conserva la confirmación de personas existentes. */
export function useWorkerIdentity(open: boolean, form: WorkerFormState, type: WorkerDocumentType | undefined,
  setForm: Dispatch<SetStateAction<WorkerFormState>>, setErrors: Dispatch<SetStateAction<WorkerFormErrors>>) {
  const latest = useRef(form); latest.current = form;
  const automatic = useRef<AutomaticWorkerIdentity>({}); const generation = useRef(0); const controller = useRef<AbortController>();
  const [state, setState] = useState<State>(emptyState());
  const context = { latest, automatic, generation, controller, setForm, setErrors, setState };
  useLookup(context, open, form, type); const current = state.key === workerDocumentKey(form);
  return { personaIdentificada: current ? state.person : null, personaConfirmada: current ? state.confirmed : null,
    buscandoPersona: open && canLookupWorker(form, type) && (!current || state.pending),
    errorIdentificacion: current ? state.error : null, infoIdentificacion: current ? state.info : null,
    buscarPersonaPorDocumento: () => canLookupWorker(latest.current, type) ? lookup(context) : Promise.resolve(),
    limpiarIdentificacion: () => clearIdentity(context), confirmarPersona: () => confirmPerson(context, current ? state.person : null),
    cancelarSeleccionPersona: () => setState(previous => ({ ...previous, confirmed: null })) };
}
