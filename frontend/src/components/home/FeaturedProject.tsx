import React from 'react';
import { CalendarClockIcon, CarIcon, MapPinIcon, MaximizeIcon, WalletIcon } from 'lucide-react';
import { LinkButton } from '../ui/Button';
import { Badge, SectionHeading } from '../ui/Primitives';
import { featuredProject } from '../../data/projects';

const specs = [
{ icon: MaximizeIcon, label: 'Lotes desde', value: '450 m²' },
{ icon: CarIcon, label: 'Distancia', value: '30 min de Chiclayo' },
{ icon: WalletIcon, label: 'Inicial desde', value: 'S/ 8,000' },
{ icon: CalendarClockIcon, label: 'Financiamiento', value: 'Hasta 36 meses' }];


export function FeaturedProject() {
  return (
    <section className="bg-white py-20 lg:py-28">
      <div className="shell">
        <SectionHeading
          eyebrow="Proyecto destacado"
          title="Conoce nuestro proyecto"
          description="Un condominio campestre cerrado en Picsi, diseñado para familias que quieren espacio, naturaleza y una inversión segura." />
        

        <div className="mt-12 grid gap-10 lg:grid-cols-[1.15fr_1fr] lg:items-center">
          <div className="relative">
            <img
              src={featuredProject.cover}
              alt={`Render del masterplan de ${featuredProject.name}`}
              className="aspect-[4/3] w-full rounded-2xl object-cover shadow-lift" />
            
            <div className="absolute -bottom-6 left-6 right-6 hidden rounded-xl border border-line bg-white p-5 shadow-card sm:block lg:-right-10 lg:left-auto lg:w-64">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-muted">
                Preventa al contado
              </p>
              <p className="mt-1 font-display text-3xl text-brand">S/ 25,900</p>
              <p className="mt-1 text-xs text-muted">Precio por lote de 450 m²</p>
            </div>
          </div>

          <div>
            <Badge tone="gold">{featuredProject.status}</Badge>
            <h3 className="mt-4 font-display text-3xl leading-tight text-night sm:text-[34px]">
              {featuredProject.name}
            </h3>
            <p className="mt-3 flex items-center gap-2 text-sm text-muted">
              <MapPinIcon className="h-4 w-4 text-gold" />
              {featuredProject.location}
            </p>
            <p className="mt-5 text-[15px] leading-relaxed text-muted">
              {featuredProject.shortDescription} Cada lote se entrega con escritura pública e
              independización registral.
            </p>

            <dl className="mt-8 grid grid-cols-2 gap-x-6 gap-y-6">
              {specs.map((s) =>
              <div key={s.label} className="flex gap-3">
                  <s.icon className="mt-0.5 h-5 w-5 shrink-0 text-brand" strokeWidth={1.6} />
                  <div>
                    <dt className="text-[12px] uppercase tracking-wide text-muted">{s.label}</dt>
                    <dd className="mt-0.5 text-[15px] font-semibold text-night">{s.value}</dd>
                  </div>
                </div>
              )}
            </dl>

            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <LinkButton to={`/proyectos/${featuredProject.slug}`} size="lg">
                Ver proyecto
              </LinkButton>
              <LinkButton to="/contacto" variant="secondary" size="lg">
                Solicitar información
              </LinkButton>
            </div>
          </div>
        </div>
      </div>
    </section>);

}