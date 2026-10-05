import { FormEvent, useState } from 'react';

import { useNavigate } from 'react-router-dom';

import {
    ArrowLeftIcon,
    LoaderCircleIcon,
    MailIcon,
    ShieldCheckIcon
} from 'lucide-react';

import { ApiError, authApi } from '../lib/apiClient';
import { BrandPanel } from '../components/BrandPanel';
import { Logo } from '../components/Logo';
import { TextField } from '../components/TextField';


type ForgotPasswordResponse = {
    mensaje: string;
    correoEnmascarado: string | null;
};


const PORTAL_USUARIO_REGEX =
    /^(?:[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}|\d{8}|[a-zA-Z0-9._-]{3,50})$/;


export function ForgotPassword() {

    const navigate = useNavigate();

    const [usuario, setUsuario] =
        useState('');

    const [loading, setLoading] =
        useState(false);

    const [enviado, setEnviado] =
        useState(false);

    const [error, setError] =
        useState<string | null>(null);

    const [
        correoEnmascarado,
        setCorreoEnmascarado
    ] = useState<string | null>(null);


    async function handleSubmit(
        event: FormEvent<HTMLFormElement>
    ) {

        event.preventDefault();

        if (loading) {
            return;
        }

        setError(null);
        setCorreoEnmascarado(null);

        const usuarioLimpio =
            usuario.trim();


        if (
            !usuarioLimpio ||
            usuarioLimpio.length > 120 ||
            !PORTAL_USUARIO_REGEX.test(usuarioLimpio)
        ) {

            setError(
                'Ingresa un DNI, usuario o correo válido.'
            );

            return;
        }


        setLoading(true);

        try {

            const data =
                await authApi.post<ForgotPasswordResponse>(
                    '/forgot-password',
                    {
                        usuario: usuarioLimpio,
                        origen: 'PORTAL_CLIENTE'
                    }
                );


            setCorreoEnmascarado(
                data.correoEnmascarado
            );

            setEnviado(true);

        } catch (error) {

            if (error instanceof ApiError) {

                setError(
                    error.message
                );

            } else {

                setError(
                    'No pudimos conectar con el servicio de autenticación. Inténtalo nuevamente.'
                );
            }

        } finally {

            setLoading(false);
        }
    }


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


                            {!enviado ? (

                                <>


                                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slateux-100 text-ink-800">

                                        <MailIcon className="h-5 w-5" />

                                    </div>


                                    <span className="mt-5 block text-[11px] font-semibold uppercase tracking-[0.16em] text-brass-500">

                                        Recuperación de acceso

                                    </span>


                                    <h1 className="mt-3 text-[1.75rem] font-semibold leading-tight tracking-tight text-ink-800">

                                        ¿Olvidaste tu contraseña?

                                    </h1>


                                    <p className="mt-2 text-[14px] leading-relaxed text-slateux-500">

                                        Ingresa tuusuario Monolithe y te
                                        enviaremos un enlace de recuperación al
                                        correo electrónico asociado a tu cuenta.

                                    </p>


                                    {error ? (

                                        <div
                                            role="alert"
                                            className="mt-5 rounded-field border border-danger-200 bg-danger-50 px-3.5 py-3"
                                        >

                                            <p className="text-[13px] font-semibold text-danger-700">

                                                No pudimos continuar

                                            </p>


                                            <p className="mt-0.5 text-[13px] leading-relaxed text-danger-700/85">

                                                {error}

                                            </p>

                                        </div>

                                    ) : null}



                                    <form
                                        onSubmit={handleSubmit}
                                        noValidate
                                        className="mt-6 space-y-5"
                                    >


                                        <TextField
                                            id="usuarioRecuperacion"
                                            label="Nombre de Usuario"
                                            type="text"
                                            autoComplete="username"
                                            placeholder="Ingresa tus datos de acceso"
                                            value={usuario}
                                            maxLength={120}
                                            invalid={Boolean(error)}
                                            disabled={loading}
                                            onChange={(event) =>
                                                setUsuario(
                                                    event.target.value
                                                )
                                            }
                                        />


                                        <button
                                            type="submit"
                                            disabled={loading}
                                            className="flex h-11 w-full items-center justify-center gap-2 rounded-field bg-ink-800 text-[14.5px] font-semibold text-white hover:bg-ink-700 disabled:cursor-not-allowed disabled:bg-ink-800/70"
                                        >

                                            {loading ? (

                                                <>

                                                    <LoaderCircleIcon className="h-[18px] w-[18px] animate-spin" />

                                                    Enviando...

                                                </>

                                            ) : (

                                                <>
                                                    <MailIcon className="h-[18px] w-[18px]" />

                                                    Enviar correo de recuperación
                                                </>

                                            )}

                                        </button>


                                    </form>


                                </>

                            ) : (

                                <div className="text-center">


                                    <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-slateux-100 text-ink-800">

                                        <ShieldCheckIcon className="h-6 w-6" />

                                    </div>


                                    <h1 className="mt-5 text-xl font-semibold text-ink-800">

                                        Revisa tu correo

                                    </h1>


                                    {correoEnmascarado ? (

                                        <p className="mt-3 text-[14px] leading-relaxed text-slateux-500">

                                            Hemos enviado las instrucciones para
                                            restablecer tu contraseña a{' '}

                                            <span className="font-semibold text-ink-700">

                                                {correoEnmascarado}

                                            </span>

                                            .

                                        </p>

                                    ) : (

                                        <p className="mt-3 text-[14px] leading-relaxed text-slateux-500">

                                            Si existe una cuenta asociada a los
                                            datos ingresados, recibirás un correo
                                            con las instrucciones para restablecer
                                            tu contraseña.

                                        </p>

                                    )}


                                    <button
                                        type="button"
                                        onClick={() =>
                                            navigate('/login')
                                        }
                                        className="mt-6 inline-flex items-center gap-2 text-[13px] font-semibold text-ink-700 hover:text-ink-900"
                                    >

                                        <ArrowLeftIcon className="h-4 w-4" />

                                        Volver a iniciar sesión

                                    </button>
                                </div>
                            )}
                        </div>
                    </section>
                </div>
            </main>
        </div>
    );
}