import { FormEvent, useRef, useState } from 'react';
import {
  LoaderCircleIcon,
  LockKeyholeIcon,
  ShieldCheckIcon
} from 'lucide-react';

import { ApiError, authApi } from '../lib/apiClient';
import {
  clearStoredSession,
  getAccessToken
} from '../lib/authSession';
import { Alert } from '../components/ui/Feedback';
import { Button } from '../components/ui/Button';
import { FieldLabel, Input } from '../components/ui/Field';

export function ChangePassword() {
  const [contrasenaActual, setContrasenaActual] = useState('');
  const [nuevaContrasena, setNuevaContrasena] = useState('');
  const [confirmarContrasena, setConfirmarContrasena] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const actualRef = useRef<HTMLInputElement>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (loading) return;

    setError(null);
    setSuccess(false);

    if (nuevaContrasena.length < 8 || nuevaContrasena.length > 72) {
      setError('La nueva contraseña debe tener entre 8 y 72 caracteres.');
      return;
    }

    if (nuevaContrasena !== confirmarContrasena) {
      setError('La confirmación no coincide con la nueva contraseña.');
      return;
    }

    if (contrasenaActual === nuevaContrasena) {
      setError('La nueva contraseña debe ser diferente de la actual.');
      return;
    }

    const accessToken = getAccessToken();

    if (!accessToken) {
      clearStoredSession();
      window.location.replace('/login');
      return;
    }

    setLoading(true);

    try {
      await authApi.post<void>(
        '/change-password',
        {
          contrasenaActual,
          nuevaContrasena,
          confirmarContrasena
        },
        {
          headers: {
            Authorization: `Bearer ${accessToken}`
          }
        }
      );

      setSuccess(true);

      /*
       * El backend revoca las sesiones al cambiar la contraseña,
       * así que eliminamos también la sesión almacenada en el navegador.
       */
      clearStoredSession();

      window.setTimeout(() => {
        window.location.replace('/login');
      }, 1200);
    } catch (error) {
      if (error instanceof ApiError) {
        setError(error.message);
      } else {
        setError(
          'No pudimos cambiar la contraseña. Inténtalo nuevamente.'
        );
      }

      actualRef.current?.focus();
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
            Seguridad de la cuenta
          </p>
        </div>

        <div className="rounded-xl border border-brand-100 bg-white p-7 shadow-sm">
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-brand-900">
              Cambiar contraseña
            </h2>

            <p className="mt-1 text-[13px] leading-relaxed text-brand-400">
              Debes establecer una nueva contraseña antes de continuar al
              Backoffice.
            </p>
          </div>

          {error ? (
            <Alert
              tone="danger"
              title="No pudimos cambiar la contraseña"
              className="mb-5"
            >
              {error}
            </Alert>
          ) : null}

          {success ? (
            <Alert
              tone="success"
              title="Contraseña actualizada"
              className="mb-5"
            >
              Tu contraseña fue cambiada correctamente. Serás enviado al
              inicio de sesión.
            </Alert>
          ) : null}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <FieldLabel htmlFor="contrasenaActual">
                Contraseña actual
              </FieldLabel>

              <Input
                ref={actualRef}
                id="contrasenaActual"
                type="password"
                value={contrasenaActual}
                onChange={(event) =>
                  setContrasenaActual(event.target.value)
                }
                autoComplete="current-password"
                disabled={loading || success}
              />
            </div>

            <div>
              <FieldLabel htmlFor="nuevaContrasena">
                Nueva contraseña
              </FieldLabel>

              <Input
                id="nuevaContrasena"
                type="password"
                value={nuevaContrasena}
                onChange={(event) =>
                  setNuevaContrasena(event.target.value)
                }
                autoComplete="new-password"
                disabled={loading || success}
              />

              <p className="mt-1 text-[11px] text-brand-300">
                Entre 8 y 72 caracteres.
              </p>
            </div>

            <div>
              <FieldLabel htmlFor="confirmarContrasena">
                Confirmar nueva contraseña
              </FieldLabel>

              <Input
                id="confirmarContrasena"
                type="password"
                value={confirmarContrasena}
                onChange={(event) =>
                  setConfirmarContrasena(event.target.value)
                }
                autoComplete="new-password"
                disabled={loading || success}
              />
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
                  Actualizando...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <LockKeyholeIcon className="h-4 w-4" />
                  Cambiar contraseña
                </span>
              )}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}