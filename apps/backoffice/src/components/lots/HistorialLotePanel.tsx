import { useCallback, useEffect, useState } from 'react';
import {
  ClockIcon,
  HistoryIcon,
  RefreshCwIcon,
  UserIcon,
  ArrowRightIcon
} from 'lucide-react';
import { Button } from '../ui/Button';
import { Alert } from '../ui/Feedback';
import { cn } from '../../utils/cn';
import { coreService } from '../../services/coreService';
import type { LoteHistorialEstadoResponse } from '../../types/core';

export interface HistorialLotePanelProps {
  idLote: number;
  codigoLote?: string;
  refreshKey?: number;
  className?: string;
}

function formatFechaPeru(fechaIso: string): string {
  try {
    const date = new Date(fechaIso);
    return new Intl.DateTimeFormat('es-PE', {
      timeZone: 'America/Lima',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    }).format(date);
  } catch {
    return fechaIso;
  }
}

function formatResponsable(idUsuario?: number | null): string {
  if (idUsuario !== null && idUsuario !== undefined && idUsuario > 0) {
    return `Usuario #${idUsuario}`;
  }
  return 'Sistema / No disponible';
}

function getStatusBadgeClass(codigo?: string | null): string {
  const code = (codigo ?? '').trim().toUpperCase();
  switch (code) {
    case 'DISPONIBLE':
      return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    case 'RESERVADO':
    case 'SEPARADO':
      return 'bg-amber-50 text-amber-800 border-amber-200';
    case 'VENDIDO':
      return 'bg-brand-100 text-brand-800 border-brand-200';
    case 'BLOQUEADO':
      return 'bg-rose-50 text-rose-700 border-rose-200';
    case 'NO_DISPONIBLE':
      return 'bg-slate-100 text-slate-700 border-slate-200';
    default:
      return 'bg-gray-100 text-gray-700 border-gray-200';
  }
}

function sortHistorialDesc(
  items: LoteHistorialEstadoResponse[]
): LoteHistorialEstadoResponse[] {
  return [...items].sort((a, b) => {
    const timeA = new Date(a.fechaCambio).getTime();
    const timeB = new Date(b.fechaCambio).getTime();
    return timeB - timeA;
  });
}

