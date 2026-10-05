import {
    FormEvent,
    useEffect,
    useState
} from 'react';

import {
    useNavigate,
    useSearchParams
} from 'react-router-dom';

import {
    ArrowLeftIcon,
    CheckCircle2Icon,
    EyeIcon,
    EyeOffIcon,
    KeyRoundIcon,
    LoaderCircleIcon,
    LockKeyholeIcon,
    MailCheckIcon,
    ShieldCheckIcon
} from 'lucide-react';

import { ApiError, authApi } from '../lib/apiClient';
import { BrandPanel } from '../components/BrandPanel';
import { Logo } from '../components/Logo';
import { TextField } from '../components/TextField';


type ResetPasswordOtpResponse = {
    ticket: string;
};

type ResendOtpResponse = {
    message: string;
    reenviosRestantes: number;
    segundosParaNuevoReenvio: number;
};

type MessageResponse = {
    mensaje: string;
};

type Step =
    | 'password'
    | 'otp'
    | 'success';


function resolverMensajeError(
    error: unknown
): string {
    if (error instanceof ApiError) {
        return error.message;
    }

    return 'No pudimos conectar con el servicio de autenticación. Inténtalo nuevamente.';
}


function obtenerSegundosEspera(
    mensaje: string
): number | null {
    const match =
        mensaje.match(
            /esperar\s+(\d+)\s+segundos/i
        );

    if (!match) {
        return null;
    }

    const segundos = Number(match[1]);

    return Number.isFinite(segundos)
        ? segundos
        : null;
}


