import type { Permission, RoleName, SessionUser } from '../types';

export interface StoredAuthUser {
    idUsuario: number;
    usuario: string;
    autoridades: string[];
    requiereCambioPassword: boolean;
}

const ROLE_MAP: Record<string, RoleName> = {
    ROLE_ADMINISTRADOR: 'Administrador',
    ROLE_GERENCIA: 'Gerencia',
    ROLE_MARKETING: 'Marketing',
    ROLE_ASESOR: 'Asesor',
    ROLE_FINANZAS: 'Finanzas',
    ROLE_RRHH: 'RRHH'
};

export function getStoredAuthUser(): StoredAuthUser | null {
    const raw =
        localStorage.getItem('monolithe_user') ??
        sessionStorage.getItem('monolithe_user');

    if (!raw) return null;

    try {
        return JSON.parse(raw) as StoredAuthUser;
    } catch {
        return null;
    }
}

export function getSessionRoles(
    autoridades: string[]
): RoleName[] {
    return autoridades
        .map((authority) => ROLE_MAP[authority])
        .filter((role): role is RoleName => Boolean(role));
}

export function getSessionPermissions(
    autoridades: string[]
): Set<Permission> {
    return new Set(
        autoridades
            .filter((authority) => !authority.startsWith('ROLE_'))
            .map((authority) => authority as Permission)
    );
}

export function toSessionUser(
    authUser: StoredAuthUser,
    roles: RoleName[]
): SessionUser {
    const primaryRole = roles[0];

    if (!primaryRole) {
        throw new Error('El usuario no tiene un rol válido para el Backoffice');
    }

    const username = authUser.usuario;
    const displayName = username.includes('@')
        ? username.split('@')[0]
        : username;

    const initials = displayName
        .replace(/[^a-zA-Z0-9]/g, '')
        .slice(0, 2)
        .toUpperCase();

    return {
        id: String(authUser.idUsuario),
        name: displayName,
        email: username.includes('@') ? username : '',
        jobTitle: primaryRole,
        initials: initials || 'US',
        primaryRole,
        roles
    };
}

export function getAccessToken(): string | null {
    return (
        localStorage.getItem('monolithe_access_token') ??
        sessionStorage.getItem('monolithe_access_token')
    );
}

export function getRefreshToken(): string | null {
    return (
        localStorage.getItem('monolithe_refresh_token') ??
        sessionStorage.getItem('monolithe_refresh_token')
    );
}

export function clearStoredSession(): void {
    const keys = [
        'monolithe_access_token',
        'monolithe_refresh_token',
        'monolithe_user'
    ];

    for (const key of keys) {
        localStorage.removeItem(key);
        sessionStorage.removeItem(key);
    }
}

export function updateStoredTokens(
    accessToken: string,
    refreshToken: string
): boolean {
    const usesLocalStorage =
        localStorage.getItem('monolithe_refresh_token') !== null;

    const usesSessionStorage =
        sessionStorage.getItem('monolithe_refresh_token') !== null;

    const storage = usesLocalStorage
        ? localStorage
        : usesSessionStorage
            ? sessionStorage
            : null;

    if (!storage) {
        return false;
    }

    storage.setItem(
        'monolithe_access_token',
        accessToken
    );

    storage.setItem(
        'monolithe_refresh_token',
        refreshToken
    );

    return true;
}