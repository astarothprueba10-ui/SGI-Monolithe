import { Link } from 'react-router-dom';
import { FormEvent, useRef, useState } from 'react';
import {
    EyeIcon,
    EyeOffIcon,
    LoaderCircleIcon,
    LockIcon,
    ShieldCheckIcon
} from 'lucide-react';

import { ApiError, authApi } from '../lib/apiClient';
import { Alert } from '../components/ui/Feedback';
import { Button } from '../components/ui/Button';
import { FieldLabel, Input } from '../components/ui/Field';

type LoginResponse = {
    idUsuario: number;
    usuario: string;
    autoridades: string[];
    requiereCambioPassword: boolean;
    accessToken: string;
    refreshToken: string;
    tokenType: string;
    expiresIn: number;
    mensaje: string;
};

const INTERNAL_ROLES = new Set([
    'ROLE_ADMINISTRADOR',
    'ROLE_GERENCIA',
    'ROLE_MARKETING',
    'ROLE_ASESOR',
    'ROLE_FINANZAS',
    'ROLE_RRHH'
]);

function resolverMensajeErrorLogin(error: ApiError): string {
    if (error.status === 423) {
        return error.message;
    }

    const esBloqueado = /bloquead|locked/i.test(error.message);
    const esSesionOToken = /sesi[oó]n|token|expirad/i.test(error.message);

    if (
        error.status === 401 &&
        !esBloqueado &&
        !esSesionOToken &&
        (error.message === 'No fue posible autenticar al usuario' ||
            /credencial|autenticar|bad credentials/i.test(error.message))
    ) {
        return 'Usuario o contraseña incorrectos';
    }

    return error.message;
}

const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
const CONTROL_CHARS_REGEX = /[\x00-\x1F\x7F]/;

function validarCredencialesLogin(usuario: string, contrasena: string): string | null {
    const usuarioLimpio = usuario.trim();
    if (!usuarioLimpio || usuarioLimpio.length > 120 || !EMAIL_REGEX.test(usuarioLimpio)) {
        return 'Ingresa un usuario válido';
    }
    if (!contrasena) {
        return 'Ingresa tu contraseña';
    }
    if (contrasena.length > 128 || CONTROL_CHARS_REGEX.test(contrasena)) {
        return 'La contraseña contiene caracteres no permitidos';
    }
    return null;
}

