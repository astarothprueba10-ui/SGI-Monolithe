import React, { createContext, useContext, useMemo } from 'react';
import { DEMO_USERS, ROLES } from '../data/roles';
import type { Action, ModuleKey, Permission, RoleName, SessionUser } from '../types';

interface AuthValue {
  user: SessionUser;
  role: RoleName;
  permissions: Set<Permission>;
  can: (permission: Permission) => boolean;
  canAny: (module: ModuleKey, actions: Action[]) => boolean;
  hasModule: (module: ModuleKey) => boolean;
}

const AuthContext = createContext<AuthValue | null>(null);

export function AuthProvider({
  role,
  children



}: {role: RoleName;children: React.ReactNode;}) {
  const value = useMemo<AuthValue>(() => {
    const user = DEMO_USERS[role];
    const permissions = new Set<Permission>(
      user.roles.flatMap((r) => ROLES[r].permissions)
    );
    const can = (permission: Permission) => permissions.has(permission);
    return {
      user,
      role,
      permissions,
      can,
      canAny: (module, actions) => actions.some((a) => can(`${module}.${a}` as Permission)),
      hasModule: (module) => can(`${module}.view` as Permission)
    };
  }, [role]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth debe usarse dentro de AuthProvider');
  return ctx;
}