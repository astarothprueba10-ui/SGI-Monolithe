import { Clock3Icon, HistoryIcon, ShieldCheckIcon } from 'lucide-react';
import type { PoliticaFinanciamientoActual } from '../../services/financingConfigService';

const fechaLima = (iso: string) => {
  const fecha = new Date(iso);
  return Number.isNaN(fecha.getTime()) ? '—'
    : new Intl.DateTimeFormat('es-PE', {
      timeZone: 'America/Lima', day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    }).format(fecha);
};

/** Historial real de versiones publicadas, sin datos sintéticos. */
export function HistorialPoliticasFinancierasPanel({
  politica
}: { politica: PoliticaFinanciamientoActual }) {
  const versiones = [...politica.historial].sort((a, b) => b.version - a.version);

  return <section aria-labelledby="historial-financiero-titulo"
    className="overflow-hidden rounded-2xl border border-brand-100 bg-white shadow-sm">
    <header className="flex flex-wrap items-center justify-between gap-3 border-b border-brand-100 px-4 py-4 sm:px-6">
      <div className="flex min-w-0 items-center gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
          <HistoryIcon className="h-5 w-5" aria-hidden="true"/>
        </span>
        <div>
          <h3 id="historial-financiero-titulo" className="text-base font-bold text-brand-950">
            Historial de versiones
          </h3>
          <p className="mt-0.5 text-xs text-brand-500">Registro de políticas publicadas y conservadas.</p>
        </div>
      </div>
      <span className="rounded-full border border-brand-100 bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-700">
        {versiones.length} {versiones.length === 1 ? 'versión' : 'versiones'}
      </span>
    </header>

    {versiones.length === 0
      ? <p className="px-5 py-8 text-sm text-brand-500">Todavía no hay versiones registradas.</p>
      : <div className="divide-y divide-brand-100">
        {versiones.map((v) => {
          const actual = v.idPolitica === politica.idPolitica;
          return <div key={v.idPolitica}
            className="grid grid-cols-1 gap-3 px-4 py-4 transition-colors hover:bg-brand-50/40 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)_auto] sm:items-center sm:gap-5 sm:px-6">
            <div className="flex min-w-0 items-center gap-3">
              <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${actual ? 'bg-emerald-50 text-emerald-700' : 'bg-brand-50 text-brand-600'}`}>
                {actual ? <ShieldCheckIcon className="h-4 w-4" aria-hidden="true"/>
                  : <HistoryIcon className="h-4 w-4" aria-hidden="true"/>}
              </span>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-brand-950">Versión {v.version}</p>
                <p className={`text-xs font-medium ${actual ? 'text-emerald-700' : 'text-brand-500'}`}>
                  {actual ? 'Vigente' : 'Histórica'}
                </p>
              </div>
            </div>
            <div className="min-w-0">
              <p className="text-sm leading-relaxed text-brand-700">{v.motivo || 'Registro de configuración financiera'}</p>
              {v.idPublicador != null && <p className="mt-1 text-xs text-brand-500">
                Usuario responsable: {v.nombrePublicador?.trim() || `Usuario #${v.idPublicador}`}
              </p>}
            </div>
            <time dateTime={v.vigenteDesde}
              className="inline-flex items-center gap-1.5 text-xs tabular-nums text-brand-500 sm:justify-self-end">
              <Clock3Icon className="h-3.5 w-3.5" aria-hidden="true"/>
              {fechaLima(v.vigenteDesde)}
            </time>
          </div>;
        })}
      </div>}
  </section>;
}
