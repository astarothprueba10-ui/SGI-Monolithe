import type { LeadFormValues } from '../utils/crmLeadValidation';

/** Datos mínimos que puede completar una consulta de identidad del CRM. */
export interface LeadIdentityResponse {
  tipoDocumento: string;
  numeroDocumento: string;
  estado: 'ENCONTRADO' | 'NO_ENCONTRADO' | 'NO_DISPONIBLE';
  fuente: 'MONOLITHE' | 'DNI' | null;
  persona: { nombres: string; apellidoPaterno: string | null; apellidoMaterno: string | null } | null;
  mensaje: string;
}

/** Nombres que pertenecen al autocompletado y pueden retirarse al cambiar de documento. */
export type AutomaticLeadNames = Partial<Pick<LeadFormValues, 'names' | 'paternalSurname' | 'maternalSurname'>>;
