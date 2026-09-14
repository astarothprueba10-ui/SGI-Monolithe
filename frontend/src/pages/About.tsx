import React from 'react';
import { CompassIcon, EyeIcon, TargetIcon } from 'lucide-react';
import { PageHero } from '../components/public/PageHero';
import { LinkButton } from '../components/ui/Button';
import { SectionHeading } from '../components/ui/Primitives';
import { IMAGES } from '../data/projects';
import { milestones, values } from '../data/site';

const stats = [
{ value: '+40 ha', label: 'Banco de tierras en Lambayeque' },
{ value: '8 años', label: 'Gestionando terrenos saneados' },
{ value: '100%', label: 'Lotes con escritura pública' },
{ value: '3', label: 'Proyectos en cartera' }];


export function About() {
  return (
    <>
      <PageHero
        crumbs={[{ label: 'Inicio', to: '/' }, { label: 'Nosotros' }]}
        eyebrow="Nosotros"
        title="Construimos confianza antes de construir terrenos"
        description="MONOLITHE es una inmobiliaria lambayecana dedicada a habilitar y comercializar lotes campestres y urbanos con documentación en regla."
        image={IMAGES.heroAvenue} />
      

      {/* Quiénes somos */}
      <section className="bg-white py-20 lg:py-28">
        <div className="shell grid gap-12 lg:grid-cols-2 lg:items-center">
          <img
            src={IMAGES.team}
            alt="Equipo de asesores de MONOLITHE atendiendo a una familia"
            className="aspect-[3/2] w-full rounded-2xl object-cover shadow-card" />
          
          <div>
            <SectionHeading
              eyebrow="Quiénes somos"
              title="Una inmobiliaria del norte, con estándares de ciudad"
              description="Nacimos en Chiclayo con una convicción simple: comprar un terreno no debería generar dudas. Por eso trabajamos únicamente con predios saneados, contratos claros y entrega de escritura pública." />
            
            <p className="mt-5 text-[15px] leading-relaxed text-muted">
              Acompañamos a cada familia e inversionista desde la primera visita al terreno hasta la
              inscripción de su propiedad en Registros Públicos. Nuestro equipo integra especialistas
              legales, técnicos y comerciales que trabajan sobre un mismo expediente.
            </p>

            <dl className="mt-10 grid grid-cols-2 gap-6">
              {stats.map((s) =>
              <div key={s.label} className="border-l-2 border-gold pl-4">
                  <dt className="font-display text-3xl text-night">{s.value}</dt>
                  <dd className="mt-1 text-[13px] leading-snug text-muted">{s.label}</dd>
                </div>
              )}
            </dl>
          </div>
        </div>
      </section>

      {/* Historia */}
      <section className="bg-bone py-20 lg:py-24">
        <div className="shell">
          <SectionHeading eyebrow="Nuestra historia" title="De un terreno a una cartera de proyectos" />
          <ol className="mt-12 grid gap-6 md:grid-cols-4">
            {milestones.map((m) =>
            <li key={m.year} className="relative rounded-xl border border-line bg-white p-6">
                <span className="font-display text-2xl text-gold-600">{m.year}</span>
                <h3 className="mt-3 text-[15px] font-semibold text-night">{m.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted">{m.text}</p>
              </li>
            )}
          </ol>
        </div>
      </section>

      {/* Misión / Visión */}
      <section className="bg-night py-20 lg:py-24">
        <div className="shell grid gap-8 lg:grid-cols-2">
          <article className="rounded-2xl border border-white/12 bg-white/[0.04] p-8">
            <TargetIcon className="h-7 w-7 text-gold" strokeWidth={1.5} />
            <h2 className="mt-5 font-display text-2xl text-white">Misión</h2>
            <p className="mt-3 text-[15px] leading-relaxed text-white/70">
              Facilitar el acceso a la propiedad en el norte del Perú mediante proyectos inmobiliarios
              seguros, accesibles y bien planificados, que generen bienestar a las familias y
              rentabilidad a los inversionistas.
            </p>
          </article>
          <article className="rounded-2xl border border-white/12 bg-white/[0.04] p-8">
            <EyeIcon className="h-7 w-7 text-gold" strokeWidth={1.5} />
            <h2 className="mt-5 font-display text-2xl text-white">Visión</h2>
            <p className="mt-3 text-[15px] leading-relaxed text-white/70">
              Ser al 2030 la inmobiliaria de referencia en Lambayeque por la calidad de sus
              condominios campestres y por la transparencia de su gestión documentaria.
            </p>
          </article>
        </div>
      </section>

      {/* Valores + propuesta de valor */}
      <section className="bg-white py-20 lg:py-28">
        <div className="shell grid gap-12 lg:grid-cols-[1fr_1.2fr]">
          <SectionHeading
            eyebrow="Valores"
            title="Lo que sostiene cada decisión que tomamos"
            description="Nuestros valores no son un enunciado: son el criterio con el que elegimos terrenos, redactamos contratos y atendemos a cada cliente." />
          
          <ul className="grid gap-5 sm:grid-cols-2">
            {values.map((v) =>
            <li key={v.title} className="rounded-xl bg-bone p-6">
                <CompassIcon className="h-5 w-5 text-brand" strokeWidth={1.6} />
                <h3 className="mt-4 text-[15px] font-semibold text-night">{v.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted">{v.text}</p>
              </li>
            )}
          </ul>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-bone py-16">
        <div className="shell flex flex-col items-center gap-6 rounded-2xl bg-night px-8 py-12 text-center">
          <h2 className="max-w-2xl font-display text-3xl leading-tight text-white sm:text-4xl">
            ¿Quieres conocer el terreno antes de decidir?
          </h2>
          <p className="max-w-xl text-[15px] text-white/70">
            Coordinamos una visita guiada al Condominio Campestre Los Cocos y resolvemos todas tus
            dudas legales y comerciales en el mismo lugar.
          </p>
          <div className="flex flex-col gap-3 sm:flex-row">
            <LinkButton to="/proyectos" size="lg">
              Ver nuestros proyectos
            </LinkButton>
            <LinkButton
              to="/contacto"
              size="lg"
              variant="secondary"
              className="border-white/35 bg-transparent text-white hover:border-white hover:bg-white hover:text-night">
              
              Agendar una visita
            </LinkButton>
          </div>
        </div>
      </section>
    </>);

}