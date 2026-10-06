import { useCallback, useEffect, useMemo, useState } from 'react';
import { PlusIcon, PencilIcon } from 'lucide-react';
import { Card } from '../../ui/Card';
import { Button } from '../../ui/Button';
import { SearchInput, Select } from '../../ui/Field';
import { Table, TD, TH, TR } from '../../ui/Table';
import { Badge } from '../../ui/Badge';
import { Pagination } from '../../ui/Pagination';
import { EmptyState } from '../../ui/Feedback';
import { useAuth } from '../../../contexts/AuthContext';
import { coreService } from '../../../services/coreService';
import { LotFormModal } from '../LotFormModal';
import type {
  ProyectoResponse,
  LoteResponse,
  EtapaResponse,
  ManzanaResponse,
  ZonaResponse,
  CatalogoResponse,
  EstadoLoteResponse
} from '../../../types/core';

interface Props {
  project: ProyectoResponse;
}

const PAGE_SIZE = 12;

function LotStatusBadge({ lot }: { lot: LoteResponse }) {
  if (lot.codigoEstadoLote === 'DISPONIBLE') {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-[#4cbb17]/40 bg-[#4cbb17]/10 px-2.5 py-0.5 text-xs font-semibold text-[#2d7a0c]">
        <span className="h-1.5 w-1.5 rounded-full bg-[#4cbb17]"></span>
        {lot.nombreEstadoLote ?? 'Disponible'}
      </span>
    );
  }

  if (lot.codigoEstadoLote === 'VENDIDO') {
    return (
      <Badge tone="neutral" className="border border-brand-200 bg-brand-100 text-brand-800">
        {lot.nombreEstadoLote ?? 'Vendido'}
      </Badge>
    );
  }

  return (
    <Badge tone="accent">
      {lot.nombreEstadoLote ?? lot.codigoEstadoLote ?? 'Reservado'}
    </Badge>
  );
}

