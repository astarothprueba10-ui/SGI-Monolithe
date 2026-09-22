import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRightIcon, MapPinIcon, MaximizeIcon } from 'lucide-react';
import { Badge, statusTone } from '../ui/Primitives';
import type { Project } from '../../types/content';

export function ProjectCard({ project }: {project: Project;}) {
  return (
    <article className="group flex h-full flex-col overflow-hidden rounded-2xl border border-line bg-white shadow-card transition-[box-shadow,transform] duration-200 ease-out hover:-translate-y-1 hover:shadow-lift">
      <div className="relative aspect-[4/3] overflow-hidden bg-bone">
        <img
          src={project.cover}
          alt={`Vista del proyecto ${project.name}`}
          loading="lazy"
          className="h-full w-full object-cover transition-transform duration-300 ease-out group-hover:scale-105" />
        
        <div className="absolute left-4 top-4 flex gap-2">
          <Badge tone={statusTone(project.status)}>{project.status}</Badge>
        </div>
        <div className="absolute bottom-0 left-0 right-0 bg-night/75 px-4 py-3">
          <p className="flex items-center gap-1.5 text-[13px] text-white/90">
            <MapPinIcon className="h-3.5 w-3.5 text-gold-400" />
            {project.location}
          </p>
        </div>
      </div>

      <div className="flex flex-1 flex-col p-5">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-gold-600">
          {project.type}
        </p>
        <h3 className="mt-1.5 font-display text-xl leading-snug text-night">{project.name}</h3>
        <p className="mt-2.5 text-sm leading-relaxed text-muted">{project.shortDescription}</p>

        <dl className="mt-5 grid grid-cols-2 gap-3 border-t border-line pt-4">
          <div>
            <dt className="text-[11px] uppercase tracking-wide text-muted">Precio desde</dt>
            <dd className="mt-0.5 text-[17px] font-semibold text-brand">{project.priceFrom}</dd>
          </div>
          <div>
            <dt className="text-[11px] uppercase tracking-wide text-muted">Área desde</dt>
            <dd className="mt-0.5 flex items-center gap-1.5 text-[17px] font-semibold text-night">
              <MaximizeIcon className="h-4 w-4 text-gold" />
              {project.areaFrom}
            </dd>
          </div>
        </dl>

        <Link
          to={`/proyectos/${project.slug}`}
          className="mt-auto inline-flex items-center gap-2 pt-5 text-sm font-semibold text-night transition-colors duration-150 ease-out hover:text-brand">
          
          Ver proyecto
          <ArrowRightIcon className="h-4 w-4 transition-transform duration-150 ease-out group-hover:translate-x-1" />
        </Link>
      </div>
    </article>);

}