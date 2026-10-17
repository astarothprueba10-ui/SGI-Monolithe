import { ConfirmacionConsulta } from '../components/public/ConfirmacionConsulta';
import { EstadoCatalogoProyectos } from '../components/public/EstadoCatalogoProyectos';
import React from 'react';
import {
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
import { Button } from '../components/ui/Button';
import { Checkbox, Field, Input, Select, Textarea } from '../components/ui/Form';
import { Alert } from '../components/ui/Feedback';
import { SectionHeading } from '../components/ui/Primitives';
import { contactInfo } from '../data/site';
import { IMAGES } from '../data/projects';
import { useCaptacionPublica } from '../hooks/useCaptacionPublica';

export function Contact() {
  const { values, accept, setAccept, errors, setErrors, state, codigoSeguimiento, projects, projectsLoading, projectsError, reloadProjects, update, submit, reset } = useCaptacionPublica();

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
            <ConfirmacionConsulta nombre={values.nombres} referencia={codigoSeguimiento} reset={reset} /> :

            <form onSubmit={submit} noValidate className="space-y-5">
                <SectionHeading title="Cuéntanos qué necesitas" />

                {Object.values(errors).some(Boolean) &&
              <Alert tone="error" title="No pudimos enviar tu solicitud">
                    {errors.envio || errors.catalogo || "Revisa los campos marcados y vuelve a intentarlo."}
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
                  <Field label="Apellidos" htmlFor="apellidos" required error={errors.apellidoPaterno}>
                    <Input
                    id="apellidos"
                    value={values.apellidoPaterno}
                    error={errors.apellidoPaterno}
                    onChange={(e) => update('apellidoPaterno', e.target.value)}
                    autoComplete="family-name" />
                  
                  </Field>
                  <Field label="DNI" htmlFor="dni" hint="Opcional durante la solicitud de información." error={errors.numeroDocumento}>
                    <Input
                    id="dni"
                    error={errors.numeroDocumento}
                    value={values.numeroDocumento}
                    inputMode="numeric"
                    maxLength={8}
                    onChange={(e) => update('numeroDocumento', e.target.value)} />
                  
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
                  <Field label="Proyecto de interés" htmlFor="proyecto" required error={errors.idProyecto}>
                    <Select
                    id="proyecto"
                    disabled={projectsLoading || !projects.length}
                    value={values.idProyecto}
                    onChange={(e) => update('idProyecto', e.target.value)}>
                    
                      <option value="">Selecciona un proyecto</option>
                      {projects.map((p) =>
                    <option key={p.idProyecto} value={p.idProyecto}>
                          {p.nombre}
                        </option>
                    )}
                    </Select>
                  </Field>
                </div>

                <EstadoCatalogoProyectos loading={projectsLoading} error={projectsError} empty={!projects.length} retry={() => void reloadProjects()} />
                <p className="text-sm text-muted">Si ya eres cliente y necesitas soporte, contáctanos por WhatsApp, teléfono o correo.</p>
                <Field label="Motivo de contacto" htmlFor="motivo" required error={errors.motivoContacto}>
                  <Select
                  id="motivo"
                  value={values.motivoContacto}
                  error={errors.motivoContacto}
                  onChange={(e) => update('motivoContacto', e.target.value)}>
                  
                    <option value="">Selecciona un motivo</option>
                    <option>Quiero comprar un lote</option>
                    <option>Quiero agendar una visita</option>
                    <option>Consulta sobre financiamiento</option>
                  </Select>
                </Field>

                <Field label="Mensaje" htmlFor="mensaje" error={errors.mensaje}>
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
              

                <Button type="submit" size="lg" loading={state === 'loading'} disabled={state === 'loading' || projectsLoading || !projects.length} className="w-full">
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