import React, { useState } from 'react';
import { CheckCircle2Icon, CheckIcon, EyeIcon, EyeOffIcon, XIcon } from 'lucide-react';
import { AuthLayout } from '../../components/auth/AuthLayout';
import { Button, LinkButton } from '../../components/ui/Button';
import { Field, Input } from '../../components/ui/Form';
import { cn } from '../../utils/cn';

const rules = [
{ id: 'len', label: 'Mínimo 8 caracteres', test: (v: string) => v.length >= 8 },
{ id: 'upper', label: 'Una letra mayúscula', test: (v: string) => /[A-Z]/.test(v) },
{ id: 'num', label: 'Un número', test: (v: string) => /\d/.test(v) },
{ id: 'sym', label: 'Un carácter especial', test: (v: string) => /[^A-Za-z0-9]/.test(v) }];


export function ResetPassword() {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [show, setShow] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const passed = rules.filter((r) => r.test(password)).length;
  const allValid = passed === rules.length;

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!allValid) {
      setError('La contraseña no cumple todos los requisitos');
      return;
    }
    if (password !== confirm) {
      setError('Las contraseñas no coinciden');
      return;
    }
    setError('');
    setLoading(true);
    window.setTimeout(() => {
      setLoading(false);
      setDone(true);
    }, 1000);
  }

  if (done) {
    return (
      <AuthLayout
        title="Contraseña actualizada"
        subtitle="Tu contraseña se actualizó correctamente. Ya puedes ingresar a Mi Cuenta con tus nuevas credenciales.">
        
        <div className="rounded-2xl border border-brand/30 bg-brand-50 p-8 text-center">
          <CheckCircle2Icon className="mx-auto h-12 w-12 text-brand" strokeWidth={1.4} />
          <p className="mt-4 text-sm text-brand-700">
            Por seguridad cerramos todas las sesiones abiertas en otros dispositivos.
          </p>
        </div>
        <LinkButton to="/mi-cuenta" size="lg" className="mt-6 w-full">
          Iniciar sesión
        </LinkButton>
      </AuthLayout>);

  }

  return (
    <AuthLayout
      title="Nueva contraseña"
      subtitle="Crea una contraseña segura para proteger la información de tu propiedad.">
      
      <form onSubmit={submit} className="space-y-5" noValidate>
        <Field label="Nueva contraseña" htmlFor="nueva" required>
          <div className="relative">
            <Input
              id="nueva"
              type={show ? 'text' : 'password'}
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setError('');
              }}
              className="pr-11"
              autoComplete="new-password" />
            
            <button
              type="button"
              onClick={() => setShow((v) => !v)}
              aria-label={show ? 'Ocultar contraseña' : 'Mostrar contraseña'}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-2 text-muted transition-colors duration-150 ease-out hover:text-night">
              
              {show ? <EyeOffIcon className="h-4 w-4" /> : <EyeIcon className="h-4 w-4" />}
            </button>
          </div>
        </Field>

        <div className="rounded-xl border border-line bg-bone/60 p-4">
          <div className="mb-3 flex items-center gap-2">
            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-line">
              <div
                className={cn(
                  'h-full rounded-full transition-[width,background-color] duration-200 ease-out',
                  passed <= 1 && 'bg-red-500',
                  passed === 2 && 'bg-gold',
                  passed === 3 && 'bg-gold-600',
                  passed === 4 && 'bg-brand'
                )}
                style={{ width: `${passed / rules.length * 100}%` }} />
              
            </div>
            <span className="text-xs font-semibold text-muted">
              {passed <= 1 ? 'Débil' : passed === 2 ? 'Regular' : passed === 3 ? 'Buena' : 'Segura'}
            </span>
          </div>
          <ul className="grid gap-2 sm:grid-cols-2">
            {rules.map((r) => {
              const ok = r.test(password);
              return (
                <li
                  key={r.id}
                  className={cn('flex items-center gap-2 text-[13px]', ok ? 'text-brand-700' : 'text-muted')}>
                  
                  {ok ? <CheckIcon className="h-3.5 w-3.5" /> : <XIcon className="h-3.5 w-3.5 opacity-50" />}
                  {r.label}
                </li>);

            })}
          </ul>
        </div>

        <Field label="Confirmar contraseña" htmlFor="confirmar" required error={error}>
          <Input
            id="confirmar"
            type={show ? 'text' : 'password'}
            value={confirm}
            error={error}
            onChange={(e) => {
              setConfirm(e.target.value);
              setError('');
            }}
            autoComplete="new-password" />
          
        </Field>

        <Button type="submit" size="lg" className="w-full" loading={loading}>
          Guardar nueva contraseña
        </Button>
      </form>
    </AuthLayout>);

}