import { useCallback, useEffect, useMemo, useState } from 'react';
import { LayoutGridIcon, PlusIcon, PencilIcon, FilterIcon } from 'lucide-react';
import { Card } from '../../ui/Card';
import { Button } from '../../ui/Button';
import { Select, FieldLabel, SearchInput } from '../../ui/Field';
import { Dropdown, DropdownItem } from '../../ui/Dropdown';
import { Table, TD, TH, TR } from '../../ui/Table';
import { Badge } from '../../ui/Badge';
import { EmptyState } from '../../ui/Feedback';
import { useAuth } from '../../../contexts/AuthContext';
import { coreService } from '../../../services/coreService';
import { BlockFormModal } from '../BlockFormModal';
import { cn } from '../../../utils/cn';
import type {
  ProyectoResponse,
  EtapaResponse,
  ManzanaResponse
} from '../../../types/core';

interface Props {
  project: ProyectoResponse;
}

type StatusFilterOption = 'TODOS' | 'ACTIVO' | 'INACTIVO';

export function ProjectBlocksTab({ project }: Props) {
  const { can } = useAuth();
  const canEdit = can('projects.edit');

  const [stages, setStages] = useState<EtapaResponse[]>([]);
  const [stagesLoading, setStagesLoading] = useState(true);
  const [stagesError, setStagesError] = useState<string | null>(null);

  const [selectedStageId, setSelectedStageId] = useState<number | null>(null);
  const [blocks, setBlocks] = useState<ManzanaResponse[]>([]);
  const [blocksLoading, setBlocksLoading] = useState(false);
  const [blocksError, setBlocksError] = useState<string | null>(null);

  // Filtros locales
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilterOption>('TODOS');

  const [formOpen, setFormOpen] = useState(false);
  const [editingBlock, setEditingBlock] = useState<ManzanaResponse | null>(null);

  // 1. Cargar etapas del proyecto al montar
  useEffect(() => {
    let mounted = true;

    async function loadStages() {
      setStagesLoading(true);
      setStagesError(null);
      try {
        const data = await coreService.getStagesByProject(project.idProyecto);
        if (!mounted) return;
        setStages(data);

        if (data.length > 0) {
          const activeStage = data.find((s) => s.activo);
          setSelectedStageId(activeStage ? activeStage.idEtapa : data[0].idEtapa);
        } else {
          setSelectedStageId(null);
        }
      } catch (err: unknown) {
        if (mounted) {
          setStagesError(
            err instanceof Error
              ? err.message
              : 'Error al cargar las etapas del proyecto'
          );
        }
      } finally {
        if (mounted) setStagesLoading(false);
      }
    }

    loadStages();
    return () => {
      mounted = false;
    };
  }, [project.idProyecto]);

  // 2. Cargar manzanas únicamente de la etapa seleccionada
  const loadBlocksForStage = useCallback(async (idEtapa: number) => {
    setBlocksLoading(true);
    setBlocksError(null);
    try {
      const data = await coreService.getBlocksByStage(idEtapa);
      setBlocks(data);
    } catch (err: unknown) {
      setBlocksError(
        err instanceof Error
          ? err.message
          : 'Error al cargar las manzanas de la etapa'
      );
    } finally {
      setBlocksLoading(false);
    }
  }, []);

  useEffect(() => {
    if (selectedStageId && selectedStageId > 0) {
      loadBlocksForStage(selectedStageId);
    } else {
      setBlocks([]);
    }
  }, [selectedStageId, loadBlocksForStage]);

  // Filtros combinados en frontend sin peticiones extra al backend
  const filteredBlocks = useMemo(() => {
    return blocks.filter((blk) => {
      // Filtro de estado activo
      if (statusFilter === 'ACTIVO' && !blk.activo) return false;
      if (statusFilter === 'INACTIVO' && blk.activo) return false;

      // Filtro por texto (código, nombre, descripción)
      if (searchQuery.trim()) {
        const term = searchQuery.toLowerCase().trim();
        const matchCode = blk.codigo.toLowerCase().includes(term);
        const matchName = (blk.nombre ?? '').toLowerCase().includes(term);
        const matchDesc = (blk.descripcion ?? '').toLowerCase().includes(term);
        if (!matchCode && !matchName && !matchDesc) return false;
      }

      return true;
    });
  }, [blocks, searchQuery, statusFilter]);

  const handleOpenCreate = () => {
    setEditingBlock(null);
    setFormOpen(true);
  };

  const handleOpenEdit = (block: ManzanaResponse) => {
    setEditingBlock(block);
    setFormOpen(true);
  };

  const handleCloseForm = () => {
    setFormOpen(false);
    setEditingBlock(null);
  };

  const handleFormSuccess = async (targetEtapaId: number) => {
    if (targetEtapaId !== selectedStageId) {
      setSelectedStageId(targetEtapaId);
    } else {
      await loadBlocksForStage(targetEtapaId);
    }
  };

  return (
    <div className="space-y-6">
      <BlockFormModal
        open={formOpen}
        onClose={handleCloseForm}
        onSuccess={handleFormSuccess}
        project={project}
        stages={stages}
        initialStageId={selectedStageId ?? undefined}
        block={editingBlock}
      />

      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h3 className="text-base font-semibold text-brand-900 flex items-center gap-2">
            <LayoutGridIcon className="h-5 w-5 text-brand-600" />
            Manzanas del proyecto
          </h3>
          <p className="text-xs text-brand-500 mt-0.5">
            Administra las manzanas organizadas por etapa para {project.nombre}.
          </p>
        </div>

        {canEdit && stages.length > 0 && selectedStageId && (
          <Button
            icon={PlusIcon}
            onClick={handleOpenCreate}
            className="bg-brand-900 text-white hover:bg-brand-800 border border-[#4cbb17]/40 shadow-sm"
          >
            Nueva manzana
          </Button>
        )}
      </div>

      {stagesError && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <p className="font-semibold">Error al cargar etapas:</p>
          <p>{stagesError}</p>
        </div>
      )}

      {/* Selector de Etapa y Filtros */}
      {stagesLoading ? (
        <div className="flex h-16 items-center justify-center rounded-lg border border-brand-100 bg-white">
          <p className="text-xs font-medium text-brand-600">Cargando etapas del proyecto...</p>
        </div>
      ) : stages.length === 0 ? (
        <Card className="p-8 border border-brand-100 shadow-card bg-white text-center">
          <EmptyState
            title="No puedes crear manzanas"
            description="No puedes crear manzanas porque este proyecto aún no tiene etapas."
          />
        </Card>
      ) : (
        <div className="space-y-4">
          <Card className="p-4 border border-brand-100 shadow-card bg-white flex flex-wrap items-center gap-3">
            {/* Selector de Etapa */}
            <div className="flex items-center gap-2">
              <FieldLabel htmlFor="stage-filter">
                Etapa
              </FieldLabel>
              <Select
                id="select-etapa-manzanas"
                value={selectedStageId ? String(selectedStageId) : ''}
                onChange={(e) => setSelectedStageId(Number(e.target.value))}
                className="w-40 bg-white border-brand-200 focus:ring-2 focus:ring-brand-500/20 text-sm font-medium text-brand-900"
              >
                {stages.map((stg) => (
                  <option key={stg.idEtapa} value={String(stg.idEtapa)}>
                    {stg.codigo}
                  </option>
                ))}
              </Select>
            </div>

            {/* Buscador Dinámico */}
            <SearchInput
              value={searchQuery}
              onValueChange={setSearchQuery}
              placeholder="Buscar manzana..."
              className="w-full sm:w-64"
            />

            {/* Filtro por Estado Activo */}
            <Dropdown
              align="left"
              width="w-40"
              trigger={({ toggle }) => (
                <button
                  type="button"
                  onClick={toggle}
                  aria-label="Filtrar manzanas por estado"
                  title="Filtrar por estado"
                  className={cn(
                    'inline-flex h-9 items-center gap-2 rounded-md border px-3 text-[13px] font-medium transition-colors duration-150 ease-smooth',
                    statusFilter !== 'TODOS'
                      ? 'border-emerald-300 bg-emerald-50/70 text-emerald-900 hover:bg-emerald-100/80'
                      : 'border-brand-200 bg-white text-brand-700 hover:bg-brand-50 hover:border-brand-300'
                  )}
                >
                  <FilterIcon className="h-4 w-4 text-emerald-600 shrink-0" aria-hidden="true" />
                  <span>
                    {statusFilter === 'TODOS'
                      ? 'Todos'
                      : statusFilter === 'ACTIVO'
                        ? 'Activos'
                        : 'Inactivos'}
                  </span>
                  {statusFilter !== 'TODOS' && (
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-600" />
                  )}
                </button>
              )}
            >
              {({ close }) => (
                <div className="py-1">
                  {(
                    [
                      { id: 'TODOS', label: 'Todos' },
                      { id: 'ACTIVO', label: 'Activos' },
                      { id: 'INACTIVO', label: 'Inactivos' }
                    ] as const
                  ).map((option) => (
                    <DropdownItem
                      key={option.id}
                      onClick={() => {
                        setStatusFilter(option.id);
                        close();
                      }}
                    >
                      <span
                        className={cn(
                          statusFilter === option.id
                            ? 'font-semibold text-emerald-700'
                            : 'text-brand-700'
                        )}
                      >
                        {option.label}
                      </span>
                    </DropdownItem>
                  ))}
                </div>
              )}
            </Dropdown>
          </Card>

          {blocksError && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              <p className="font-semibold">Error al cargar manzanas:</p>
              <p>{blocksError}</p>
            </div>
          )}

          {/* Tabla de Manzanas */}
          <Card className="border border-brand-100 shadow-card bg-white overflow-hidden">
            {blocksLoading ? (
              <div className="flex h-48 items-center justify-center">
                <p className="text-sm font-medium text-brand-600">Cargando manzanas de la etapa...</p>
              </div>
            ) : blocks.length === 0 ? (
              <EmptyState
                title="Esta etapa aún no tiene manzanas."
                description={
                  canEdit
                    ? 'Crea la primera manzana para esta etapa.'
                    : 'No se han registrado manzanas en la etapa seleccionada.'
                }
              />
            ) : filteredBlocks.length === 0 ? (
              <EmptyState
                title="No se encontraron manzanas con los filtros seleccionados."
                description="Intenta cambiar los términos de búsqueda o el filtro de estado."
              />
            ) : (
              <Table
                head={
                  <>
                    <TH className="text-brand-900 font-bold bg-brand-50/80">Orden</TH>
                    <TH className="text-brand-900 font-bold bg-brand-50/80">Manzana</TH>
                    <TH className="text-brand-900 font-bold bg-brand-50/80">Etapa Asociada</TH>
                    <TH className="text-brand-900 font-bold bg-brand-50/80">Descripción</TH>
                    <TH className="text-brand-900 font-bold bg-brand-50/80">Estado</TH>
                    {canEdit && (
                      <TH align="right" className="text-brand-900 font-bold bg-brand-50/80">
                        Acciones
                      </TH>
                    )}
                  </>
                }
              >
                {filteredBlocks.map((blk) => (
                  <TR key={blk.idManzana} className="hover:bg-brand-50/40">
                    <TD className="font-semibold text-brand-900">
                      {String(blk.numeroOrden ?? 0).padStart(2, '0')}
                    </TD>
                    <TD>
                      <span className="inline-flex items-center rounded-md border border-brand-200 bg-brand-50 px-2 py-0.5 text-xs font-medium text-brand-700">
                        {blk.codigo}
                      </span>
                    </TD>
                    <TD>
                      <span className="font-medium text-brand-900">
                        {blk.codigoEtapa
                          ? blk.codigoEtapa.replace(/^ETAPA-/, 'ET-')
                          : '—'}
                        {blk.nombreEtapa ? ` ${blk.nombreEtapa}` : ''}
                      </span>
                    </TD>
                    <TD className="text-brand-700">
                      {blk.descripcion ?? '—'}
                    </TD>
                    <TD>
                      {blk.activo ? (
                        <span className="inline-flex items-center gap-1.5 rounded-full border border-[#4cbb17]/40 bg-[#4cbb17]/10 px-2.5 py-0.5 text-xs font-semibold text-[#2d7a0c]">
                          <span className="h-1.5 w-1.5 rounded-full bg-[#4cbb17]"></span>
                          Activa
                        </span>
                      ) : (
                        <Badge tone="neutral">Inactiva</Badge>
                      )}
                    </TD>
                    {canEdit && (
                      <TD align="right">
                        <Button
                          size="sm"
                          icon={PencilIcon}
                          onClick={() => handleOpenEdit(blk)}
                          className="border-brand-200 text-brand-700 hover:bg-brand-50"
                        >
                          Editar
                        </Button>
                      </TD>
                    )}
                  </TR>
                ))}
              </Table>
            )}
          </Card>
        </div>
      )}
    </div>
  );
}
