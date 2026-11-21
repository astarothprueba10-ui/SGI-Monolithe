import { ApiError, authApi } from './apiClient';

/** Identificador y vencimiento del reto que sigue a la contraseña. */
export interface MfaChallenge {
    reto: string;
    paso: 'ACTIVACION' | 'CODIGO';
    venceEn: number;
}

/** Material de vinculación presente solo en el formulario actual. */
export interface MfaEnrollment {
    reto: string;
    venceEn: number;
    qr: string;
    claveManual: string;
    codigoRecuperacion: string;
}

/** Sesión completa devuelta después de verificar el autenticador. */
export interface MfaLoginSession {
    idUsuario: number;
    usuario: string;
    nombreMostrar: string | null;
    iniciales: string | null;
    autoridades: string[];
    requiereCambioPassword: boolean;
    accessToken: string;
    refreshToken: string;
}

/** Valida que el servidor responda con un reto de autenticación utilizable. */
export function requireMfaChallenge(value: MfaChallenge): MfaChallenge {
    if (!value || !/^[A-Za-z0-9_-]{43}$/.test(value.reto) ||
        !['ACTIVACION', 'CODIGO'].includes(value.paso) || !Number.isFinite(value.venceEn) || value.venceEn <= 0) {
        throw new ApiError(503, 'El servicio de autenticación debe actualizarse para usar la verificación en dos pasos.');
    }
    return value;
}

/** Activa una vinculación después de verificar la prueba inicial o de recuperación. */
export async function prepareMfa(reto: string, codigo: string): Promise<MfaEnrollment> {
    const response = await authApi.post<MfaEnrollment>('/mfa/preparar', { reto, codigo });
    if (!response || !/^[A-Za-z0-9_-]{43}$/.test(response.reto) ||
        !Number.isFinite(response.venceEn) || response.venceEn <= 0 ||
        !/^data:image\/png;base64,[A-Za-z0-9+/=]+$/.test(response.qr) ||
        !/^[A-Z2-7]{32}$/.test(response.claveManual) || !response.codigoRecuperacion) {
        throw new ApiError(503, 'No se pudo preparar la aplicación autenticadora.');
    }
    return response;
}

/** Intercambia un código TOTP válido por la sesión. */
export async function verifyMfa(reto: string, codigo: string): Promise<MfaLoginSession> {
    const session = await authApi.post<MfaLoginSession>('/mfa/verificar', { reto, codigo });
    if (!session?.accessToken || !session.refreshToken || !Array.isArray(session.autoridades)) {
        throw new ApiError(503, 'El servicio no entregó una sesión verificada.');
    }
    return session;
}

/** Invita al correo verificado después de probar contraseña; nunca devuelve el código. */
export async function requestMfaInvitation(reto: string): Promise<{ mensaje: string; segundosEspera: number }> {
    return authApi.post<{ mensaje: string; segundosEspera: number }>('/mfa/activacion/enviar', { reto });
}
