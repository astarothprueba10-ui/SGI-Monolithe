import { useEffect } from 'react';
import { revokeSession } from '../../lib/apiClient';
import { watchSessionInactivity } from '../../lib/inactivitySession';

/** Aplica el cierre por inactividad a cualquier sesión autenticada del Backoffice. */
export function SessionInactivity() {
  useEffect(() => watchSessionInactivity(revokeSession), []);
  return null;
}
