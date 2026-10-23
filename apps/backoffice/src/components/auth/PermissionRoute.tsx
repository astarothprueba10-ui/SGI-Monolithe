import React from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Unauthorized } from '../../pages/Unauthorized';
import type { Permission } from '../../types';
import { puedeAdministrarCuentas } from '../../lib/securityAccess';

/** Bloquea el acceso directo por URL a un módulo no autorizado. */
export function PermissionRoute({
  permission,
  children



}: {permission: Permission;children: React.ReactNode;}) {
  const { can } = useAuth();
  if (!can(permission)) return <Unauthorized requested={permission} />;
  return <>{children}</>;
}

/** Restricts account administration to active Admin/Gerencia session roles and their permissions. */
export function AccountAdminPermissionRoute({
  permission,
  children
}: {permission: Permission;children: React.ReactNode;}) {
  const { user, permissions } = useAuth();
  if (!puedeAdministrarCuentas(user.roles, permissions, permission)) {
    return <Unauthorized requested={permission} />;
  }
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

/** Hides account-administration actions unless both role and permission authorize them. */
export function AccountAdminGate({
  permissions: requiredPermissions,
  children,
  fallback = null
}: {
  permissions: Permission | readonly Permission[];
  children: React.ReactNode;
  fallback?: React.ReactNode;
}) {
  const { user, permissions } = useAuth();
  if (!puedeAdministrarCuentas(user.roles, permissions, requiredPermissions)) {
    return <>{fallback}</>;
  }
  return <>{children}</>;
}
