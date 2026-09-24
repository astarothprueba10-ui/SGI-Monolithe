import React from 'react';
import { Link } from 'react-router-dom';
import { PROJECTS } from '../../data/projects';
import { number, percent } from '../../utils/format';

export function LotMixSummary() {
  const active = PROJECTS.filter((p) => p.status === 'Activo');

  return (
    <div className="space-y-4 px-5 py-4">
      {active.map((project) => {
        const total = project.totalLots;
        const soldPct = project.sold / total * 100;
        const reservedPct = project.reserved / total * 100;
        const availablePct = project.available / total * 100;
        return (
          <div key={project.id}>
            <div className="mb-1.5 flex items-baseline justify-between gap-3">
              <Link
                to="/plano"
                className="truncate text-[13px] font-medium text-brand-800 transition-colors duration-150 ease-smooth hover:text-brand-500">
                
                {project.name}
              </Link>
              <span className="shrink-0 text-[12px] tabular text-brand-400">
                {number(total)} lotes · {percent(soldPct, 0)} vendido
              </span>
            </div>
            <div
              className="flex h-2.5 w-full overflow-hidden rounded-full bg-brand-50"
              role="img"
              aria-label={`${project.name}: ${project.sold} vendidos, ${project.reserved} separados, ${project.available} disponibles`}>
              
              <span className="bg-brand-600" style={{ width: `${soldPct}%` }} />
              <span className="bg-amber-400" style={{ width: `${reservedPct}%` }} />
              <span className="bg-emerald-500" style={{ width: `${availablePct}%` }} />
            </div>
            <div className="mt-1.5 flex gap-4 text-[11px] text-brand-400">
              <span>Vendidos {project.sold}</span>
              <span>Separados {project.reserved}</span>
              <span>Disponibles {project.available}</span>
            </div>
          </div>);

      })}
    </div>);

}