import { PageHero } from '../components/public/PageHero';
import { LinkButton } from '../components/ui/Button';
import { SectionHeading } from '../components/ui/Primitives';
import { IMAGES } from '../data/projects';
import { usePublicProjects } from '../contexts/PublicProjectsContext';

export function Benefits() {
  const { proyectos, cargando } = usePublicProjects();
  const losCocosVisible = proyectos.some((p) => p.codigo === 'PROY-001');
  if (cargando) return <div className="shell py-24">Cargando información...</div>;
  if (!losCocosVisible) return (
    <div className="shell py-24">
      <SectionHeading title="Beneficios y servicios" description="Consulta los proyectos actualmente disponibles o solicita información a nuestros asesores." />
      <LinkButton to="/proyectos" size="lg" className="mt-8">Ver proyectos</LinkButton>
    </div>
  );
  return (
    <>
      <PageHero
        crumbs={[{ label: 'Inicio', to: '/' }, { label: 'Beneficios y Servicios' }]}
        eyebrow="Beneficios y servicios"
        title="Un condominio pensado hasta el último detalle"
        description="Solicita información actualizada sobre servicios, áreas comunes y documentación de cada proyecto antes de tomar una decisión."
        image={IMAGES.team} />
      

      <section className="bg-white py-16 lg:py-20">
        <div className="shell">
          <SectionHeading
            eyebrow="Información del proyecto"
            title="Servicios sujetos a confirmación"
            description="El equipo comercial podrá indicarte qué servicios y espacios comunes corresponden al proyecto publicado y qué documentación está disponible."
          />
          <LinkButton to="/contacto" size="lg" className="mt-8">Solicitar información</LinkButton>
        </div>
      </section>

      <section className="bg-night py-16 lg:py-20">
        <div className="shell flex flex-col items-start gap-8 lg:flex-row lg:items-center lg:justify-between">
          <SectionHeading
            light
            title="¿Quieres conocer el proyecto?"
            description="Consulta la posibilidad de coordinar una visita y conoce las características disponibles con un asesor." />
          
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