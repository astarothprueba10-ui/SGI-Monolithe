import {
    FormEvent,
    useEffect,
    useState
} from 'react';

import { useSearchParams } from 'react-router-dom';

import {
    CheckCircle2Icon,
    EyeIcon,
    EyeOffIcon,
    KeyRoundIcon,
    LoaderCircleIcon,
    LockKeyholeIcon,
    MailCheckIcon,
    ShieldCheckIcon
} from 'lucide-react';

import {
    ApiError,
    authApi
} from '../lib/apiClient';

import { Alert } from '../components/ui/Feedback';
import { Button } from '../components/ui/Button';
import {
    FieldLabel,
    Input
} from '../components/ui/Field';


type ResetPasswordOtpResponse = {
    ticket: string;
};


type MessageResponse = {
    mensaje: string;
};


type ResendOtpResponse = {
    message: string;
    reenviosRestantes: number;
    segundosParaNuevoReenvio: number;
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

    const segundos =
        Number(match[1]);

    return Number.isFinite(segundos)
        ? segundos
        : null;
}


export function ResetPassword() {

    const [searchParams] =
        useSearchParams();

    const token =
        searchParams
            .get('token')
            ?.trim() ?? '';


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


    const [
        ticket,
        setTicket
    ] = useState('');

    const [
        codigoOtp,
        setCodigoOtp
    ] = useState('');


    const [
        showPassword,
        setShowPassword
    ] = useState(false);


    const [
        loading,
        setLoading
    ] = useState(false);

    const [
        resending,
        setResending
    ] = useState(false);


    const [
        error,
        setError
    ] = useState<string | null>(
        null
    );

    const [
        mensajeExito,
        setMensajeExito
    ] = useState('');

    const [
        mensajeReenvio,
        setMensajeReenvio
    ] = useState<string | null>(
        null
    );


    /*
     * Son 3 reenvíos adicionales.
     * El primer OTP no cuenta como reenvío.
     */
    const [
        reenviosRestantes,
        setReenviosRestantes
    ] = useState(3);


    /*
     * Cooldown visual.
     * El backend también valida los 60 segundos,
     * por lo que este contador no es una medida
     * de seguridad, solamente UX.
     */
    const [
        segundosReenvio,
        setSegundosReenvio
    ] = useState(0);


    useEffect(() => {

        if (segundosReenvio <= 0) {
            return;
        }

        const timeout =
            window.setTimeout(
                () => {
                    setSegundosReenvio(
                        (actual) =>
                            Math.max(
                                0,
                                actual - 1
                            )
                    );
                },
                1000
            );

        return () =>
            window.clearTimeout(
                timeout
            );

    }, [segundosReenvio]);


    async function handlePasswordSubmit(
        event: FormEvent<HTMLFormElement>
    ) {

        event.preventDefault();

        if (loading) {
            return;
        }

        setError(null);
        setMensajeReenvio(null);


        if (!token) {

            setError(
                'El enlace de recuperación no contiene un token válido.'
            );

            return;
        }


        if (!nuevaContrasena) {

            setError(
                'Ingresa tu nueva contraseña.'
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


        if (!confirmarContrasena) {

            setError(
                'Confirma tu nueva contraseña.'
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


            /*
             * El ticket solamente vive
             * en memoria.
             */
            setTicket(
                data.ticket
            );


            /*
             * La contraseña ya quedó
             * almacenada únicamente como
             * hash pendiente en backend.
             */
            setNuevaContrasena('');
            setConfirmarContrasena('');


            /*
             * Después del primer envío
             * esperamos 60 segundos antes
             * de permitir un reenvío.
             */
            setReenviosRestantes(3);
            setSegundosReenvio(60);

            setStep('otp');

        } catch (error) {

            setError(
                resolverMensajeError(
                    error
                )
            );

        } finally {

            setLoading(false);
        }
    }


    async function handleResendOtp() {

        if (
            resending ||
            loading ||
            segundosReenvio > 0 ||
            reenviosRestantes <= 0
        ) {
            return;
        }


        setError(null);
        setMensajeReenvio(null);


        if (!ticket) {

            setError(
                'La verificación ya no es válida. Solicita nuevamente el restablecimiento.'
            );

            return;
        }


        setResending(true);


        try {

            const data =
                await authApi.post<ResendOtpResponse>(
                    '/reset-password/resend',
                    {
                        ticket
                    }
                );


            /*
             * El OTP anterior queda inválido.
             * Limpiamos cualquier código que
             * el usuario hubiera escrito.
             */
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
                'Hemos enviado un nuevo código de verificación a tu correo.'
            );

        } catch (error) {

            const mensaje =
                resolverMensajeError(
                    error
                );


            /*
             * Si el backend indica que
             * todavía existe cooldown,
             * sincronizamos también el
             * contador del frontend.
             */
            const segundos =
                obtenerSegundosEspera(
                    mensaje
                );

            if (
                segundos !== null &&
                segundos > 0
            ) {

                setSegundosReenvio(
                    segundos
                );
            }


            /*
             * Si ya se agotaron los
             * reenvíos o la ventana total,
             * deshabilitamos el botón.
             */
            if (
                /maximo de 3 reenvios/i.test(
                    mensaje
                ) ||
                /máximo de 3 reenvíos/i.test(
                    mensaje
                ) ||
                /periodo para reenviar.*expirado/i.test(
                    mensaje
                )
            ) {

                setReenviosRestantes(
                    0
                );
            }


            setError(
                mensaje
            );

        } finally {

            setResending(false);
        }
    }


    async function handleOtpSubmit(
        event: FormEvent<HTMLFormElement>
    ) {

        event.preventDefault();


        if (
            loading ||
            resending
        ) {
            return;
        }


        setError(null);
        setMensajeReenvio(null);


        const otpNormalizado =
            codigoOtp.trim();


        if (
            !/^\d{6}$/.test(
                otpNormalizado
            )
        ) {

            setError(
                'El código de verificación debe contener 6 dígitos.'
            );

            return;
        }


        if (!ticket) {

            setError(
                'La verificación ya no es válida. Solicita nuevamente el restablecimiento.'
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
                        codigoOtp:
                            otpNormalizado
                    }
                );


            /*
             * Eliminamos datos sensibles
             * del estado al terminar.
             */
            setTicket('');
            setCodigoOtp('');
            setSegundosReenvio(0);
            setMensajeReenvio(null);


            setMensajeExito(
                data.mensaje ||
                'Su contraseña ha sido cambiada con exito'
            );


            setStep(
                'success'
            );

        } catch (error) {

            setError(
                resolverMensajeError(
                    error
                )
            );

        } finally {

            setLoading(false);
        }
    }


    function volverAlLogin() {

        window.location.replace(
            '/login'
        );
    }


    const puedeReenviar =
        Boolean(ticket) &&
        !loading &&
        !resending &&
        segundosReenvio === 0 &&
        reenviosRestantes > 0;


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
                        Recuperación de acceso
                    </p>

                </div>


                <div className="rounded-xl border border-brand-100 bg-white p-7 shadow-sm">

                    {step === 'password' ? (
                        <>

                            <div className="mb-6">

                                <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-brand-50 text-brand-800">
                                    <LockKeyholeIcon className="h-5 w-5" />
                                </div>

                                <h2 className="text-lg font-semibold text-brand-900">
                                    Crear nueva contraseña
                                </h2>

                                <p className="mt-1 text-[13px] leading-relaxed text-brand-400">
                                    Ingresa y confirma la nueva contraseña que
                                    utilizarás para acceder a tu cuenta.
                                </p>

                            </div>


                            {!token ? (
                                <Alert
                                    tone="danger"
                                    title="Enlace inválido"
                                    className="mb-5"
                                >
                                    Este enlace de recuperación no contiene un
                                    token válido. Solicita un nuevo correo de
                                    recuperación.
                                </Alert>
                            ) : null}


                            {error ? (
                                <Alert
                                    tone="danger"
                                    title="No pudimos continuar"
                                    className="mb-5"
                                >
                                    {error}
                                </Alert>
                            ) : null}


                            <form
                                onSubmit={handlePasswordSubmit}
                                className="space-y-5"
                                noValidate
                            >

                                <div>

                                    <FieldLabel htmlFor="nuevaContrasena">
                                        Nueva contraseña
                                    </FieldLabel>

                                    <div className="relative">

                                        <Input
                                            id="nuevaContrasena"
                                            type={
                                                showPassword
                                                    ? 'text'
                                                    : 'password'
                                            }
                                            value={
                                                nuevaContrasena
                                            }
                                            onChange={
                                                (event) =>
                                                    setNuevaContrasena(
                                                        event.target.value
                                                    )
                                            }
                                            maxLength={72}
                                            autoComplete="new-password"
                                            placeholder="••••••••••••"
                                            disabled={
                                                loading ||
                                                !token
                                            }
                                            className="pr-10"
                                        />


                                        <button
                                            type="button"
                                            onClick={
                                                () =>
                                                    setShowPassword(
                                                        (value) =>
                                                            !value
                                                    )
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


                                <div>

                                    <FieldLabel htmlFor="confirmarContrasena">
                                        Confirmar contraseña
                                    </FieldLabel>

                                    <Input
                                        id="confirmarContrasena"
                                        type={
                                            showPassword
                                                ? 'text'
                                                : 'password'
                                        }
                                        value={
                                            confirmarContrasena
                                        }
                                        onChange={
                                            (event) =>
                                                setConfirmarContrasena(
                                                    event.target.value
                                                )
                                        }
                                        maxLength={72}
                                        autoComplete="new-password"
                                        placeholder="••••••••••••"
                                        disabled={
                                            loading ||
                                            !token
                                        }
                                    />

                                </div>


                                <Button
                                    type="submit"
                                    variant="primary"
                                    className="w-full"
                                    disabled={
                                        loading ||
                                        !token
                                    }
                                >

                                    {loading ? (

                                        <span className="flex items-center gap-2">

                                            <LoaderCircleIcon className="h-4 w-4 animate-spin" />

                                            Enviando código...

                                        </span>

                                    ) : (

                                        <span className="flex items-center gap-2">

                                            <KeyRoundIcon className="h-4 w-4" />

                                            Continuar

                                        </span>

                                    )}

                                </Button>

                            </form>

                        </>
                    ) : null}


                    {step === 'otp' ? (
                        <>

                            <div className="mb-6">

                                <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-brand-50 text-brand-800">
                                    <MailCheckIcon className="h-5 w-5" />
                                </div>

                                <h2 className="text-lg font-semibold text-brand-900">
                                    Verifica tu correo
                                </h2>

                                <p className="mt-1 text-[13px] leading-relaxed text-brand-400">
                                    Enviamos un código de 6 dígitos al correo
                                    registrado de tu cuenta. El código expira
                                    en 10 minutos.
                                </p>

                            </div>


                            {mensajeReenvio ? (

                                <div
                                    className="mb-5 rounded-lg border border-brand-100 bg-brand-50 px-4 py-3 text-[13px] leading-relaxed text-brand-700"
                                    role="status"
                                    aria-live="polite"
                                >
                                    {mensajeReenvio}
                                </div>

                            ) : null}


                            {error ? (
                                <Alert
                                    tone="danger"
                                    title="Código no válido"
                                    className="mb-5"
                                >
                                    {error}
                                </Alert>
                            ) : null}


                            <form
                                onSubmit={handleOtpSubmit}
                                className="space-y-5"
                                noValidate
                            >

                                <div>

                                    <FieldLabel htmlFor="codigoOtp">
                                        Código de verificación
                                    </FieldLabel>

                                    <Input
                                        id="codigoOtp"
                                        value={
                                            codigoOtp
                                        }
                                        onChange={
                                            (event) => {

                                                const value =
                                                    event.target.value.replace(
                                                        /\D/g,
                                                        ''
                                                    );

                                                setCodigoOtp(
                                                    value.slice(
                                                        0,
                                                        6
                                                    )
                                                );
                                            }
                                        }
                                        maxLength={6}
                                        inputMode="numeric"
                                        autoComplete="one-time-code"
                                        placeholder="000000"
                                        disabled={
                                            loading ||
                                            resending
                                        }
                                        className="text-center text-lg tracking-[0.35em]"
                                    />

                                </div>


                                <Button
                                    type="submit"
                                    variant="primary"
                                    className="w-full"
                                    disabled={
                                        loading ||
                                        resending ||
                                        codigoOtp.length !== 6
                                    }
                                >

                                    {loading ? (

                                        <span className="flex items-center gap-2">

                                            <LoaderCircleIcon className="h-4 w-4 animate-spin" />

                                            Verificando código...

                                        </span>

                                    ) : (

                                        <span className="flex items-center gap-2">

                                            <ShieldCheckIcon className="h-4 w-4" />

                                            Verificar y cambiar contraseña

                                        </span>

                                    )}

                                </Button>

                            </form>


                            <div className="mt-5 border-t border-brand-100 pt-5 text-center">

                                <p className="text-[12px] text-brand-400">
                                    ¿No recibiste el código?
                                </p>


                                <button
                                    type="button"
                                    onClick={
                                        handleResendOtp
                                    }
                                    disabled={
                                        !puedeReenviar
                                    }
                                    className="mt-2 inline-flex min-h-9 items-center justify-center gap-2 rounded-lg px-3 text-[13px] font-medium text-brand-800 transition hover:bg-brand-50 disabled:cursor-not-allowed disabled:text-brand-300"
                                >

                                    {resending ? (
                                        <>
                                            <LoaderCircleIcon className="h-4 w-4 animate-spin" />
                                            Reenviando código...
                                        </>
                                    ) : segundosReenvio > 0 ? (
                                        <>
                                            Reenviar código en{' '}
                                            {segundosReenvio}s
                                        </>
                                    ) : reenviosRestantes <= 0 ? (
                                        <>
                                            Límite de reenvíos alcanzado
                                        </>
                                    ) : (
                                        <>
                                            <MailCheckIcon className="h-4 w-4" />

                                            Reenviar código

                                            <span className="text-brand-300">
                                                ({reenviosRestantes} disponibles)
                                            </span>
                                        </>
                                    )}

                                </button>


                                <p className="mt-3 text-[11px] leading-relaxed text-brand-300">
                                    Cada nuevo código invalida al anterior.
                                    Puedes solicitar un máximo de 3 reenvíos.
                                </p>

                            </div>


                            <p className="mt-4 text-center text-[11px] leading-relaxed text-brand-300">
                                Por seguridad, el código solo puede intentarse
                                un máximo de 5 veces. Reenviar un código no
                                reinicia los intentos fallidos.
                            </p>

                        </>
                    ) : null}


                    {step === 'success' ? (
                        <>

                            <div className="text-center">

                                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-brand-50 text-brand-800">
                                    <CheckCircle2Icon className="h-6 w-6" />
                                </div>

                                <h2 className="mt-4 text-lg font-semibold text-brand-900">
                                    Contraseña actualizada
                                </h2>

                                <p className="mt-2 text-[13px] leading-relaxed text-brand-400">
                                    {mensajeExito}
                                </p>

                            </div>


                            <Button
                                type="button"
                                variant="primary"
                                className="mt-6 w-full"
                                onClick={
                                    volverAlLogin
                                }
                            >

                                <span className="flex items-center gap-2">

                                    <LockKeyholeIcon className="h-4 w-4" />

                                    Ir a iniciar sesión

                                </span>

                            </Button>

                        </>
                    ) : null}

                </div>

            </div>

        </div>
    );
}