import { useEffect, useState } from 'react';
import { ClipboardListIcon, RefreshCwIcon } from 'lucide-react';
import { Button } from '../ui/Button';
import { coreService } from '../../services/coreService';
import type { LoteHistorialComercialItem } from '../../types/core';

interface Props {
  idLote: number;
  refreshKey?: number;
}

const tipoNombre: Record<LoteHistorialComercialItem['tipo'], string> = {
  SEPARACION: 'Separación',
  VENTA: 'Venta',
  CONTRATO: 'Contrato'
};

function fechaPeru(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('es-PE', {
    timeZone: 'America/Lima',
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit', hour12: false
  }).format(date);
}

function fechaCivil(value: string): string {
  const [anio, mes, dia] = value.slice(0, 10).split('-');
  return anio && mes && dia ? `${dia}/${mes}/${anio}` : value;
}

const soles = new Intl.NumberFormat('es-PE', {
  style: 'currency', currency: 'PEN'
});

export function HistorialComercialLotePanel({ idLote, refreshKey }: Props) {
  const [items, setItems] = useState<LoteHistorialComercialItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    let vigente = true;
    setLoading(true);
    setError(null);
    setItems([]);
    void coreService.getLotCommercialHistory(idLote)
      .then((result) => { if (vigente) setItems(result ?? []); })
      .catch((cause: unknown) => {
        if (vigente) setError(cause instanceof Error ? cause.message : 'No se pudo consultar el historial.');
      })
      .finally(() => { if (vigente) setLoading(false); });
    return () => { vigente = false; };
  }, [idLote, refreshKey, revision]);

  return (
    <section className="space-y-3" aria-label="Historial comercial del lote">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h4 className="flex items-center gap-2 text-xs font-semibold text-brand-900">
          <ClipboardListIcon className="h-4 w-4 text-brand-600" />
          Historial comercial
        </h4>
        <Button size="sm" variant="secondary" icon={RefreshCwIcon}
          onClick={() => setRevision((n) => n + 1)} disabled={loading}>
          Actualizar
        </Button>
      </div>
      <p className="text-xs text-brand-500">
        Operaciones registradas en orden cronológico. Los estados mostrados son los actuales de cada operación.
      </p>
      {loading ? (
        <p className="text-xs text-brand-500 py-3">Cargando operaciones comerciales…</p>
      ) : error ? (
        <p role="alert" className="text-xs text-red-700">{error}</p>
      ) : items.length === 0 ? (
        <p className="text-xs text-brand-500 py-3">No hay operaciones comerciales visibles para este lote.</p>
      ) : (
        <ol className="space-y-2 max-h-80 overflow-y-auto pr-1">
          {items.map((item) => (
            <li key={`${item.tipo}-${item.id}`}
              className="rounded-lg border border-brand-100 bg-white p-3 shadow-xs">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-xs font-semibold text-brand-900">
                  {tipoNombre[item.tipo]} · {item.codigo}
                </span>
                <time className="text-[11px] text-brand-500" dateTime={item.fecha}>
                  {fechaPeru(item.fecha)} (PET)
                </time>
              </div>
              <p className="mt-1.5 text-xs text-brand-700">
                Estado actual: <span className="font-semibold">{item.estado.replace(/_/g, ' ')}</span>
              </p>
              {item.monto !== null && (
                <p className="mt-1 text-xs text-brand-600">Monto: {soles.format(item.monto)}</p>
              )}
              {item.referencia && (
                <p className="mt-1 text-xs text-brand-600">Venta asociada: {item.referencia}</p>
              )}
              {item.fecha_firma && (
                <p className="mt-1 text-xs text-brand-600">Fecha de firma: {fechaCivil(item.fecha_firma)}</p>
              )}
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
