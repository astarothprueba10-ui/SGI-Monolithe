import { FormEvent, useState } from 'react';
import {
    ArrowLeftIcon,
    LoaderCircleIcon,
    MailIcon,
    ShieldCheckIcon
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

import { ApiError, authApi } from '../lib/apiClient';
import { Alert } from '../components/ui/Feedback';
import { Button } from '../components/ui/Button';
import { FieldLabel, Input } from '../components/ui/Field';


type ForgotPasswordResponse = {
    mensaje: string;
    correoEnmascarado: string | null;
};


const USUARIO_REGEX =
    /^(?:[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}|[a-zA-Z0-9._-]{3,120})$/;


export function ForgotPassword() {

    const navigate = useNavigate();

    const [usuario, setUsuario] =
        useState('');

    const [loading, setLoading] =
        useState(false);

    const [error, setError] =
        useState<string | null>(null);

    const [enviado, setEnviado] =
        useState(false);

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
            !USUARIO_REGEX.test(usuarioLimpio)
        ) {
            setError(
                'Ingresa un nombre de usuario válido.'
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
                        origen: 'BACKOFFICE'
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


                    {!enviado ? (

                        <>

                            <div className="mb-6">

                                <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-brand-50 text-brand-800">

                                    <MailIcon className="h-5 w-5" />

                                </div>


                                <h2 className="text-lg font-semibold text-brand-900">

                                    ¿Olvidaste tu contraseña?

                                </h2>


                                <p className="mt-1 text-[13px] leading-relaxed text-brand-400">

                                    Ingresa tu Usuario Monolithe y te enviaremos
                                    un enlace de recuperación al correo electrónico
                                    asociado a tu cuenta.

                                </p>

                            </div>



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
                                onSubmit={handleSubmit}
                                className="space-y-5"
                                noValidate
                            >

                                <div>

                                    <FieldLabel htmlFor="usuarioRecuperacion">

                                        Nombre de usuario

                                    </FieldLabel>


                                    <Input
                                        id="usuarioRecuperacion"
                                        type="text"
                                        value={usuario}
                                        onChange={(event) =>
                                            setUsuario(
                                                event.target.value
                                            )
                                        }
                                        maxLength={120}
                                        autoComplete="username"
                                        placeholder="Ingresa tu Usuario Monolithe"
                                        disabled={loading}
                                    />

                                </div>



                                <Button
                                    type="submit"
                                    variant="primary"
                                    className="w-full"
                                    disabled={loading}
                                >

                                    {loading ? (

                                        <span className="flex items-center gap-2">

                                            <LoaderCircleIcon className="h-4 w-4 animate-spin" />

                                            Enviando...

                                        </span>

                                    ) : (

                                        <span className="flex items-center gap-2">

                                            <MailIcon className="h-4 w-4" />

                                            Enviar correo de recuperación

                                        </span>

                                    )}

                                </Button>

                            </form>

                        </>

                    ) : (

                        <>

                            <div className="text-center">

                                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-brand-50 text-brand-800">

                                    <MailIcon className="h-6 w-6" />

                                </div>


                                <h2 className="mt-4 text-lg font-semibold text-brand-900">

                                    Revisa tu correo

                                </h2>


                                {correoEnmascarado ? (

                                    <p className="mt-2 text-[13px] leading-relaxed text-brand-400">

                                        Hemos enviado las instrucciones para
                                        restablecer tu contraseña a{' '}

                                        <span className="font-semibold text-brand-700">

                                            {correoEnmascarado}

                                        </span>

                                        .

                                    </p>

                                ) : (

                                    <p className="mt-2 text-[13px] leading-relaxed text-brand-400">

                                        Si existe una cuenta asociada al usuario
                                        ingresado, recibirás un correo con las
                                        instrucciones para restablecer tu contraseña.

                                    </p>

                                )}

                            </div>

                        </>

                    )}



                    <button
                        type="button"
                        onClick={() =>
                            navigate('/login')
                        }
                        className="mx-auto mt-6 flex items-center gap-2 text-[13px] font-medium text-brand-700 hover:text-brand-900"
                    >

                        <ArrowLeftIcon className="h-4 w-4" />

                        Volver a iniciar sesión

                    </button>

                </div>

            </div>

        </div>
    );
}