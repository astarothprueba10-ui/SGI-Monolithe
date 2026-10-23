import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Table, TD, TH, TR } from '../ui/Table';
import { Badge } from '../ui/Badge';
import { Alert, EmptyState } from '../ui/Feedback';
import { Modal } from '../ui/Modal';
import { FieldLabel } from '../ui/Field';
import { FilterBar } from '../ui/filters/FilterBar';
import { FilterSelect } from '../ui/filters/FilterSelect';
import { FilterDateRange } from '../ui/filters/FilterDateRange';
import { Gate } from '../auth/PermissionRoute';
import { coreService } from '../../services/coreService';
import { ApiError } from '../../lib/apiClient';
import type { SolicitudReincorporacionItem } from '../../types/workers';
import { formatWorkerDate } from './workerForm';
import { CheckIcon, RefreshCwIcon, XIcon } from 'lucide-react';

interface ReincorporacionesPanelProps {
  onSuccessAction?: () => void;
}

export function ReincorporacionesPanel({ onSuccessAction }: ReincorporacionesPanelProps) {
  const [solicitudes, setSolicitudes] = useState<SolicitudReincorporacionItem[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filtroEstado, setFiltroEstado] = useState<'PENDIENTE' | 'APROBADA' | 'RECHAZADA' | 'TODOS'>('PENDIENTE');
  const [trabajadorFilter, setTrabajadorFilter] = useState('all');
  const [fechaDesdeFilter, setFechaDesdeFilter] = useState('');
  const [fechaHastaFilter, setFechaHastaFilter] = useState('');

  const [solicitudAAprobar, setSolicitudAAprobar] = useState<SolicitudReincorporacionItem | null>(null);
  const [procesandoAprobacion, setProcesandoAprobacion] = useState(false);
  const bloqueoAprobacionRef = useRef(false);

  const [solicitudARechazar, setSolicitudARechazar] = useState<SolicitudReincorporacionItem | null>(null);
  const [motivoRechazo, setMotivoRechazo] = useState('');
  const [procesandoRechazo, setProcesandoRechazo] = useState(false);
  const [errorRechazo, setErrorRechazo] = useState<string | null>(null);

  const cargarSolicitudes = useCallback(async () => {
    setCargando(true);
    setError(null);
    try {
      const params = {
        estado: filtroEstado === 'TODOS' ? undefined : filtroEstado,
        idTrabajador: trabajadorFilter !== 'all' ? Number(trabajadorFilter) : undefined
      };
      const res = await coreService.listarReincorporaciones(params);
      setSolicitudes(Array.isArray(res?.solicitudes) ? res.solicitudes : []);
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'No se pudieron consultar las reincorporaciones.';
      setError(msg);
      setSolicitudes([]);
    } finally {
      setCargando(false);
    }
  }, [filtroEstado, trabajadorFilter]);

  useEffect(() => {
    void cargarSolicitudes();
  }, [cargarSolicitudes]);

  async function confirmarAprobacion() {
    const item = solicitudAAprobar;
    if (!item || bloqueoAprobacionRef.current) return;
    bloqueoAprobacionRef.current = true;
    setProcesandoAprobacion(true);
    try {
      const res = await coreService.resolverReincorporacion(item.idSolicitud, { decision: 'APROBAR' });
      if (res?.requiereRevisionUsuario) {
        toast.info('Trabajador reincorporado. La cuenta de usuario requiere revision administrativa antes de recuperar el acceso.', { duration: 6000 });
      } else {
        toast.success(`Solicitud #${item.idSolicitud} aprobada exitosamente.`);
      }
      setSolicitudAAprobar(null);
      await cargarSolicitudes();
      onSuccessAction?.();
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'Error al aprobar la reincorporacion.';
      toast.error(msg);
    } finally {
      bloqueoAprobacionRef.current = false;
      setProcesandoAprobacion(false);
    }
  }

  function abrirModalRechazo(item: SolicitudReincorporacionItem) {
    setSolicitudARechazar(item);
    setMotivoRechazo('');
    setErrorRechazo(null);
  }

  async function confirmarRechazo(e: React.FormEvent) {
    e.preventDefault();
    if (!solicitudARechazar) return;
    const limpio = motivoRechazo.trim();
    if (limpio.length < 10 || limpio.length > 1000) {
      setErrorRechazo('La justificacion del rechazo debe tener entre 10 y 1000 caracteres.');
      return;
    }
    setProcesandoRechazo(true);
    setErrorRechazo(null);
    try {
      await coreService.resolverReincorporacion(solicitudARechazar.idSolicitud, {
        decision: 'RECHAZAR',
        motivoResolucion: limpio
      });
      toast.success(`Solicitud #${solicitudARechazar.idSolicitud} rechazada correctamente.`);
      setSolicitudARechazar(null);
      await cargarSolicitudes();
      onSuccessAction?.();
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'Error al rechazar la reincorporacion.';
      setErrorRechazo(msg);
    } finally {
      setProcesandoRechazo(false);
    }
  }

  const trabajadoresDisponibles = useMemo(() => {
    const map = new Map<string, string>();
    for (const s of solicitudes) {
      const key = String(s.idTrabajador);
      const label = `${s.codigoTrabajador} - ${s.nombreTrabajador}`;
      map.set(key, label);
    }
    return Array.from(map.entries()).map(([value, label]) => ({ value, label }));
  }, [solicitudes]);

  const solicitudesFiltradas = useMemo(() => {
    return solicitudes.filter((s) => {
      if (fechaDesdeFilter || fechaHastaFilter) {
        const f = s.fechaSolicitud ? s.fechaSolicitud.slice(0, 10) : '';
        if (!f) return false;
        if (fechaDesdeFilter && f < fechaDesdeFilter) return false;
        if (fechaHastaFilter && f > fechaHastaFilter) return false;
      }
      return true;
    });
  }, [solicitudes, fechaDesdeFilter, fechaHastaFilter]);

  const hayFiltrosActivos = filtroEstado !== 'PENDIENTE' || trabajadorFilter !== 'all' || fechaDesdeFilter !== '' || fechaHastaFilter !== '';

  function limpiarFiltros() {
    setFiltroEstado('PENDIENTE');
    setTrabajadorFilter('all');
    setFechaDesdeFilter('');
    setFechaHastaFilter('');
  }

  function badgeToneForEstado(estado: string): 'brand' | 'accent' | 'neutral' {
    if (estado === 'APROBADA') return 'brand';
    if (estado === 'PENDIENTE') return 'accent';
    return 'neutral';
  }

  return (
    <div className="space-y-4">
      <Card>
        <FilterBar>
          <FilterSelect
            id="filtro-estado-reinc"
            label="Estado"
            value={filtroEstado}
            onChange={(val) => setFiltroEstado(val as typeof filtroEstado)}
            options={[
              { value: 'PENDIENTE', label: 'Pendientes' },
              { value: 'APROBADA', label: 'Aprobadas' },
              { value: 'RECHAZADA', label: 'Rechazadas' },
              { value: 'TODOS', label: 'Todas las solicitudes' }
            ]}
          />

          {trabajadoresDisponibles.length > 1 ? (
            <FilterSelect
              id="filtro-reinc-trabajador"
              label="Trabajador"
              value={trabajadorFilter}
              onChange={setTrabajadorFilter}
              options={[{ value: 'all', label: 'Todos los trabajadores' }, ...trabajadoresDisponibles]}
              className="w-64"
            />
          ) : null}

          <FilterDateRange
            idDesde="filtro-reinc-desde"
            idHasta="filtro-reinc-hasta"
            labelDesde="Solicitado desde"
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

          <Button icon={RefreshCwIcon} variant="secondary" size="sm" onClick={cargarSolicitudes} disabled={cargando}>
            Actualizar
          </Button>
        </FilterBar>

        {error ? (
          <div className="p-6">
            <Alert tone="danger" title="Error al cargar las reincorporaciones">{error}</Alert>
          </div>
        ) : null}

        {cargando ? (
          <div className="p-8 text-center text-brand-500">Cargando solicitudes de reincorporacion...</div>
        ) : solicitudesFiltradas.length === 0 ? (
          <EmptyState
            title="Sin solicitudes de reincorporacion"
            description={
              solicitudes.length === 0
                ? 'No se encontraron solicitudes registradas con el filtro seleccionado.'
                : 'No hay solicitudes que coincidan con los filtros aplicados.'
            }
          />
        ) : (
          <Table
            head={
              <>
                <TH>Fecha solicitud</TH>
                <TH>Trabajador</TH>
                <TH>Nueva fecha ingreso</TH>
                <TH>Motivo</TH>
                <TH>Estado</TH>
                <TH className="text-right">Acciones</TH>
              </>
            }
          >
            {solicitudesFiltradas.map((item) => (
              <TR key={item.idSolicitud}>
                <TD className="text-brand-600">
                  {formatWorkerDate(item.fechaSolicitud)}
                </TD>

                <TD>
                  <p className="font-medium text-brand-900">
                    {item.nombreTrabajador}
                  </p>
                  <p className="font-mono text-xs text-brand-400">
                    {item.codigoTrabajador}
                  </p>
                </TD>

                <TD className="text-brand-700">
                  {formatWorkerDate(item.nuevaFechaIngreso)}
                </TD>

                <TD className="max-w-xs text-brand-700">
                  <p className="line-clamp-2" title={item.motivo}>
                    {item.motivo}
                  </p>
                </TD>

                <TD>
                  <Badge tone={badgeToneForEstado(item.estado)}>
                    {item.estado}
                  </Badge>
                </TD>

                <TD className="text-right">
                  <Gate permission="hr.approve">
                    {item.puedeResolver && item.estado === 'PENDIENTE' ? (
                      <div className="flex items-center justify-end gap-1.5">
                        <Button
                          variant="secondary"
                          size="sm"
                          icon={CheckIcon}
                          onClick={() => setSolicitudAAprobar(item)}
                          disabled={procesandoAprobacion}
                        >
                          Aprobar
                        </Button>

                        <Button
                          variant="danger"
                          size="sm"
                          icon={XIcon}
                          onClick={() => abrirModalRechazo(item)}
                          disabled={procesandoRechazo}
                        >
                          Rechazar
                        </Button>
                      </div>
                    ) : null}
                  </Gate>
                </TD>
              </TR>
            ))}
          </Table>

        )}
      </Card>

      <Modal
        open={solicitudAAprobar !== null}
        onClose={() => !procesandoAprobacion && setSolicitudAAprobar(null)}
        title="Aprobar reincorporacion"
        description="Confirma la aprobacion de la solicitud de reincorporacion laboral."
        width="max-w-md"
        footer={(
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setSolicitudAAprobar(null)} disabled={procesandoAprobacion}>
              Cancelar
            </Button>
            <Button variant="primary" onClick={confirmarAprobacion} disabled={procesandoAprobacion}>
              {procesandoAprobacion ? 'Aprobando...' : 'Confirmar aprobacion'}
            </Button>
          </div>
        )}
      >
        {solicitudAAprobar ? (
          <div className="space-y-3 text-sm text-brand-700">
            <p><strong>Trabajador:</strong> {solicitudAAprobar.nombreTrabajador} ({solicitudAAprobar.codigoTrabajador})</p>
            <p><strong>Nueva fecha de ingreso:</strong> {formatWorkerDate(solicitudAAprobar.nuevaFechaIngreso)}</p>
            <p><strong>Motivo:</strong> {solicitudAAprobar.motivo}</p>
          </div>
        ) : null}
      </Modal>

      <Modal
        open={solicitudARechazar !== null}
        onClose={() => !procesandoRechazo && setSolicitudARechazar(null)}
        title="Rechazar reincorporacion"
        description="Ingresa el motivo administrativo del rechazo de la reincorporacion."
        width="max-w-md"
        footer={(
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setSolicitudARechazar(null)} disabled={procesandoRechazo}>
              Cancelar
            </Button>
            <Button variant="danger" onClick={confirmarRechazo} disabled={procesandoRechazo}>
              {procesandoRechazo ? 'Rechazando...' : 'Rechazar solicitud'}
            </Button>
          </div>
        )}
      >
        <form onSubmit={confirmarRechazo} className="space-y-3">
          {errorRechazo ? <Alert tone="danger" title="Error al rechazar la reincorporación">{errorRechazo}</Alert> : null}
          <div>
            <FieldLabel htmlFor="motivoRechazoReinc">Justificacion del rechazo *</FieldLabel>
            <textarea
              id="motivoRechazoReinc"
              rows={3}
              value={motivoRechazo}
              onChange={(e) => setMotivoRechazo(e.target.value)}
              placeholder="Explica el motivo del rechazo (10 a 1000 caracteres)..."
              className="w-full rounded-md border border-brand-200 px-3 py-2 text-[13px] text-brand-800 focus:border-brand-500 focus:outline-none"
              disabled={procesandoRechazo}
            />
            <p className="mt-1 text-right text-xs text-brand-400">{motivoRechazo.trim().length} / 1000 caracteres</p>
          </div>
        </form>
      </Modal>
    </div>
  );
}
