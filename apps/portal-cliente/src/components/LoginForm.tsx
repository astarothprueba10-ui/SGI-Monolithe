import React, { useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ApiError, authApi } from '../lib/apiClient';
import { MfaLoginForm } from './auth/MfaLoginForm';
import { requireMfaChallenge, type MfaChallenge, type MfaLoginSession } from '../lib/mfaLogin';
import {
  AlertCircleIcon,
  CheckIcon,
  EyeIcon,
  EyeOffIcon,
  LoaderCircleIcon,
  LockIcon,
  ShieldCheckIcon,
  UserIcon
} from 'lucide-react';
import { TextField } from './TextField';

type TipoDocumento = 'DNI' | 'CE' | 'PASAPORTE' | 'RUC';

const TIPOS_DOCUMENTO: { value: TipoDocumento; label: string }[] = [
  { value: 'DNI', label: 'DNI' },
  { value: 'CE', label: 'CE' },
  { value: 'PASAPORTE', label: 'PAS' },
  { value: 'RUC', label: 'RUC' }
];

const DOC_REGEX: Record<TipoDocumento, RegExp> = {
  DNI: /^\d{8}$/,
  CE: /^[a-zA-Z0-9]{8,12}$/,
  PASAPORTE: /^[a-zA-Z0-9]{6,20}$/,
  RUC: /^\d{11}$/
};

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
    return 'Documento o contrasena incorrectos';
  }

  return error.message;
}

const CONTROL_CHARS_REGEX = /[\x00-\x1F\x7F]/;


function validarFormularioPortal(
  tipoDocumento: TipoDocumento,
  usuario: string,
  contrasena: string
): string | null {
  const numeroDocumento = usuario.trim();

  if (!numeroDocumento) {
    return 'Ingresa tu número de documento';
  }

  if (!DOC_REGEX[tipoDocumento].test(numeroDocumento)) {
    return `Formato incorrecto para ${tipoDocumento}`;
  }

  if (!contrasena) {
    return 'Ingresa tu contraseña';
  }

  if (
    contrasena.length > 128 ||
    CONTROL_CHARS_REGEX.test(contrasena)
  ) {
    return 'La contraseña contiene caracteres no permitidos';
  }

  return null;
}


