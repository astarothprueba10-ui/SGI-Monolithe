import React from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Unauthorized } from '../../pages/Unauthorized';
import type { Permission } from '../../types';

/** Bloquea el acceso directo por URL a un módulo no autorizado. */
export function PermissionRoute({
  permission,
  children



}: {permission: Permission;children: React.ReactNode;}) {
  const { can } = useAuth();
  if (!can(permission)) return <Unauthorized requested={permission} />;
  return <>{children}</>;
}

/** Envuelve acciones sensibles: si no hay permiso, no se renderiza el botón. */
export function Gate({
  permission,
  children,
  fallback = null




}: {permission: Permission;children: React.ReactNode;fallback?: React.ReactNode;}) {
  const { can } = useAuth();
  if (!can(permission)) return <>{fallback}</>;
  return <>{children}</>;
}