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


type ForgotPasswordResponse = { mensaje: string };

type TipoDocumento = 'DNI' | 'CE' | 'PASAPORTE' | 'RUC';
const TIPOS_DOCUMENTO: TipoDocumento[] = ['DNI', 'CE', 'PASAPORTE', 'RUC'];
const PORTAL_DOCUMENTO_REGEX: Record<TipoDocumento, RegExp> = {
    DNI: /^\d{8}$/,
    CE: /^[a-zA-Z0-9]{8,12}$/,
    PASAPORTE: /^[a-zA-Z0-9]{6,20}$/,
    RUC: /^\d{11}$/
};


export function ForgotPassword() {

    const navigate = useNavigate();

    const [usuario, setUsuario] = useState('');
    const [tipoDocumento, setTipoDocumento] = useState<TipoDocumento>('DNI');

    const [loading, setLoading] =
        useState(false);

    const [enviado, setEnviado] =
        useState(false);

    const [error, setError] =
        useState<string | null>(null);

    // Nunca pedimos el correo destino: Auth Service lo consulta en la ficha CRM.

    async function handleSubmit(
        event: FormEvent<HTMLFormElement>
    ) {

        event.preventDefault();

        if (loading) {
            return;
        }

        setError(null);

        const usuarioLimpio =
            usuario.trim();


        if (
            !PORTAL_DOCUMENTO_REGEX[tipoDocumento].test(usuarioLimpio)
        ) {

            setError(
                `Ingresa un número de ${tipoDocumento} válido.`
            );

            return;
        }


        setLoading(true);

        try {

            await authApi.post<ForgotPasswordResponse>(
                    '/forgot-password',
                    {
                        usuario: usuarioLimpio,
                        origen: 'PORTAL_CLIENTE'
                    }
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

                                        Identifícate con tu número de documento. Enviaremos las
                                        instrucciones únicamente al correo principal que figura
                                        en tus datos de cliente registrados en Monolithe.
                                        No se puede indicar otro correo desde este formulario.

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


                                        <div>
                                            <label htmlFor="tipoDocumentoRecuperacion" className="mb-1.5 block text-[13px] font-medium text-ink-700">
                                                Tipo de documento
                                            </label>
                                            <select id="tipoDocumentoRecuperacion" value={tipoDocumento} disabled={loading}
                                                onChange={event => {
                                                    setTipoDocumento(event.target.value as TipoDocumento);
                                                    setUsuario('');
                                                    setError(null);
                                                }}
                                                className="h-11 w-full rounded-field border border-slateux-200 bg-white px-3 text-[14px] text-ink-700">
                                                {TIPOS_DOCUMENTO.map(tipo => <option key={tipo} value={tipo}>{tipo}</option>)}
                                            </select>
                                        </div>
                                        <TextField
                                            id="usuarioRecuperacion"
                                            label="Número de documento"
                                            type="text"
                                            autoComplete="username"
                                            placeholder={`Número de ${tipoDocumento}`}
                                            value={usuario}
                                            maxLength={tipoDocumento === 'DNI' ? 8 : tipoDocumento === 'RUC' ? 11 : tipoDocumento === 'CE' ? 12 : 20}
                                            inputMode={tipoDocumento === 'DNI' || tipoDocumento === 'RUC' ? 'numeric' : 'text'}
                                            invalid={Boolean(error)}
                                            disabled={loading}
                                            onChange={(event) => setUsuario(event.target.value)}
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


                                    <p className="mt-3 text-[14px] leading-relaxed text-slateux-500">
                                        Si existe una cuenta CLIENTE asociada al documento, el enlace
                                        se enviará al correo principal registrado en su expediente.
                                        Por seguridad no revelamos si la cuenta existe.
                                    </p>
                                    <p className="mt-3 text-[12px] leading-relaxed text-slateux-400">
                                        Si ya no tienes acceso a ese correo, solicita actualizarlo
                                        mediante el proceso de verificación de identidad de Monolithe.
                                    </p>

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