export function ProjectLotsTab({ project }: Props) {
  const { can } = useAuth();
  const canEdit = can('lots.edit');

  // Filtros
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [selectedEtapaId, setSelectedEtapaId] = useState('all');
  const [selectedManzanaId, setSelectedManzanaId] = useState('all');
  const [selectedZonaId, setSelectedZonaId] = useState('all');
  const [selectedStatusId, setSelectedStatusId] = useState('all');
  const [page, setPage] = useState(1);

  // Datos
  const [lots, setLots] = useState<LoteResponse[]>([]);
  const [stages, setStages] = useState<EtapaResponse[]>([]);
  const [stageBlocks, setStageBlocks] = useState<ManzanaResponse[]>([]);
  const [zones, setZones] = useState<ZonaResponse[]>([]);
  const [lotStatuses, setLotStatuses] = useState<EstadoLoteResponse[]>([]);
  const [lotTypes, setLotTypes] = useState<CatalogoResponse[]>([]);

  // Estados de carga
  const [lotsLoading, setLotsLoading] = useState(true);
  const [lotsError, setLotsError] = useState<string | null>(null);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [blocksLoading, setBlocksLoading] = useState(false);

  // Modal
  const [formOpen, setFormOpen] = useState(false);
  const [editingLot, setEditingLot] = useState<LoteResponse | null>(null);

  // Debounce 400ms
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedQuery(query);
      setPage(1);
    }, 400);
    return () => clearTimeout(handler);
  }, [query]);

  // Cargar catálogos al montar
  useEffect(() => {
    let mounted = true;

    async function loadCatalogs() {
      try {
        const [stagesData, zonesData, statusesData, typesData] = await Promise.all([
          coreService.getStagesByProject(project.idProyecto),
          coreService.getZonesByProject(project.idProyecto),
          coreService.getLotStatuses(),
          coreService.getLotTypes()
        ]);

        if (!mounted) return;
        setStages(stagesData);
        setZones(zonesData);
        setLotStatuses(statusesData);
        setLotTypes(typesData);
      } catch {
        // Silent - individual fields will show empty options
      }
    }

    loadCatalogs();
    return () => {
      mounted = false;
    };
  }, [project.idProyecto]);

  // Cargar manzanas cuando cambia etapa
  useEffect(() => {
    if (selectedEtapaId === 'all') {
      setStageBlocks([]);
      setSelectedManzanaId('all');
      return;
    }

    let mounted = true;
    setBlocksLoading(true);

    coreService.getBlocksByStage(Number(selectedEtapaId)).then((data) => {
      if (!mounted) return;
      setStageBlocks(data);
      setSelectedManzanaId('all');
    }).catch(() => {
      if (mounted) setStageBlocks([]);
    }).finally(() => {
      if (mounted) setBlocksLoading(false);
    });

    return () => {
      mounted = false;
    };
  }, [selectedEtapaId]);

  // Cargar lotes
  const loadLots = useCallback(async () => {
    setLotsLoading(true);
    setLotsError(null);
    try {
      const data = await coreService.searchLots({
        idProyecto: project.idProyecto,
        idEtapa: selectedEtapaId !== 'all' ? Number(selectedEtapaId) : undefined,
        idManzana: selectedManzanaId !== 'all' ? Number(selectedManzanaId) : undefined,
        idZona: selectedZonaId !== 'all' ? Number(selectedZonaId) : undefined,
        idEstadoLote: selectedStatusId !== 'all' ? Number(selectedStatusId) : undefined,
        texto: debouncedQuery.trim() || undefined
      });
      setLots(data);
      setHasLoaded(true);
    } catch (err: unknown) {
      setLotsError(
        err instanceof Error
          ? err.message
          : 'Error al cargar lotes del proyecto desde core-service'
      );
    } finally {
      setLotsLoading(false);
    }
  }, [project.idProyecto, selectedEtapaId, selectedManzanaId, selectedZonaId, selectedStatusId, debouncedQuery]);

  useEffect(() => {
    loadLots();
  }, [loadLots]);

  const pagedLots = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return lots.slice(start, start + PAGE_SIZE);
  }, [lots, page]);

  const handleOpenCreate = () => {
    setEditingLot(null);
    setFormOpen(true);
  };

  const handleOpenEdit = (lot: LoteResponse) => {
    setEditingLot(lot);
    setFormOpen(true);
  };

  const handleCloseForm = () => {
    setFormOpen(false);
    setEditingLot(null);
  };

  const handleFormSuccess = async () => {
    await loadLots();
  };

  return (
    <div className="space-y-4">
      <LotFormModal
        open={formOpen}
        onClose={handleCloseForm}
        onSuccess={handleFormSuccess}
        project={project}
        stages={stages}
        zones={zones}
        lotStatuses={lotStatuses}
        lotTypes={lotTypes}
        lot={editingLot}
      />

      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h3 className="text-base font-semibold text-brand-900">Lotes del proyecto</h3>
          <p className="text-xs text-brand-500 mt-0.5">
            Consulta y gestiona los lotes de {project.nombre}.
          </p>
        </div>
        {canEdit && (
          <Button
            icon={PlusIcon}
            onClick={handleOpenCreate}
            className="bg-brand-900 text-white hover:bg-brand-800 border border-[#4cbb17]/40 shadow-sm"
          >
            Nuevo lote
          </Button>
        )}
      </div>

      <Card className="border border-brand-100 shadow-card bg-white">
        {/* Barra de filtros */}
        <div className="flex flex-wrap items-center gap-3 border-b border-brand-100 px-5 py-3.5 bg-brand-50/20">
          <SearchInput
            value={query}
            onValueChange={(v) => {
              setQuery(v);
              setPage(1);
            }}
            placeholder="Buscar lote..."
            className="w-full sm:w-64 bg-white border-brand-200"
          />

          <Select
            value={selectedEtapaId}
            onChange={(e) => {
              setSelectedEtapaId(e.target.value);
              setPage(1);
            }}
            aria-label="Filtrar por etapa"
            className="w-40 bg-white border-brand-200 text-sm"
          >
            <option value="all">Etapas</option>
            {stages.map((stg) => (
              <option key={stg.idEtapa} value={String(stg.idEtapa)}>
                {stg.codigo}
              </option>
            ))}
          </Select>

          <Select
            value={selectedManzanaId}
            onChange={(e) => {
              setSelectedManzanaId(e.target.value);
              setPage(1);
            }}
            aria-label="Filtrar por manzana"
            disabled={selectedEtapaId === 'all' || blocksLoading}
            className="w-40 bg-white border-brand-200 text-sm"
          >
            <option value="all">
              {blocksLoading ? 'Cargando...' : 'Manzanas'}
            </option>
            {stageBlocks.map((blk) => (
              <option key={blk.idManzana} value={String(blk.idManzana)}>
                {blk.codigo}
              </option>
            ))}
          </Select>

          <Select
            value={selectedZonaId}
            onChange={(e) => {
              setSelectedZonaId(e.target.value);
              setPage(1);
            }}
            aria-label="Filtrar por zona"
            className="w-40 bg-white border-brand-200 text-sm"
          >
            <option value="all">Zonas</option>
            {zones.map((zn) => (
              <option key={zn.idZona} value={String(zn.idZona)}>
                {zn.nombre}
              </option>
            ))}
          </Select>

          <Select
            value={selectedStatusId}
            onChange={(e) => {
              setSelectedStatusId(e.target.value);
              setPage(1);
            }}
            aria-label="Filtrar por estado"
            className="w-44 bg-white border-brand-200 text-sm"
          >
            <option value="all">Estados</option>
            {lotStatuses.map((st) => (
              <option key={st.id} value={String(st.id)}>
                {st.nombre}
              </option>
            ))}
          </Select>

          {hasLoaded && lotsLoading && (
            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-brand-600 animate-pulse ml-auto">
              <span className="h-2 w-2 rounded-full bg-brand-600"></span>
              Actualizando...
            </span>
          )}
        </div>

        {lotsError && (
          <div className="m-5 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            <p className="font-semibold">Error al cargar lotes:</p>
            <p>{lotsError}</p>
          </div>
        )}

        {!hasLoaded && lotsLoading ? (
          <div className="flex h-48 items-center justify-center">
            <p className="text-sm font-medium text-brand-600">Buscando lotes en core-service...</p>
          </div>
        ) : lots.length === 0 ? (
          <EmptyState
            title="No se encontraron lotes con los filtros seleccionados."
            description="Ajusta los filtros o crea el primer lote para este proyecto."
          />
        ) : (
          <>
            <Table
              head={
                <>
                  <TH className="text-brand-900 font-bold bg-brand-50/80">Lote</TH>
                  <TH className="text-brand-900 font-bold bg-brand-50/80">Manzana</TH>
                  <TH className="text-brand-900 font-bold bg-brand-50/80">Etapa</TH>
                  <TH className="text-brand-900 font-bold bg-brand-50/80">Zona</TH>
                  <TH align="right" className="text-brand-900 font-bold bg-brand-50/80">Área</TH>
                  <TH className="text-brand-900 font-bold bg-brand-50/80">Estado</TH>
                  {canEdit && (
                    <TH align="right" className="text-brand-900 font-bold bg-brand-50/80">Acciones</TH>
                  )}
                </>
              }
            >
              {pagedLots.map((lot) => (
                <TR key={lot.idLote} className="hover:bg-brand-50/40">
                  <TD>
                    <p className="font-semibold text-brand-900 text-sm">
                      {lot.numero ? `Lote ${lot.numero}` : lot.codigo}
                    </p>
                    {lot.numero && (
                      <p className="text-xs text-brand-500 font-mono mt-0.5">{lot.codigo}</p>
                    )}
                  </TD>
                  <TD>
                    <span className="inline-flex items-center rounded-md border border-brand-200 bg-brand-50 px-2 py-0.5 text-xs font-medium text-brand-700">
                      {lot.codigoManzana ?? '—'}
                    </span>
                  </TD>
                  <TD className="text-brand-600 text-sm">
                    {lot.codigoEtapa ?? '—'}
                  </TD>
                  <TD className="text-brand-600 text-sm">
                    {lot.nombreZona ?? '—'}
                  </TD>
                  <TD align="right" className="text-brand-900 font-medium">
                    {lot.areaM2 ? `${lot.areaM2} m²` : '—'}
                  </TD>
                  <TD>
                    <LotStatusBadge lot={lot} />
                  </TD>
                  {canEdit && (
                    <TD align="right">
                      <Button
                        size="sm"
                        icon={PencilIcon}
                        onClick={() => handleOpenEdit(lot)}
                        className="border-brand-200 text-brand-700 hover:bg-brand-50"
                      >
                        Editar
                      </Button>
                    </TD>
                  )}
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
    </div>
  );
}
