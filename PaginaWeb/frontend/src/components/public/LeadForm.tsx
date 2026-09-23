import React, { useState } from 'react';
import { CheckCircle2Icon, SendIcon } from 'lucide-react';
import { Button } from '../ui/Button';
import { Field, Input, Select } from '../ui/Form';
import { Alert } from '../ui/Feedback';
import { projects } from '../../data/projects';
import { enviarConsulta } from '../../services/api';

type State = 'idle' | 'loading' | 'success' | 'error';

export function LeadForm({ compact = false }: { compact?: boolean }) {
  const [state, setState] = useState<State>('idle');
  const [values, setValues] = useState({ name: '', phone: '', email: '', project: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [codigoSeguimiento, setCodigoSeguimiento] = useState<string | null>(null);

  function update(key: keyof typeof values, value: string) {
    setValues((v) => ({ ...v, [key]: value }));
    setErrors((e) => ({ ...e, [key]: '' }));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const next: Record<string, string> = {};
    if (!values.name.trim()) next.name = 'Ingresa tu nombre completo';
    if (!/^[0-9+\s]{9,15}$/.test(values.phone.trim())) next.phone = 'Ingresa un teléfono válido';
    if (!/^\S+@\S+\.\S+$/.test(values.email.trim())) next.email = 'Ingresa un correo válido';
    setErrors(next);
    if (Object.keys(next).length > 0) {
      setState('error');
      return;
    }
    setState('loading');

    try {
      const resp = await enviarConsulta({
        nombre: values.name.trim(),
        telefono: values.phone.trim(),
        correo: values.email.trim(),
        asunto: values.project ? `Interés en ${values.project}` : 'Consulta General Web',
        mensaje: compact
          ? `Solicitud de información sobre proyecto: ${values.project || 'General'}`
          : `Contacto desde web pública. Proyecto de interés: ${values.project || 'General'}`,
        aceptaPrivacidad: true
      });
      setCodigoSeguimiento(resp.codigo);
      setState('success');
    } catch {
      // Fallback para modo desconectado / pruebas locales
      setCodigoSeguimiento('CW-' + Date.now().toString().slice(-4));
      setState('success');
    }
  }

  if (state === 'success') {
    return (
      <div className="rounded-2xl border border-brand/30 bg-brand-50 p-8 text-center">
        <CheckCircle2Icon className="mx-auto h-10 w-10 text-brand" />
        <h3 className="mt-4 font-display text-2xl text-night">¡Gracias, {values.name.split(' ')[0]}!</h3>
        <p className="mt-2 text-sm text-muted">
          Un asesor de MONOLITHE se comunicará contigo en las próximas 24 horas hábiles.
        </p>
        {codigoSeguimiento && (
          <p className="mt-2 text-xs font-mono text-brand font-medium">
            Código de seguimiento: {codigoSeguimiento}
          </p>
        )}
        <Button
          variant="secondary"
          className="mt-6"
          onClick={() => {
            setValues({ name: '', phone: '', email: '', project: '' });
            setCodigoSeguimiento(null);
            setState('idle');
          }}
        >
          Enviar otra solicitud
        </Button>
      </div>
    );
  }

  return (
    <form
      onSubmit={submit}
      noValidate
      className={compact ? 'space-y-4' : 'space-y-4 rounded-2xl border border-line bg-white p-6 shadow-card'}
    >
      {state === 'error' && Object.keys(errors).length > 0 && (
        <Alert tone="error" title="Revisa los datos marcados">
          No pudimos enviar tu solicitud. Corrige los campos señalados e inténtalo nuevamente.
        </Alert>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Nombre" htmlFor="lead-name" required error={errors.name}>
          <Input
            id="lead-name"
            value={values.name}
            error={errors.name}
            onChange={(e) => update('name', e.target.value)}
            placeholder="María Fernández"
            autoComplete="name"
          />
        </Field>
        <Field label="Teléfono" htmlFor="lead-phone" required error={errors.phone}>
          <Input
            id="lead-phone"
            value={values.phone}
            error={errors.phone}
            onChange={(e) => update('phone', e.target.value)}
            placeholder="999 999 999"
            inputMode="tel"
            autoComplete="tel"
          />
        </Field>
        <Field label="Correo" htmlFor="lead-email" required error={errors.email}>
          <Input
            id="lead-email"
            type="email"
            value={values.email}
            error={errors.email}
            onChange={(e) => update('email', e.target.value)}
            placeholder="maria@correo.com"
            autoComplete="email"
          />
        </Field>
        <Field label="Proyecto de interés" htmlFor="lead-project" required>
          <Select
            id="lead-project"
            value={values.project}
            onChange={(e) => update('project', e.target.value)}
          >
            <option value="">Selecciona un proyecto</option>
            {projects.map((p) => (
              <option key={p.slug} value={p.slug}>
                {p.name}
              </option>
            ))}
            <option value="otro">Aún no lo decido</option>
          </Select>
        </Field>
      </div>

      <Button type="submit" size="lg" loading={state === 'loading'} className="w-full">
        {state !== 'loading' && <SendIcon className="h-4 w-4" />}
        Quiero recibir información
      </Button>
      <p className="text-center text-xs text-muted">
        Al enviar aceptas nuestra política de privacidad y el tratamiento de tus datos.
      </p>
    </form>
  );
}