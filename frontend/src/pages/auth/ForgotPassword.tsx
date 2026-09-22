import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeftIcon, MailCheckIcon } from 'lucide-react';
import { AuthLayout } from '../../components/auth/AuthLayout';
import { Button, LinkButton } from '../../components/ui/Button';
import { Field, Input } from '../../components/ui/Form';

export function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) {
      setError('Ingresa un correo electrónico válido');
      return;
    }
    setError('');
    setLoading(true);
    window.setTimeout(() => {
      setLoading(false);
      setSent(true);
    }, 1000);
  }

  if (sent) {
    return (
      <AuthLayout
        title="Revisa tu correo"
        subtitle={`Enviamos las instrucciones para restablecer tu contraseña a ${email}.`}>
        
        <div className="rounded-2xl border border-brand/30 bg-brand-50 p-6 text-center">
          <MailCheckIcon className="mx-auto h-10 w-10 text-brand" strokeWidth={1.5} />
          <p className="mt-4 text-sm leading-relaxed text-brand-700">
            El enlace es válido por 30 minutos. Si no lo encuentras, revisa tu carpeta de spam o
            correo no deseado.
          </p>
        </div>

        <div className="mt-6 space-y-3">
          <LinkButton to="/mi-cuenta/nueva-contrasena" size="lg" className="w-full">
            Ya tengo el enlace, continuar
          </LinkButton>
          <Button variant="secondary" className="w-full" onClick={() => setSent(false)}>
            Reenviar instrucciones
          </Button>
        </div>

        <Link
          to="/mi-cuenta"
          className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-night hover:text-brand">
          
          <ArrowLeftIcon className="h-4 w-4" />
          Volver a iniciar sesión
        </Link>
      </AuthLayout>);

  }

  return (
    <AuthLayout
      title="Recuperar contraseña"
      subtitle="Ingresa el correo registrado en MONOLITHE y te enviaremos las instrucciones para crear una nueva contraseña.">
      
      <form onSubmit={submit} className="space-y-5" noValidate>
        <Field label="Correo electrónico" htmlFor="correo" required error={error}>
          <Input
            id="correo"
            type="email"
            value={email}
            error={error}
            onChange={(e) => {
              setEmail(e.target.value);
              setError('');
            }}
            placeholder="tucorreo@dominio.com"
            autoComplete="email" />
          
        </Field>

        <Button type="submit" size="lg" className="w-full" loading={loading}>
          Enviar instrucciones
        </Button>

        <Link
          to="/mi-cuenta"
          className="inline-flex items-center gap-2 text-sm font-semibold text-night hover:text-brand">
          
          <ArrowLeftIcon className="h-4 w-4" />
          Volver a iniciar sesión
        </Link>
      </form>
    </AuthLayout>);

}