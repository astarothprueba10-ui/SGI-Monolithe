import { useState, useEffect, useMemo, useCallback } from 'react';
import { toast } from 'sonner';
import {
  RotateCcw,
  CheckCircle,
  XCircle,
  Clock,
  TrendingUp,
  Search,
  RefreshCw,
  Eye,
  Award,
  ListOrdered,
  Image as ImageIcon,
  AlertCircle
} from 'lucide-react';
import { Card, CardHeader } from '../ui/Card';
import { Button } from '../ui/Button';
import { Table, TH, TR, TD } from '../ui/Table';
import { StatusBadge } from '../ui/Badge';
import { Pagination } from '../ui/Pagination';
import { Modal } from '../ui/Modal';
import { EmptyState } from '../ui/Feedback';
import {
  crmBackend,
  type CrmAdvisor,
  type CrmSolicitudRetroceso,
  type CrmIndicadoresRetroceso
} from '../../services/crmBackend';

interface Props {
  rangoPeriodo: { desde: string; hastaExclusivo: string } | null;
  onDecisionSuccess?: () => void;
}

function formatearFecha(dateStr: string | null | undefined): string {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return new Intl.DateTimeFormat('es-PE', {
    timeZone: 'America/Lima',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  }).format(d);
}

function mapearEstadoBadge(estado: string): 'Pendiente' | 'Aprobado' | 'Rechazado' {
  if (estado === 'APROBADA') return 'Aprobado';
  if (estado === 'RECHAZADA') return 'Rechazado';
  return 'Pendiente';
}