function useHistorialLote(idLote: number, refreshKey?: number) {
  const [items, setItems] = useState<LoteHistorialEstadoResponse[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchHistorial = useCallback(async () => {
    if (!idLote || idLote <= 0) return;
    setLoading(true);
    setError(null);
    try {
      const data = await coreService.getLotStatusHistory(idLote);
      setItems(sortHistorialDesc(data ?? []));
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al cargar historial');
    } finally {
      setLoading(false);
    }
  }, [idLote]);

  useEffect(() => { void fetchHistorial(); }, [fetchHistorial, refreshKey]);
  return { items, loading, error, refresh: fetchHistorial };
}

function HistorialItemHeader({
  fechaStr,
  idUsuario
}: {
  fechaStr: string;
  idUsuario?: number | null;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-brand-50 pb-2">
      <div className="flex items-center gap-1.5 text-xs text-brand-500">
        <ClockIcon className="h-3.5 w-3.5 shrink-0 text-brand-400" aria-hidden="true" />
        <span className="font-medium text-brand-800">{fechaStr}</span>
        <span className="text-[11px] text-brand-400">(PET / America/Lima)</span>
      </div>
      <div className="flex items-center gap-1 text-xs text-brand-500">
        <UserIcon className="h-3.5 w-3.5 shrink-0 text-brand-400" aria-hidden="true" />
        <span className="font-medium text-brand-700">{formatResponsable(idUsuario)}</span>
      </div>
    </div>
  );
}

function HistorialItemTransitions({
  item,
  badgeAnt,
  badgeNuevo
}: {
  item: LoteHistorialEstadoResponse;
  badgeAnt: string;
  badgeNuevo: string;
}) {
  const estadoAnt = item.nombreEstadoAnterior || item.codigoEstadoAnterior || 'Estado inicial';
  const estadoNuevo = item.nombreEstadoNuevo || item.codigoEstadoNuevo || 'Sin estado';
  return (
    <div className="mt-2.5 flex flex-wrap items-center gap-2 text-xs">
      <span className={cn('inline-flex items-center rounded-md border px-2 py-0.5 font-medium', badgeAnt)}>
        {estadoAnt}
      </span>
      <ArrowRightIcon className="h-3.5 w-3.5 text-brand-400" aria-hidden="true" />
      <span className={cn('inline-flex items-center rounded-md border px-2 py-0.5 font-medium', badgeNuevo)}>
        {estadoNuevo}
      </span>
    </div>
  );
}

function HistorialItemCard({ item }: { item: LoteHistorialEstadoResponse }) {
  const fechaStr = formatFechaPeru(item.fechaCambio);
  const badgeAnt = getStatusBadgeClass(item.codigoEstadoAnterior);
  const badgeNuevo = getStatusBadgeClass(item.codigoEstadoNuevo);

  return (
    <div className="rounded-lg border border-brand-100 bg-white p-3.5 shadow-xs">
      <HistorialItemHeader fechaStr={fechaStr} idUsuario={item.idUsuario} />
      <HistorialItemTransitions item={item} badgeAnt={badgeAnt} badgeNuevo={badgeNuevo} />
      {item.motivo ? (
        <p className="mt-2 text-xs text-brand-600 bg-brand-50/50 rounded p-2 italic">
          "{item.motivo}"
        </p>
      ) : null}
    </div>
  );
}

function HistorialLoadingState() {
  return (
    <div className="space-y-2 py-6 text-center">
      <RefreshCwIcon className="mx-auto h-5 w-5 animate-spin text-brand-400" aria-hidden="true" />
      <p className="text-xs text-brand-500">Cargando historial de estados...</p>
    </div>
  );
}

function HistorialErrorState({
  error,
  onRetry
}: {
  error: string;
  onRetry: () => void;
}) {
  return (
    <Alert
      tone="danger"
      title="Error al consultar historial"
      actions={
        <Button size="sm" variant="secondary" onClick={onRetry}>
          Reintentar
        </Button>
      }
    >
      {error}
    </Alert>
  );
}

function HistorialEmptyState() {
  return (
    <div className="rounded-lg border border-dashed border-brand-200 bg-brand-50/30 p-6 text-center">
      <HistoryIcon className="mx-auto h-7 w-7 text-brand-300" aria-hidden="true" />
      <p className="mt-2 text-xs font-semibold text-brand-700">Sin cambios de estado</p>
      <p className="mt-1 text-xs text-brand-400">Este lote no registra modificaciones historicas de estado.</p>
    </div>
  );
}

function HistorialHeader({
  codigoLote,
  loading,
  onRefresh
}: {
  codigoLote?: string;
  loading: boolean;
  onRefresh: () => void;
}) {
  return (
    <div className="flex items-center justify-between gap-2 border-b border-brand-100 pb-2">
      <div className="flex items-center gap-2">
        <HistoryIcon className="h-4 w-4 text-brand-600" aria-hidden="true" />
        <h4 className="text-xs font-semibold text-brand-900">
          Historial de estados {codigoLote ? `(Lote ${codigoLote})` : ''}
        </h4>
      </div>
      <Button size="sm" variant="secondary" icon={RefreshCwIcon} onClick={onRefresh} disabled={loading}>
        Actualizar
      </Button>
    </div>
  );
}

function HistorialList({ items }: { items: LoteHistorialEstadoResponse[] }) {
  return (
    <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
      {items.map((item) => (
        <HistorialItemCard key={item.idHistorial} item={item} />
      ))}
    </div>
  );
}

export function HistorialLotePanel({
  idLote,
  codigoLote,
  refreshKey,
  className
}: HistorialLotePanelProps) {
  const { items, loading, error, refresh } = useHistorialLote(idLote, refreshKey);

  return (
    <div className={cn('space-y-3', className)}>
      <HistorialHeader codigoLote={codigoLote} loading={loading} onRefresh={refresh} />
      {loading ? (
        <HistorialLoadingState />
      ) : error ? (
        <HistorialErrorState error={error} onRetry={refresh} />
      ) : items.length === 0 ? (
        <HistorialEmptyState />
      ) : (
        <HistorialList items={items} />
      )}
    </div>
  );
}
