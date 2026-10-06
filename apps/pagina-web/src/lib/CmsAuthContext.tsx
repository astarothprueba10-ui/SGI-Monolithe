import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState
} from 'react';

import type { SessionUser } from '../types/cms';

import {
  getSessionUser,
  isAuthenticated,
  hasCmsAccess,
  hasRole,
  logout as doLogout
} from '../services/authService';

// ---------------------------------------------------------------------------
// Tipo del contexto
// ---------------------------------------------------------------------------

interface CmsAuthValue {
  user: SessionUser | null;
  authenticated: boolean;
  cmsAccess: boolean;
  can: (role: string) => boolean;
  logout: () => Promise<void>;
  refresh: () => void;
}

const CmsAuthContext = createContext<CmsAuthValue | null>(null);

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

export function CmsAuthProvider({
  children
}: {
  children: React.ReactNode;
}) {
  const [user, setUser] = useState<SessionUser | null>(
    () => getSessionUser()
  );
  const [authenticated, setAuthenticated] = useState(
    () => isAuthenticated()
  );

  const refresh = useCallback(() => {
    setUser(getSessionUser());
    setAuthenticated(isAuthenticated());
  }, []);

  useEffect(() => {
    // Escuchar cambios de storage desde otras pestanas
    function onStorage(e: StorageEvent) {
      if (e.key?.startsWith('sgi_')) {
        refresh();
      }
    }
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, [refresh]);

  const logout = useCallback(async () => {
    await doLogout();
    setUser(null);
    setAuthenticated(false);
  }, []);

  const can = useCallback(
    (role: string) => hasRole(role),
    []
  );

  const value = useMemo<CmsAuthValue>(
    () => ({
      user,
      authenticated,
      cmsAccess: authenticated && hasCmsAccess(),
      can,
      logout,
      refresh
    }),
    [user, authenticated, can, logout, refresh]
  );

  return (
    <CmsAuthContext.Provider value={value}>
      {children}
    </CmsAuthContext.Provider>
  );
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useCmsAuth(): CmsAuthValue {
  const ctx = useContext(CmsAuthContext);
  if (!ctx) {
    throw new Error(
      'useCmsAuth debe usarse dentro de CmsAuthProvider'
    );
  }
  return ctx;
}
