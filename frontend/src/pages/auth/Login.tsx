import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { CheckCircle2Icon, EyeIcon, EyeOffIcon, LockIcon } from 'lucide-react';
import { AuthLayout } from '../../components/auth/AuthLayout';
import { Button } from '../../components/ui/Button';
import { Checkbox, Field, Input } from '../../components/ui/Form';
import { Alert } from '../../components/ui/Feedback';

type Status = 'idle' | 'loading' | 'invalid' | 'blocked' | 'success';

export function Login() {
  const navigate = useNavigate();
  const [user, setUser] = useState('');
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const [remember, setRemember] = useState(true);
  const [status, setStatus] = useState<Status>('idle');

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setStatus('loading');
    window.setTimeout(() => {
      const value = user.trim().toLowerCase();
      if (value === 'bloqueado') {
        setStatus('blocked');
        return;
      }
      if (!value || password.length < 4) {
        setStatus('invalid');
        return;
      }
      setStatus('success');
      const role = value.includes('admin') || value.includes('marketing') ? 'admin' : 'cliente';
      window.setTimeout(() => navigate(`/mi-cuenta/bienvenida?rol=${role}&usuario=${value}`), 900);
    }, 1000);
  }

  return (
    <AuthLayout
      title="Bienvenido a Mi Cuenta"
      subtitle="Consulta la información de tu propiedad y gestiona tus operaciones con MONOLITHE."
      footer={
      <p className="text-center text-sm text-muted">
          ¿Aún no tienes acceso?{' '}
          <Link to="/contacto" className="font-semibold text-night hover:text-brand">
            Solicítalo a tu asesor
          </Link>
        </p>
      }>
      
      {status === 'invalid' &&
      <Alert tone="error" className="mb-6" title="Credenciales incorrectas">
          El usuario o la contraseña no coinciden. Te quedan 2 intentos antes del bloqueo temporal.
        </Alert>
      }
      {status === 'blocked' &&
      <Alert tone="warning" className="mb-6" title="Usuario bloqueado temporalmente">
          Por seguridad bloqueamos el acceso durante 30 minutos. Puedes restablecer tu contraseña o
          comunicarte con tu asesor.
        </Alert>
      }
      {status === 'success' &&
      <Alert tone="success" className="mb-6" title="Acceso verificado">
          Ingresando a tu cuenta…
        </Alert>
      }

      <form onSubmit={submit} className="space-y-5" noValidate>
        <Field label="Usuario o DNI" htmlFor="usuario" required>
          <Input
            id="usuario"
            value={user}
            onChange={(e) => setUser(e.target.value)}
            placeholder="72458123"
            autoComplete="username"
            error={status === 'invalid' ? ' ' : undefined} />
          
        </Field>

        <Field label="Contraseña" htmlFor="password" required>
          <div className="relative">
            <Input
              id="password"
              type={show ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              autoComplete="current-password"
              className="pr-11"
              error={status === 'invalid' ? ' ' : undefined} />
            
            <button
              type="button"
              onClick={() => setShow((v) => !v)}
              aria-label={show ? 'Ocultar contraseña' : 'Mostrar contraseña'}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-2 text-muted transition-colors duration-150 ease-out hover:text-night">
              
              {show ? <EyeOffIcon className="h-4 w-4" /> : <EyeIcon className="h-4 w-4" />}
            </button>
          </div>
        </Field>

        <div className="flex items-center justify-between gap-4">
          <Checkbox
            id="recordarme"
            checked={remember}
            onChange={(e) => setRemember(e.target.checked)}
            label="Recordarme" />
          
          <Link
            to="/mi-cuenta/recuperar"
            className="text-sm font-semibold text-night transition-colors duration-150 ease-out hover:text-brand">
            
            ¿Olvidaste tu contraseña?
          </Link>
        </div>

        <Button
          type="submit"
          size="lg"
          className="w-full"
          loading={status === 'loading'}
          disabled={status === 'success'}>
          
          {status === 'success' ?
          <>
              <CheckCircle2Icon className="h-4 w-4" />
              Ingresando
            </> :

          <>
              <LockIcon className="h-4 w-4" />
              Iniciar sesión
            </>
          }
        </Button>

        <p className="rounded-lg bg-bone px-4 py-3 text-xs leading-relaxed text-muted">
          Demo: usa <span className="font-semibold text-night">admin</span> para el perfil
          administrativo, cualquier otro usuario para el perfil cliente y{' '}
          <span className="font-semibold text-night">bloqueado</span> para ver el estado de bloqueo.
        </p>
      </form>
    </AuthLayout>);

}