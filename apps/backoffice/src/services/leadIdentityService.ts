import { coreApi } from '../lib/apiClient';
import type { LeadIdentityResponse } from '../types/leadIdentity';

/** Consulta desde el servidor sin publicar el documento en la URL ni la clave del proveedor. */
export function lookupLeadIdentity(tipoDocumento: string, numeroDocumento: string, signal: AbortSignal) {
  return coreApi.post<LeadIdentityResponse>('/crm/personas/consultar', { tipoDocumento, numeroDocumento }, { signal });
}
