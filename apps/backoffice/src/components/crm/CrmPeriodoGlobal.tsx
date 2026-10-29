
import { CalendarDays } from 'lucide-react';

export type PeriodoCrmModo =
  | 'HOY'
  | 'SEMANA'
  | 'MES'
  | 'ANIO'
  | 'RANGO';

interface Props {
  modo: PeriodoCrmModo;
  onModoChange: (modo: PeriodoCrmModo) => void;
  fechaReferencia: string;
  onFechaReferenciaChange: (fecha: string) => void;
  fechaDesde: string;
  onFechaDesdeChange: (fecha: string) => void;
  fechaHasta: string;
  onFechaHastaChange: (fecha: string) => void;
}

const MODOS: { valor: PeriodoCrmModo; nombre: string }[] = [
  { valor: 'HOY', nombre: 'Hoy' },
  { valor: 'SEMANA', nombre: 'Semana' },
  { valor: 'MES', nombre: 'Mes' },
  { valor: 'ANIO', nombre: 'Año' },
  { valor: 'RANGO', nombre: 'Rango' }
];

export function CrmPeriodoGlobal({
  modo,
  onModoChange,
  fechaReferencia,
  onFechaReferenciaChange,
  fechaDesde,
  onFechaDesdeChange,
  fechaHasta,
  onFechaHastaChange
}: Props) {
  return (
    <section className="mb-4 rounded-xl border border-brand-100 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-blue-50 p-2 text-blue-600">
            <CalendarDays className="h-5 w-5" />
          </div>

          <div>
            <h3 className="text-sm font-semibold text-brand-900">
              Período global
            </h3>
            <p className="text-xs text-brand-400">
              Actualiza tarjetas, tablas y gráficos.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-1 rounded-lg border border-brand-100 p-1">
          {MODOS.map((item) => (
            <button
              key={item.valor}
              type="button"
              aria-pressed={modo === item.valor}
              onClick={() => onModoChange(item.valor)}
              className={`rounded-md px-4 py-2 text-xs font-medium transition-colors ${
                modo === item.valor
                  ? 'bg-brand-900 text-white'
                  : 'text-brand-600 hover:bg-brand-50'
              }`}
            >
              {item.nombre}
            </button>
          ))}
        </div>

        {modo === 'RANGO' ? (
          <div className="flex flex-wrap items-center gap-2">
            <label className="flex items-center gap-2 text-xs text-brand-600">
              Desde
              <input
                type="date"
                aria-label="Fecha desde"
                value={fechaDesde}
                max={fechaHasta || undefined}
                onChange={(e) => onFechaDesdeChange(e.target.value)}
                className="rounded-md border border-brand-100 px-2 py-2"
              />
            </label>

            <label className="flex items-center gap-2 text-xs text-brand-600">
              Hasta
              <input
                type="date"
                aria-label="Fecha hasta"
                value={fechaHasta}
                min={fechaDesde || undefined}
                onChange={(e) => onFechaHastaChange(e.target.value)}
                className="rounded-md border border-brand-100 px-2 py-2"
              />
            </label>
          </div>
        ) : (
          <input
            type="date"
            aria-label="Fecha de referencia"
            value={fechaReferencia}
            onChange={(e) => onFechaReferenciaChange(e.target.value)}
            className="rounded-md border border-brand-100 px-3 py-2 text-xs text-brand-700"
          />
        )}
      </div>
    </section>
  );
}
