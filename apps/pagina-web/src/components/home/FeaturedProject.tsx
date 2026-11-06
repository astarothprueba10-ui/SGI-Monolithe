import { CalendarClockIcon, MapPinIcon, MaximizeIcon, WalletIcon } from 'lucide-react';
import { LinkButton } from '../ui/Button';
import { Badge, SectionHeading } from '../ui/Primitives';
import { featuredProject } from '../../data/projects';
import { usePublicProjects } from '../../contexts/PublicProjectsContext';


export function FeaturedProject() {
  const { proyectos } = usePublicProjects();
  const oficial = proyectos.find((p) => p.codigo === 'PROY-001');
  if (!oficial) return null;
  const specs = [
    { icon: MaximizeIcon, label: 'Área total', value: oficial.areaTotal != null ? `${oficial.areaTotal} m²` : 'Consultar área' },
    { icon: MapPinIcon, label: 'Ubicación', value: [oficial.distrito, oficial.provincia].filter(Boolean).join(', ') || 'Consultar' },
    { icon: WalletIcon, label: 'Precio vigente', value: 'Consultar con un asesor' },
    { icon: CalendarClockIcon, label: 'Opciones de pago', value: 'Consultar con un asesor' }
  ];
  return (
    <section className="bg-white py-20 lg:py-28">
      <div className="shell">
        <SectionHeading
          eyebrow="Proyecto destacado"
          title="Conoce nuestro proyecto"
          description="Conoce la ubicación del proyecto y solicita información comercial y registral actualizada al equipo responsable." />
        <div className="mt-12 grid gap-10 lg:grid-cols-[1.15fr_1fr] lg:items-center">
          <div className="relative">
            <img
              src={featuredProject.cover}
              alt={`Render del masterplan de ${oficial.nombre}`}
              className="aspect-[4/3] w-full rounded-2xl object-cover shadow-lift" />
            
            <div className="absolute -bottom-6 left-6 right-6 hidden rounded-xl border border-line bg-white p-5 shadow-card sm:block lg:-right-10 lg:left-auto lg:w-64">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-muted">
                Información comercial
              </p>
              <p className="mt-1 font-display text-3xl text-brand">Consultar precio</p>
              <p className="mt-1 text-xs text-muted">Solicita una cotización vigente</p>
            </div>
          </div>

          <div>
            <Badge tone="gold">{featuredProject.status}</Badge>
            <h3 className="mt-4 font-display text-3xl leading-tight text-night sm:text-[34px]">
              {oficial.nombre}
            </h3>
            <p className="mt-3 flex items-center gap-2 text-sm text-muted">
              <MapPinIcon className="h-4 w-4 text-gold" />
              {[oficial.distrito, oficial.provincia].filter(Boolean).join(', ')}
            </p>
            <p className="mt-5 text-[15px] leading-relaxed text-muted">
              {oficial.descripcion || 'Consulta con un asesor las características y disponibilidad del proyecto.'}
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
              <LinkButton to={`/proyectos/${oficial.codigo.toLowerCase()}`} size="lg">
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