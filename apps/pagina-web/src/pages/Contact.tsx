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
import { IMAGES } from '../data/projects';
import { usePublicProjects } from '../contexts/PublicProjectsContext';
import { enviarConsulta } from '../services/api';
import { esDniPublicoValido, esCelularPublicoValido, esNombrePublicoValido, insertarTextoPublico, normalizarCampoPublico } from '../lib/publicContactPolicy';

type State = 'idle' | 'loading' | 'success' | 'error';

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
  const { proyectos } = usePublicProjects();
  const [values, setValues] = useState(initial);
  const [accept, setAccept] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [state, setState] = useState<State>('idle');
  const [codigoSeguimiento, setCodigoSeguimiento] = useState<string>('');

  function update(key: keyof typeof initial, value: string) {
    setValues((v) => ({ ...v, [key]: normalizarCampoPublico(key, value, v[key]) }));
    setErrors((current) => {
      const next = { ...current };
      delete next[key];
      return next;
    });
  }

  function paste(key: keyof typeof initial, event: React.ClipboardEvent<HTMLInputElement>) {
    event.preventDefault();
    const input = event.currentTarget;
    update(key, insertarTextoPublico(input.value, event.clipboardData.getData('text'), input.selectionStart, input.selectionEnd));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const next: Record<string, string> = {};
    if (!esNombrePublicoValido(values.nombres)) next.nombres = 'Ingresa tus nombres utilizando solo letras y espacios.';
    if (!esNombrePublicoValido(values.apellidos)) next.apellidos = 'Ingresa tus apellidos utilizando solo letras y espacios.';
    if (!esCelularPublicoValido(values.telefono)) next.telefono = 'El celular debe tener 9 dígitos y comenzar por 9.';
    if (!esDniPublicoValido(values.dni)) next.dni = 'El DNI debe tener exactamente 8 dígitos.';
    if (!/^\S+@\S+\.\S+$/.test(values.correo.trim())) next.correo = 'Correo inválido';
    if (!values.motivo) next.motivo = 'Selecciona un motivo';
    if (!values.proyecto) next.proyecto = 'Selecciona un proyecto o la opción Aún no lo decido';
    const proyectoElegido = proyectos.find((p) => p.codigo.toLowerCase() === values.proyecto);
    if (values.proyecto && values.proyecto !== 'otro' && !proyectoElegido) {
      next.proyecto = 'El proyecto seleccionado ya no está disponible';
    }
    if (!accept) next.accept = 'Debes aceptar la política de privacidad';
    setErrors(next);
    if (Object.keys(next).length > 0) return;
    setState('loading');

    try {
      const resp = await enviarConsulta({
        nombre: `${values.nombres.trim()} ${values.apellidos.trim()}`.trim(),
        telefono: values.telefono.trim(),
        correo: values.correo.trim(),
        idProyecto: proyectoElegido?.idProyecto,
        asunto: values.motivo ? `[${values.motivo}] Consulta Web` : 'Contacto Web',
        mensaje: `DNI: ${values.dni || 'N/A'}\nProyecto: ${values.proyecto || 'General'}\nMotivo: ${values.motivo}\n\n${values.mensaje.trim()}`,
        aceptaPrivacidad: accept
      });
      setCodigoSeguimiento(resp.codigo);
      setState('success');
    } catch {
      setCodigoSeguimiento('');
      setState('error');
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

                {state === 'error' && (
                  <Alert tone="error" title="No se pudo registrar tu consulta">
                    No pudimos confirmar el registro. Inténtalo nuevamente.
                  </Alert>
                )}

                {Object.values(errors).some(Boolean) &&
              <Alert tone="error" title="No pudimos enviar tu solicitud">
                    Revisa los campos marcados en rojo y vuelve a intentarlo.
                  </Alert>
              }

                <div className="grid gap-5 sm:grid-cols-2">
                  <Field label="Nombres" htmlFor="nombres" required hint="Solo letras y espacios." error={errors.nombres}>
                    <Input
                    id="nombres"
                    value={values.nombres}
                    error={errors.nombres}
                    aria-invalid={Boolean(errors.nombres)}
                    onChange={(e) => update('nombres', e.target.value)}
                    autoComplete="given-name" />
                  
                  </Field>
                  <Field label="Apellidos" htmlFor="apellidos" required hint="Solo letras y espacios." error={errors.apellidos}>
                    <Input
                    id="apellidos"
                    value={values.apellidos}
                    error={errors.apellidos}
                    aria-invalid={Boolean(errors.apellidos)}
                    onChange={(e) => update('apellidos', e.target.value)}
                    autoComplete="family-name" />
                  
                  </Field>
                  <Field label="DNI" htmlFor="dni" hint="8 dígitos, sin letras ni espacios." error={errors.dni}>
                    <Input
                    id="dni"
                    value={values.dni}
                    error={errors.dni}
                    aria-invalid={Boolean(errors.dni)}
                    inputMode="numeric"
                    minLength={8}
                    maxLength={8}
                    pattern="[0-9]{8}"
                    onPaste={(event) => paste('dni', event)}
                    onChange={(e) => update('dni', e.target.value)} />
                  
                  </Field>
                  <Field label="Teléfono" htmlFor="telefono" required hint="9 dígitos; debe comenzar por 9." error={errors.telefono}>
                    <Input
                    id="telefono"
                    value={values.telefono}
                    error={errors.telefono}
                    aria-invalid={Boolean(errors.telefono)}
                    type="tel"
                    inputMode="numeric"
                    minLength={9}
                    maxLength={9}
                    pattern="9[0-9]{8}"
                    placeholder="987654321"
                    autoComplete="tel-national"
                    onPaste={(event) => paste('telefono', event)}
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
                  <Field label="Proyecto de interés" htmlFor="proyecto" required error={errors.proyecto}>
                    <Select
                    id="proyecto"
                    value={values.proyecto}
                    error={errors.proyecto}
                    onChange={(e) => update('proyecto', e.target.value)}>
                    
                      <option value="">Selecciona un proyecto</option>
                      {proyectos.map((p) =>
                    <option key={p.codigo} value={p.codigo.toLowerCase()}>
                          {p.nombre}
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
                  setErrors((prev) => {
                    const next = { ...prev };
                    delete next.accept;
                    return next;
                  });
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