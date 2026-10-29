
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ApiError,
  corePublicApi
} from '../lib/apiClient';

type ConfirmacionResponse = {
  mensaje: string;
  correo: string | null;
};

export function ConfirmarCorreo() {
  const [token, setToken] = useState(() =>
    new URLSearchParams(window.location.search)
      .get('token')?.trim() ?? ''
  );

  const [cargando, setCargando] = useState(false);
  const [confirmado, setConfirmado] = useState(false);
  const [correo, setCorreo] = useState('');
  const [error, setError] = useState('');

  // Retirar el token de la barra de direcciones.
  useEffect(() => {
    const url = new URL(window.location.href);

    if (url.searchParams.has('token')) {
      url.searchParams.delete('token');

      window.history.replaceState(
        window.history.state,
        '',
        `${url.pathname}${url.search}${url.hash}`
      );
    }
  }, []);

  async function confirmarCambio() {
    if (!token || cargando || confirmado) return;

    setCargando(true);
    setError('');

    try {
      const respuesta =
        await corePublicApi.post<ConfirmacionResponse>(
          '/trabajadores/confirmar-cambio-correo',
          { token }
        );

      setCorreo(respuesta.correo ?? '');
      setConfirmado(true);
      setToken('');
    } catch (err) {
      if (err instanceof ApiError) {
        setError(
          err.message || 'No fue posible confirmar el correo.'
        );
      } else {
        setError(
          'No se pudo conectar con el servidor. Inténtalo nuevamente.'
        );
      }
    } finally {
      setCargando(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-brand-50 px-4 py-10">
      <section className="w-full max-w-md rounded-xl border border-brand-100 bg-white p-8 shadow-sm">
        <h1 className="text-2xl font-bold text-brand-900">
          MONOLITHE
        </h1>

        <p className="mt-1 text-sm text-brand-400">
          Verificación de correo electrónico
        </p>

        {confirmado ? (
          <div className="mt-8" role="status">
            <h2 className="text-xl font-semibold text-green-700">
              Correo confirmado correctamente
            </h2>

            <p className="mt-3 text-sm text-brand-700">
              Tu nuevo correo electrónico ha sido verificado
              y actualizado en tu expediente laboral.
            </p>

            {correo && (
              <p className="mt-3 break-all text-sm font-semibold text-brand-900">
                {correo}
              </p>
            )}
          </div>
        ) : (
          <div className="mt-8">
            <h2 className="text-lg font-semibold text-brand-900">
              Confirmar nuevo correo
            </h2>

            <p className="mt-3 text-sm leading-6 text-brand-700">
              Para finalizar el cambio aprobado por
              Gerencia o Administración, confirma que
              tienes acceso a esta dirección de correo.
            </p>

            {!token && (
              <p className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700" role="alert">
                El enlace no contiene un token válido.
                Solicita un nuevo enlace de verificación.
              </p>
            )}

            {error && (
              <p className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700" role="alert">
                {error}
              </p>
            )}

            <button
              type="button"
              onClick={confirmarCambio}
              disabled={!token || cargando}
              className="mt-6 w-full rounded-lg bg-brand-800 px-5 py-3 text-sm font-semibold text-white hover:bg-brand-900 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {cargando
                ? 'Confirmando correo...'
                : 'Confirmar correo electrónico'}
            </button>
          </div>
        )}

        <div className="mt-7 border-t border-brand-100 pt-5 text-center">
          <Link
            to="/login"
            className="text-sm font-medium text-brand-700 hover:underline"
          >
            Ir al inicio de sesión
          </Link>
        </div>
      </section>
    </main>
  );
}
