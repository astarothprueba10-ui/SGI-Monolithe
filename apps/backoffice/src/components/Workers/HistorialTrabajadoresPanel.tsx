import { useCallback, useEffect, useMemo, useState } from 'react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Table, TD, TH, TR } from '../ui/Table';
import { Badge } from '../ui/Badge';
import { Alert, EmptyState } from '../ui/Feedback';
import { FilterBar } from '../ui/filters/FilterBar';
import { FilterSelect } from '../ui/filters/FilterSelect';
import { FilterDateRange } from '../ui/filters/FilterDateRange';
import { coreService } from '../../services/coreService';
import { ApiError } from '../../lib/apiClient';
import { formatPeruDateTime } from './workerDateUtils';
import type { MovimientoHistorialItem, TrabajadorResponse } from '../../types/workers';
import { RefreshCwIcon } from 'lucide-react';

interface HistorialTrabajadoresPanelProps {
  trabajadores?: TrabajadorResponse[];
}

const TIPOS_EVENTO = [
  { value: 'TODOS', label: 'Todos los movimientos' },
  { value: 'REGISTRO', label: 'Registro' },
  { value: 'CAMBIO_ESTADO', label: 'Cambio de estado' },
  { value: 'CESE', label: 'Cese' },
  { value: 'REINCORPORACION', label: 'Reincorporación' },
  { value: 'SUSPENSION_PROGRAMADA', label: 'Suspensión programada' },
  { value: 'SUSPENSION_INICIO', label: 'Inicio de suspensión' },
  { value: 'SUSPENSION_FIN', label: 'Fin de suspensión' },
  { value: 'SUSPENSION_CANCELADA', label: 'Suspensión cancelada' }
];

