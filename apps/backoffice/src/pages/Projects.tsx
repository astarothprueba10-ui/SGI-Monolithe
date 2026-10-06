import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  DownloadIcon,
  MapIcon,
  PlusIcon,
  SlidersHorizontalIcon,
  Building2Icon,
  CalendarIcon,
  Maximize2Icon,
  MapPinIcon,
  PencilIcon,
  LayersIcon
} from 'lucide-react';
import { PageHeader } from '../components/ui/PageHeader';
import { Card } from '../components/ui/Card';
import { Button, IconButton } from '../components/ui/Button';
import { SearchInput, Select } from '../components/ui/Field';
import { Table, TD, TH, TR } from '../components/ui/Table';
import { Badge } from '../components/ui/Badge';
import { Tabs } from '../components/ui/Tabs';
import { Pagination } from '../components/ui/Pagination';
import { EmptyState } from '../components/ui/Feedback';
import { Gate } from '../components/auth/PermissionRoute';
import { useAuth } from '../contexts/AuthContext';
import { coreService } from '../services/coreService';
import { ProjectFormModal } from '../components/projects/ProjectFormModal';
import { StageManagementModal } from '../components/projects/StageManagementModal';
import { number } from '../utils/format';
import type {
  ProyectoResponse,
  LoteResponse,
  EstadoLoteResponse
} from '../types/core';

const PAGE_SIZE = 12;

