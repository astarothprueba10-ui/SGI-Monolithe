import React, { useMemo, useState } from 'react';
import { SearchXIcon } from 'lucide-react';
import { PageHero } from '../components/public/PageHero';
import { ProjectCard } from '../components/public/ProjectCard';
import { Tabs } from '../components/ui/Primitives';
import { EmptyState } from '../components/ui/Feedback';
import { Button } from '../components/ui/Button';
import { IMAGES } from '../data/projects';
import type { ProyectoDto } from '../services/api';
import { usePublicProjects } from '../contexts/PublicProjectsContext';
import type { Project } from '../types/content';

const filters = [{ id: 'todos', label: 'Todos' }]; // El estado comercial requiere datos oficiales.

export function Projects() {
  const [active, setActive] = useState('todos');
  const { proyectos, cargando, error } = usePublicProjects();
  const listaProyectos = useMemo(() => proyectos.map(mapearProyectoApi), [proyectos]);

  function mapearProyectoApi(dto: ProyectoDto): Project {
    const ubicacion = [dto.distrito, dto.provincia].filter(Boolean).join(', ') || 'Lambayeque, Perú';
    return {
      slug: dto.codigo.toLowerCase(),
      name: dto.nombre,
      location: ubicacion,
      status: 'Estado por confirmar',
      type: 'Proyecto inmobiliario',
      priceFrom: 'Consultar precio',
      areaFrom: dto.areaTotal ? `${dto.areaTotal} m²` : 'Consultar área',
      areaLabel: 'Área total',
      shortDescription: dto.descripcion || 'Solicita más información sobre este proyecto.',
      description: dto.descripcion || 'Consulta información del proyecto con un asesor.',
      // Hasta que el CMS asigne una imagen específica, no atribuir el masterplan
      // de Los Cocos a un proyecto distinto.
      cover: dto.codigo === 'PROY-001' ? IMAGES.masterplan : '',
      gallery: dto.codigo === 'PROY-001' ? [{ src: IMAGES.masterplan, caption: dto.nombre }] : [],
      financing: {
        cash: 'Consultar precio',
        downPayment: 'Consultar',
        months: 'Consultar',
        note: 'Consulta las condiciones vigentes con un asesor.'
      },
      highlights: [],
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
        description="Consulta los proyectos publicados y solicita al equipo comercial información actualizada sobre disponibilidad, documentación y condiciones de compra."
        image={proyectos.some((p) => p.codigo === 'PROY-001') ? IMAGES.masterplan : IMAGES.team}
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

          {cargando ? (
            <p className="mt-12 text-center text-muted">Cargando proyectos...</p>
          ) : error ? (
            <EmptyState
              className="mt-12"
              icon={<SearchXIcon className="h-10 w-10" />}
              title="No se pudo cargar el catálogo"
              description="Intenta nuevamente en unos momentos."
              action={<Button onClick={() => window.location.reload()}>Reintentar</Button>}
            />
          ) : visible.length === 0 ? (
            <EmptyState
              className="mt-12"
              icon={<SearchXIcon className="h-10 w-10" />}
              title="No hay proyectos en este estado"
              description="No hay proyectos disponibles con los filtros actuales. Puedes solicitar información a nuestro equipo."
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