import React from 'react';
import { ArrowRightIcon, MessageCircleIcon, PhoneIcon } from 'lucide-react';
import { HeroCarousel } from '../components/home/HeroCarousel';
import { FeaturedProject } from '../components/home/FeaturedProject';
import { LeadForm } from '../components/public/LeadForm';
import { LinkButton, AnchorButton } from '../components/ui/Button';
import { SectionHeading } from '../components/ui/Primitives';
import { Icon } from '../components/ui/Icon';
import { contactInfo, homeBenefits, pillars } from '../data/site';
import { IMAGES } from '../data/projects';

export function Home() {
  return (
    <>
      <HeroCarousel />
      <FeaturedProject />

      {/* Beneficios resumidos */}
      <section className="bg-bone py-20 lg:py-24">
        <div className="shell">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <SectionHeading
              eyebrow="Beneficios"
              title="Todo lo que encuentras dentro del condominio"
              description="Servicios, áreas comunes y seguridad pensados para que puedas construir y vivir desde el primer día." />
            
            <LinkButton to="/beneficios" variant="secondary" className="shrink-0">
              Ver todos los beneficios
              <ArrowRightIcon className="h-4 w-4" />
            </LinkButton>
          </div>

          <ul className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {homeBenefits.map((b) =>
            <li
              key={b.title}
              className="flex h-full gap-4 rounded-xl border border-line bg-white p-6">
              
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand">
                  <Icon name={b.icon} className="h-5 w-5" />
                </span>
                <div>
                  <h3 className="text-[15px] font-semibold text-night">{b.title}</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-muted">{b.text}</p>
                </div>
              </li>
            )}
          </ul>
        </div>
      </section>

      {/* Inversión */}
      <section className="relative isolate overflow-hidden bg-night py-20 lg:py-28">
        <img
          src={IMAGES.heroAerial}
          alt=""
          aria-hidden="true"
          className="absolute inset-0 h-full w-full object-cover opacity-20" />
        
        <div className="shell relative grid gap-12 lg:grid-cols-[1fr_auto] lg:items-center">
          <div>
            <SectionHeading
              light
              eyebrow="Inversión"
              title="Una inversión pensada para tu futuro"
              description="La tierra en zonas de expansión de Lambayeque mantiene una plusvalía sostenida. En Los Cocos aseguras hoy un precio de preventa con financiamiento directo de MONOLITHE." />
            
            <LinkButton to="/proyectos/condominio-campestre-los-cocos" size="lg" className="mt-9">
              Conoce nuestras facilidades de pago
            </LinkButton>
          </div>

          <div className="w-full rounded-2xl border border-white/15 bg-white/[0.06] p-8 backdrop-blur lg:w-[360px]">
            <p className="text-[12px] font-semibold uppercase tracking-[0.16em] text-gold-400">
              Precio de preventa
            </p>
            <p className="mt-3 font-display text-[52px] leading-none text-white">S/ 25,900</p>
            <p className="mt-2 text-sm text-white/60">al contado · lote de 450 m²</p>
            <dl className="mt-8 space-y-4 border-t border-white/15 pt-6 text-sm">
              <div className="flex items-center justify-between gap-4">
                <dt className="text-white/60">Inicial desde</dt>
                <dd className="font-semibold text-white">S/ 8,000</dd>
              </div>
              <div className="flex items-center justify-between gap-4">
                <dt className="text-white/60">Saldo financiado</dt>
                <dd className="font-semibold text-white">Hasta 36 meses</dd>
              </div>
              <div className="flex items-center justify-between gap-4">
                <dt className="text-white/60">Entidad financiera</dt>
                <dd className="font-semibold text-gold-400">Directo con MONOLITHE</dd>
              </div>
            </dl>
          </div>
        </div>
      </section>

      {/* Por qué MONOLITHE */}
      <section className="bg-white py-20 lg:py-28">
        <div className="shell">
          <SectionHeading
            align="center"
            eyebrow="Por qué MONOLITHE"
            title="Cuatro razones para comprar con tranquilidad" />
          
          <ul className="mt-14 grid gap-x-10 gap-y-12 sm:grid-cols-2 lg:grid-cols-4">
            {pillars.map((p, i) =>
            <li key={p.title} className="flex h-full flex-col border-t-2 border-gold/40 pt-6">
                <span className="font-display text-sm text-gold-600">0{i + 1}</span>
                <Icon name={p.icon} className="mt-4 h-7 w-7 text-brand" />
                <h3 className="mt-4 font-display text-xl text-night">{p.title}</h3>
                <p className="mt-2.5 text-sm leading-relaxed text-muted">{p.text}</p>
              </li>
            )}
          </ul>
        </div>
      </section>

      {/* Contacto rápido */}
      <section className="bg-bone py-20 lg:py-24">
        <div className="shell grid gap-12 lg:grid-cols-[1fr_1.1fr] lg:items-start">
          <div>
            <SectionHeading
              eyebrow="Contacto rápido"
              title="Déjanos tus datos y te enviamos la información completa"
              description="Recibirás el brochure del proyecto, el plano de lotes disponibles y el cronograma de pagos personalizado." />
            
            <div className="mt-8 space-y-3">
              <AnchorButton
                href={contactInfo.whatsappUrl}
                target="_blank"
                variant="secondary"
                size="lg"
                className="w-full justify-start sm:w-auto">
                
                <MessageCircleIcon className="h-5 w-5 text-brand" />
                Escríbenos por WhatsApp
              </AnchorButton>
              <AnchorButton
                href={`tel:${contactInfo.phone.replace(/\s/g, '')}`}
                variant="ghost"
                size="lg"
                className="w-full justify-start sm:w-auto">
                
                <PhoneIcon className="h-5 w-5 text-gold-600" />
                {contactInfo.phone}
              </AnchorButton>
            </div>
          </div>
          <LeadForm />
        </div>
      </section>
    </>);

}