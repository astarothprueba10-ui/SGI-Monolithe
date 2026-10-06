import React from 'react';
import { Navigate } from 'react-router-dom';
import { useCmsAuth } from '../../lib/CmsAuthContext';

/**
 * Guard que protege las rutas del CMS.
 * Redirige a /mi-cuenta si no hay sesion o no tiene rol CMS.
 */
export function CmsGuard({
  children
}: {
  children: React.ReactNode;
}) {
  const { authenticated, cmsAccess } = useCmsAuth();

  if (!authenticated) {
    return (
      <Navigate
        to="/mi-cuenta"
        replace
        state={{ returnTo: '/cms' }}
      />
    );
  }

  if (!cmsAccess) {
    return (
      <Navigate
        to="/mi-cuenta/bienvenida?acceso=denegado"
        replace
      />
    );
  }

  return <>{children}</>;
}
