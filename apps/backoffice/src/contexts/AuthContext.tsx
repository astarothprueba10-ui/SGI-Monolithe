import {
  createContext,
  useContext,
  useMemo,
  type ReactNode
} from 'react';

import {
  getSessionPermissions,
  getSessionRoles,
  getStoredAuthUser,
  toSessionUser
} from '../lib/authSession';

import type {
  Action,
  ModuleKey,
  Permission,
  RoleName,
  SessionUser
} from '../types';

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
  children
}: {
  children: ReactNode;
}) {
  const value = useMemo<AuthValue | null>(() => {
    const storedAuthUser = getStoredAuthUser();

    if (!storedAuthUser) {
      return null;
    }

    const roles = getSessionRoles(
      storedAuthUser.autoridades
    );

    if (roles.length === 0) {
      return null;
    }

    const user = toSessionUser(
      storedAuthUser,
      roles
    );

    const permissions = getSessionPermissions(
      storedAuthUser.autoridades
    );

    const can = (permission: Permission) =>
      permissions.has(permission);

    return {
      user,
      role: user.primaryRole,
      permissions,

      can,

      canAny: (module, actions) =>
        actions.some((action) =>
          can(`${module}.${action}` as Permission)
        ),

      hasModule: (module) =>
        can(`${module}.view` as Permission)
    };
  }, []);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthValue {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error(
      'No existe una sesión autenticada en el Backoffice.'
    );
  }

  return context;
}