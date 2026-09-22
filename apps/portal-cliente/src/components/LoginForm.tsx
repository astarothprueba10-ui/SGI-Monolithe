import React, { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
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

type LoginResponse = {
  idUsuario: number;
  usuario: string;
  autoridades: string[];
  requiereCambioPassword: boolean;
  accessToken: string;
  refreshToken: string;
};

const AUTH_API_URL =
  import.meta.env.VITE_AUTH_API_URL || 'http://localhost:8081/api/auth';

export function LoginForm() {
  const [usuario, setUsuario] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [signedIn, setSignedIn] = useState(false);
  const usuarioRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (loading) return;

    setError(null);
    setLoading(true);

    try {
      const response = await fetch(`${AUTH_API_URL}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          usuario: usuario.trim(),
          contrasena: password
        })
      });

      if (!response.ok) {
        throw new Error('Las credenciales ingresadas no son correctas.');
      }

      const data = (await response.json()) as LoginResponse;
      const storage = remember ? localStorage : sessionStorage;

      storage.setItem('monolithe_access_token', data.accessToken);
      storage.setItem('monolithe_refresh_token', data.refreshToken);
      storage.setItem(
        'monolithe_user',
        JSON.stringify({
          idUsuario: data.idUsuario,
          usuario: data.usuario,
          autoridades: data.autoridades,
          requiereCambioPassword: data.requiereCambioPassword
        })
      );

      setSignedIn(true);
      setTimeout(() => navigate('/portal'), 350);
    } catch {
      setError('No pudimos iniciar tu sesión. Verifica tu usuario y contraseña.');
      usuarioRef.current?.focus();
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="mt-8 space-y-5">
      <div aria-live="polite" className={error || signedIn ? 'block' : 'sr-only'}>
        {error ? (
          <div role="alert" className="flex gap-3 rounded-field border border-danger-200 bg-danger-50 px-3.5 py-3">
            <AlertCircleIcon className="mt-0.5 h-[18px] w-[18px] shrink-0 text-danger-500" aria-hidden="true" />
            <div>
              <p className="text-[13px] font-semibold text-danger-700">No pudimos iniciar tu sesión</p>
              <p className="mt-0.5 text-[13px] leading-relaxed text-danger-700/85">{error}</p>
            </div>
          </div>
        ) : null}

        {signedIn ? (
          <div role="status" className="flex gap-3 rounded-field border border-slateux-200 bg-slateux-50 px-3.5 py-3">
            <ShieldCheckIcon className="mt-0.5 h-[18px] w-[18px] shrink-0 text-brass-500" aria-hidden="true" />
            <p className="text-[13px] leading-relaxed text-ink-700">Sesión verificada. Serás redirigido a tu panel.</p>
          </div>
        ) : null}
      </div>

      <TextField
        ref={usuarioRef}
        id="usuario"
        label="DNI o usuario"
        type="text"
        icon={UserIcon}
        autoComplete="username"
        placeholder="Ingresa tu DNI o usuario"
        value={usuario}
        invalid={Boolean(error)}
        disabled={loading}
        onChange={(e) => setUsuario(e.target.value)}
      />

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
          <a href="#recuperar" className="rounded text-[13px] font-medium text-ink-600 underline-offset-4 outline-none transition-colors hover:text-ink-800 hover:underline">
            ¿Olvidaste tu contraseña?
          </a>
        }
        trailing={
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
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
        disabled={loading}
        className="flex h-11 w-full items-center justify-center gap-2 rounded-field bg-ink-800 text-[14.5px] font-semibold text-white hover:bg-ink-700 disabled:cursor-not-allowed disabled:bg-ink-800/70"
      >
        {loading ? (
          <>
            <LoaderCircleIcon className="h-[18px] w-[18px] animate-spin" aria-hidden="true" />
            Verificando credenciales…
          </>
        ) : (
          'Iniciar sesión'
        )}
      </button>
    </form>
  );
}