export function Login() {

    const [usuario, setUsuario] = useState('');
    const [password, setPassword] = useState('');
    const [remember, setRemember] = useState(true);
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    const usuarioRef = useRef<HTMLInputElement>(null);

    async function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();

        if (loading) return;

        setError(null);
        setSuccess(false);

        const errorValidacion = validarCredencialesLogin(usuario, password);
        if (errorValidacion) {
            setError(errorValidacion);
            usuarioRef.current?.focus();
            return;
        }

        setLoading(true);

        try {
            const data = await authApi.post<LoginResponse>('/login', {
                usuario: usuario.trim(),
                contrasena: password
            });

            const tieneRolInterno = data.autoridades.some((authority) =>
                INTERNAL_ROLES.has(authority)
            );

            if (!tieneRolInterno) {
                try {
                    await authApi.post<void>('/logout', {
                        refreshToken: data.refreshToken
                    });
                } catch {
                    console.warn(
                        'No fue posible revocar la sesión de un usuario sin acceso al Backoffice.'
                    );
                }

                throw new ApiError(
                    403,
                    'Este usuario no tiene acceso al Backoffice.'
                );
            }

            const storage = remember ? localStorage : sessionStorage;
            const otherStorage = remember ? sessionStorage : localStorage;

            otherStorage.removeItem('monolithe_access_token');
            otherStorage.removeItem('monolithe_refresh_token');
            otherStorage.removeItem('monolithe_user');

            storage.setItem(
                'monolithe_access_token',
                data.accessToken
            );

            storage.setItem(
                'monolithe_refresh_token',
                data.refreshToken
            );

            storage.setItem(
                'monolithe_user',
                JSON.stringify({
                    idUsuario: data.idUsuario,
                    usuario: data.usuario,
                    autoridades: data.autoridades,
                    requiereCambioPassword: data.requiereCambioPassword
                })
            );

            setSuccess(true);

            window.setTimeout(() => {
                window.location.replace('/');
            }, 350);
        } catch (error) {
            if (error instanceof ApiError) {
                setError(resolverMensajeErrorLogin(error));
            } else {
                setError(
                    'No pudimos conectar con el servicio de autenticación. Inténtalo nuevamente.'
                );
            }

            usuarioRef.current?.focus();
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="flex min-h-screen items-center justify-center bg-brand-50 px-4 py-10">
            <div className="w-full max-w-[430px]">
                <div className="mb-6 text-center">
                    <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-brand-800 text-white">
                        <ShieldCheckIcon className="h-6 w-6" />
                    </div>

                    <h1 className="mt-4 text-2xl font-semibold text-brand-900">
                        SIGI MONOLITHE
                    </h1>

                    <p className="mt-1 text-sm text-brand-400">
                        Acceso administrativo
                    </p>
                </div>

                <div className="rounded-xl border border-brand-100 bg-white p-7 shadow-sm">
                    <div className="mb-6">
                        <h2 className="text-lg font-semibold text-brand-900">
                            Iniciar sesión
                        </h2>

                        <p className="mt-1 text-[13px] leading-relaxed text-brand-400">
                            Ingresa con tus credenciales corporativas para acceder al
                            sistema de gestión.
                        </p>
                    </div>

                    {error ? (
                        <Alert
                            tone="danger"
                            title="No pudimos iniciar tu sesión"
                            className="mb-5"
                        >
                            {error}
                        </Alert>
                    ) : null}

                    {success ? (
                        <Alert
                            tone="success"
                            title="Acceso verificado"
                            className="mb-5"
                        >
                            Ingresando al Backoffice...
                        </Alert>
                    ) : null}

                    <form onSubmit={handleSubmit} className="space-y-5" noValidate>
                        <div>
                            <FieldLabel htmlFor="usuario">
                                Usuario
                            </FieldLabel>

                            <Input
                                ref={usuarioRef}
                                id="usuario"
                                value={usuario}
                                onChange={(event) =>
                                    setUsuario(event.target.value)
                                }
                                maxLength={120}
                                placeholder="usuario@monolithe.pe"
                                autoComplete="username"
                                disabled={loading}
                            />
                        </div>

                        <div>
                            <FieldLabel htmlFor="password">
                                Contraseña
                            </FieldLabel>

                            <div className="relative">
                                <Input
                                    id="password"
                                    type={showPassword ? 'text' : 'password'}
                                    value={password}
                                    onChange={(event) =>
                                        setPassword(event.target.value)
                                    }
                                    maxLength={128}
                                    placeholder="••••••••••"
                                    autoComplete="current-password"
                                    disabled={loading}
                                    className="pr-10"
                                />

                                <button
                                    type="button"
                                    onClick={() =>
                                        setShowPassword((value) => !value)
                                    }
                                    aria-label={
                                        showPassword
                                            ? 'Ocultar contraseña'
                                            : 'Mostrar contraseña'
                                    }
                                    className="absolute right-1 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-md text-brand-300 hover:bg-brand-50 hover:text-brand-700"
                                >
                                    {showPassword ? (
                                        <EyeOffIcon className="h-4 w-4" />
                                    ) : (
                                        <EyeIcon className="h-4 w-4" />
                                    )}
                                </button>
                            </div>
                        </div>

                        <div className="flex items-center justify-between gap-4">

                            <label className="flex cursor-pointer items-center gap-2 text-[13px] text-brand-600">
                                <input
                                    type="checkbox"
                                    checked={remember}
                                    onChange={(event) =>
                                        setRemember(event.target.checked)
                                    }
                                    disabled={loading}
                                />

                                Recordarme en este equipo
                            </label>


                            <Link
                                to="/recuperar-contrasena"
                                className="text-[13px] font-medium text-brand-700 transition hover:text-brand-900"
                            >
                                ¿Olvidaste tu contraseña?
                            </Link>

                        </div>

                        <Button
                            type="submit"
                            variant="primary"
                            className="w-full"
                            disabled={loading || success}
                        >
                            {loading ? (
                                <span className="flex items-center gap-2">
                                    <LoaderCircleIcon className="h-4 w-4 animate-spin" />
                                    Verificando credenciales...
                                </span>
                            ) : (
                                <span className="flex items-center gap-2">
                                    <LockIcon className="h-4 w-4" />
                                    Iniciar sesión
                                </span>
                            )}
                        </Button>
                    </form>

                    <p className="mt-6 text-center text-[11px] leading-relaxed text-brand-300">
                        Acceso exclusivo para personal autorizado de Inmobiliaria
                        Monolithe.
                    </p>
                </div>
            </div>
        </div>
    );
}