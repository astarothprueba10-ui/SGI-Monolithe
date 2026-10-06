import { useEffect, useMemo, useState } from 'react';
import { SlidersHorizontalIcon } from 'lucide-react';
import { Card } from '../../ui/Card';
import { IconButton } from '../../ui/Button';
import { SearchInput, Select } from '../../ui/Field';
import { Table, TD, TH, TR } from '../../ui/Table';
import { Badge } from '../../ui/Badge';
import { Pagination } from '../../ui/Pagination';
import { EmptyState } from '../../ui/Feedback';
import { coreService } from '../../../services/coreService';
import type {
  ProyectoResponse,
  LoteResponse,
  EstadoLoteResponse
} from '../../../types/core';

interface Props {
  project: ProyectoResponse;
}

const PAGE_SIZE = 12;

export function ProjectLotsTab({ project }: Props) {
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [statusId, setStatusId] = useState('all');
  const [page, setPage] = useState(1);

  const [lots, setLots] = useState<LoteResponse[]>([]);
  const [lotStatuses, setLotStatuses] = useState<EstadoLoteResponse[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasLoaded, setHasLoaded] = useState(false);

  // Debounce 400ms
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedQuery(query);
    }, 400);
    return () => clearTimeout(handler);
  }, [query]);

  // Load lots & statuses on mount / filter change
  useEffect(() => {
    let mounted = true;

    async function loadData() {
      setLoading(true);
      setError(null);
      try {
        const [lotsRes, statusesRes] = await Promise.all([
          coreService.searchLots({
            idProyecto: project.idProyecto,
            idEstadoLote: statusId !== 'all' ? Number(statusId) : undefined,
            texto: debouncedQuery.trim() || undefined
          }),
          lotStatuses.length === 0 ? coreService.getLotStatuses() : Promise.resolve(lotStatuses)
        ]);

        if (!mounted) return;
        setLots(lotsRes);
        if (statusesRes.length > 0) setLotStatuses(statusesRes);
        setHasLoaded(true);
      } catch (err: any) {
        if (mounted) {
          setError(err.message || 'Error al cargar lotes del proyecto desde core-service');
        }
      } finally {
        if (mounted) setLoading(false);
      }
    }

    loadData();
    return () => {
      mounted = false;
    };
  }, [project.idProyecto, statusId, debouncedQuery]);

  const pagedLots = useMemo(() => {
    return lots.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  }, [lots, page]);

  return (
    <Card className="border border-brand-100 shadow-card bg-white">
      <div className="flex flex-wrap items-center gap-3 border-b border-brand-100 px-5 py-3.5 bg-brand-50/20">
        <SearchInput
          value={query}
          onValueChange={(v) => {
            setQuery(v);
            setPage(1);
          }}
          placeholder="Buscar por lote o código…"
          className="w-full sm:w-72 bg-white focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 border-brand-200"
        />

        <Select
          value={statusId}
          onChange={(e) => {
            setStatusId(e.target.value);
            setPage(1);
          }}
          aria-label="Filtrar por estado"
          className="w-[180px] bg-white border-brand-200 focus:ring-2 focus:ring-brand-500/20"
        >
          <option value="all">Todos los estados</option>
          {lotStatuses.map((st) => (
            <option key={st.id} value={String(st.id)}>
              {st.nombre}
            </option>
          ))}
        </Select>

        {hasLoaded && loading && (
          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-brand-600 animate-pulse ml-1">
            <span className="h-2 w-2 rounded-full bg-brand-600"></span>
            Actualizando...
          </span>
        )}

        <IconButton
          icon={SlidersHorizontalIcon}
          label="Más filtros"
          className="ml-auto border border-brand-200 text-brand-700 hover:bg-brand-50"
        />
      </div>

      {error && (
        <div className="m-5 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <p className="font-semibold">Error al cargar lotes:</p>
          <p>{error}</p>
        </div>
      )}

      {!hasLoaded && loading ? (
        <div className="flex h-48 items-center justify-center">
          <p className="text-sm font-medium text-brand-600">Buscando lotes en core-service...</p>
        </div>
      ) : pagedLots.length === 0 ? (
        <EmptyState
          title="Sin resultados"
          description="No se encontraron lotes con los filtros aplicados en este proyecto."
        />
      ) : (
        <>
          <Table
            head={
              <>
                <TH className="text-brand-900 font-bold bg-brand-50/80">Lote</TH>
                <TH className="text-brand-900 font-bold bg-brand-50/80">Etapa / Manzana</TH>
                <TH className="text-brand-900 font-bold bg-brand-50/80">Zona</TH>
                <TH className="text-brand-900 font-bold bg-brand-50/80">Tipo</TH>
                <TH align="right" className="text-brand-900 font-bold bg-brand-50/80">Área</TH>
                <TH className="text-brand-900 font-bold bg-brand-50/80">Estado</TH>
              </>
            }
          >
            {pagedLots.map((lot) => (
              <TR key={lot.idLote} className="hover:bg-brand-50/40">
                <TD className="font-semibold text-brand-900">{lot.codigo}</TD>
                <TD className="text-brand-600">
                  {lot.nombreEtapa ?? '—'} · {lot.nombreManzana ?? '—'}
                </TD>
                <TD className="text-brand-600">{lot.nombreZona ?? '—'}</TD>
                <TD>
                  <Badge tone="neutral" className="bg-brand-50 text-brand-700 border border-brand-200">
                    {lot.nombreTipoLote ?? 'Residencial'}
                  </Badge>
                </TD>
                <TD align="right" className="text-brand-900 font-medium">
                  {lot.areaM2 ? `${lot.areaM2} m²` : '—'}
                </TD>
                <TD>
                  {lot.codigoEstadoLote === 'DISPONIBLE' ? (
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-[#4cbb17]/40 bg-[#4cbb17]/10 px-2.5 py-0.5 text-xs font-semibold text-[#2d7a0c]">
                      <span className="h-1.5 w-1.5 rounded-full bg-[#4cbb17]"></span>
                      {lot.nombreEstadoLote ?? 'Disponible'}
                    </span>
                  ) : lot.codigoEstadoLote === 'VENDIDO' ? (
                    <Badge tone="neutral" className="border border-brand-200 bg-brand-100 text-brand-800">
                      {lot.nombreEstadoLote ?? 'Vendido'}
                    </Badge>
                  ) : (
                    <Badge tone="accent">
                      {lot.nombreEstadoLote ?? 'Reservado'}
                    </Badge>
                  )}
                </TD>
              </TR>
            ))}
          </Table>
          <Pagination
            page={page}
            pageSize={PAGE_SIZE}
            total={lots.length}
            onPageChange={setPage}
          />
        </>
      )}
    </Card>
  );
}
