
import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { PageHeader } from '../components/ui/PageHeader';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { SearchInput } from '../components/ui/Field';
import { Table, TD, TH, TR } from '../components/ui/Table';
import { Badge } from '../components/ui/Badge';
import { EmptyState } from '../components/ui/Feedback';
import { Tabs } from '../components/ui/Tabs';
import { coreService } from '../services/coreService';
import type { CatalogosTrabajadorResponse, MetricasTrabajadoresResponse, TrabajadorResponse } from '../types/workers';
import { EyeIcon, PencilIcon, PlusIcon, UserCheckIcon } from 'lucide-react';
import { IconButton } from '../components/ui/Button';
import { Gate } from '../components/auth/PermissionRoute';
import { useAuth } from '../contexts/AuthContext';
import { NewWorkerModal } from '../components/Workers/NewWorkerModal';
import { EditWorkerModal } from '../components/Workers/EditWorkerModal';
import { WorkerDetailModal } from '../components/Workers/WorkerDetailModal';
import { ReincorporarWorkerModal } from '../components/Workers/ReincorporarWorkerModal';
import { CorreccionesPendientesPanel } from '../components/Workers/CorreccionesPendientesPanel';
import { ReincorporacionesPanel } from '../components/Workers/ReincorporacionesPanel';
import { HistorialTrabajadoresPanel } from '../components/Workers/HistorialTrabajadoresPanel';
import { FilterBar } from '../components/ui/filters/FilterBar';
import { FilterSelect } from '../components/ui/filters/FilterSelect';
import { FilterDateRange } from '../components/ui/filters/FilterDateRange';
import { formatWorkerDate } from '../components/Workers/workerForm';

function nombreCompleto(trabajador: TrabajadorResponse): string {
  const persona = trabajador.informacionPersonal;

  return [
    persona.nombres,
    persona.apellidoPaterno,
    persona.apellidoMaterno
  ].filter(Boolean).join(' ');
}

function obtenerIniciales(nombre: string): string {
  return nombre
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((parte) => parte.charAt(0).toUpperCase())
    .join('');
}

