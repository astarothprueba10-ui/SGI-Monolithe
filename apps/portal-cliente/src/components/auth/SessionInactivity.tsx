import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { watchSessionInactivity } from '../../lib/inactivitySession';
import { revokePortalSession } from '../../lib/portalCredentials';

/** Controla la inactividad tanto en el portal como durante un cambio de contraseña. */
export function SessionInactivity() {
  const { pathname } = useLocation();
  useEffect(() => watchSessionInactivity(revokePortalSession), [pathname]);
  return null;
}
