import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import {
  LayersIcon,
  MapPinIcon,
  SearchIcon
} from 'lucide-react';
import { PageHeader } from '../components/ui/PageHeader';
import { Card, CardHeader } from '../components/ui/Card';
import { SearchInput, Select } from '../components/ui/Field';
import { Badge } from '../components/ui/Badge';
import { EmptyState } from '../components/ui/Feedback';
import { coreService } from '../services/coreService';
import { ApiError } from '../lib/apiClient';
import { area as fmtArea, number } from '../utils/format';
import { cn } from '../utils/cn';
import type {
  ProyectoResponse,
  LoteResponse,
  PlanoInteractivoDetalleResponse
} from '../types/core';

interface StatusFilter {
  code: string;
  label: string;
  dotColor: string;
  badgeStyle: string;
  polygonFill: string;
  polygonStroke: string;
}

const REAL_STATUSES: StatusFilter[] = [
  {
    code: 'DISPONIBLE',
    label: 'Disponibles',
    dotColor: 'bg-emerald-500',
    badgeStyle: 'bg-emerald-50 border-emerald-300 text-emerald-800 hover:bg-emerald-100',
    polygonFill: '#10b981',
    polygonStroke: '#047857'
  },
  {
    code: 'RESERVADO',
    label: 'Reservados',
    dotColor: 'bg-amber-500',
    badgeStyle: 'bg-amber-50 border-amber-300 text-amber-800 hover:bg-amber-100',
    polygonFill: '#f59e0b',
    polygonStroke: '#b45309'
  },
  {
    code: 'VENDIDO',
    label: 'Vendidos',
    dotColor: 'bg-slate-800',
    badgeStyle: 'bg-slate-100 border-slate-400 text-slate-800 hover:bg-slate-200',
    polygonFill: '#1e293b',
    polygonStroke: '#0f172a'
  },
  {
    code: 'BLOQUEADO',
    label: 'Bloqueados',
    dotColor: 'bg-rose-500',
    badgeStyle: 'bg-rose-50 border-rose-300 text-rose-800 hover:bg-rose-100',
    polygonFill: '#f43f5e',
    polygonStroke: '#be123c'
  },
  {
    code: 'NO_DISPONIBLE',
    label: 'No disponibles',
    dotColor: 'bg-gray-400',
    badgeStyle: 'bg-gray-100 border-gray-300 text-gray-700 hover:bg-gray-200',
    polygonFill: '#9ca3af',
    polygonStroke: '#4b5563'
  }
];

function getPolygonColors(codigoEstadoLote?: string | null) {
  const found = REAL_STATUSES.find((s) => s.code === codigoEstadoLote);
  if (found) {
    return { fill: found.polygonFill, stroke: found.polygonStroke };
  }
  return { fill: '#9ca3af', stroke: '#4b5563' };
}

