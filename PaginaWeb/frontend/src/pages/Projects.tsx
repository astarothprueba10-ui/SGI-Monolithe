import React, { useEffect, useMemo, useState } from 'react';
import { SearchXIcon } from 'lucide-react';
import { PageHero } from '../components/public/PageHero';
import { ProjectCard } from '../components/public/ProjectCard';
import { Tabs } from '../components/ui/Primitives';
import { EmptyState } from '../components/ui/Feedback';
import { Button } from '../components/ui/Button';
import { IMAGES, projects as staticProjects } from '../data/projects';
import { obtenerProyectosPublicos, ProyectoDto } from '../services/api';
import type { Project } from '../types/content';

const filters = [
  { id: 'todos', label: 'Todos' },
  { id: 'Preventa', label: 'Preventa' },
  { id: 'En venta', label: 'En venta' },
  { id: 'Próximamente', label: 'Próximamente' }
];

export function Projects() {
  const [active, setActive] = useState('todos');
  const [listaProyectos, setListaProyectos] = useState<Project[]>(staticProjects);

  useEffect(() => {
    cargarProyectos();
  }, []);

  async function cargarProyectos() {
    try {
      const data = await obtenerProyectosPublicos();
      if (data && data.length > 0) {
        const mapeados = data.map(mapearProyectoApi);
        setListaProyectos(mapeados);
      }
    } catch {
      // Si la API remota no está activa, mantiene los proyectos estáticos locales
    }
  }

  function mapearProyectoApi(dto: ProyectoDto): Project {
    const ubicacion = [dto.distrito, dto.provincia].filter(Boolean).join(', ') || 'Lambayeque, Perú';
    return {
      slug: dto.codigo.toLowerCase(),
      name: dto.nombre,
      location: ubicacion,
      status: 'En venta',
      type: 'Condominio Campestre',
      priceFrom: 'Consultar precio',
      areaFrom: dto.areaTotal ? `${dto.areaTotal} m²` : '1,000 m²',
      shortDescription: dto.descripcion || 'Lotes campestres y urbanos con título de propiedad saneado.',
      description: dto.descripcion || 'Desarrollo inmobiliario exclusivo en Lambayeque.',
      cover: IMAGES.masterplan,
      gallery: [{ src: IMAGES.masterplan, caption: dto.nombre }],
      financing: {
        cash: 'Al contado con descuento',
        downPayment: 'Desde 10%',
        months: 'Hasta 36 meses',
        note: 'Financiamiento directo con la inmobiliaria'
      },
      highlights: ['Servicios básicos', 'Pórtico de ingreso', 'Seguridad 24/7'],
      published: true,
      updatedAt: '2026'
    };
  }

  const tabs = useMemo(
    () =>
      filters.map((f) => ({
        ...f,
        count: f.id === 'todos' ? listaProyectos.length : listaProyectos.filter((p) => p.status === f.id).length
      })),
    [listaProyectos]
  );

  const visible = active === 'todos' ? listaProyectos : listaProyectos.filter((p) => p.status === active);

  return (
    <>
      <PageHero
        crumbs={[{ label: 'Inicio', to: '/' }, { label: 'Proyectos' }]}
        eyebrow="Proyectos"
        title="Nuestros proyectos"
        description="Condominios campestres y lotes urbanos en Lambayeque, todos con documentación saneada y financiamiento directo."
        image={IMAGES.masterplan}
      />

      <section className="bg-white py-14 lg:py-20">
        <div className="shell">
          <div className="flex flex-col gap-5 border-b border-line pb-6 lg:flex-row lg:items-center lg:justify-between">
            <Tabs tabs={tabs} active={active} onChange={setActive} />
            <p className="text-sm text-muted">
              Mostrando <span className="font-semibold text-night">{visible.length}</span> de{' '}
              {listaProyectos.length} proyectos
            </p>
          </div>

          {visible.length === 0 ? (
            <EmptyState
              className="mt-12"
              icon={<SearchXIcon className="h-10 w-10" />}
              title="No hay proyectos en este estado"
              description="Pronto sumaremos nuevos desarrollos en Lambayeque. Déjanos tus datos y te avisaremos antes del lanzamiento."
              action={<Button onClick={() => setActive('todos')}>Ver todos los proyectos</Button>}
            />
          ) : (
            <ul className="mt-10 grid gap-7 md:grid-cols-2 lg:grid-cols-3">
              {visible.map((p) => (
                <li key={p.slug}>
                  <ProjectCard project={p} />
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </>
  );
}