function calcularHastaExclusivoLima(fechaStr: string): string {
  const d = new Date(`${fechaStr}T12:00:00-05:00`);
  d.setDate(d.getDate() + 1);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}T00:00:00-05:00`;
}

function IndicadorCard({
  titulo, valor, subtitulo, icon: Icon, color
}: {
  titulo: string; valor: string | number; subtitulo?: string; icon: React.ElementType; color: string;
}) {
  return (
    <div className="rounded-lg border border-brand-100 bg-white p-4 shadow-card">
      <div className="flex items-start justify-between gap-3">
        <p className="text-[12px] font-medium text-brand-400">{titulo}</p>
        <span className={`flex h-7 w-7 items-center justify-center rounded-md ${color}`}>
          <Icon className="h-4 w-4" aria-hidden="true" />
        </span>
      </div>
      <p className="mt-2 text-[22px] font-semibold leading-7 text-brand-900 tabular">{valor}</p>
      {subtitulo && <p className="mt-1 text-[11px] text-slate-500">{subtitulo}</p>}
    </div>
  );
}

function MiniDashboard({
  indicadores,
  solicitudes
}: {
  indicadores: CrmIndicadoresRetroceso | null;
  solicitudes: CrmSolicitudRetroceso[];
}) {
  const pendientes = indicadores?.pendientes ?? 0;
  const aprobadas = indicadores?.aprobadas ?? 0;
  const rechazadas = indicadores?.rechazadas ?? 0;
  const total = indicadores?.total ?? (pendientes + aprobadas + rechazadas);
  const tasa = total > 0 ? Math.round((aprobadas / total) * 100) : 0;

  const rankingAsesores = useMemo(() => {
    const mapa = new Map<string, number>();
    solicitudes
      .filter((s) => s.estado === 'APROBADA')
      .forEach((s) => {
        const nom = s.nombre_asesor || s.asesor_nombre || 'Asesor desconocido';
        mapa.set(nom, (mapa.get(nom) || 0) + 1);
      });
    return Array.from(mapa.entries())
      .map(([asesor, cantidad]) => ({ asesor, cantidad }))
      .sort((a, b) => b.cantidad - a.cantidad)
      .slice(0, 3);
  }, [solicitudes]);

  const motivosFrecuentes = useMemo(() => {
    const mapa = new Map<string, number>();
    solicitudes
      .filter((s) => s.estado === 'APROBADA')
      .forEach((s) => {
        const mot = s.motivo_nombre || s.motivo_codigo || 'Otro motivo';
        mapa.set(mot, (mapa.get(mot) || 0) + 1);
      });
    return Array.from(mapa.entries())
      .map(([motivo, cantidad]) => ({ motivo, cantidad }))
      .sort((a, b) => b.cantidad - a.cantidad)
      .slice(0, 3);
  }, [solicitudes]);

  return (
    <div className="space-y-4 mb-5">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <IndicadorCard titulo="Total solicitudes" valor={total} icon={RotateCcw} color="bg-brand-50 text-brand-600" />
        <IndicadorCard titulo="Pendientes" valor={pendientes} icon={Clock} color="bg-amber-50 text-amber-600" />
        <IndicadorCard titulo="Aprobadas" valor={aprobadas} icon={CheckCircle} color="bg-emerald-50 text-emerald-600" />
        <IndicadorCard titulo="Rechazadas" valor={rechazadas} icon={XCircle} color="bg-rose-50 text-rose-600" />
        <IndicadorCard titulo="Tasa de aprobacion" valor={`${tasa}%`} subtitulo="Del total resuelto" icon={TrendingUp} color="bg-sky-50 text-sky-600" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-3 text-sm font-semibold text-brand-900">
            <ListOrdered className="h-4 w-4 text-brand-600" />
            <span>Motivos frecuentes de retroceso aprobado</span>
          </div>
          {motivosFrecuentes.length === 0 ? (
            <p className="text-xs text-slate-500 italic">No hay retrocesos aprobados en el periodo.</p>
          ) : (
            <ul className="divide-y divide-slate-100 text-xs">
              {motivosFrecuentes.map((m, idx) => (
                <li key={idx} className="py-1.5 flex justify-between items-center">
                  <span className="text-slate-700 truncate pr-2">{m.motivo}</span>
                  <span className="font-semibold text-brand-700 tabular bg-brand-50 px-2 py-0.5 rounded">
                    {m.cantidad}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-2 mb-3 text-sm font-semibold text-brand-900">
            <Award className="h-4 w-4 text-amber-600" />
            <span>Ranking de asesores (retrocesos aprobados)</span>
          </div>
          {rankingAsesores.length === 0 ? (
            <p className="text-xs text-slate-500 italic">Sin datos de asesores en el periodo.</p>
          ) : (
            <ul className="divide-y divide-slate-100 text-xs">
              {rankingAsesores.map((a, idx) => (
                <li key={idx} className="py-1.5 flex justify-between items-center">
                  <span className="text-slate-700 truncate pr-2">{a.asesor}</span>
                  <span className="font-semibold text-amber-700 tabular bg-amber-50 px-2 py-0.5 rounded">
                    {a.cantidad}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}

function VisorEvidenciaModal({
  url,
  open,
  onClose,
  idSolicitud
}: {
  url: string | null;
  open: boolean;
  onClose: () => void;
  idSolicitud: number | null;
}) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Evidencia fotografica - Solicitud #${idSolicitud}`}
      footer={<Button variant="secondary" onClick={onClose}>Cerrar</Button>}
    >
      <div className="flex items-center justify-center p-2 bg-slate-900/5 rounded-lg min-h-[250px] max-h-[70vh] overflow-hidden">
        {url ? (
          <img src={url} alt="Evidencia fotografica" className="max-h-[65vh] max-w-full object-contain rounded" />
        ) : (
          <div className="p-8 text-xs text-slate-500 flex items-center gap-2">
            <RefreshCw className="h-4 w-4 animate-spin text-brand-600" />
            <span>Cargando imagen de evidencia...</span>
          </div>
        )}
      </div>
    </Modal>
  );
}