export function ResetPassword() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();

    const token =
        searchParams.get('token')?.trim() ?? '';

    const [step, setStep] =
        useState<Step>('password');

    const [
        nuevaContrasena,
        setNuevaContrasena
    ] = useState('');

    const [
        confirmarContrasena,
        setConfirmarContrasena
    ] = useState('');

    const [ticket, setTicket] =
        useState('');

    const [codigoOtp, setCodigoOtp] =
        useState('');

    const [
        showPassword,
        setShowPassword
    ] = useState(false);

    const [loading, setLoading] =
        useState(false);

    const [resending, setResending] =
        useState(false);

    const [error, setError] =
        useState<string | null>(null);

    const [
        mensajeReenvio,
        setMensajeReenvio
    ] = useState<string | null>(null);

    const [
        mensajeExito,
        setMensajeExito
    ] = useState('');

    const [
        reenviosRestantes,
        setReenviosRestantes
    ] = useState(3);

    const [
        segundosReenvio,
        setSegundosReenvio
    ] = useState(0);


    useEffect(() => {
        if (segundosReenvio <= 0) {
            return;
        }

        const timeout =
            window.setTimeout(() => {
                setSegundosReenvio(
                    (actual) =>
                        Math.max(0, actual - 1)
                );
            }, 1000);

        return () =>
            window.clearTimeout(timeout);

    }, [segundosReenvio]);


    async function handlePasswordSubmit(
        event: FormEvent<HTMLFormElement>
    ) {
        event.preventDefault();

        if (loading) return;

        setError(null);

        if (!token) {
            setError(
                'El enlace de recuperación no contiene un token válido.'
            );
            return;
        }

        if (
            nuevaContrasena.length < 8 ||
            nuevaContrasena.length > 72
        ) {
            setError(
                'La contraseña debe contener entre 8 y 72 caracteres.'
            );
            return;
        }

        if (
            nuevaContrasena !==
            confirmarContrasena
        ) {
            setError(
                'La nueva contraseña y su confirmación no coinciden.'
            );
            return;
        }

        setLoading(true);

        try {
            const data =
                await authApi.post<ResetPasswordOtpResponse>(
                    '/reset-password',
                    {
                        token,
                        nuevaContrasena,
                        confirmarContrasena
                    }
                );

            if (!data.ticket) {
                throw new Error(
                    'El servidor no devolvió el ticket de verificación.'
                );
            }

            setTicket(data.ticket);

            setNuevaContrasena('');
            setConfirmarContrasena('');

            setReenviosRestantes(3);
            setSegundosReenvio(60);

            setStep('otp');

        } catch (error) {
            setError(
                resolverMensajeError(error)
            );

        } finally {
            setLoading(false);
        }
    }


    async function handleResendOtp() {
        if (
            loading ||
            resending ||
            segundosReenvio > 0 ||
            reenviosRestantes <= 0
        ) {
            return;
        }

        if (!ticket) {
            setError(
                'La verificación ya no es válida. Inicia nuevamente la recuperación.'
            );
            return;
        }

        setError(null);
        setMensajeReenvio(null);
        setResending(true);

        try {
            const data =
                await authApi.post<ResendOtpResponse>(
                    '/reset-password/resend',
                    {
                        ticket
                    }
                );

            setCodigoOtp('');

            setReenviosRestantes(
                Math.max(
                    0,
                    data.reenviosRestantes
                )
            );

            setSegundosReenvio(
                Math.max(
                    0,
                    data.segundosParaNuevoReenvio ||
                    60
                )
            );

            setMensajeReenvio(
                data.message ||
                'Hemos enviado un nuevo código de verificación.'
            );

        } catch (error) {
            const mensaje =
                resolverMensajeError(error);

            const segundos =
                obtenerSegundosEspera(mensaje);

            if (
                segundos !== null &&
                segundos > 0
            ) {
                setSegundosReenvio(segundos);
            }

            if (
                /maximo de 3 reenvios/i.test(mensaje) ||
                /máximo de 3 reenvíos/i.test(mensaje) ||
                /periodo para reenviar.*expirado/i.test(mensaje)
            ) {
                setReenviosRestantes(0);
            }

            setError(mensaje);

        } finally {
            setResending(false);
        }
    }


    async function handleOtpSubmit(
        event: FormEvent<HTMLFormElement>
    ) {
        event.preventDefault();

        if (loading || resending) {
            return;
        }

        setError(null);
        setMensajeReenvio(null);

        const otpNormalizado =
            codigoOtp.trim();

        if (!/^\d{6}$/.test(otpNormalizado)) {
            setError(
                'El código de verificación debe contener 6 dígitos.'
            );
            return;
        }

        if (!ticket) {
            setError(
                'La verificación ya no es válida. Inicia nuevamente la recuperación.'
            );
            return;
        }

        setLoading(true);

        try {
            const data =
                await authApi.post<MessageResponse>(
                    '/reset-password/confirm',
                    {
                        ticket,
                        codigoOtp: otpNormalizado
                    }
                );

            setTicket('');
            setCodigoOtp('');
            setSegundosReenvio(0);

            setMensajeExito(
                data.mensaje ||
                'Su contraseña ha sido cambiada con exito'
            );

            setStep('success');

        } catch (error) {
            setError(
                resolverMensajeError(error)
            );

        } finally {
            setLoading(false);
        }
    }


    const puedeReenviar =
        Boolean(ticket) &&
        !loading &&
        !resending &&
        segundosReenvio === 0 &&
        reenviosRestantes > 0;


    return (
        <div className="grid min-h-screen w-full grid-cols-1 bg-slateux-50 lg:grid-cols-[minmax(0,1fr)_minmax(520px,44%)] xl:grid-cols-[minmax(0,1fr)_600px]">

            <BrandPanel />

            <main className="flex flex-col px-5 py-8 sm:px-10 lg:px-14 lg:py-10 xl:px-20">

                <header className="flex items-center justify-between gap-4">

                    <div className="lg:hidden">
                        <Logo size="sm" />
                    </div>

                    <button
                        type="button"
                        onClick={() =>
                            navigate('/login')
                        }
                        className="ml-auto inline-flex items-center gap-1.5 rounded text-[13px] font-medium text-slateux-500 transition-colors hover:text-ink-700"
                    >
                        <ArrowLeftIcon className="h-4 w-4" />
                        Volver
                    </button>

                </header>


                <div className="flex flex-1 items-center justify-center py-10 sm:py-14">

                    <section className="w-full max-w-[27rem]">

                        <div className="rounded-card border border-slateux-200 bg-white p-6 shadow-card sm:p-8">

                            {step === 'password' ? (
                                <>

                                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slateux-100 text-ink-800">
                                        <LockKeyholeIcon className="h-5 w-5" />
                                    </div>

                                    <span className="mt-5 block text-[11px] font-semibold uppercase tracking-[0.16em] text-brass-500">
                                        Recuperación de acceso
                                    </span>

                                    <h1 className="mt-3 text-[1.75rem] font-semibold leading-tight tracking-tight text-ink-800">
                                        Crear nueva contraseña
                                    </h1>

                                    <p className="mt-2 text-[14px] leading-relaxed text-slateux-500">
                                        Ingresa y confirma la nueva contraseña
                                        para tu Portal Cliente.
                                    </p>


                                    {!token ? (
                                        <div className="mt-5 rounded-field border border-danger-200 bg-danger-50 px-3.5 py-3 text-[13px] text-danger-700">
                                            El enlace de recuperación no es válido.
                                            Solicita uno nuevo.
                                        </div>
                                    ) : null}


                                    {error ? (
                                        <div className="mt-5 rounded-field border border-danger-200 bg-danger-50 px-3.5 py-3 text-[13px] text-danger-700">
                                            {error}
                                        </div>
                                    ) : null}


                                    <form
                                        onSubmit={handlePasswordSubmit}
                                        className="mt-6 space-y-5"
                                        noValidate
                                    >

                                        <TextField
                                            id="nuevaContrasena"
                                            label="Nueva contraseña"
                                            type={
                                                showPassword
                                                    ? 'text'
                                                    : 'password'
                                            }
                                            icon={KeyRoundIcon}
                                            autoComplete="new-password"
                                            placeholder="••••••••••••"
                                            value={nuevaContrasena}
                                            maxLength={72}
                                            disabled={
                                                loading || !token
                                            }
                                            onChange={(event) =>
                                                setNuevaContrasena(
                                                    event.target.value
                                                )
                                            }
                                            trailing={
                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        setShowPassword(
                                                            (value) => !value
                                                        )
                                                    }
                                                    className="flex h-8 w-8 items-center justify-center rounded-md text-slateux-400 hover:bg-slateux-100 hover:text-ink-700"
                                                >
                                                    {showPassword ? (
                                                        <EyeOffIcon className="h-[18px] w-[18px]" />
                                                    ) : (
                                                        <EyeIcon className="h-[18px] w-[18px]" />
                                                    )}
                                                </button>
                                            }
                                        />


                                        <TextField
                                            id="confirmarContrasena"
                                            label="Confirmar contraseña"
                                            type={
                                                showPassword
                                                    ? 'text'
                                                    : 'password'
                                            }
                                            icon={LockKeyholeIcon}
                                            autoComplete="new-password"
                                            placeholder="••••••••••••"
                                            value={confirmarContrasena}
                                            maxLength={72}
                                            disabled={
                                                loading || !token
                                            }
                                            onChange={(event) =>
                                                setConfirmarContrasena(
                                                    event.target.value
                                                )
                                            }
                                        />


                                        <button
                                            type="submit"
                                            disabled={
                                                loading || !token
                                            }
                                            className="flex h-11 w-full items-center justify-center gap-2 rounded-field bg-ink-800 text-[14.5px] font-semibold text-white hover:bg-ink-700 disabled:cursor-not-allowed disabled:bg-ink-800/70"
                                        >
                                            {loading ? (
                                                <>
                                                    <LoaderCircleIcon className="h-[18px] w-[18px] animate-spin" />
                                                    Enviando código...
                                                </>
                                            ) : (
                                                <>
                                                    <ShieldCheckIcon className="h-[18px] w-[18px]" />
                                                    Continuar
                                                </>
                                            )}
                                        </button>

                                    </form>

                                </>
                            ) : null}


                            {step === 'otp' ? (
                                <>

                                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slateux-100 text-ink-800">
                                        <MailCheckIcon className="h-5 w-5" />
                                    </div>

                                    <span className="mt-5 block text-[11px] font-semibold uppercase tracking-[0.16em] text-brass-500">
                                        Verificación
                                    </span>

                                    <h1 className="mt-3 text-[1.75rem] font-semibold leading-tight tracking-tight text-ink-800">
                                        Verifica tu correo
                                    </h1>

                                    <p className="mt-2 text-[14px] leading-relaxed text-slateux-500">
                                        Enviamos un código de 6 dígitos al correo
                                        registrado de tu cuenta. El código expira
                                        en 10 minutos.
                                    </p>


                                    {mensajeReenvio ? (
                                        <div className="mt-5 rounded-field border border-slateux-200 bg-slateux-50 px-3.5 py-3 text-[13px] text-ink-700">
                                            {mensajeReenvio}
                                        </div>
                                    ) : null}


                                    {error ? (
                                        <div className="mt-5 rounded-field border border-danger-200 bg-danger-50 px-3.5 py-3 text-[13px] text-danger-700">
                                            {error}
                                        </div>
                                    ) : null}


                                    <form
                                        onSubmit={handleOtpSubmit}
                                        className="mt-6 space-y-5"
                                        noValidate
                                    >

                                        <div>

                                            <label
                                                htmlFor="codigoOtp"
                                                className="mb-1.5 block text-[13px] font-medium text-ink-700"
                                            >
                                                Código de verificación
                                            </label>

                                            <input
                                                id="codigoOtp"
                                                value={codigoOtp}
                                                onChange={(event) => {
                                                    const value =
                                                        event.target.value.replace(
                                                            /\D/g,
                                                            ''
                                                        );

                                                    setCodigoOtp(
                                                        value.slice(0, 6)
                                                    );
                                                }}
                                                maxLength={6}
                                                inputMode="numeric"
                                                autoComplete="one-time-code"
                                                placeholder="000000"
                                                disabled={
                                                    loading || resending
                                                }
                                                className="h-11 w-full rounded-field border border-slateux-300 bg-white px-3 text-center text-lg tracking-[0.35em] text-ink-800 outline-none transition focus:border-ink-700 focus:ring-2 focus:ring-ink-700/10"
                                            />

                                        </div>


                                        <button
                                            type="submit"
                                            disabled={
                                                loading ||
                                                resending ||
                                                codigoOtp.length !== 6
                                            }
                                            className="flex h-11 w-full items-center justify-center gap-2 rounded-field bg-ink-800 text-[14.5px] font-semibold text-white hover:bg-ink-700 disabled:cursor-not-allowed disabled:bg-ink-800/70"
                                        >
                                            {loading ? (
                                                <>
                                                    <LoaderCircleIcon className="h-[18px] w-[18px] animate-spin" />
                                                    Verificando...
                                                </>
                                            ) : (
                                                <>
                                                    <ShieldCheckIcon className="h-[18px] w-[18px]" />
                                                    Verificar y cambiar contraseña
                                                </>
                                            )}
                                        </button>

                                    </form>


                                    <div className="mt-5 border-t border-slateux-200 pt-5 text-center">

                                        <p className="text-[12.5px] text-slateux-500">
                                            ¿No recibiste el código?
                                        </p>

                                        <button
                                            type="button"
                                            onClick={handleResendOtp}
                                            disabled={!puedeReenviar}
                                            className="mt-2 inline-flex items-center gap-2 rounded px-3 py-2 text-[13px] font-semibold text-ink-700 hover:bg-slateux-100 disabled:cursor-not-allowed disabled:text-slateux-300"
                                        >
                                            {resending ? (
                                                <>
                                                    <LoaderCircleIcon className="h-4 w-4 animate-spin" />
                                                    Reenviando...
                                                </>
                                            ) : segundosReenvio > 0 ? (
                                                <>
                                                    Reenviar código en {segundosReenvio}s
                                                </>
                                            ) : reenviosRestantes <= 0 ? (
                                                <>
                                                    Límite de reenvíos alcanzado
                                                </>
                                            ) : (
                                                <>
                                                    <MailCheckIcon className="h-4 w-4" />
                                                    Reenviar código
                                                    <span className="text-slateux-400">
                                                        ({reenviosRestantes})
                                                    </span>
                                                </>
                                            )}
                                        </button>

                                        <p className="mt-3 text-[11px] leading-relaxed text-slateux-400">
                                            Cada código nuevo invalida al anterior.
                                            Máximo 3 reenvíos y 5 intentos de
                                            verificación.
                                        </p>

                                    </div>

                                </>
                            ) : null}


                            {step === 'success' ? (
                                <div className="text-center">

                                    <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-slateux-100 text-ink-800">
                                        <CheckCircle2Icon className="h-6 w-6" />
                                    </div>

                                    <h1 className="mt-5 text-xl font-semibold text-ink-800">
                                        Contraseña actualizada
                                    </h1>

                                    <p className="mt-3 text-[14px] leading-relaxed text-slateux-500">
                                        {mensajeExito}
                                    </p>

                                    <button
                                        type="button"
                                        onClick={() =>
                                            navigate('/login')
                                        }
                                        className="mt-6 flex h-11 w-full items-center justify-center gap-2 rounded-field bg-ink-800 text-[14.5px] font-semibold text-white hover:bg-ink-700"
                                    >
                                        <LockKeyholeIcon className="h-[18px] w-[18px]" />
                                        Ir a iniciar sesión
                                    </button>

                                </div>
                            ) : null}

                        </div>

                    </section>

                </div>

            </main>

        </div>
    );
}