export function HistorialTrabajadoresPanel(_props: HistorialTrabajadoresPanelProps) {
  const [movimientos, setMovimientos] = useState<MovimientoHistorialItem[]>([]);
  const [total, setTotal] = useState(0);
  const [totalMostrado, setTotalMostrado] = useState(0);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [busquedaTrabajadorFilter, setBusquedaTrabajadorFilter] = useState('');
  const [responsableFilter, setResponsableFilter] = useState('all');
  const [tipoEventoFilter, setTipoEventoFilter] = useState('TODOS');
  const [fechaDesdeFilter, setFechaDesdeFilter] = useState('');
  const [fechaHastaFilter, setFechaHastaFilter] = useState('');

  const cargarHistorial = useCallback(async () => {
    setCargando(true);
    setError(null);
    try {
      const params = {
        fechaDesde: fechaDesdeFilter || undefined,
        fechaHasta: fechaHastaFilter || undefined
      };
      const data = await coreService.getHistorialTrabajadores(params);
      setMovimientos(Array.isArray(data?.movimientos) ? data.movimientos : []);
      setTotal(data?.total ?? 0);
      setTotalMostrado(data?.totalMostrado ?? (data?.movimientos?.length ?? 0));
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'No se pudo cargar el historial laboral.';
      setError(msg);
      setMovimientos([]);
      setTotal(0);
      setTotalMostrado(0);
    } finally {
      setCargando(false);
    }
  }, [tipoEventoFilter, fechaDesdeFilter, fechaHastaFilter]);

  useEffect(() => {
    void cargarHistorial();
  }, [cargarHistorial]);


  const opcionesResponsables = useMemo(() => {
    const responsables = [
      ...new Set(
        movimientos
          .map((m) => m.responsable?.trim())
          .filter((nombre): nombre is string => Boolean(nombre))
      )
    ].sort((a, b) => a.localeCompare(b, 'es'));

    return [
      { value: 'all', label: 'Todos los responsables' },
      ...responsables.map((nombre) => ({
        value: nombre,
        label: nombre
      }))
    ];
  }, [movimientos]);

  const movimientosFiltrados = useMemo(() => {
    const busqueda = busquedaTrabajadorFilter
      .trim()
      .toLocaleLowerCase('es-PE');

    return movimientos.filter((m) => {
      const textoTrabajador = [
        m.nombreTrabajador,
        m.codigoTrabajador
      ]
        .filter(Boolean)
        .join(' ')
        .toLocaleLowerCase('es-PE');

      const coincideBusqueda =
        !busqueda || textoTrabajador.includes(busqueda);

      const coincideResponsable =
        responsableFilter === 'all' ||
        m.responsable === responsableFilter;

      return coincideBusqueda && coincideResponsable;
    });
  }, [movimientos, busquedaTrabajadorFilter, responsableFilter]);

  const hayFiltrosActivos =
    busquedaTrabajadorFilter.trim() !== '' ||
    responsableFilter !== 'all' ||
    tipoEventoFilter !== 'TODOS' ||
    fechaDesdeFilter !== '' ||
    fechaHastaFilter !== '';

  function limpiarFiltros() {
    setBusquedaTrabajadorFilter('');
    setResponsableFilter('all');
    setTipoEventoFilter('TODOS');
    setFechaDesdeFilter('');
    setFechaHastaFilter('');
  }

  function badgeToneForEvento(tipo: string): 'brand' | 'accent' | 'neutral' {
    if (tipo === 'REGISTRO' || tipo === 'REINCORPORACION') return 'brand';
    if (tipo.includes('SUSPENSION')) return 'accent';
    return 'neutral';
  }

  return (
    <div className="space-y-4">
      <Card>
        <FilterBar>
          <div className="flex w-full flex-col gap-4">


            {/* FILA 1: Buscador, movimiento y responsable */}
            <div className="grid w-full grid-cols-1 items-center gap-4 md:grid-cols-2 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)_minmax(0,1fr)]">

              <div className="min-w-0">
                <input
                  type="search"
                  aria-label="Buscar trabajador"
                  placeholder="Buscar por nombre o código..."
                  value={busquedaTrabajadorFilter}
                  onChange={(e) => setBusquedaTrabajadorFilter(e.target.value)}
                  className="h-11 w-full rounded-lg border border-brand-200 bg-white px-4 text-sm text-brand-900 outline-none focus:border-brand-500"
                />
              </div>

              <div className="min-w-0">
                <FilterSelect
                  id="filtro-hist-tipo"
                  label="Movimiento"
                  value={tipoEventoFilter}
                  onChange={setTipoEventoFilter}
                  options={TIPOS_EVENTO}
                  className="w-48 max-w-full"
                />
              </div>

              <div className="min-w-0">
                <FilterSelect
                  id="filtro-hist-responsable"
                  label="Responsable"
                  value={responsableFilter}
                  onChange={setResponsableFilter}
                  options={opcionesResponsables}
                  className="w-48 max-w-full"
                />
              </div>

            </div>

            {/* FILA 2: Fechas y acciones */}
            <div className="flex flex-wrap items-center gap-x-5 gap-y-3">

              <div className="min-w-0 max-w-full [&>div]:flex-wrap [&>div]:gap-y-3">
                <FilterDateRange
                  idDesde="filtro-hist-desde"
                  idHasta="filtro-hist-hasta"
                  labelDesde="Desde"
                  labelHasta="Hasta"
                  desde={fechaDesdeFilter}
                  hasta={fechaHastaFilter}
                  onChangeDesde={setFechaDesdeFilter}
                  onChangeHasta={setFechaHastaFilter}
                />
              </div>

              <div className="flex flex-wrap items-center gap-2 sm:ml-auto">

                {hayFiltrosActivos && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={limpiarFiltros}
                  >
                    Limpiar filtros
                  </Button>
                )}

                <Button
                  icon={RefreshCwIcon}
                  variant="secondary"
                  size="sm"
                  onClick={cargarHistorial}
                  disabled={cargando}
                >
                  Actualizar
                </Button>

              </div>

            </div>

          </div>
        </FilterBar>



        {totalMostrado < total ? (
          <div className="border-b border-brand-100 bg-brand-50/50 px-5 py-2 text-[12px] text-brand-600">
            Mostrando {totalMostrado} de {total} movimientos registrados.
          </div>
        ) : null}

        {cargando ? (
          <div className="p-8 text-center text-brand-500">Cargando historial laboral...</div>
        ) : error ? (
          <div className="p-6">
            <Alert tone="danger" title="Error al cargar el historial">
              {error}
            </Alert>
          </div>
        ) : movimientosFiltrados.length === 0 ? (<EmptyState
          title="Sin movimientos"
          description={
            hayFiltrosActivos
              ? 'No se encontraron eventos laborales que coincidan con los filtros aplicados.'
              : 'Todavía no existen eventos laborales registrados en el historial.'
          }
        />
        ) : (
          <Table
            head={
              <>
                <TH>Fecha y hora</TH>
                <TH>Trabajador</TH>
                <TH>Movimiento</TH>
                <TH>Estado anterior</TH>
                <TH>Estado nuevo</TH>
                <TH>Responsable</TH>
                <TH>Motivo</TH>
              </>
            }
          >
            {movimientosFiltrados.map((m) => (
              <TR key={m.idEvento}>
                <TD className="tabular text-brand-700 whitespace-nowrap">
                  {formatPeruDateTime(m.fechaEvento)}
                </TD>
                <TD>
                  <p className="font-medium text-brand-900">{m.nombreTrabajador || 'No registrado'}</p>
                  <p className="font-mono text-[11px] text-brand-400">{m.codigoTrabajador}</p>
                </TD>
                <TD>
                  <Badge tone={badgeToneForEvento(m.tipoEvento)}>
                    {m.tipoEvento}
                  </Badge>
                </TD>
                <TD className="text-brand-600">
                  {m.estadoAnterior || 'No registrado'}
                </TD>
                <TD className="text-brand-900 font-medium">
                  {m.estadoNuevo || 'No registrado'}
                </TD>
                <TD className="text-brand-700">
                  {m.responsable || 'No registrado'}
                </TD>
                <TD className="max-w-xs text-brand-600">
                  <span
                    className="block truncate" title={m.motivo ?? undefined}>
                    {m.motivo || 'No registrado'}
                  </span>
                </TD>
              </TR>
            ))}
          </Table>
        )}
      </Card>
    </div>
  );
}
