import type { Permission, RoleName, SessionUser } from '../types';

export interface StoredAuthUser {
    idUsuario: number;
    usuario: string;
    nombreMostrar?: string | null;
    iniciales?: string | null;
    autoridades: string[];
    requiereCambioPassword: boolean;
}

const ROLE_MAP: Record<string, RoleName> = {
    ROLE_ADMINISTRADOR: 'Administrador',
    ROLE_GERENCIA: 'Gerencia',
    ROLE_MARKETING: 'Marketing',
    ROLE_ASESOR: 'Asesor',
    ROLE_FINANZAS: 'Finanzas',
    ROLE_ASESORIA_LEGAL: 'Asesoría Legal',
    ROLE_RRHH: 'RRHH',
    ROLE_SUPERVISOR_COMERCIAL: 'Supervisor comercial'
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

/** El único rol de negocio excluido del Backoffice es CLIENTE.
 *  Los nuevos roles internos que emite auth-service no requieren una lista
 *  manual de habilitación en el frontend. Los permisos reales siguen en JWT.
 */
export function getSessionRoles(
    autoridades: string[]
): RoleName[] {
    const roles = autoridades
        .filter((authority) =>
            /^ROLE_[A-Z][A-Z0-9_]*$/.test(authority) &&
            authority !== 'ROLE_CLIENTE'
        )
        .map((authority) => {
            const conocido = ROLE_MAP[authority];
            if (conocido) return conocido;
            // Solo sirve para presentación. No se asignan permisos por el nombre.
            return authority.slice(5).toLowerCase().split('_')
                .map((palabra) => palabra.charAt(0).toUpperCase() + palabra.slice(1))
                .join(' ') as RoleName;
        });
    return [...new Set(roles)];
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

    const displayName =
        authUser.nombreMostrar?.trim() || 'Usuario';

    const initials =
        authUser.iniciales?.trim().toUpperCase() || 'US';

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
        'monolithe_user',
        'monolithe_session_id'
    ];

    for (const key of keys) {
        localStorage.removeItem(key);
        sessionStorage.removeItem(key);
    }
}

function storedTokenLocation(): Storage | null {
    if (localStorage.getItem('monolithe_refresh_token') !== null) return localStorage;
    if (sessionStorage.getItem('monolithe_refresh_token') !== null) return sessionStorage;
    return null;
}

/** Actualiza solo una sesión existente y, si se indica, comprueba el token anterior. */
export function updateStoredTokens(
    accessToken: string,
    refreshToken: string,
    expectedRefreshToken?: string
): boolean {
    if (expectedRefreshToken !== undefined && getRefreshToken() !== expectedRefreshToken) return false;
    const storage = storedTokenLocation();
    if (!storage) return false;
    storage.setItem('monolithe_access_token', accessToken);
    storage.setItem('monolithe_refresh_token', refreshToken);
    return true;
}