export function Projects() {
  const { can } = useAuth();
  const canViewLots = can('lots.view');
  const canCreate = can('projects.create');
  const canEdit = can('projects.edit');

  const [tab, setTab] = useState('proyectos');
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [projectId, setProjectId] = useState('all');
  const [statusId, setStatusId] = useState('all');
  const [page, setPage] = useState(1);

  const [projects, setProjects] = useState<ProyectoResponse[]>([]);
  const [lots, setLots] = useState<LoteResponse[]>([]);
  const [lotStatuses, setLotStatuses] = useState<EstadoLoteResponse[]>([]);

  const [projectsLoading, setProjectsLoading] = useState(true);
  const [projectsError, setProjectsError] = useState<string | null>(null);

  const [lotsLoading, setLotsLoading] = useState(false);
  const [lotsError, setLotsError] = useState<string | null>(null);
  const [hasLoadedLots, setHasLoadedLots] = useState(false);

  // Project Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<ProyectoResponse | null>(null);

  // Stage Management Modal state
  const [stagesModalOpen, setStagesModalOpen] = useState(false);
  const [selectedProjectForStages, setSelectedProjectForStages] = useState<ProyectoResponse | null>(null);

  // ---------- Debounce 400 ms ----------
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedQuery(query);
    }, 400);
    return () => clearTimeout(handler);
  }, [query]);

  // ---------- Cargar proyectos ----------
  const loadProjects = useCallback(async () => {
    setProjectsLoading(true);
    setProjectsError(null);
    try {
      const res = await coreService.getProjects();
      setProjects(res);
    } catch (err: any) {
      setProjectsError(err.message || 'Error al cargar proyectos desde core-service');
    } finally {
      setProjectsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadProjects();
  }, [loadProjects]);

  // ---------- Cargar lotes ----------
  useEffect(() => {
    let mounted = true;
    if (tab !== 'lotes' || !canViewLots) return;

    async function loadLotsData() {
      setLotsLoading(true);
      setLotsError(null);
      try {
        const [lotsRes, statusesRes] = await Promise.all([
          coreService.searchLots({
            idProyecto: projectId !== 'all' ? Number(projectId) : undefined,
            idEstadoLote: statusId !== 'all' ? Number(statusId) : undefined,
            texto: debouncedQuery.trim() || undefined
          }),
          lotStatuses.length === 0 ? coreService.getLotStatuses() : Promise.resolve(lotStatuses)
        ]);

        if (!mounted) return;
        setLots(lotsRes);
        if (statusesRes.length > 0) setLotStatuses(statusesRes);
        setHasLoadedLots(true);
      } catch (err: any) {
        if (mounted) {
          setLotsError(err.message || 'Error al cargar lotes desde core-service');
        }
      } finally {
        if (mounted) setLotsLoading(false);
      }
    }

    loadLotsData();
    return () => {
      mounted = false;
    };
  }, [tab, canViewLots, projectId, statusId, debouncedQuery]);

  // ---------- Handlers ----------
  const handleOpenCreate = () => {
    setEditingProject(null);
    setModalOpen(true);
  };

  const handleOpenEdit = (project: ProyectoResponse) => {
    setEditingProject(project);
    setModalOpen(true);
  };

  const handleModalClose = () => {
    setModalOpen(false);
    setEditingProject(null);
  };

  const handleModalSuccess = useCallback(async () => {
    await loadProjects();
  }, [loadProjects]);

  const handleOpenStages = (project: ProyectoResponse) => {
    setSelectedProjectForStages(project);
    setStagesModalOpen(true);
  };

  const handleCloseStages = () => {
    setStagesModalOpen(false);
    setSelectedProjectForStages(null);
  };

  // ---------- Derived ----------
  const pagedLots = useMemo(() => {
    return lots.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  }, [lots, page]);

  const tabItems = useMemo(() => {
    const items: Array<{ id: string; label: string; count?: number }> = [
      { id: 'proyectos', label: 'Proyectos', count: projects.length }
    ];
    if (canViewLots) {
      items.push({
        id: 'lotes',
        label: 'Lotes',
        count: hasLoadedLots ? lots.length : undefined
      });
    }
    return items;
  }, [projects.length, canViewLots, hasLoadedLots, lots.length]);

  return (
    <div>
      <ProjectFormModal
        open={modalOpen}
        onClose={handleModalClose}
        onSuccess={handleModalSuccess}
        project={editingProject}
      />

      <StageManagementModal
        open={stagesModalOpen}
        onClose={handleCloseStages}
        project={selectedProjectForStages}
      />

      <div className="border-l-4 border-[#4cbb17] pl-3.5 mb-6">
        <PageHeader
          title="Proyectos y lotes"
          description="Consulta proyectos, etapas, manzanas, lotes y catálogos directamente desde core-service."
          actions={
            <>
              <Link to="/plano">
                <Button icon={MapIcon} className="border-brand-200 text-brand-800 hover:bg-brand-50">
                  Plano interactivo
                </Button>
              </Link>
              <Gate permission="projects.export">
                <Button icon={DownloadIcon} className="border-brand-200 text-brand-800 hover:bg-brand-50">
                  Exportar
                </Button>
              </Gate>
              {canCreate && (
                <Button
                  icon={PlusIcon}
                  onClick={handleOpenCreate}
                  className="bg-brand-900 text-white hover:bg-brand-800 border border-[#4cbb17]/40 shadow-sm"
                >
                  Nuevo proyecto
                </Button>
              )}
            </>
          }
        />
      </div>

      <Tabs
        className="mb-5"
        active={tab}
        onChange={(id) => {
          if (id === 'lotes' && !canViewLots) return;
          setTab(id);
          setPage(1);
        }}
        items={tabItems}
      />

      {tab === 'proyectos' && (
        <>
          {projectsError && (
            <div className="mb-5 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              <p className="font-semibold">Error al cargar proyectos:</p>
              <p>{projectsError}</p>
            </div>
          )}

          {projectsLoading ? (
            <div className="flex h-48 items-center justify-center rounded-lg border border-brand-100 bg-white">
              <p className="text-sm font-medium text-brand-600">Cargando proyectos desde core-service...</p>
            </div>
          ) : projects.length === 0 ? (
            <EmptyState
              title="Sin proyectos"
              description="No se encontraron proyectos disponibles en el sistema."
            />
          ) : (
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              {projects.map((project) => (
                <Card
                  key={project.idProyecto}
                  className="flex flex-col border-[#4cbb17] shadow-card bg-white"
                  style={{ borderColor: '#4cbb17' }}
                >
                  <div className="flex flex-wrap items-start justify-between gap-3 border-b border-brand-100 px-5 py-4">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <Building2Icon className="h-4 w-4 text-brand-600 shrink-0" />
                        <h3 className="text-base font-semibold text-brand-900 truncate">
                          {project.nombre}
                        </h3>
                        <span className="inline-flex items-center rounded-md border border-brand-200 bg-brand-50 px-2 py-0.5 text-xs font-medium text-brand-700">
                          {project.codigo}
                        </span>
                      </div>
                      <p className="mt-1 flex items-center gap-1 text-[13px] text-brand-500">
                        <MapPinIcon className="h-3.5 w-3.5 text-brand-400 shrink-0" />
                        {project.distrito ?? '—'}{project.provincia ? `, ${project.provincia}` : ''}
                      </p>
                    </div>

                    <div className="flex shrink-0 items-center gap-2">
                      {project.activo ? (
                        <span className="inline-flex items-center gap-1.5 rounded-full border border-[#4cbb17]/40 bg-[#4cbb17]/10 px-2.5 py-0.5 text-xs font-semibold text-[#2d7a0c]">
                          <span className="h-1.5 w-1.5 rounded-full bg-[#4cbb17]"></span>
                          {project.nombreEstadoProyecto ?? 'Activo'}
                        </span>
                      ) : (
                        <Badge tone="neutral">
                          {project.nombreEstadoProyecto ?? 'Inactivo'}
                        </Badge>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 border-b border-brand-100 px-5 py-3.5 sm:grid-cols-4 bg-brand-50/40">
                    <div>
                      <p className="text-[11px] font-medium text-brand-500 flex items-center gap-1">
                        <Maximize2Icon className="h-3 w-3 text-brand-400" />
                        Área total
                      </p>
                      <p className="mt-0.5 text-[14px] font-semibold text-brand-900">
                        {project.areaTotalM2 ? `${number(project.areaTotalM2)} m²` : '—'}
                      </p>
                    </div>
                    <div>
                      <p className="text-[11px] font-medium text-brand-500">Departamento</p>
                      <p className="mt-0.5 text-[14px] font-semibold text-brand-900">
                        {project.departamento ?? '—'}
                      </p>
                    </div>
                    <div>
                      <p className="text-[11px] font-medium text-brand-500 flex items-center gap-1">
                        <CalendarIcon className="h-3 w-3 text-brand-400" />
                        Inicio
                      </p>
                      <p className="mt-0.5 text-[14px] font-semibold text-brand-900">
                        {project.fechaInicio ?? '—'}
                      </p>
                    </div>
                    <div>
                      <p className="text-[11px] font-medium text-brand-500 flex items-center gap-1">
                        <CalendarIcon className="h-3 w-3 text-brand-400" />
                        Fin Est.
                      </p>
                      <p className="mt-0.5 text-[14px] font-semibold text-brand-900">
                        {project.fechaFinEstimada ?? '—'}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-1 flex-col px-5 py-4">
                    {project.descripcion && (
                      <p className="text-xs text-brand-600 mb-4 line-clamp-2">{project.descripcion}</p>
                    )}
                    <div className="mt-auto flex items-center justify-end gap-2 pt-2">
                      <Button
                        size="sm"
                        icon={LayersIcon}
                        onClick={() => handleOpenStages(project)}
                        className="border-brand-200 text-brand-700 hover:bg-brand-50"
                      >
                        Etapas
                      </Button>
                      <Link to="/plano">
                        <Button size="sm" icon={MapIcon} className="border-brand-200 text-brand-800 hover:bg-brand-50">
                          Ver plano
                        </Button>
                      </Link>
                      {canEdit && (
                        <Button
                          size="sm"
                          icon={PencilIcon}
                          onClick={() => handleOpenEdit(project)}
                          className="border-brand-700 text-brand-700 hover:bg-brand-50"
                        >
                          Editar
                        </Button>
                      )}
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </>
      )}

      {tab === 'lotes' && canViewLots && (
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
              value={projectId}
              onChange={(e) => {
                setProjectId(e.target.value);
                setPage(1);
              }}
              aria-label="Filtrar por proyecto"
              className="w-[180px] bg-white border-brand-200 focus:ring-2 focus:ring-brand-500/20"
            >
              <option value="all">Todos los proyectos</option>
              {projects.map((p) => (
                <option key={p.idProyecto} value={String(p.idProyecto)}>
                  {p.nombre}
                </option>
              ))}
            </Select>

            <Select
              value={statusId}
              onChange={(e) => {
                setStatusId(e.target.value);
                setPage(1);
              }}
              aria-label="Filtrar por estado"
              className="w-[160px] bg-white border-brand-200 focus:ring-2 focus:ring-brand-500/20"
            >
              <option value="all">Todos los estados</option>
              {lotStatuses.map((st) => (
                <option key={st.id} value={String(st.id)}>
                  {st.nombre}
                </option>
              ))}
            </Select>

            {hasLoadedLots && lotsLoading && (
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

          {lotsError && (
            <div className="m-5 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              <p className="font-semibold">Error al cargar lotes:</p>
              <p>{lotsError}</p>
            </div>
          )}

          {!hasLoadedLots && lotsLoading ? (
            <div className="flex h-48 items-center justify-center">
              <p className="text-sm font-medium text-brand-600">Buscando lotes en core-service...</p>
            </div>
          ) : pagedLots.length === 0 ? (
            <EmptyState
              title="Sin resultados"
              description="No se encontraron lotes con los filtros aplicados."
            />
          ) : (
            <>
              <Table
                head={
                  <>
                    <TH className="text-brand-900 font-bold bg-brand-50/80">Lote</TH>
                    <TH className="text-brand-900 font-bold bg-brand-50/80">Proyecto</TH>
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
                    <TD className="text-brand-800">{lot.nombreProyecto ?? '—'}</TD>
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
      )}
    </div>
  );
}