export function LoginForm() {
  const [tipoDocumento, setTipoDocumento] = useState<TipoDocumento>('DNI'); const [password, setPassword] = useState('');
  const [usuario, setUsuario] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [challenge, setChallenge] = useState<MfaChallenge | null>(null);
  const [signedIn, setSignedIn] = useState(false);
  const [cambioObligatorio, setCambioObligatorio] = useState(false);
  const usuarioRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  const placeholderDocumento = tipoDocumento === 'DNI'
    ? 'Ingresa tu DNI (8 digitos)'
    : tipoDocumento === 'RUC'
      ? 'Ingresa tu RUC (11 digitos)'
      : tipoDocumento === 'CE'
        ? 'Ingresa tu CE'
        : 'Ingresa tu numero de pasaporte';

  function handleTipoDocumentoChange(tipo: TipoDocumento) {
    setTipoDocumento(tipo);
    setUsuario('');
    setError(null);
    usuarioRef.current?.focus();
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (loading || signedIn) return;
    setError(null);
    const validation = validarFormularioPortal(tipoDocumento, usuario, password);
    if (validation) {
      setError(validation);
      usuarioRef.current?.focus();
      return;
    }
    await solicitarReto();
  }

  async function solicitarReto() {
    setLoading(true);
    try {
      const data = await authApi.post<MfaChallenge>('/login', {
        usuario: usuario.trim(), tipoDocumento, contrasena: password, portal: 'CLIENTE'
      });
      setChallenge(requireMfaChallenge(data));
      setPassword('');
    } catch (problem) {
      setError(problem instanceof ApiError ? resolverMensajeErrorLogin(problem)
        : 'No pudimos conectar con el servicio de autenticación. Inténtalo nuevamente.');
      usuarioRef.current?.focus();
    } finally {
      setLoading(false);
    }
  }

  async function finalizarSesion(data: MfaLoginSession) {
    if (!data.autoridades.includes('ROLE_CLIENTE')) {
      await authApi.post<void>('/logout', { refreshToken: data.refreshToken });
      throw new ApiError(403, 'Este usuario no tiene acceso al Portal Cliente.');
    }
    const storage = remember ? localStorage : sessionStorage;
    const otherStorage = remember ? sessionStorage : localStorage;
    for (const key of ['monolithe_access_token', 'monolithe_refresh_token', 'monolithe_user']) otherStorage.removeItem(key);
    const { accessToken, refreshToken, ...user } = data;
    storage.setItem('monolithe_access_token', accessToken);
    storage.setItem('monolithe_refresh_token', refreshToken);
    storage.setItem('monolithe_user', JSON.stringify(user));
    setChallenge(null);
    setCambioObligatorio(data.requiereCambioPassword);
    setSignedIn(true);
    window.setTimeout(() => {
      navigate(data.requiereCambioPassword ? '/cambiar-contrasena' : '/portal', { replace: true });
    }, 350);
  }

  function reiniciarLogin(message?: string) {
    setChallenge(null);
    setError(message ?? null);
  }

  if (challenge) return <MfaLoginForm challenge={challenge} onSuccess={finalizarSesion} onRestart={reiniciarLogin} />;

  return (
    <form onSubmit={handleSubmit} noValidate className="mt-8 space-y-5">
      <div aria-live="polite" className={error || signedIn ? 'block' : 'sr-only'}>
        {error ? (
          <div role="alert" className="flex gap-3 rounded-field border border-danger-200 bg-danger-50 px-3.5 py-3">
            <AlertCircleIcon className="mt-0.5 h-[18px] w-[18px] shrink-0 text-danger-500" aria-hidden="true" />
            <div>
              <p className="text-[13px] font-semibold text-danger-700">No pudimos iniciar tu sesion</p>
              <p className="mt-0.5 text-[13px] leading-relaxed text-danger-700/85">{error}</p>
            </div>
          </div>
        ) : null}

        {signedIn ? (
          <div role="status" className="flex gap-3 rounded-field border border-slateux-200 bg-slateux-50 px-3.5 py-3">
            <ShieldCheckIcon className="mt-0.5 h-[18px] w-[18px] shrink-0 text-brass-500" aria-hidden="true" />
            <p className="text-[13px] leading-relaxed text-ink-700">{cambioObligatorio
              ? 'Sesión verificada. Debes cambiar tu contraseña temporal antes de acceder al portal.'
              : 'Sesión verificada. Serás redirigido a tu panel.'}</p>
          </div>
        ) : null}
      </div>


      {/* Tipo y número de documento */}
      <div className="flex items-end gap-2">

        {/* Selector de tipo de documento */}
        <div className="w-28 shrink-0">
          <label
            htmlFor="tipo-documento"
            className="mb-1.5 block text-[13px] font-medium text-ink-700"
          >
            Tipo
          </label>

          <select
            id="tipo-documento"
            value={tipoDocumento}
            onChange={(e) =>
              handleTipoDocumentoChange(
                e.target.value as TipoDocumento
              )
            }
            disabled={loading}
            className="w-full rounded-field border border-slateux-200 bg-white px-3 py-2.5 text-[13px] font-medium text-ink-700"
          >
            {TIPOS_DOCUMENTO.map(({ value, label }) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>

        {/* Número de documento */}
        <div className="min-w-0 flex-1">
          <TextField
            ref={usuarioRef}
            id="usuario"
            label="Número de documento"
            type="text"
            icon={UserIcon}
            autoComplete="username"
            placeholder={placeholderDocumento}
            value={usuario}
            maxLength={
              tipoDocumento === 'DNI'
                ? 8
                : tipoDocumento === 'CE'
                  ? 12
                  : tipoDocumento === 'RUC'
                    ? 11
                    : 20
            }
            inputMode={
              tipoDocumento === 'DNI' || tipoDocumento === 'RUC'
                ? 'numeric'
                : 'text'
            }
            invalid={Boolean(error)}
            disabled={loading}
            onChange={(e) => setUsuario(e.target.value)}
          />
        </div>
      </div>

      <TextField
        id="password"
        label="Contrasena"
        type={showPassword ? 'text' : 'password'}
        icon={LockIcon}
        autoComplete="current-password"
        placeholder="••••••••••"
        value={password}
        maxLength={128}
        invalid={Boolean(error)}
        disabled={loading}
        onChange={(e) => setPassword(e.target.value)}
        labelAction={
          <Link
            to="/recuperar-contrasena"
            className="rounded text-[13px] font-medium text-ink-600 underline-offset-4 outline-none transition-colors hover:text-ink-800 hover:underline"
          >
            Olvidaste tu contrasena?
          </Link>
        }
        trailing={
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            aria-label={showPassword ? 'Ocultar contrasena' : 'Mostrar contrasena'}
            aria-pressed={showPassword}
            className="flex h-8 w-8 items-center justify-center rounded-md text-slateux-400 outline-none transition-colors hover:bg-slateux-100 hover:text-ink-700"
          >
            {showPassword ? <EyeOffIcon className="h-[18px] w-[18px]" /> : <EyeIcon className="h-[18px] w-[18px]" />}
          </button>
        }
      />

      <label className="group flex w-fit cursor-pointer select-none items-center gap-2.5 py-1">
        <span className="relative flex h-[18px] w-[18px] items-center justify-center">
          <input
            type="checkbox"
            checked={remember}
            onChange={(e) => setRemember(e.target.checked)}
            disabled={loading}
            className="peer h-[18px] w-[18px] cursor-pointer appearance-none rounded-[5px] border border-slateux-300 bg-white checked:border-ink-800 checked:bg-ink-800"
          />
          <CheckIcon className="pointer-events-none absolute h-3 w-3 stroke-[3] text-white opacity-0 peer-checked:opacity-100" aria-hidden="true" />
        </span>
        <span className="text-[13.5px] text-ink-700">Recordarme en este equipo</span>
      </label>

      <button
        type="submit"
        disabled={loading || signedIn}
        className="flex h-11 w-full items-center justify-center gap-2 rounded-field bg-ink-800 text-[14.5px] font-semibold text-white hover:bg-ink-700 disabled:cursor-not-allowed disabled:bg-ink-800/70"
      >
        {loading ? (
          <>
            <LoaderCircleIcon className="h-[18px] w-[18px] animate-spin" aria-hidden="true" />
            Verificando credenciales...
          </>
        ) : (
          'Iniciar sesion'
        )}
      </button>
    </form>
  );
}