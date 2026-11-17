import { FormEvent, type Ref, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertCircleIcon, CheckCircle2Icon, EyeIcon, EyeOffIcon,
  LoaderCircleIcon, LockKeyholeIcon, ShieldCheckIcon
} from 'lucide-react';
import { BrandPanel } from '../components/BrandPanel';
import { Logo } from '../components/Logo';
import { TextField } from '../components/TextField';
import { ApiError, authApi } from '../lib/apiClient';
import { clearPortalSession, getPortalAccessToken } from '../lib/portalSession';

/** Primer ingreso: solo CLIENTE con requiereCambioPassword puede visitar esta ruta. */
export function ChangePassword() {
  const navigate = useNavigate();
  const actualRef = useRef<HTMLInputElement>(null);
  const [contrasenaActual, setContrasenaActual] = useState('');
  const [nuevaContrasena, setNuevaContrasena] = useState('');
  const [confirmarContrasena, setConfirmarContrasena] = useState('');
  const [mostrar, setMostrar] = useState({ actual: false, nueva: false, confirmar: false });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function alternar(campo: keyof typeof mostrar) {
    setMostrar(prev => ({ ...prev, [campo]: !prev[campo] }));
  }

  function salir() {
    clearPortalSession();
    navigate('/login', { replace: true });
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (loading || success) return;
    setError(null);

    if (!contrasenaActual) {
      setError('Ingresa la contraseña temporal que recibiste por correo.');
      actualRef.current?.focus();
      return;
    }
    if (nuevaContrasena.length < 8 || nuevaContrasena.length > 72) {
      setError('La nueva contraseña debe tener entre 8 y 72 caracteres.');
      return;
    }
    if (nuevaContrasena !== confirmarContrasena) {
      setError('La confirmación no coincide con la nueva contraseña.');
      return;
    }
    if (contrasenaActual === nuevaContrasena) {
      setError('La nueva contraseña debe ser diferente de la temporal.');
      return;
    }

    const accessToken = getPortalAccessToken();
    if (!accessToken) {
      salir();
      return;
    }

    setLoading(true);
    try {
      await authApi.post<void>('/change-password', {
        contrasenaActual, nuevaContrasena, confirmarContrasena
      }, { headers: { Authorization: `Bearer ${accessToken}` } });

      // Auth Service revoca todas las sesiones tras el cambio de contraseña.
      clearPortalSession();
      setContrasenaActual('');
      setNuevaContrasena('');
      setConfirmarContrasena('');
      setSuccess(true);
    } catch (cause) {
      setError(cause instanceof ApiError
        ? cause.message
        : 'No pudimos cambiar la contraseña. Inténtalo nuevamente.');
      actualRef.current?.focus();
    } finally {
      setLoading(false);
    }
  }

  function passwordField(
    id: string, label: string, value: string,
    onChange: (value: string) => void, campo: keyof typeof mostrar,
    ref?: Ref<HTMLInputElement>
  ) {
    return <TextField
      ref={ref}
      id={id}
      label={label}
      type={mostrar[campo] ? 'text' : 'password'}
      icon={LockKeyholeIcon}
      autoComplete={campo === 'actual' ? 'current-password' : 'new-password'}
      value={value}
      onChange={e => onChange(e.target.value)}
      maxLength={campo === 'actual' ? 128 : 72}
      required
      disabled={loading || success}
      invalid={Boolean(error)}
      trailing={<button
        type="button"
        onClick={() => alternar(campo)}
        disabled={loading || success}
        className="flex h-8 w-8 items-center justify-center rounded-md text-slateux-400 hover:bg-slateux-100 hover:text-ink-700 disabled:opacity-50"
        aria-label={mostrar[campo] ? `Ocultar ${label.toLowerCase()}` : `Mostrar ${label.toLowerCase()}`}
        aria-pressed={mostrar[campo]}
      >{mostrar[campo] ? <EyeOffIcon className="h-[18px] w-[18px]" /> : <EyeIcon className="h-[18px] w-[18px]" />}</button>}
    />;
  }

  return <div className="grid min-h-screen w-full grid-cols-1 bg-slateux-50 lg:grid-cols-[minmax(0,1fr)_minmax(520px,44%)] xl:grid-cols-[minmax(0,1fr)_600px]">
    <BrandPanel />
    <main className="flex flex-col px-5 py-8 sm:px-10 lg:px-14 lg:py-10 xl:px-20">
      <header className="flex items-center justify-between gap-4">
        <div className="lg:hidden"><Logo size="sm" /></div>
        <button type="button" onClick={salir} className="ml-auto text-[13px] font-medium text-ink-700 hover:underline">
          Cerrar sesión temporal
        </button>
      </header>
      <div className="flex flex-1 items-center justify-center py-10 sm:py-14">
        <section className="w-full max-w-[27rem]">
          <div className="rounded-card border border-slateux-200 bg-white p-6 shadow-card sm:p-8">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slateux-100 text-ink-800">
              <ShieldCheckIcon className="h-5 w-5" aria-hidden="true" />
            </div>
            <span className="mt-5 block text-[11px] font-semibold uppercase tracking-[0.16em] text-brass-500">Seguridad de tu cuenta</span>
            <h1 className="mt-3 text-[1.75rem] font-semibold leading-tight text-ink-800">Cambio de contraseña obligatorio</h1>
            <p className="mt-2 text-[14px] leading-relaxed text-slateux-500">
              Por tu seguridad, debes cambiar la contraseña temporal recibida en el correo
              registrado de tu cuenta antes de acceder al Portal Cliente.
            </p>

            {error && <div role="alert" className="mt-5 flex gap-2 rounded-field border border-danger-200 bg-danger-50 px-3.5 py-3 text-[13px] text-danger-700">
              <AlertCircleIcon className="h-[18px] w-[18px] shrink-0" aria-hidden="true" />
              <span>{error}</span>
            </div>}

            {success ? <div role="status" className="mt-6 space-y-4">
              <div className="flex items-start gap-3 rounded-field border border-slateux-200 bg-slateux-50 p-4">
                <CheckCircle2Icon className="h-5 w-5 shrink-0 text-ink-700" aria-hidden="true" />
                <p className="text-[13px] leading-relaxed text-ink-700">
                  Contraseña actualizada. Tu sesión temporal fue cerrada.
                  Inicia sesión con tu documento y la nueva contraseña.
                </p>
              </div>
              <button type="button" onClick={() => navigate('/login', { replace: true })}
                className="flex h-11 w-full items-center justify-center rounded-field bg-ink-800 font-semibold text-white hover:bg-ink-700">
                Ir a iniciar sesión
              </button>
            </div> : <form onSubmit={handleSubmit} className="mt-6 space-y-5">
              {passwordField('contrasenaActual', 'Contraseña temporal', contrasenaActual, setContrasenaActual, 'actual', actualRef)}
              {passwordField('nuevaContrasena', 'Nueva contraseña', nuevaContrasena, setNuevaContrasena, 'nueva')}
              <p className="-mt-3 text-[11px] text-slateux-500">Entre 8 y 72 caracteres. No reutilices la contraseña temporal.</p>
              {passwordField('confirmarContrasena', 'Confirmar nueva contraseña', confirmarContrasena, setConfirmarContrasena, 'confirmar')}
              <button type="submit" disabled={loading}
                className="flex h-11 w-full items-center justify-center gap-2 rounded-field bg-ink-800 text-[14.5px] font-semibold text-white hover:bg-ink-700 disabled:cursor-not-allowed disabled:opacity-70">
                {loading ? <><LoaderCircleIcon className="h-[18px] w-[18px] animate-spin" /> Actualizando...</> : <><LockKeyholeIcon className="h-[18px] w-[18px]" /> Cambiar contraseña</>}
              </button>
            </form>}
          </div>
        </section>
      </div>
    </main>
  </div>;
}
