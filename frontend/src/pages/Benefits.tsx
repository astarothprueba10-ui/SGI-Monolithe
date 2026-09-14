import React from 'react';
import { PageHero } from '../components/public/PageHero';
import { LinkButton } from '../components/ui/Button';
import { SectionHeading } from '../components/ui/Primitives';
import { Icon } from '../components/ui/Icon';
import { benefitCategories } from '../data/site';
import { IMAGES } from '../data/projects';
import { cn } from '../utils/cn';

export function Benefits() {
  return (
    <>
      <PageHero
        crumbs={[{ label: 'Inicio', to: '/' }, { label: 'Beneficios y Servicios' }]}
        eyebrow="Beneficios y servicios"
        title="Un condominio pensado hasta el último detalle"
        description="Agrupamos los servicios, áreas comunes y garantías documentarias que MONOLITHE entrega en sus proyectos."
        image={IMAGES.parque} />
      

      <section className="bg-white py-12 lg:py-16">
        <div className="shell">
          <nav aria-label="Categorías de beneficios" className="flex flex-wrap gap-2">
            {benefitCategories.map((c) =>
            <a
              key={c.id}
              href={`#${c.id}`}
              className="rounded-full border border-line px-4 py-2 text-[13px] font-semibold text-muted transition-colors duration-150 ease-out hover:border-night/40 hover:text-night">
              
                {c.title}
              </a>
            )}
          </nav>
        </div>
      </section>

      {benefitCategories.map((cat, index) => {
        const reversed = index % 2 === 1;
        return (
          <section
            key={cat.id}
            id={cat.id}
            className={cn('scroll-mt-28 py-16 lg:py-20', reversed ? 'bg-bone' : 'bg-white')}>
            
            <div className="shell grid items-center gap-12 lg:grid-cols-2">
              <img
                src={cat.image}
                alt={`Imagen de ${cat.title}`}
                loading="lazy"
                className={cn(
                  'aspect-[4/3] w-full rounded-2xl object-cover shadow-card',
                  reversed && 'lg:order-2'
                )} />
              
              <div>
                <SectionHeading
                  eyebrow={`0${index + 1} · Categoría`}
                  title={cat.title}
                  description={cat.intro} />
                
                <ul className="mt-8 space-y-4">
                  {cat.items.map((item) =>
                  <li key={item.name} className="flex gap-4">
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand">
                        <Icon name={item.icon} className="h-5 w-5" />
                      </span>
                      <div>
                        <h3 className="text-[15px] font-semibold text-night">{item.name}</h3>
                        <p className="mt-1 text-sm leading-relaxed text-muted">{item.description}</p>
                      </div>
                    </li>
                  )}
                </ul>
              </div>
            </div>
          </section>);

      })}

      <section className="bg-night py-16 lg:py-20">
        <div className="shell flex flex-col items-start gap-8 lg:flex-row lg:items-center lg:justify-between">
          <SectionHeading
            light
            title="¿Quieres ver estos beneficios en persona?"
            description="Coordina una visita guiada al Condominio Campestre Los Cocos y recorre las áreas comunes con un asesor." />
          
          <div className="flex shrink-0 flex-col gap-3 sm:flex-row">
            <LinkButton to="/contacto" size="lg">
              Agendar visita
            </LinkButton>
            <LinkButton
              to="/proyectos"
              size="lg"
              variant="secondary"
              className="border-white/35 bg-transparent text-white hover:border-white hover:bg-white hover:text-night">
              
              Ver proyectos
            </LinkButton>
          </div>
        </div>
      </section>
    </>);

}