export function LotMap() {
  const [projects, setProjects] = useState<ProyectoResponse[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(null);
  const [lots, setLots] = useState<LoteResponse[]>([]);
  const [planDetail, setPlanDetail] = useState<PlanoInteractivoDetalleResponse | null>(null);
  const [planNotFound, setPlanNotFound] = useState(false);
  const [loadingProjects, setLoadingProjects] = useState(true);
  const [loadingPlan, setLoadingPlan] = useState(false);
  const [selectedLotId, setSelectedLotId] = useState<number | null>(null);

  const [query, setQuery] = useState('');
  const [activeStatuses, setActiveStatuses] = useState<string[]>(
    REAL_STATUSES.map((s) => s.code)
  );

  // Cargar proyectos activos al montar
  useEffect(() => {
    let isMounted = true;
    setLoadingProjects(true);
    coreService
      .getActiveProjects()
      .then((res) => {
        if (!isMounted) return;
        setProjects(res);
        if (res.length > 0) {
          setSelectedProjectId(res[0].idProyecto);
        }
      })
      .catch((err: unknown) => {
        if (!isMounted) return;
        const msg = err instanceof ApiError ? err.message : 'Error al cargar proyectos activos';
        toast.error(msg);
      })
      .finally(() => {
        if (isMounted) setLoadingProjects(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  // Al cambiar de proyecto, cargar lotes y plano en paralelo
  useEffect(() => {
    if (!selectedProjectId) {
      setLots([]);
      setPlanDetail(null);
      setPlanNotFound(false);
      return;
    }

    let isMounted = true;
    setLoadingPlan(true);
    setSelectedLotId(null);
    setPlanNotFound(false);

    Promise.allSettled([
      coreService.searchLots({ idProyecto: selectedProjectId, activo: true }),
      coreService.getCurrentPlanDetail(selectedProjectId)
    ]).then(([lotsResult, planResult]) => {
      if (!isMounted) return;

      if (lotsResult.status === 'fulfilled') {
        setLots(lotsResult.value);
      } else {
        setLots([]);
        const err = lotsResult.reason;
        const msg = err instanceof ApiError ? err.message : 'Error al cargar lotes del proyecto';
        toast.error(msg);
      }

      if (planResult.status === 'fulfilled') {
        setPlanDetail(planResult.value);
        setPlanNotFound(false);
      } else {
        setPlanDetail(null);
        const err = planResult.reason;
        if (err instanceof ApiError && err.status === 404) {
          setPlanNotFound(true);
        } else if (err && typeof err === 'object' && 'status' in err && (err as { status?: number }).status === 404) {
          setPlanNotFound(true);
        } else {
          setPlanNotFound(true);
        }
      }

      setLoadingPlan(false);
    });

    return () => {
      isMounted = false;
    };
  }, [selectedProjectId]);

  const currentProject = useMemo(() => {
    return projects.find((p) => p.idProyecto === selectedProjectId) ?? null;
  }, [projects, selectedProjectId]);

  const counts = useMemo(() => {
    const acc: Record<string, number> = {
      Total: lots.length,
      DISPONIBLE: 0,
      RESERVADO: 0,
      VENDIDO: 0,
      BLOQUEADO: 0,
      NO_DISPONIBLE: 0
    };

    lots.forEach((l) => {
      const st = l.codigoEstadoLote || 'NO_DISPONIBLE';
      if (acc[st] !== undefined) {
        acc[st]++;
      } else {
        acc.NO_DISPONIBLE++;
      }
    });

    return acc;
  }, [lots]);

  const toggleStatus = (code: string) => {
    setActiveStatuses((prev) =>
      prev.includes(code) ? prev.filter((s) => s !== code) : [...prev, code]
    );
  };

  const filteredLotIds = useMemo(() => {
    const q = query.trim().toLowerCase();
    const matches = lots.filter((l) => {
      const matchQuery =
        !q ||
        l.codigo.toLowerCase().includes(q) ||
        (l.numero && l.numero.toLowerCase().includes(q)) ||
        (l.nombreManzana && l.nombreManzana.toLowerCase().includes(q)) ||
        (l.codigoManzana && l.codigoManzana.toLowerCase().includes(q)) ||
        (l.nombreEtapa && l.nombreEtapa.toLowerCase().includes(q));

      const st = l.codigoEstadoLote || 'NO_DISPONIBLE';
      const matchStatus = activeStatuses.includes(st);

      return matchQuery && matchStatus;
    });
    return new Set(matches.map((l) => l.idLote));
  }, [lots, query, activeStatuses]);

  const activeGeometries = useMemo(() => {
    if (!planDetail?.lotes) return [];
    return planDetail.lotes.filter((g) => g.activo);
  }, [planDetail]);

  const manzanaLabels = useMemo(() => {
    const rows = new Map<string, number[]>();

    activeGeometries.forEach((geom) => {
      const lote = lots.find((l) => l.idLote === geom.idLote);

      if (!lote?.codigoManzana || geom.etiquetaY == null) {
        return;
      }

      const values = rows.get(lote.codigoManzana) ?? [];
      values.push(Number(geom.etiquetaY));
      rows.set(lote.codigoManzana, values);
    });

    return Array.from(rows.entries())
      .map(([codigo, ys]) => ({
        codigo,
        y: ys.reduce((sum, value) => sum + value, 0) / ys.length
      }))
      .sort((a, b) => a.y - b.y);
  }, [activeGeometries, lots]);

  const selectedLot = useMemo(() => {
    if (selectedLotId === null) return null;
    return lots.find((l) => l.idLote === selectedLotId) ?? null;
  }, [lots, selectedLotId]);

  if (loadingProjects) {
    return (
      <div className="flex h-64 items-center justify-center">
        <p className="text-brand-500 text-sm">Cargando proyectos...</p>
      </div>
    );
  }

  if (projects.length === 0) {
    return (
      <div>
        <PageHeader
          title="Plano interactivo"
          description="Consulta la disponibilidad del inventario por etapa y manzana."
        />
        <EmptyState
          title="Sin proyectos activos"
          description="No se encontraron proyectos activos registrados en el sistema."
          icon={MapPinIcon}
        />
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Plano interactivo"
        description="Consulta la disponibilidad del inventario por etapa y manzana. Selecciona un lote para ver su información comercial."
        meta={
          currentProject ? (
            <>
              <Badge tone="brand">{currentProject.nombre}</Badge>
              <span className="text-[12px] text-brand-400">
                {number(lots.length)} lotes · {currentProject.distrito || currentProject.provincia || 'Ubicación n/d'}
              </span>
            </>
          ) : undefined
        }
      />

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_340px]">
        <Card>
          <div className="flex flex-wrap items-center gap-3 border-b border-brand-100 px-5 py-3.5">
            <Select
              value={selectedProjectId ?? ''}
              onChange={(e) => setSelectedProjectId(Number(e.target.value))}
              aria-label="Proyecto"
              className="w-[220px]"
            >
              {projects.map((p) => (
                <option key={p.idProyecto} value={p.idProyecto}>
                  {p.nombre}
                </option>
              ))}
            </Select>

            <SearchInput
              value={query}
              onValueChange={setQuery}
              placeholder="Buscar por lote, manzana o etapa..."
              label="Buscar lote"
              className="w-full sm:w-64"
            />

            <div className="ml-auto flex flex-wrap items-center gap-1.5">
              {REAL_STATUSES.map((st) => {
                const on = activeStatuses.includes(st.code);
                const count = counts[st.code] ?? 0;

                return (
                  <button
                    key={st.code}
                    type="button"
                    onClick={() => toggleStatus(st.code)}
                    aria-pressed={on}
                    className={cn(
                      'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[12px] font-medium transition-colors duration-150 ease-smooth',
                      on
                        ? st.badgeStyle
                        : 'border-brand-200 bg-white text-brand-300 hover:text-brand-500'
                    )}
                  >
                    <span className={cn('h-1.5 w-1.5 rounded-full', st.dotColor)} />
                    {st.label}
                    <span className="tabular">{count}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="p-5">
            {loadingPlan ? (
              <div className="flex h-80 items-center justify-center">
                <p className="text-brand-400 text-sm">Cargando plano interactivo...</p>
              </div>
            ) : planNotFound ? (
              <EmptyState
                title="Sin plano interactivo"
                description="Este proyecto aún no tiene un plano interactivo configurado."
                icon={MapPinIcon}
              />
            ) : planDetail ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between border-b border-brand-100 pb-3 text-[13px]">
                  <div className="flex items-center gap-2 font-medium text-brand-700">
                    <LayersIcon className="h-4 w-4 text-brand-400" />
                    <span>Plano V{planDetail.plano.numeroVersion}</span>
                  </div>
                  <span className="text-brand-500 font-medium">
                    Plano V{planDetail.plano.numeroVersion} · {activeGeometries.length} de {lots.length} lotes posicionados
                  </span>
                </div>

                <div className="overflow-auto rounded-xl border border-brand-200 bg-white p-4 shadow-sm">
                  <svg
                    viewBox="0 0 920 720"
                    preserveAspectRatio="xMidYMid meet"
                    className="w-full h-auto min-h-[620px] max-h-[720px] select-none"
                  >
                    <defs>
                      <filter
                        id="lot-shadow"
                        x="-20%"
                        y="-20%"
                        width="140%"
                        height="140%"
                      >
                        <feDropShadow
                          dx="0"
                          dy="2"
                          stdDeviation="2"
                          floodColor="#0f172a"
                          floodOpacity="0.12"
                        />
                      </filter>
                    </defs>

                    {/* Fondo suave */}
                    <rect
                      x="0"
                      y="0"
                      width="920"
                      height="720"
                      rx="18"
                      fill="#f8fafc"
                    />

                    {/* Línea horizontal de separación entre bloques de manzanas */}
                    <line
                      x1="100"
                      y1="275"
                      x2="900"
                      y2="275"
                      stroke="#e2e8f0"
                      strokeWidth="1"
                      strokeDasharray="6 6"
                    />

                    {/* Leyendas de manzanas a la izquierda */}
                    {manzanaLabels.map((row) => (
                      <g key={row.codigo}>
                        <rect
                          x="22"
                          y={row.y - 19}
                          width="64"
                          height="38"
                          rx="11"
                          fill="#ffffff"
                          stroke="#cbd5e1"
                          strokeWidth="1.5"
                        />

                        <text
                          x="54"
                          y={row.y}
                          textAnchor="middle"
                          dominantBaseline="central"
                          fontSize="13"
                          fontWeight="700"
                          fill="#334155"
                          pointerEvents="none"
                        >
                          {row.codigo}
                        </text>
                      </g>
                    ))}

                    {/* Lotes */}
                    {activeGeometries.map((geom) => {
                      const lote = lots.find((l) => l.idLote === geom.idLote);
                      const isMatch = filteredLotIds.has(geom.idLote);
                      const isSelected = selectedLotId === geom.idLote;
                      const colors = getPolygonColors(lote?.codigoEstadoLote);

                      const pointsStr = geom.puntos.map((p) => `${p.x},${p.y}`).join(' ');

                      return (
                        <g key={geom.idLoteGeometria} className="cursor-pointer">
                          <polygon
                            points={pointsStr}
                            fill={colors.fill}
                            stroke={isSelected ? '#2563eb' : colors.stroke}
                            strokeWidth={isSelected ? 3 : 1.75}
                            strokeLinejoin="round"
                            filter="url(#lot-shadow)"
                            opacity={isMatch ? (isSelected ? 1 : 0.9) : 0.18}
                            className="transition-all duration-150 hover:brightness-105"
                            onClick={() => setSelectedLotId(geom.idLote)}
                          >
                            <title>
                              {geom.codigoLote} - {lote?.nombreEstadoLote || lote?.codigoEstadoLote || 'Sin estado'}
                            </title>
                          </polygon>

                          {geom.etiquetaX != null && geom.etiquetaY != null && (
                            <text
                              x={geom.etiquetaX}
                              y={geom.etiquetaY}
                              transform={
                                geom.rotacionEtiqueta
                                  ? `rotate(${geom.rotacionEtiqueta}, ${geom.etiquetaX}, ${geom.etiquetaY})`
                                  : undefined
                              }
                              textAnchor="middle"
                              dominantBaseline="central"
                              fontSize="12"
                              fontWeight="700"
                              fill="#ffffff"
                              pointerEvents="none"
                              opacity={isMatch ? 1 : 0.3}
                            >
                              {geom.codigoLote}
                            </text>
                          )}
                        </g>
                      );
                    })}
                  </svg>
                </div>
              </div>
            ) : (
              <EmptyState
                title="Sin datos de plano"
                description="No se pudo cargar la información del plano interactivo."
                icon={MapPinIcon}
              />
            )}
          </div>
        </Card>

        {/* Panel lateral de lote seleccionado */}
        <Card className="h-fit xl:sticky xl:top-6">
          <CardHeader
            title={selectedLot ? `Lote ${selectedLot.codigo}` : 'Detalle del lote'}
            description={
              selectedLot
                ? `${selectedLot.nombreManzana || selectedLot.codigoManzana || ''} · ${selectedLot.nombreEtapa || selectedLot.codigoEtapa || ''}`
                : undefined
            }
          />

          {!selectedLot ? (
            <EmptyState
              title="Selecciona un lote"
              description="Haz clic en cualquier polígono del plano para ver la ficha del lote."
              icon={SearchIcon}
            />
          ) : (
            <dl className="divide-y divide-brand-50">
              <div className="flex items-baseline justify-between gap-3 px-5 py-2.5">
                <dt className="text-[12px] text-brand-400">Código</dt>
                <dd className="text-right text-[13px] font-medium text-brand-800">
                  {selectedLot.codigo}
                </dd>
              </div>

              <div className="flex items-baseline justify-between gap-3 px-5 py-2.5">
                <dt className="text-[12px] text-brand-400">Número</dt>
                <dd className="text-right text-[13px] font-medium text-brand-800">
                  {selectedLot.numero || '-'}
                </dd>
              </div>

              <div className="flex items-baseline justify-between gap-3 px-5 py-2.5">
                <dt className="text-[12px] text-brand-400">Etapa</dt>
                <dd className="text-right text-[13px] font-medium text-brand-800">
                  {selectedLot.nombreEtapa || selectedLot.codigoEtapa || '-'}
                </dd>
              </div>

              <div className="flex items-baseline justify-between gap-3 px-5 py-2.5">
                <dt className="text-[12px] text-brand-400">Manzana</dt>
                <dd className="text-right text-[13px] font-medium text-brand-800">
                  {selectedLot.nombreManzana || selectedLot.codigoManzana || '-'}
                </dd>
              </div>

              <div className="flex items-baseline justify-between gap-3 px-5 py-2.5">
                <dt className="text-[12px] text-brand-400">Zona</dt>
                <dd className="text-right text-[13px] font-medium text-brand-800">
                  {selectedLot.nombreZona || selectedLot.codigoZona || '-'}
                </dd>
              </div>

              <div className="flex items-baseline justify-between gap-3 px-5 py-2.5">
                <dt className="text-[12px] text-brand-400">Tipo</dt>
                <dd className="text-right text-[13px] font-medium text-brand-800">
                  {selectedLot.nombreTipoLote || selectedLot.codigoTipoLote || '-'}
                </dd>
              </div>

              <div className="flex items-baseline justify-between gap-3 px-5 py-2.5">
                <dt className="text-[12px] text-brand-400">Área</dt>
                <dd className="text-right text-[13px] font-medium text-brand-800">
                  {selectedLot.areaM2 != null ? fmtArea(selectedLot.areaM2) : '-'}
                </dd>
              </div>

              <div className="flex items-baseline justify-between gap-3 px-5 py-2.5">
                <dt className="text-[12px] text-brand-400">Estado</dt>
                <dd className="text-right text-[13px] font-medium text-brand-800">
                  {selectedLot.nombreEstadoLote || selectedLot.codigoEstadoLote || '-'}
                </dd>
              </div>

              <div className="flex items-baseline justify-between gap-3 px-5 py-2.5">
                <dt className="text-[12px] text-brand-400">Activo</dt>
                <dd className="text-right text-[13px] font-medium text-brand-800">
                  {selectedLot.activo ? 'Sí' : 'No'}
                </dd>
              </div>
            </dl>
          )}
        </Card>
      </div>
    </div>
  );
}