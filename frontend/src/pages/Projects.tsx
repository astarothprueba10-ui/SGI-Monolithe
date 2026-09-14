import React, { useMemo, useState } from 'react';
import { SearchXIcon } from 'lucide-react';
import { PageHero } from '../components/public/PageHero';
import { ProjectCard } from '../components/public/ProjectCard';
import { Tabs } from '../components/ui/Primitives';
import { EmptyState } from '../components/ui/Feedback';
import { Button } from '../components/ui/Button';
import { IMAGES, projects } from '../data/projects';

const filters = [
{ id: 'todos', label: 'Todos' },
{ id: 'Preventa', label: 'Preventa' },
{ id: 'En venta', label: 'En venta' },
{ id: 'Próximamente', label: 'Próximamente' }];


export function Projects() {
  const [active, setActive] = useState('todos');

  const tabs = useMemo(
    () =>
    filters.map((f) => ({
      ...f,
      count:
      f.id === 'todos' ? projects.length : projects.filter((p) => p.status === f.id).length
    })),
    []
  );

  const visible = active === 'todos' ? projects : projects.filter((p) => p.status === active);

  return (
    <>
      <PageHero
        crumbs={[{ label: 'Inicio', to: '/' }, { label: 'Proyectos' }]}
        eyebrow="Proyectos"
        title="Nuestros proyectos"
        description="Condominios campestres y lotes urbanos en Lambayeque, todos con documentación saneada y financiamiento directo."
        image={IMAGES.masterplan} />
      

      <section className="bg-white py-14 lg:py-20">
        <div className="shell">
          <div className="flex flex-col gap-5 border-b border-line pb-6 lg:flex-row lg:items-center lg:justify-between">
            <Tabs tabs={tabs} active={active} onChange={setActive} />
            <p className="text-sm text-muted">
              Mostrando <span className="font-semibold text-night">{visible.length}</span> de{' '}
              {projects.length} proyectos
            </p>
          </div>

          {visible.length === 0 ?
          <EmptyState
            className="mt-12"
            icon={<SearchXIcon className="h-10 w-10" />}
            title="No hay proyectos en este estado"
            description="Pronto sumaremos nuevos desarrollos en Lambayeque. Déjanos tus datos y te avisaremos antes del lanzamiento."
            action={<Button onClick={() => setActive('todos')}>Ver todos los proyectos</Button>} /> :


          <ul className="mt-10 grid gap-7 md:grid-cols-2 lg:grid-cols-3">
              {visible.map((p) =>
            <li key={p.slug}>
                  <ProjectCard project={p} />
                </li>
            )}
            </ul>
          }
        </div>
      </section>
    </>);

}