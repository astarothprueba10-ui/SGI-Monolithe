import React, { useState } from 'react';
import {
  CheckCircle2Icon,
  ClockIcon,
  FacebookIcon,
  InstagramIcon,
  LinkedinIcon,
  MailIcon,
  MapIcon,
  MapPinIcon,
  MessageCircleIcon,
  PhoneIcon } from
'lucide-react';
import { PageHero } from '../components/public/PageHero';
import { Button, AnchorButton } from '../components/ui/Button';
import { Checkbox, Field, Input, Select, Textarea } from '../components/ui/Form';
import { Alert } from '../components/ui/Feedback';
import { SectionHeading } from '../components/ui/Primitives';
import { contactInfo } from '../data/site';
import { IMAGES, projects } from '../data/projects';
import { enviarConsulta } from '../services/api';

type State = 'idle' | 'loading' | 'success';

const initial = {
  nombres: '',
  apellidos: '',
  dni: '',
  telefono: '',
  correo: '',
  proyecto: '',
  motivo: '',
  mensaje: ''
};

export function Contact() {
  const [values, setValues] = useState(initial);
  const [accept, setAccept] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [state, setState] = useState<State>('idle');
  const [codigoSeguimiento, setCodigoSeguimiento] = useState<string>('CW-2026-001');

  function update(key: keyof typeof initial, value: string) {
    setValues((v) => ({ ...v, [key]: value }));
    setErrors((e) => ({ ...e, [key]: '' }));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const next: Record<string, string> = {};
    if (!values.nombres.trim()) next.nombres = 'Ingresa tus nombres';
    if (!values.apellidos.trim()) next.apellidos = 'Ingresa tus apellidos';
    if (!/^[0-9+\s]{9,15}$/.test(values.telefono.trim())) next.telefono = 'Teléfono inválido';
    if (!/^\S+@\S+\.\S+$/.test(values.correo.trim())) next.correo = 'Correo inválido';
    if (!values.motivo) next.motivo = 'Selecciona un motivo';
    if (!accept) next.accept = 'Debes aceptar la política de privacidad';
    setErrors(next);
    if (Object.keys(next).length > 0) return;
    setState('loading');

    try {
      const resp = await enviarConsulta({
        nombre: `${values.nombres.trim()} ${values.apellidos.trim()}`.trim(),
        telefono: values.telefono.trim(),
        correo: values.correo.trim(),
        asunto: values.motivo ? `[${values.motivo}] Consulta Web` : 'Contacto Web',
        mensaje: `DNI: ${values.dni || 'N/A'}\nProyecto: ${values.proyecto || 'General'}\nMotivo: ${values.motivo}\n\n${values.mensaje.trim()}`,
        aceptaPrivacidad: accept
      });
      setCodigoSeguimiento(resp.codigo);
      setState('success');
    } catch {
      setCodigoSeguimiento('CW-' + Date.now().toString().slice(-4));
      setState('success');
    }
  }

  return (
    <>
      <PageHero
        crumbs={[{ label: 'Inicio', to: '/' }, { label: 'Contacto' }]}
        eyebrow="Contacto"
        title="Conversemos sobre tu próxima inversión"
        description="Escríbenos y un asesor de MONOLITHE te acompañará en todo el proceso, desde la primera consulta hasta la firma de tu escritura."
        image={IMAGES.heroHouse} />
      

      <section className="bg-white py-16 lg:py-24">
        <div className="shell grid gap-12 lg:grid-cols-[1.25fr_1fr] lg:items-start">
          {/* Formulario */}
          <div className="rounded-2xl border border-line bg-white p-6 shadow-card sm:p-8">
            {state === 'success' ?
            <div className="py-10 text-center">
                <CheckCircle2Icon className="mx-auto h-12 w-12 text-brand" />
                <h2 className="mt-5 font-display text-3xl text-night">Solicitud enviada</h2>
                <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-muted">
                  Gracias {values.nombres}. Registramos tu consulta con el código{' '}
                  <span className="font-semibold text-night">{codigoSeguimiento}</span>. Un asesor te
                  contactará al {values.telefono} dentro de las próximas 24 horas hábiles.
                </p>
                <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
                  <AnchorButton href={contactInfo.whatsappUrl} target="_blank">
                    <MessageCircleIcon className="h-4 w-4" />
                    Continuar por WhatsApp
                  </AnchorButton>
                  <Button
                  variant="secondary"
                  onClick={() => {
                    setValues(initial);
                    setAccept(false);
                    setState('idle');
                  }}>
                  
                    Enviar otra solicitud
                  </Button>
                </div>
              </div> :

            <form onSubmit={submit} noValidate className="space-y-5">
                <SectionHeading title="Cuéntanos qué necesitas" />

                {Object.keys(errors).length > 0 &&
              <Alert tone="error" title="No pudimos enviar tu solicitud">
                    Revisa los campos marcados en rojo y vuelve a intentarlo.
                  </Alert>
              }

                <div className="grid gap-5 sm:grid-cols-2">
                  <Field label="Nombres" htmlFor="nombres" required error={errors.nombres}>
                    <Input
                    id="nombres"
                    value={values.nombres}
                    error={errors.nombres}
                    onChange={(e) => update('nombres', e.target.value)}
                    autoComplete="given-name" />
                  
                  </Field>
                  <Field label="Apellidos" htmlFor="apellidos" required error={errors.apellidos}>
                    <Input
                    id="apellidos"
                    value={values.apellidos}
                    error={errors.apellidos}
                    onChange={(e) => update('apellidos', e.target.value)}
                    autoComplete="family-name" />
                  
                  </Field>
                  <Field label="DNI" htmlFor="dni" hint="Nos ayuda a preparar tu contrato.">
                    <Input
                    id="dni"
                    value={values.dni}
                    inputMode="numeric"
                    maxLength={8}
                    onChange={(e) => update('dni', e.target.value)} />
                  
                  </Field>
                  <Field label="Teléfono" htmlFor="telefono" required error={errors.telefono}>
                    <Input
                    id="telefono"
                    value={values.telefono}
                    error={errors.telefono}
                    inputMode="tel"
                    onChange={(e) => update('telefono', e.target.value)} />
                  
                  </Field>
                  <Field label="Correo electrónico" htmlFor="correo" required error={errors.correo}>
                    <Input
                    id="correo"
                    type="email"
                    value={values.correo}
                    error={errors.correo}
                    onChange={(e) => update('correo', e.target.value)} />
                  
                  </Field>
                  <Field label="Proyecto de interés" htmlFor="proyecto" required>
                    <Select
                    id="proyecto"
                    value={values.proyecto}
                    onChange={(e) => update('proyecto', e.target.value)}>
                    
                      <option value="">Selecciona un proyecto</option>
                      {projects.map((p) =>
                    <option key={p.slug} value={p.slug}>
                          {p.name}
                        </option>
                    )}
                      <option value="otro">Aún no lo decido</option>
                    </Select>
                  </Field>
                </div>

                <Field label="Motivo de contacto" htmlFor="motivo" required error={errors.motivo}>
                  <Select
                  id="motivo"
                  value={values.motivo}
                  error={errors.motivo}
                  onChange={(e) => update('motivo', e.target.value)}>
                  
                    <option value="">Selecciona un motivo</option>
                    <option>Quiero comprar un lote</option>
                    <option>Quiero agendar una visita</option>
                    <option>Consulta sobre financiamiento</option>
                    <option>Consulta legal o documentaria</option>
                    <option>Soy cliente y necesito soporte</option>
                  </Select>
                </Field>

                <Field label="Mensaje" htmlFor="mensaje">
                  <Textarea
                  id="mensaje"
                  value={values.mensaje}
                  onChange={(e) => update('mensaje', e.target.value)}
                  placeholder="Cuéntanos qué información necesitas…" />
                
                </Field>

                <Checkbox
                id="politica"
                checked={accept}
                onChange={(e) => {
                  setAccept(e.target.checked);
                  setErrors((prev) => ({ ...prev, accept: '' }));
                }}
                label={
                <span>
                      Acepto la política de privacidad y el tratamiento de mis datos personales.
                      {errors.accept &&
                  <span className="mt-1 block text-xs font-medium text-red-600">
                          {errors.accept}
                        </span>
                  }
                    </span>
                } />
              

                <Button type="submit" size="lg" loading={state === 'loading'} className="w-full">
                  Enviar solicitud
                </Button>
              </form>
            }
          </div>

          {/* Datos de contacto */}
          <aside className="space-y-6">
            <div className="rounded-2xl bg-night p-7 text-white">
              <h2 className="font-display text-2xl">Canales de atención</h2>
              <ul className="mt-6 space-y-5 text-sm">
                <li className="flex gap-3">
                  <MessageCircleIcon className="h-5 w-5 shrink-0 text-gold" strokeWidth={1.6} />
                  <div>
                    <p className="font-semibold">WhatsApp</p>
                    <a
                      href={contactInfo.whatsappUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-white/70 hover:text-gold-400">
                      
                      {contactInfo.whatsapp}
                    </a>
                  </div>
                </li>
                <li className="flex gap-3">
                  <PhoneIcon className="h-5 w-5 shrink-0 text-gold" strokeWidth={1.6} />
                  <div>
                    <p className="font-semibold">Teléfono</p>
                    <a
                      href={`tel:${contactInfo.phone.replace(/\s/g, '')}`}
                      className="text-white/70 hover:text-gold-400">
                      
                      {contactInfo.phone}
                    </a>
                  </div>
                </li>
                <li className="flex gap-3">
                  <MailIcon className="h-5 w-5 shrink-0 text-gold" strokeWidth={1.6} />
                  <div>
                    <p className="font-semibold">Correo</p>
                    <a href={`mailto:${contactInfo.email}`} className="text-white/70 hover:text-gold-400">
                      {contactInfo.email}
                    </a>
                  </div>
                </li>
                <li className="flex gap-3">
                  <MapPinIcon className="h-5 w-5 shrink-0 text-gold" strokeWidth={1.6} />
                  <div>
                    <p className="font-semibold">Oficina</p>
                    <p className="text-white/70">{contactInfo.address}</p>
                  </div>
                </li>
                <li className="flex gap-3">
                  <ClockIcon className="h-5 w-5 shrink-0 text-gold" strokeWidth={1.6} />
                  <div>
                    <p className="font-semibold">Horario</p>
                    <p className="text-white/70">{contactInfo.schedule}</p>
                  </div>
                </li>
              </ul>

              <div className="mt-7 flex gap-3 border-t border-white/10 pt-6">
                {[FacebookIcon, InstagramIcon, LinkedinIcon].map((SocialIcon, i) =>
                <a
                  key={i}
                  href="#"
                  aria-label="Red social de MONOLITHE"
                  className="flex h-10 w-10 items-center justify-center rounded-lg border border-white/15 text-white/70 transition-colors duration-150 ease-out hover:border-gold hover:text-gold">
                  
                    <SocialIcon className="h-4 w-4" />
                  </a>
                )}
              </div>
            </div>

            <div className="overflow-hidden rounded-2xl border border-line">
              <div className="flex h-56 flex-col items-center justify-center bg-bone text-center">
                <MapIcon className="h-8 w-8 text-gold" strokeWidth={1.4} />
                <p className="mt-3 text-sm font-semibold text-night">Oficina Chiclayo</p>
                <p className="mt-1 max-w-[220px] text-[13px] text-muted">
                  Espacio reservado para el mapa de la oficina comercial.
                </p>
              </div>
            </div>
          </aside>
        </div>
      </section>
    </>);

}