import type { AutomaticLeadNames, LeadIdentityResponse } from '../types/leadIdentity';
import type { LeadFormValues } from '../utils/crmLeadValidation';

const PATTERNS: Record<string, RegExp> = {
  DNI: /^[0-9]{8}$/, RUC: /^[0-9]{11}$/, CE: /^[0-9]{9,12}$/, PASAPORTE: /^[A-Z0-9]{6,20}$/
};

/** Evita consultas mientras el documento todavía está incompleto. */
export function canLookupLead(form: Pick<LeadFormValues, 'tipoDocumento' | 'numeroDocumento'>): boolean {
  return PATTERNS[form.tipoDocumento]?.test(form.numeroDocumento) ?? false;
}

/** Distingue cada consulta por tipo y número, incluidos los ceros iniciales. */
export function leadDocumentKey(form: Pick<LeadFormValues, 'tipoDocumento' | 'numeroDocumento'>): string {
  return `${form.tipoDocumento}:${form.numeroDocumento}`;
}

/** Completa únicamente campos vacíos y verifica que la respuesta corresponda al documento actual. */
export function automaticLeadNames(form: LeadFormValues, response: LeadIdentityResponse): AutomaticLeadNames {
  if (response.estado !== 'ENCONTRADO' || !response.persona || leadDocumentKey(form) !== leadDocumentKey(response)) return {};
  const values = { names: response.persona.nombres, paternalSurname: response.persona.apellidoPaterno,
    maternalSurname: response.persona.apellidoMaterno };
  return Object.fromEntries(Object.entries(values).filter(([field, value]) =>
    !form[field as keyof AutomaticLeadNames].trim() && typeof value === 'string' && value.trim()
  ).map(([field, value]) => [field, value!.trim()]));
}

/** Retira datos del documento anterior conservando cualquier corrección manual. */
export function clearAutomaticLeadNames(form: LeadFormValues, automatic: AutomaticLeadNames): LeadFormValues {
  const cleared = { ...form };
  for (const field of Object.keys(automatic) as (keyof AutomaticLeadNames)[]) {
    if (cleared[field] === automatic[field]) cleared[field] = '';
  }
  return cleared;
}
