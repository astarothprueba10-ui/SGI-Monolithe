import { ArrowRightIcon, MessageCircleIcon, PhoneIcon } from 'lucide-react';
import { HeroCarousel } from '../components/home/HeroCarousel';
import { FeaturedProject } from '../components/home/FeaturedProject';
import { LeadForm } from '../components/public/LeadForm';
import { LinkButton, AnchorButton } from '../components/ui/Button';
import { SectionHeading } from '../components/ui/Primitives';
import { Icon } from '../components/ui/Icon';
import { contactInfo, pillars } from '../data/site';
import { IMAGES } from '../data/projects';
import { usePublicProjects } from '../contexts/PublicProjectsContext';

export function Home() {
  const { proyectos } = usePublicProjects();
  const losCocosVisible = proyectos.some((p) => p.codigo === 'PROY-001');
  return (
    <>
      <HeroCarousel />
      <FeaturedProject />

      {/* Beneficios específicos de Los Cocos */}
      {losCocosVisible && <section className="bg-bone py-20 lg:py-24">
        <div className="shell">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <SectionHeading
              eyebrow="Beneficios"
              title="Consulta las características del proyecto"
              description="Un asesor puede confirmar los servicios, las áreas comunes y su disponibilidad según la información aprobada del proyecto." />
            
            <LinkButton to="/beneficios" variant="secondary" className="shrink-0">
              Ver todos los beneficios
              <ArrowRightIcon className="h-4 w-4" />
            </LinkButton>
          </div>

          <p className="mt-10 max-w-2xl text-[15px] leading-relaxed text-muted">
            Solicita la ficha vigente antes de tomar una decisión de compra.
          </p>
        </div>
      </section>}

      {/* Inversión: promociones de Los Cocos solo mientras esté publicado */}
      {losCocosVisible && <section className="relative isolate overflow-hidden bg-night py-20 lg:py-28">
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
              description="Conoce Los Cocos y consulta con un asesor los lotes disponibles, los precios y las condiciones comerciales vigentes." />
            
            <LinkButton to="/proyectos/proy-001" size="lg" className="mt-9">
              Consultar condiciones comerciales
            </LinkButton>
          </div>

          <div className="w-full rounded-2xl border border-white/15 bg-white/[0.06] p-8 backdrop-blur lg:w-[360px]">
            <p className="text-[12px] font-semibold uppercase tracking-[0.16em] text-gold-400">
              Información comercial
            </p>
            <p className="mt-3 font-display text-[52px] leading-none text-white">Consultar precio</p>
            <p className="mt-2 text-sm text-white/60">Solicita la cotización vigente a un asesor</p>
            <dl className="mt-8 space-y-4 border-t border-white/15 pt-6 text-sm">
              <div className="flex items-center justify-between gap-4">
                <dt className="text-white/60">Área de lote disponible</dt>
                <dd className="font-semibold text-white">Consultar</dd>
              </div>
              <div className="flex items-center justify-between gap-4">
                <dt className="text-white/60">Opciones de pago</dt>
                <dd className="font-semibold text-white">Consultar</dd>
              </div>
              <div className="flex items-center justify-between gap-4">
                <dt className="text-white/60">Documentación y disponibilidad</dt>
                <dd className="font-semibold text-gold-400">Consultar con un asesor</dd>
              </div>
            </dl>
          </div>
        </div>
      </section>}

      {/* Por qué MONOLITHE */}
      <section className="bg-white py-20 lg:py-28">
        <div className="shell">
          <SectionHeading
            align="center"
            eyebrow="Por qué MONOLITHE"
            title="Razones para comprar con tranquilidad" />
          
          <ul className="mt-14 grid gap-x-10 gap-y-12 sm:grid-cols-2 lg:grid-cols-4">
            {pillars.filter((p) => !['Financiamiento flexible', 'Proyecto campestre'].includes(p.title)).map((p, i) =>
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
              description="Un asesor podrá brindarte información sobre el proyecto, disponibilidad de lotes, precios, visitas al terreno y alternativas de financiamiento." />
            
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