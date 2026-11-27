import { useEffect, useState } from 'react';
import { coreService } from '../../../services/coreService';
import type { ZonaResponse } from '../../../types/core';

export function CommercialZoneLegend({ projectId, codigos }: { projectId: number; codigos: string[] }) {
  const [zonas, setZonas] = useState<ZonaResponse[] | null>(null);
  const [error, setError] = useState(false);
  useEffect(() => {
    let vigente = true;
    setZonas(null); setError(false);
    coreService.getZonesByProject(projectId).then(r => { if(vigente) setZonas(r); })
      .catch(() => { if(vigente) setError(true); });
    return () => { vigente = false; };
  }, [projectId, codigos.join('|')]);
  if (!codigos.length) return null;
  return <aside aria-label="Leyenda de zonas" className="rounded-lg border border-brand-100 bg-brand-50/60 p-3">
    <h4 className="text-sm font-semibold text-brand-900">Leyenda de zonas</h4>
    <p className="mb-2 text-xs text-brand-600">Cada código identifica una zona del proyecto y sus características comerciales.</p>
    {error ? <p role="status" className="text-xs text-brand-600">No se pudo consultar la descripción de las zonas. Revisa el catálogo en Zonas.</p>
      : !zonas ? <p className="text-xs text-brand-500">Cargando leyenda…</p>
      : <dl className="grid gap-x-4 gap-y-2 sm:grid-cols-2 lg:grid-cols-4">{codigos.map(c => <div key={c} className="flex items-start gap-2 text-xs">
        <dt className="rounded border border-brand-200 bg-white px-2 py-0.5 font-semibold text-brand-900">{c}</dt>
        <dd className="pt-0.5 text-brand-700">{zonas.find(z => z.codigo===c)?.nombre || 'Sin descripción registrada'}</dd>
      </div>)}</dl>}
  </aside>;
}