function RevisionModal({
  solicitud,
  open,
  onClose,
  onDecision,
  onVerEvidencia
}: {
  solicitud: CrmSolicitudRetroceso | null;
  open: boolean;
  onClose: () => void;
  onDecision: (aprobar: boolean, obs: string) => Promise<void>;
  onVerEvidencia: (id: number) => void;
}) {
  const [observacion, setObservacion] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [errorObs, setErrorObs] = useState('');

  useEffect(() => {
    if (open) {
      setObservacion('');
      setErrorObs('');
      setEnviando(false);
    }
  }, [open]);

  if (!solicitud) return null;
  const esPendiente = solicitud.estado === 'PENDIENTE';
  const tieneEvidencia = Boolean(solicitud.tiene_evidencia);

  const handleResolver = async (aprobar: boolean) => {
    const obsLimpia = observacion.trim();
    if (!aprobar && obsLimpia.length < 10) {
      setErrorObs('Para rechazar, debe ingresar una observacion de minimo 10 caracteres.');
      return;
    }
    setErrorObs('');
    setEnviando(true);
    try {
      await onDecision(aprobar, obsLimpia);
      onClose();
    } catch {
      // toast manejado en caller
    } finally {
      setEnviando(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Revision de solicitud de retroceso"
      description={`Solicitud #${solicitud.id_solicitud} - Prospecto ${solicitud.codigo_prospecto || solicitud.prospecto_codigo}`}
      footer={
        <div className="flex justify-between w-full items-center">
          <Button variant="secondary" onClick={onClose} disabled={enviando}>
            Cerrar
          </Button>
          {esPendiente ? (
            <div className="flex gap-2">
              <Button
                variant="danger"
                onClick={() => handleResolver(false)}
                disabled={enviando}
              >
                {enviando ? 'Procesando...' : 'Rechazar retroceso'}
              </Button>
              <Button
                variant="primary"
                onClick={() => handleResolver(true)}
                disabled={enviando || !tieneEvidencia}
                title={!tieneEvidencia ? 'Requiere evidencia fotografica para aprobar' : undefined}
              >
                {enviando ? 'Procesando...' : 'Aprobar retroceso'}
              </Button>
            </div>
          ) : (
            <span className="text-xs text-slate-500 font-medium">
              Esta solicitud ya fue resuelta como {solicitud.estado}.
            </span>
          )}
        </div>
      }
    >
      <div className="space-y-3 text-sm">
        <div className="grid grid-cols-2 gap-2 bg-slate-50 p-3 rounded-md">
          <div><span className="text-xs text-slate-500 block">Prospecto:</span> <span className="font-medium text-slate-800">{solicitud.nombre_prospecto || solicitud.prospecto_nombre}</span></div>
          <div><span className="text-xs text-slate-500 block">Asesor solicitante:</span> <span className="font-medium text-slate-800">{solicitud.nombre_asesor || solicitud.asesor_nombre}</span></div>
          <div><span className="text-xs text-slate-500 block">Fecha solicitud:</span> <span className="font-medium text-slate-800">{formatearFecha(solicitud.fecha_solicitud)}</span></div>
          <div><span className="text-xs text-slate-500 block">Estado actual solicitud:</span> <StatusBadge status={mapearEstadoBadge(solicitud.estado)} /></div>
        </div>

        <div className="border border-brand-100 rounded-md p-3 bg-brand-50/30">
          <div className="flex items-center gap-2 text-xs font-semibold text-brand-900 mb-1">
            <span>Transicion solicitada:</span>
            <span className="px-2 py-0.5 bg-amber-100 text-amber-900 rounded font-bold">{solicitud.nombre_etapa_origen || solicitud.etapa_origen || solicitud.estado_origen_nombre || solicitud.estado_origen_codigo}</span>
            <span>-&gt;</span>
            <span className="px-2 py-0.5 bg-sky-100 text-sky-900 rounded font-bold">{solicitud.nombre_etapa_destino || solicitud.etapa_destino || solicitud.estado_destino_nombre || solicitud.estado_destino_codigo}</span>
          </div>
          <div className="mt-2 text-xs text-slate-700">
            <span className="font-semibold block">Motivo:</span>
            <span>{solicitud.motivo_nombre || solicitud.motivo_codigo}</span>
          </div>
          <div className="mt-2 text-xs text-slate-700">
            <span className="font-semibold block">Explicacion del asesor:</span>
            <p className="mt-0.5 whitespace-pre-wrap bg-white p-2 rounded border border-slate-200 text-slate-800">
              {solicitud.motivo_detallado || 'Sin explicacion detallada.'}
            </p>
          </div>
        </div>

        {/* SECCION EVIDENCIA FOTOGRAFICA */}
        <div className="p-3 rounded-md border border-slate-200 bg-slate-50 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ImageIcon className="h-4 w-4 text-brand-600" />
            <div>
              <span className="text-xs font-semibold text-slate-800 block">Evidencia fotografica:</span>
              <span className="text-xs text-slate-500">
                {tieneEvidencia ? 'Fotografia adjuntada por el asesor' : 'Evidencia pendiente (sin fotografia)'}
              </span>
            </div>
          </div>
          {tieneEvidencia ? (
            <Button
              size="sm"
              variant="secondary"
              onClick={() => onVerEvidencia(solicitud.id_solicitud)}
            >
              <Eye className="h-3.5 w-3.5 mr-1" />
              Ver evidencia
            </Button>
          ) : (
            <span className="text-xs font-medium text-amber-700 bg-amber-100 px-2 py-1 rounded">
              Evidencia pendiente
            </span>
          )}
        </div>

        {!esPendiente && (
          <div className="bg-slate-100 p-3 rounded-md border border-slate-200 text-xs">
            <span className="font-semibold block text-slate-800">Resolucion registrada:</span>
            <div className="mt-1 text-slate-600">
              <p>Resuelto por: {solicitud.resuelto_por_nombre || 'Sistema'}</p>
              <p>Fecha resolucion: {formatearFecha(solicitud.fecha_resolucion)}</p>
              {solicitud.observacion_resolucion && (
                <p className="mt-1 text-slate-800 font-medium">Observacion: {solicitud.observacion_resolucion}</p>
              )}
            </div>
          </div>
        )}

        {esPendiente && (
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Observacion de la decision {observacion.trim().length > 0 && `(${observacion.length}/2000)`}
            </label>
            <textarea
              className="w-full border border-slate-300 rounded-md p-2 text-xs focus:ring-2 focus:ring-brand-500 focus:outline-none resize-none"
              rows={3}
              maxLength={2000}
              placeholder="Opcional para aprobacion. Obligatoria para rechazo (minimo 10 caracteres)."
              value={observacion}
              onChange={(e) => {
                setObservacion(e.target.value);
                if (errorObs) setErrorObs('');
              }}
              disabled={enviando}
            />
            {errorObs && <p className="text-xs text-rose-600 mt-1">{errorObs}</p>}
          </div>
        )}
      </div>
    </Modal>
  );
}

export function CrmSolicitudesRetroceso({ rangoPeriodo, onDecisionSuccess }: Props) {
  const [solicitudes, setSolicitudes] = useState<CrmSolicitudRetroceso[]>([]);
  const [indicadores, setIndicadores] = useState<CrmIndicadoresRetroceso | null>(null);
  const [asesores, setAsesores] = useState<CrmAdvisor[]>([]);
  const [cargando, setCargando] = useState(false);
  const [busqueda, setBusqueda] = useState('');
  const [filtroEstado, setFiltroEstado] = useState('TODOS');
  const [filtroAsesor, setFiltroAsesor] = useState<number | ''>('');
  const [fechaDesde, setFechaDesde] = useState('');
  const [fechaHasta, setFechaHasta] = useState('');
  const [errorFechas, setErrorFechas] = useState('');
  const [pagina, setPagina] = useState(1);
  const [totalRegistros, setTotalRegistros] = useState(0);
  const [seleccionada, setSeleccionada] = useState<CrmSolicitudRetroceso | null>(null);
  const [modalAbierto, setModalAbierto] = useState(false);
  const [visorUrl, setVisorUrl] = useState<string | null>(null);
  const [visorAbierto, setVisorAbierto] = useState(false);
  const [visorSolicitudId, setVisorSolicitudId] = useState<number | null>(null);
  const tamano = 15;

  useEffect(() => {
    crmBackend.asesores()
      .then((res) => setAsesores(res || []))
      .catch(() => {});
  }, []);

  const resolverRango = useCallback(() => {
    if (fechaDesde && fechaHasta) {
      if (fechaDesde > fechaHasta) {
        setErrorFechas('La fecha desde no puede superar la fecha hasta.');
        return null;
      }
      setErrorFechas('');
      return {
        desde: `${fechaDesde}T00:00:00-05:00`,
        hastaExclusivo: calcularHastaExclusivoLima(fechaHasta)
      };
    }
    setErrorFechas('');
    return rangoPeriodo;
  }, [fechaDesde, fechaHasta, rangoPeriodo]);

  const cargarDatos = useCallback(async () => {
    const rango = resolverRango();
    if (!rango?.desde || !rango?.hastaExclusivo) return;
    setCargando(true);
    try {
      const idAsesor = filtroAsesor !== '' ? Number(filtroAsesor) : undefined;
      const [resInd, resSol] = await Promise.all([
        crmBackend.retrocesos.indicadores(rango.desde, rango.hastaExclusivo, idAsesor),
        crmBackend.retrocesos.listarSolicitudes({
          desde: rango.desde,
          hastaExclusivo: rango.hastaExclusivo,
          estado: filtroEstado === 'TODOS' ? undefined : filtroEstado,
          busqueda: busqueda.trim() || undefined,
          pagina,
          tamano,
          asesor: idAsesor
        })
      ]);
      setIndicadores(resInd);
      if (Array.isArray(resSol)) {
        setSolicitudes(resSol);
        setTotalRegistros(resSol.length);
      } else {
        setSolicitudes(resSol.items || []);
        setTotalRegistros(resSol.total || (resSol.items ? resSol.items.length : 0));
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al consultar solicitudes de retroceso.';
      toast.error('Error de consulta', { description: msg });
    } finally {
      setCargando(false);
    }
  }, [resolverRango, filtroEstado, filtroAsesor, busqueda, pagina]);

  useEffect(() => {
    cargarDatos();
  }, [cargarDatos]);

  const limpiarFechas = () => {
    setFechaDesde('');
    setFechaHasta('');
    setErrorFechas('');
    setPagina(1);
  };

  const handleVerEvidencia = async (idSolicitud: number) => {
    setVisorSolicitudId(idSolicitud);
    setVisorUrl(null);
    setVisorAbierto(true);
    try {
      const res = await crmBackend.retrocesos.obtenerUrlEvidencia(idSolicitud);
      setVisorUrl(res.url);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'No se pudo obtener la imagen.';
      toast.error('Error al visualizar imagen', { description: msg });
      setVisorAbierto(false);
    }
  };

  const resolverDecision = async (aprobar: boolean, obs: string) => {
    if (!seleccionada) return;
    try {
      await crmBackend.retrocesos.resolverDecision(seleccionada.id_solicitud, {
        aprobar,
        observacion: obs || undefined
      });
      toast.success(aprobar ? 'Solicitud aprobada' : 'Solicitud rechazada', {
        description: `Se registro la decision para la solicitud #${seleccionada.id_solicitud}.`
      });
      await cargarDatos();
      if (onDecisionSuccess) onDecisionSuccess();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al registrar decision.';
      if (msg.includes('EVIDENCIA_REQUERIDA')) {
        toast.error('Evidencia requerida', {
          description: 'No se puede aprobar la solicitud sin evidencia fotografica adjuntada.'
        });
      } else {
        toast.error('Error', { description: msg });
      }
      throw err;
    }
  };

  return (
    <div className="space-y-4">
      <MiniDashboard indicadores={indicadores} solicitudes={solicitudes} />

      <Card>
        <CardHeader
          title="Bandeja de solicitudes de retroceso"
          description="Revision y autorizacion de solicitudes comerciales para regresar prospectos a etapas iniciales."
          actions={
            <Button
              variant="secondary"
              size="sm"
              className="min-w-[130px] whitespace-nowrap flex items-center justify-center"
              onClick={cargarDatos}
              disabled={cargando}
            >
              <RefreshCw className={`h-4 w-4 mr-1.5 ${cargando ? 'animate-spin' : ''}`} />
              Actualizar
            </Button>
          }
        />

        {/* ZONA DE FILTROS */}
        <div className="p-4 border-b border-brand-100 space-y-3">
          {/* Fila 1: Buscador | Estado | Asesor (alineados a la izquierda) */}
          <div className="flex flex-wrap items-end gap-3 justify-start">
            <div className="flex-1 min-w-[220px] max-w-sm">
              <label className="block text-xs font-medium text-slate-700 mb-1">Buscar prospecto o asesor</label>
              <div className="relative">
                <Search className="h-4 w-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  className="w-full pl-9 pr-3 py-1.5 text-xs border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-500"
                  placeholder="Nombre, codigo o asesor..."
                  value={busqueda}
                  onChange={(e) => {
                    setBusqueda(e.target.value);
                    setPagina(1);
                  }}
                />
              </div>
            </div>

            <div className="min-w-[150px]">
              <label className="block text-xs font-medium text-slate-700 mb-1">Estado</label>
              <select
                className="w-full text-xs border border-slate-300 rounded-md px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white"
                value={filtroEstado}
                onChange={(e) => {
                  setFiltroEstado(e.target.value);
                  setPagina(1);
                }}
              >
                <option value="TODOS">Todos los estados</option>
                <option value="PENDIENTE">Pendientes</option>
                <option value="APROBADA">Aprobadas</option>
                <option value="RECHAZADA">Rechazadas</option>
              </select>
            </div>

            <div className="min-w-[180px]">
              <label className="block text-xs font-medium text-slate-700 mb-1">Asesor</label>
              <select
                className="w-full text-xs border border-slate-300 rounded-md px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white"
                value={filtroAsesor}
                onChange={(e) => {
                  setFiltroAsesor(e.target.value ? Number(e.target.value) : '');
                  setPagina(1);
                }}
              >
                <option value="">Todos los asesores</option>
                {asesores.map((a) => (
                  <option key={a.id_asesor} value={a.id_asesor}>
                    {a.nombre_completo}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Fila 2: Fecha desde | Fecha hasta | Limpiar fechas */}
          <div className="flex flex-wrap items-end gap-3 pt-2 border-t border-slate-100">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Fecha desde</label>
              <input
                type="date"
                className="text-xs border border-slate-300 rounded-md px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white"
                value={fechaDesde}
                onChange={(e) => {
                  setFechaDesde(e.target.value);
                  setPagina(1);
                }}
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Fecha hasta</label>
              <input
                type="date"
                className="text-xs border border-slate-300 rounded-md px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white"
                value={fechaHasta}
                onChange={(e) => {
                  setFechaHasta(e.target.value);
                  setPagina(1);
                }}
              />
            </div>

            {(fechaDesde || fechaHasta) && (
              <Button
                variant="ghost"
                size="sm"
                className="text-xs text-brand-600 hover:text-brand-800"
                onClick={limpiarFechas}
              >
                Limpiar fechas
              </Button>
            )}

            {errorFechas && (
              <span className="text-xs text-rose-600 self-center">{errorFechas}</span>
            )}
          </div>
        </div>

        {cargando ? (
          <div className="flex items-center justify-center p-12 text-brand-500">
            <RefreshCw className="mr-2 h-6 w-6 animate-spin" />
            <span>Consultando bandeja de retrocesos...</span>
          </div>
        ) : solicitudes.length === 0 ? (
          <EmptyState
            title="Sin solicitudes de retroceso"
            description="No se registraron solicitudes en el periodo y filtros especificados."
          />
        ) : (
          <>
            <Table
              head={
                <>
                  <TH>Fecha</TH>
                  <TH>Prospecto</TH>
                  <TH>Asesor</TH>
                  <TH>Etapa origen</TH>
                  <TH>Etapa destino</TH>
                  <TH>Motivo</TH>
                  <TH>Evidencia</TH>
                  <TH>Estado</TH>
                  <TH align="right">Acciones</TH>
                </>
              }
            >
              {solicitudes.map((sol) => (
                <TR key={sol.id_solicitud}>
                  <TD className="text-xs text-slate-600 whitespace-nowrap">
                    {formatearFecha(sol.fecha_solicitud)}
                  </TD>
                  <TD>
                    <div className="text-xs font-medium text-brand-900">{sol.nombre_prospecto || sol.prospecto_nombre}</div>
                    <div className="text-[11px] text-slate-500">{sol.codigo_prospecto || sol.prospecto_codigo}</div>
                  </TD>
                  <TD className="text-xs text-slate-700">{sol.nombre_asesor || sol.asesor_nombre}</TD>
                  <TD>
                    <span className="text-[11px] px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-medium">
                      {sol.nombre_etapa_origen || sol.etapa_origen || sol.estado_origen_nombre || sol.estado_origen_codigo}
                    </span>
                  </TD>
                  <TD>
                    <span className="text-[11px] px-2 py-0.5 rounded bg-sky-50 text-sky-700 font-medium border border-sky-100">
                      {sol.nombre_etapa_destino || sol.etapa_destino || sol.estado_destino_nombre || sol.estado_destino_codigo}
                    </span>
                  </TD>
                  <TD className="text-xs text-slate-700 max-w-[180px]">
                    <span className="block truncate" title={sol.motivo_detallado}>
                      {sol.motivo_nombre || sol.motivo_codigo}
                    </span>
                  </TD>
                  <TD>
                    {sol.tiene_evidencia ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                        <CheckCircle className="h-3 w-3" /> Con foto
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                        <AlertCircle className="h-3 w-3" /> Sin foto
                      </span>
                    )}
                  </TD>
                  <TD>
                    <StatusBadge status={mapearEstadoBadge(sol.estado)} />
                  </TD>
                  <TD align="right">
                    <Button
                      size="sm"
                      variant={sol.estado === 'PENDIENTE' ? 'primary' : 'secondary'}
                      onClick={() => {
                        setSeleccionada(sol);
                        setModalAbierto(true);
                      }}
                    >
                      <Eye className="h-3.5 w-3.5 mr-1" />
                      {sol.estado === 'PENDIENTE' ? 'Revisar' : 'Detalle'}
                    </Button>
                  </TD>
                </TR>
              ))}
            </Table>

            <Pagination
              page={pagina}
              pageSize={tamano}
              total={totalRegistros}
              onPageChange={setPagina}
            />
          </>
        )}
      </Card>

      <RevisionModal
        solicitud={seleccionada}
        open={modalAbierto}
        onClose={() => {
          setModalAbierto(false);
          setSeleccionada(null);
        }}
        onDecision={resolverDecision}
        onVerEvidencia={handleVerEvidencia}
      />

      <VisorEvidenciaModal
        url={visorUrl}
        open={visorAbierto}
        onClose={() => {
          setVisorAbierto(false);
          setVisorUrl(null);
        }}
        idSolicitud={visorSolicitudId}
      />
    </div>
  );
}
