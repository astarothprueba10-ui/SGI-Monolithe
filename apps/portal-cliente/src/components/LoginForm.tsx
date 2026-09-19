import React, { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertCircleIcon,
  CheckIcon,
  EyeIcon,
  EyeOffIcon,
  LoaderCircleIcon,
  LockIcon,
  MailIcon,
  ShieldCheckIcon } from
'lucide-react';
import { TextField } from './TextField';

const DEMO_EMAIL = 'admin@monolithe.pe';
const DEMO_PASSWORD = 'monolithe2026';

export function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [signedIn, setSignedIn] = useState(false);
  const emailRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (loading) return;

    setError(null);
    setLoading(true);

    await new Promise((resolve) => setTimeout(resolve, 1200));

    if (
    email.trim().toLowerCase() === DEMO_EMAIL &&
    password === DEMO_PASSWORD)
    {
      setSignedIn(true);
      setLoading(false);
      setTimeout(() => navigate('/portal'), 600);
      return;
    }

    setLoading(false);
    setError(
      'Las credenciales ingresadas no son correctas. Verifica tu correo y contraseña.'
    );
    emailRef.current?.focus();
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="mt-8 space-y-5">
      <div
        aria-live="polite"
        className={error || signedIn ? 'block' : 'sr-only'}>
        
        {error ?
        <div
          role="alert"
          className="flex gap-3 rounded-field border border-danger-200 bg-danger-50 px-3.5 py-3">
          
            <AlertCircleIcon
            className="mt-0.5 h-[18px] w-[18px] shrink-0 text-danger-500"
            aria-hidden="true" />
          
            <div>
              <p className="text-[13px] font-semibold text-danger-700">
                No pudimos iniciar tu sesión
              </p>
              <p className="mt-0.5 text-[13px] leading-relaxed text-danger-700/85">
                {error}
              </p>
            </div>
          </div> :
        null}
        {signedIn ?
        <div
          role="status"
          className="flex gap-3 rounded-field border border-slateux-200 bg-slateux-50 px-3.5 py-3">
          
            <ShieldCheckIcon
            className="mt-0.5 h-[18px] w-[18px] shrink-0 text-brass-500"
            aria-hidden="true" />
          
            <p className="text-[13px] leading-relaxed text-ink-700">
              Sesión verificada. Serás redirigido a tu panel de trabajo.
            </p>
          </div> :
        null}
      </div>

      <TextField
        ref={emailRef}
        id="email"
        label="Correo electrónico"
        type="email"
        icon={MailIcon}
        autoComplete="email"
        placeholder="nombre@monolithe.pe"
        value={email}
        invalid={Boolean(error)}
        disabled={loading}
        onChange={(e) => setEmail(e.target.value)} />
      

      <TextField
        id="password"
        label="Contraseña"
        type={showPassword ? 'text' : 'password'}
        icon={LockIcon}
        autoComplete="current-password"
        placeholder="••••••••••"
        value={password}
        invalid={Boolean(error)}
        disabled={loading}
        onChange={(e) => setPassword(e.target.value)}
        labelAction={
        <a
          href="#recuperar"
          className="rounded text-[13px] font-medium text-ink-600 underline-offset-4 outline-none transition-colors duration-150 ease-out hover:text-ink-800 hover:underline focus-visible:ring-2 focus-visible:ring-ink-700/25">
          
            ¿Olvidaste tu contraseña?
          </a>
        }
        trailing={
        <button
          type="button"
          onClick={() => setShowPassword((v) => !v)}
          aria-label={
          showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'
          }
          aria-pressed={showPassword}
          className="flex h-8 w-8 items-center justify-center rounded-md text-slateux-400 outline-none transition-colors duration-150 ease-out hover:bg-slateux-100 hover:text-ink-700 focus-visible:ring-2 focus-visible:ring-ink-700/25">
          
            {showPassword ?
          <EyeOffIcon className="h-[18px] w-[18px]" aria-hidden="true" /> :

          <EyeIcon className="h-[18px] w-[18px]" aria-hidden="true" />
          }
          </button>
        } />
      

      <label className="group flex w-fit cursor-pointer select-none items-center gap-2.5 py-1">
        <span className="relative flex h-[18px] w-[18px] items-center justify-center">
          <input
            type="checkbox"
            checked={remember}
            onChange={(e) => setRemember(e.target.checked)}
            disabled={loading}
            className="peer h-[18px] w-[18px] cursor-pointer appearance-none rounded-[5px] border border-slateux-300 bg-white outline-none transition-colors duration-150 ease-out checked:border-ink-800 checked:bg-ink-800 focus-visible:ring-4 focus-visible:ring-ink-700/15 group-hover:border-slateux-400 group-hover:checked:border-ink-800" />
          
          <CheckIcon
            className="pointer-events-none absolute h-3 w-3 stroke-[3] text-white opacity-0 transition-opacity duration-150 ease-out peer-checked:opacity-100"
            aria-hidden="true" />
          
        </span>
        <span className="text-[13.5px] text-ink-700">Recordarme en este equipo</span>
      </label>

      <button
        type="submit"
        disabled={loading}
        className="flex h-11 w-full items-center justify-center gap-2 rounded-field bg-ink-800 text-[14.5px] font-semibold text-white outline-none transition-[background-color,transform] duration-150 ease-out hover:bg-ink-700 focus-visible:ring-4 focus-visible:ring-ink-700/25 active:translate-y-px disabled:cursor-not-allowed disabled:bg-ink-800/70 disabled:active:translate-y-0">
        
        {loading ?
        <>
            <LoaderCircleIcon
            className="h-[18px] w-[18px] animate-spin"
            aria-hidden="true" />
          
            Verificando credenciales…
          </> :

        'Iniciar sesión'
        }
      </button>

      <p className="border-t border-slateux-200 pt-5 text-[13px] leading-relaxed text-slateux-500">
        ¿Eres cliente comprador y aún no tienes acceso?{' '}
        <a
          href="#soporte"
          className="rounded font-medium text-ink-700 underline-offset-4 outline-none transition-colors duration-150 ease-out hover:underline focus-visible:ring-2 focus-visible:ring-ink-700/25">
          
          Solicítalo a tu asesor
        </a>
      </p>
    </form>);

}