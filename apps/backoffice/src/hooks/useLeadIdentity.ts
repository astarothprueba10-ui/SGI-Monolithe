import { useEffect, useRef, useState, type Dispatch, type MutableRefObject, type SetStateAction } from 'react';
import { automaticLeadNames, canLookupLead, clearAutomaticLeadNames, leadDocumentKey } from '../lib/leadIdentity';
import { lookupLeadIdentity } from '../services/leadIdentityService';
import type { AutomaticLeadNames, LeadIdentityResponse } from '../types/leadIdentity';
import { sanitizarLead, type LeadFormValues } from '../utils/crmLeadValidation';

type Setter = Dispatch<SetStateAction<LeadFormValues>>;
type LookupState = { key: string; pending: boolean; message: string };
type LookupContext = { form: LeadFormValues; setForm: Setter; automatic: MutableRefObject<AutomaticLeadNames>;
  latest: MutableRefObject<LeadFormValues>; setState: Dispatch<SetStateAction<LookupState>> };

function applyIdentity(context: LookupContext, response: LeadIdentityResponse, signal: AbortSignal) {
  if (signal.aborted || leadDocumentKey(context.latest.current) !== leadDocumentKey(context.form)) return;
  if (leadDocumentKey(response) !== leadDocumentKey(context.form)) throw new Error('Documento de respuesta incorrecto.');
  const patch = automaticLeadNames(context.latest.current, response);
  context.automatic.current = { ...context.automatic.current, ...patch };
  context.setForm(previous => ({ ...previous, ...automaticLeadNames(previous, response) }));
  context.setState({ key: leadDocumentKey(response), pending: false, message: response.mensaje });
}

async function runLookup(context: LookupContext, signal: AbortSignal) {
  const key = leadDocumentKey(context.form);
  try {
    const response = await lookupLeadIdentity(context.form.tipoDocumento, context.form.numeroDocumento, signal);
    applyIdentity(context, response, signal);
  } catch {
    if (!signal.aborted && leadDocumentKey(context.latest.current) === key)
      context.setState({ key, pending: false, message: 'No se pudo consultar el documento. Puedes completar los datos manualmente.' });
  }
}

function scheduleLookup(context: LookupContext, open: boolean) {
  const controller = new AbortController();
  if (!open) context.automatic.current = {};
  if (!open || !canLookupLead(context.form)) return () => controller.abort();
  const key = leadDocumentKey(context.form);
  context.setState({ key, pending: true, message: 'Consultando datos de la persona...' });
  const timer = window.setTimeout(() => { void runLookup(context, controller.signal); }, 500);
  return () => { window.clearTimeout(timer); controller.abort(); };
}

function changeDocument(context: LookupContext, field: 'tipoDocumento' | 'numeroDocumento', raw: string) {
  const value = field === 'numeroDocumento' ? sanitizarLead(field, raw, context.latest.current.tipoDocumento) : raw;
  if (context.latest.current[field] === value) return;
  const previousAutomatic = context.automatic.current;
  context.setForm(previous => ({ ...clearAutomaticLeadNames(previous, previousAutomatic), [field]: value,
    ...(field === 'tipoDocumento' ? { numeroDocumento: '' } : {}) }));
  context.automatic.current = {};
}

function useIdentityRequest(context: LookupContext, open: boolean) {
  useEffect(() => scheduleLookup(context, open), [open, context.form.tipoDocumento, context.form.numeroDocumento]);
}

/** Consulta automáticamente al completar el documento y descarta respuestas anteriores. */
export function useLeadIdentity(open: boolean, form: LeadFormValues, setForm: Setter) {
  const automatic = useRef<AutomaticLeadNames>({});
  const latest = useRef(form);
  latest.current = form;
  const [state, setState] = useState<LookupState>({ key: '', pending: false, message: '' });
  const context = { form, setForm, automatic, latest, setState };
  useIdentityRequest(context, open);
  const applicable = open && canLookupLead(form);
  const current = state.key === leadDocumentKey(form);
  return { change: (field: 'tipoDocumento' | 'numeroDocumento', value: string) => changeDocument(context, field, value), loading: applicable && (!current || state.pending),
    message: applicable ? current ? state.message : 'Consultando datos de la persona...' : '' };
}