export function Workers() {
  const { can } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = searchParams.get('tab');
  const [activeTab, setActiveTab] = useState<'trabajadores' | 'correcciones' | 'reincorporaciones' | 'historial'>(() => {
    if (tabParam === 'reincorporaciones' || tabParam === 'correcciones' || tabParam === 'historial') return tabParam;
    return 'trabajadores';
  });
  const [trabajadores, setTrabajadores] =
    useState<TrabajadorResponse[]>([]);
  const [pendingReincIds, setPendingReincIds] = useState<Set<number>>(new Set());
  const [catalogos, setCatalogos] = useState<CatalogosTrabajadorResponse | null>(null);
  const [metricas, setMetricas] = useState<MetricasTrabajadoresResponse | null>(null);

  const [query, setQuery] = useState('');
  const [areaFilter, setAreaFilter] = useState('all');
  const [cargoFilter, setCargoFilter] = useState('all');
  const [estadoFilter, setEstadoFilter] = useState('all');
  const [fechaDesdeFilter, setFechaDesdeFilter] = useState('');
  const [fechaHastaFilter, setFechaHastaFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [errorMetricas, setErrorMetricas] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [newWorkerOpen, setNewWorkerOpen] = useState(false);
  const [workerDetailId, setWorkerDetailId] = useState<number | null>(null);
  const [workerEditId, setWorkerEditId] = useState<number | null>(null);
  const [reincorporarWorker, setReincorporarWorker] = useState<TrabajadorResponse | null>(null);

  useEffect(() => {
    let active = true;
    coreService.getWorkerCatalogs()
      .then((data) => {
        if (active) setCatalogos(data);
      })
      .catch(() => {
        if (active) setCatalogos(null);
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let activo = true;

    async function cargarTrabajadores() {
      setLoading(true);
      setError(null);
      setErrorMetricas(null);

      try {
        const [resultado, resReinc, resMetricas] = await Promise.all([
          coreService.getWorkers(),
          coreService.listarReincorporaciones({ estado: 'PENDIENTE' }).catch(() => ({
            solicitudes: [],
            totalMostrado: 0
          })),
          coreService.getMetricasTrabajadores().catch((err) => {
            if (activo) {
              setErrorMetricas(err instanceof Error ? err.message : 'No se pudieron obtener las metricas.');
            }
            return null;
          })
        ]);

        if (activo) {
          setTrabajadores(resultado);
          setPendingReincIds(new Set(resReinc.solicitudes.map((s) => s.idTrabajador)));
          setMetricas(resMetricas);
        }
      } catch (err) {
        if (activo) {
          setTrabajadores([]);

          setError(
            err instanceof Error
              ? err.message
              : 'No se pudieron consultar los trabajadores.'
          );
        }
      } finally {
        if (activo) {
          setLoading(false);
        }
      }
    }

    void cargarTrabajadores();

    return () => {
      activo = false;
    };
  }, [reloadKey]);

  // =========================================
  // 2. INDICADORES REALES (sin fallbacks inventados)
  // =========================================

  const indicadores = [
    {
      label: 'Nuevos trabajadores',
      value: loading ? '—' : metricas ? String(metricas.nuevosTrabajadores) : errorMetricas ? 'Error' : '—'
    },
    {
      label: 'Reincorporaciones aprobadas',
      value: loading ? '—' : metricas ? String(metricas.reincorporacionesAprobadas) : errorMetricas ? 'Error' : '—'
    },
    {
      label: 'Suspendidos actuales',
      value: loading ? '—' : metricas ? String(metricas.suspendidosActuales) : errorMetricas ? 'Error' : '—'
    },
    {
      label: 'Ceses registrados',
      value: loading ? '—' : metricas ? String(metricas.cesesRegistrados) : errorMetricas ? 'Error' : '—'
    }
  ];

  // =========================================
  // 3. FILTROS
  // =========================================

  const areas = useMemo(() => {
    return Array.from(
      new Set(
        trabajadores.map(
          (t) => t.informacionLaboral.area
        )
      )
    ).sort();
  }, [trabajadores]);

  const cargos = useMemo(() => {
    return Array.from(
      new Set(
        trabajadores.map(
          (t) => t.informacionLaboral.cargo
        )
      )
    ).sort();
  }, [trabajadores]);

  const rows = useMemo(() => {
    const texto = query.trim().toLowerCase();

    return trabajadores.filter((trabajador) => {
      const personal = trabajador.informacionPersonal;
      const laboral = trabajador.informacionLaboral;

      const coincideArea =
        areaFilter === 'all' ||
        laboral.area === areaFilter;

      const coincideCargo =
        cargoFilter === 'all' ||
        laboral.cargo === cargoFilter;

      const coincideEstado =
        estadoFilter === 'all' ||
        laboral.codigoEstadoTrabajador === estadoFilter;

      let coincideFecha = true;
      if (fechaDesdeFilter || fechaHastaFilter) {
        const fechaIngreso = laboral.fechaIngreso ? laboral.fechaIngreso.slice(0, 10) : '';
        if (!fechaIngreso) {
          coincideFecha = false;
        } else {
          if (fechaDesdeFilter && fechaIngreso < fechaDesdeFilter) coincideFecha = false;
          if (fechaHastaFilter && fechaIngreso > fechaHastaFilter) coincideFecha = false;
        }
      }

      const coincideBusqueda =
        texto.length === 0 ||
        nombreCompleto(trabajador)
          .toLowerCase()
          .includes(texto) ||
        laboral.cargo.toLowerCase().includes(texto) ||
        trabajador.codigo.toLowerCase().includes(texto) ||
        (personal.numeroDocumento ?? '').includes(texto);

      return coincideArea && coincideCargo && coincideEstado && coincideFecha && coincideBusqueda;
    });
  }, [trabajadores, query, areaFilter, cargoFilter, estadoFilter, fechaDesdeFilter, fechaHastaFilter]);

  const hayFiltrosActivos = query !== '' || areaFilter !== 'all' || cargoFilter !== 'all' || estadoFilter !== 'all' || fechaDesdeFilter !== '' || fechaHastaFilter !== '';

  function limpiarFiltros() {
    setQuery('');
    setAreaFilter('all');
    setCargoFilter('all');
    setEstadoFilter('all');
    setFechaDesdeFilter('');
    setFechaHastaFilter('');
  }

  const estadosDisponibles = useMemo(() => {
    const codigos = Array.from(new Set(trabajadores.map((t) => t.informacionLaboral.codigoEstadoTrabajador)));
    return codigos.map((codigo) => {
      const t = trabajadores.find((w) => w.informacionLaboral.codigoEstadoTrabajador === codigo);
      return { value: codigo, label: t?.informacionLaboral.estadoTrabajador ?? codigo };
    }).sort((a, b) => a.label.localeCompare(b.label));
  }, [trabajadores]);

  const tabs = useMemo(() => [
    { id: 'trabajadores', label: 'Listado de trabajadores', count: trabajadores.length },
    ...(can('hr.approve') ? [{ id: 'correcciones', label: 'Correcciones pendientes' }] : []),
    ...(can('hr.view') ? [{ id: 'reincorporaciones', label: 'Reincorporaciones' }] : []),
    ...(can('hr.view') ? [{ id: 'historial', label: 'Historial' }] : [])
  ], [trabajadores.length, can]);

  useEffect(() => {
    if (tabParam === 'reincorporaciones' || tabParam === 'correcciones' || tabParam === 'trabajadores' || tabParam === 'historial') {
      setActiveTab(tabParam);
    }
  }, [tabParam]);

  function handleTabChange(id: string) {
    const newTab = id as 'trabajadores' | 'correcciones' | 'reincorporaciones' | 'historial';
    setActiveTab(newTab);
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (newTab === 'trabajadores') {
        next.delete('tab');
      } else {
        next.set('tab', newTab);
      }
      return next;
    });
  }

  // --- INTERFAZ ---

  return (
    <div>
      <PageHeader
        title="Trabajadores"
        description="Gestión de trabajadores, información laboral, áreas, cargos y estados."
        actions={
          activeTab === 'trabajadores' ? (
            <Gate permission="hr.create">
              <Button
                icon={PlusIcon}
                variant="primary"
                onClick={() => setNewWorkerOpen(true)}
              >
                Nuevo trabajador
              </Button>
            </Gate>
          ) : null
        }
      />

      <Tabs
        items={tabs}
        active={activeTab}
        onChange={handleTabChange}
        className="mb-5"
      />

      {activeTab === 'correcciones' ? (
        <CorreccionesPendientesPanel
          onSuccessAction={() => setReloadKey((k) => k + 1)}
        />
      ) : activeTab === 'reincorporaciones' ? (
        <ReincorporacionesPanel
          onSuccessAction={() => setReloadKey((k) => k + 1)}
        />
      ) : activeTab === 'historial' ? (
        <HistorialTrabajadoresPanel trabajadores={trabajadores} />
      ) : (
        <>
          <div className="mb-5 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {indicadores.map((item) => (
              <Card key={item.label} className="p-5">
                <p className="text-[12px] text-brand-400">
                  {item.label}
                </p>

                <p className="mt-1.5 text-[22px] font-semibold tabular text-brand-900">
                  {loading ? '—' : item.value}
                </p>
              </Card>
            ))}
          </div>

          {errorMetricas ? (
            <p className="mb-4 text-[12px] text-amber-700 bg-amber-50 border border-amber-200 rounded-md px-3 py-1.5">
              No se pudieron actualizar las métricas: {errorMetricas}
            </p>
          ) : null}

          <Card>
            <FilterBar>
              <SearchInput
                value={query}
                onValueChange={setQuery}
                placeholder="Buscar nombre, DNI, código o cargo..."
                className="w-full sm:w-72"
              />

              <FilterSelect
                id="filtro-area"
                label="Área"
                value={areaFilter}
                onChange={setAreaFilter}
                options={[
                  { value: 'all', label: 'Todas las áreas' },
                  ...areas.map((area) => ({ value: area, label: area }))
                ]}
              />

              <FilterSelect
                id="filtro-cargo"
                label="Cargo"
                value={cargoFilter}
                onChange={setCargoFilter}
                options={[
                  { value: 'all', label: 'Todos los cargos' },
                  ...cargos.map((cargo) => ({ value: cargo, label: cargo }))
                ]}
              />

              <FilterSelect
                id="filtro-estado"
                label="Estado"
                value={estadoFilter}
                onChange={setEstadoFilter}
                options={[
                  { value: 'all', label: 'Todos los estados' },
                  ...estadosDisponibles
                ]}
              />

              <FilterDateRange
                idDesde="filtro-ingreso-desde"
                idHasta="filtro-ingreso-hasta"
                labelDesde="Ingreso desde"
                labelHasta="Hasta"
                desde={fechaDesdeFilter}
                hasta={fechaHastaFilter}
                onChangeDesde={setFechaDesdeFilter}
                onChangeHasta={setFechaHastaFilter}
              />

              {hayFiltrosActivos ? (
                <Button variant="ghost" size="sm" onClick={limpiarFiltros}>
                  Limpiar filtros
                </Button>
              ) : null}
            </FilterBar>

        {loading ? (
          <div className="p-8 text-center text-brand-500">
            Cargando trabajadores...
          </div>
        ) : error ? (
          <div className="space-y-4 p-8 text-center">
            <p className="text-rose-700">
              No se pudieron cargar los trabajadores: {error}
            </p>

            <Button
              size="sm"
              onClick={() => setReloadKey((valor) => valor + 1)}
            >
              Reintentar
            </Button>
          </div>
        ) : rows.length === 0 ? (
          <EmptyState
            title="Sin trabajadores"
            description={
              trabajadores.length === 0
                ? 'Todavía no existen trabajadores registrados.'
                : 'No hay trabajadores que coincidan con los filtros.'
            }
          />
        ) : (
          <Table
            head={
              <>
                <TH>Fecha de creación</TH>
                <TH>Fecha de ingreso</TH>
                <TH>Trabajador</TH>
                <TH>Documento</TH>
                <TH>Área</TH>
                <TH>Cargo</TH>
                <TH className="text-center">Ficha</TH>
                <TH>Estado</TH>
                <TH className="text-center">Acciones</TH>
              </>
            }
          >
            {rows.map((trabajador) => {
              const personal = trabajador.informacionPersonal;
              const laboral = trabajador.informacionLaboral;
              const nombre = nombreCompleto(trabajador);
              const tipoDocumento = catalogos?.tiposDocumento.find(
                (tipo) => tipo.idTipoDocumento === personal.idTipoDocumento
              );

              return (
                <TR key={trabajador.idTrabajador}>
                  <TD className="whitespace-nowrap">{formatWorkerDate(trabajador.fechaCreacion)}</TD>
                  <TD className="whitespace-nowrap">{formatWorkerDate(laboral.fechaIngreso)}</TD>
                  <TD>
                    <div className="flex items-center gap-2.5">
                      <span className="flex h-7 w-7 items-center justify-center rounded-full bg-brand-50 text-[11px] font-semibold text-brand-600">
                        {obtenerIniciales(nombre)}
                      </span>

                      <span>
                        <span className="block font-medium text-brand-900">
                          {nombre}
                        </span>

                        <span className="block text-[11px] text-brand-300">
                          {trabajador.codigo}
                        </span>
                      </span>
                    </div>
                  </TD>

                  <TD>
                    <span className="block text-[11px] text-brand-400">
                      {tipoDocumento?.codigo || tipoDocumento?.nombre || '—'}
                    </span>
                    <span className="font-mono text-[13px] text-brand-800">
                      {personal.numeroDocumento || '—'}
                    </span>
                  </TD>

                  <TD className="text-brand-500">
                    {laboral.area}
                  </TD>

                  <TD>{laboral.cargo}</TD>

                  <TD className="text-center">
                    <Gate permission="hr.view">
                      <IconButton
                        icon={EyeIcon}
                        label={`Ver ficha de ${nombre}`}
                        onClick={() => setWorkerDetailId(trabajador.idTrabajador)}
                        className="mx-auto"
                      />
                    </Gate>
                  </TD>

                  <TD>
                    {laboral.codigoEstadoTrabajador === 'CESADO' && pendingReincIds.has(trabajador.idTrabajador) ? (
                      <Badge tone="accent">Reincorporación pendiente</Badge>
                    ) : (
                      <Badge
                        tone={
                          laboral.codigoEstadoTrabajador === 'ACTIVO'
                            ? 'brand'
                            : laboral.codigoEstadoTrabajador === 'EN_VERIFICACION'
                            ? 'accent'
                            : 'neutral'
                        }
                      >
                        {laboral.estadoTrabajador}
                      </Badge>
                    )}
                  </TD>

                  <TD className="text-center">
                    <div className="flex items-center justify-center gap-1">
                      {laboral.codigoEstadoTrabajador === 'CESADO' &&
                       !pendingReincIds.has(trabajador.idTrabajador) && (
                        <Gate permission="hr.edit">
                          <IconButton
                            icon={UserCheckIcon}
                            label={`Solicitar reincorporación para ${nombre}`}
                            onClick={() => setReincorporarWorker(trabajador)}
                          />
                        </Gate>
                      )}
                      <Gate permission="hr.edit">
                        <IconButton
                          icon={PencilIcon}
                          label={`Editar ${nombre}`}
                          onClick={() => setWorkerEditId(trabajador.idTrabajador)}
                        />
                      </Gate>
                    </div>
                  </TD>
                </TR>
              );
            })}
          </Table>
        )}
      </Card>
      </>
      )}

      <NewWorkerModal
        open={newWorkerOpen}
        onClose={() => setNewWorkerOpen(false)}
        onSuccess={() => {
          setNewWorkerOpen(false);
          setReloadKey((k) => k + 1);
        }}
      />

      <WorkerDetailModal
        open={workerDetailId !== null}
        workerId={workerDetailId}
        onClose={() => setWorkerDetailId(null)}
      />

      <EditWorkerModal
        open={workerEditId !== null}
        workerId={workerEditId}
        onClose={() => setWorkerEditId(null)}
        onSuccess={() => {
          setWorkerEditId(null);
          setReloadKey((k) => k + 1);
        }}
        onPartialUpdate={() => setReloadKey((k) => k + 1)}
      />

      <ReincorporarWorkerModal
        open={reincorporarWorker !== null}
        worker={reincorporarWorker}
        onClose={() => setReincorporarWorker(null)}
        onSuccess={() => {
          setReincorporarWorker(null);
          setReloadKey((k) => k + 1);
        }}
      />
    </div>
  );
}
