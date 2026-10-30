import React, { useEffect, useMemo, useRef, useState } from 'react';
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
import { coreService } from '../../services/coreService';
import { ApiError } from '../../lib/apiClient';
import type { CorreccionDocumentalItem } from '../../types/workers';
import { CheckIcon, XIcon, EyeIcon, RefreshCwIcon } from 'lucide-react';

interface CorreccionesPendientesPanelProps {
  onSuccessAction?: () => void;
}

export function CorreccionesPendientesPanel({ onSuccessAction }: CorreccionesPendientesPanelProps) {
  const [solicitudes, setSolicitudes] = useState<CorreccionDocumentalItem[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Estados para modal de imagen
  const [modalFotoOpen, setModalFotoOpen] = useState(false);
  const [urlFoto, setUrlFoto] = useState<string | null>(null);
  const [cargandoFoto, setCargandoFoto] = useState(false);
  const [solicitudFoto, setSolicitudFoto] = useState<CorreccionDocumentalItem | null>(null);

  // Estados para modal de rechazo
  const [modalRechazoOpen, setModalRechazoOpen] = useState(false);
  const [solicitudARechazar, setSolicitudARechazar] = useState<CorreccionDocumentalItem | null>(null);
  const [motivoRechazo, setMotivoRechazo] = useState('');
  const [procesandoRechazo, setProcesandoRechazo] = useState(false);

  const [solicitudAAprobar, setSolicitudAAprobar] = useState<CorreccionDocumentalItem | null>(null);
  const [procesandoAprobacion, setProcesandoAprobacion] = useState(false);
  const bloqueoAprobacionRef = useRef(false);
  const [resolviendoId, setResolviendoId] = useState<number | null>(null);

  // Estados de filtros
  const [trabajadorFilter, setTrabajadorFilter] = useState('all');
  const [tipoCorreccionFilter, setTipoCorreccionFilter] = useState('all');
  const [fechaDesdeFilter, setFechaDesdeFilter] = useState('');
  const [fechaHastaFilter, setFechaHastaFilter] = useState('');

  useEffect(() => {
    void cargarSolicitudes();
  }, []);

  async function cargarSolicitudes() {
    setCargando(true);
    setError(null);
    try {
      const data = await coreService.listarCorreccionesDocumentales();
      setSolicitudes(Array.isArray(data) ? data : []);
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'No se pudieron consultar las correcciones pendientes.';
      setError(msg);
      setSolicitudes([]);
    } finally {
      setCargando(false);
    }
  }

  async function verEvidencia(item: CorreccionDocumentalItem) {
    setSolicitudFoto(item);
    setModalFotoOpen(true);
    setUrlFoto(null);
    setCargandoFoto(true);

    try {
      const res = await coreService.obtenerUrlFirmadaEvidencia(item.idSolicitud);
      setUrlFoto(res.url);
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'No se pudo obtener el acceso a la fotografia.';
      toast.error(msg);
      setModalFotoOpen(false);
    } finally {
      setCargandoFoto(false);
    }
  }

  function abrirModalAprobacion(item: CorreccionDocumentalItem) {
    setSolicitudAAprobar(item);
  }

  function cerrarModalAprobacion() {
    if (bloqueoAprobacionRef.current) return;
    setSolicitudAAprobar(null);
  }

  async function confirmarAprobacion() {
    const item = solicitudAAprobar;
    if (!item || bloqueoAprobacionRef.current) return;
    if (!validarEvidenciaAprobacion(item)) return;

    bloqueoAprobacionRef.current = true;
    setProcesandoAprobacion(true);
    await ejecutarAprobacion(item);
  }

  async function ejecutarAprobacion(item: CorreccionDocumentalItem) {
    setResolviendoId(item.idSolicitud);
    try {
      await coreService.resolverCorreccionDocumental(item.idSolicitud, {
        decision: 'APROBAR'
      });
      toast.success(`Solicitud #${item.idSolicitud} aprobada exitosamente.`);
      setSolicitudAAprobar(null);
      await cargarSolicitudes();
      onSuccessAction?.();
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'Error al aprobar la correccion.';
      toast.error(msg);
    } finally {
      bloqueoAprobacionRef.current = false;
      setProcesandoAprobacion(false);
      setResolviendoId(null);
    }
  }

  function validarEvidenciaAprobacion(item: CorreccionDocumentalItem) {
    if (item.tipoDato === 'CONTACTO' || item.tieneEvidencia) return true;
    toast.error('No se puede aprobar la solicitud porque no tiene evidencia adjunta.');
    return false;
  }

  function abrirModalRechazo(item: CorreccionDocumentalItem) {
    setSolicitudARechazar(item);
    setMotivoRechazo('');
    setModalRechazoOpen(true);
  }

  async function confirmarRechazo(e: React.FormEvent) {
    e.preventDefault();
    if (!solicitudARechazar) return;

    const motivoLimpio = motivoRechazo.trim();
    if (motivoLimpio.length < 10 || motivoLimpio.length > 1000) {
      toast.error('La justificacion del rechazo debe tener entre 10 y 1000 caracteres.');
      return;
    }

    setProcesandoRechazo(true);
    try {
      await coreService.resolverCorreccionDocumental(solicitudARechazar.idSolicitud, {
        decision: 'RECHAZAR',
        motivo: motivoLimpio
      });
      toast.success(`Solicitud #${solicitudARechazar.idSolicitud} rechazada correctamente.`);
      setModalRechazoOpen(false);
      setSolicitudARechazar(null);
      await cargarSolicitudes();
      onSuccessAction?.();
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'Error al rechazar la correccion.';
      toast.error(msg);
    } finally {
      setProcesandoRechazo(false);
    }
  }

  const trabajadoresDisponibles = useMemo(() => {
    const map = new Map<string, string>();
    for (const s of solicitudes) {
      const key = String(s.idTrabajador || s.idPersona);
      const label = s.codigoTrabajador ? `${s.codigoTrabajador} - ${s.nombreCompleto}` : s.nombreCompleto;
      map.set(key, label);
    }
    return Array.from(map.entries()).map(([value, label]) => ({ value, label }));
  }, [solicitudes]);

  const tiposDisponibles = useMemo(() => {
    const set = new Set<string>();
    for (const s of solicitudes) {
      if (s.tipoDato === 'CONTACTO') set.add('CORREO');
      else if (s.tipoDocumentoPropuesto) set.add(s.tipoDocumentoPropuesto);
    }
    return Array.from(set).sort().map((t) => ({ value: t, label: t === 'CORREO' ? 'Correo electrónico' : t }));
  }, [solicitudes]);

  const solicitudesFiltradas = useMemo(() => {
    return solicitudes.filter((s) => {
      if (trabajadorFilter !== 'all') {
        const key = String(s.idTrabajador || s.idPersona);
        if (key !== trabajadorFilter) return false;
      }
      if (tipoCorreccionFilter !== 'all') {
        const valorTipo = s.tipoDato === 'CONTACTO' ? 'CORREO' : s.tipoDocumentoPropuesto;
        if (valorTipo !== tipoCorreccionFilter) return false;
      }
      if (fechaDesdeFilter || fechaHastaFilter) {
        const f = s.fechaSolicitud ? s.fechaSolicitud.slice(0, 10) : '';
        if (!f) return false;
        if (fechaDesdeFilter && f < fechaDesdeFilter) return false;
        if (fechaHastaFilter && f > fechaHastaFilter) return false;
      }
      return true;
    });
  }, [solicitudes, trabajadorFilter, tipoCorreccionFilter, fechaDesdeFilter, fechaHastaFilter]);

  const hayFiltrosActivos = trabajadorFilter !== 'all' || tipoCorreccionFilter !== 'all' || fechaDesdeFilter !== '' || fechaHastaFilter !== '';

  function limpiarFiltros() {
    setTrabajadorFilter('all');
    setTipoCorreccionFilter('all');
    setFechaDesdeFilter('');
    setFechaHastaFilter('');
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-[15px] font-semibold text-brand-900">
            Correcciones pendientes de identidad y correo
          </h2>
          <p className="text-[13px] text-brand-400">
            Revisión de correcciones documentales y solicitudes de cambio de correo de trabajadores.
          </p>
        </div>

        <Button
          size="sm"
          variant="secondary"
          onClick={() => void cargarSolicitudes()}
          disabled={cargando}
          icon={RefreshCwIcon}
        >
          Actualizar lista
        </Button>
      </div>

      <Card>
        <FilterBar>
          {trabajadoresDisponibles.length > 1 ? (
            <FilterSelect
              id="filtro-corr-trabajador"
              label="Trabajador"
              value={trabajadorFilter}
              onChange={setTrabajadorFilter}
              options={[{ value: 'all', label: 'Todos los trabajadores' }, ...trabajadoresDisponibles]}
              className="w-64"
            />
          ) : null}

          {tiposDisponibles.length > 0 ? (
            <FilterSelect
              id="filtro-corr-tipo"
              label="Tipo propuesto"
              value={tipoCorreccionFilter}
              onChange={setTipoCorreccionFilter}
              options={[{ value: 'all', label: 'Todos los tipos' }, ...tiposDisponibles]}
              className="w-48"
            />
          ) : null}

          <FilterDateRange
            idDesde="filtro-corr-desde"
            idHasta="filtro-corr-hasta"
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
        </FilterBar>

        {cargando ? (
          <div className="p-8 text-center text-brand-500">
            Cargando solicitudes pendientes...
          </div>
        ) : error ? (
          <div className="space-y-3 p-8 text-center">
            <p className="text-rose-700">Error: {error}</p>
            <Button size="sm" onClick={() => void cargarSolicitudes()}>
              Reintentar
            </Button>
          </div>
        ) : solicitudesFiltradas.length === 0 ? (
          <EmptyState
            title="Sin correcciones"
            description={
              solicitudes.length === 0
                ? 'No existen solicitudes de corrección de documento o correo pendientes de aprobación.'
                : 'No hay solicitudes que coincidan con los filtros aplicados.'
            }
          />
        ) : (
          <Table
            head={
              <>
                <TH>ID / Fecha</TH>
                <TH>Trabajador</TH>
                <TH>Dato actual</TH>
                <TH>Dato propuesto</TH>
                <TH>Motivo</TH>
                <TH>Evidencia</TH>
                <TH>Estado</TH>
                <TH className="text-right">Acciones</TH>
              </>
            }
          >
            {solicitudesFiltradas.map((item) => {
              const nombreTrabajador = item.nombreCompleto?.trim() || 'Nombre no disponible';
              const fecha = item.fechaSolicitud ? new Date(item.fechaSolicitud).toLocaleDateString() : '—';
              const estaResolviendo = resolviendoId === item.idSolicitud;

              return (
                <TR key={item.idSolicitud}>
                  <TD>
                    <span className="block font-medium text-brand-900">
                      #{item.idSolicitud}
                    </span>
                    <span className="block text-[11px] text-brand-400">{fecha}</span>
                  </TD>

                  <TD>
                    <span className="block font-medium text-brand-900">{nombreTrabajador}</span>
                    <span className="block text-[11px] text-brand-400">
                      {item.codigoTrabajador || 'Código laboral no disponible'}
                    </span>
                  </TD>

                  <TD className="text-brand-600">
                    <span className="block text-[11px] text-brand-400">
                      {item.tipoDato === 'CONTACTO' ? 'CORREO' : item.tipoDocumentoActual || '—'}
                    </span>
                    <span className="font-mono text-[13px]">
                      {item.tipoDato === 'CONTACTO' ? (item.valorAnterior || '—') : item.numeroDocumentoActual || '—'}
                    </span>
                  </TD>

                  <TD className="text-brand-900">
                    <span className="block text-[11px] font-medium text-brand-500">
                      {item.tipoDato === 'CONTACTO' ? 'CORREO' : item.tipoDocumentoPropuesto || '—'}
                    </span>
                    <span className="font-mono text-[13px] font-semibold text-brand-900">
                      {item.tipoDato === 'CONTACTO' ? (item.valorPropuesto || '—') : item.numeroDocumentoPropuesto || '—'}
                    </span>
                  </TD>

                  <TD className="max-w-xs">
                    <p className="line-clamp-2 text-[12px] text-brand-600" title={item.motivo}>
                      {item.motivo || 'Sin motivo registrado'}
                    </p>
                  </TD>

                  <TD>
                    {item.tipoDato === 'CONTACTO' ? (
                      <span className="text-[12px] text-brand-500">No requerida</span>
                    ) : item.tieneEvidencia ? (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => void verEvidencia(item)}
                        icon={EyeIcon}
                      >
                        Ver evidencia
                      </Button>
                    ) : (
                      <span className="text-[12px] font-medium text-rose-700">
                        Sin evidencia adjunta
                      </span>
                    )}
                  </TD>

                  <TD>
                    <Badge tone="accent">
                      {item.estado || 'PENDIENTE'}
                    </Badge>
                  </TD>

                  <TD className="text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <Button
                        size="sm"
                        variant="primary"
                        disabled={estaResolviendo}
                        onClick={() => abrirModalAprobacion(item)}
                        icon={CheckIcon}
                      >
                        Aprobar
                      </Button>

                      <Button
                        size="sm"
                        variant="secondary"
                        disabled={estaResolviendo}
                        onClick={() => abrirModalRechazo(item)}
                        icon={XIcon}
                        className="text-rose-700 hover:border-rose-300 hover:bg-rose-50"
                      >
                        Rechazar
                      </Button>
                    </div>
                  </TD>
                </TR>
              );
            })}
          </Table>
        )}
      </Card>

      <Modal
        open={solicitudAAprobar !== null}
        onClose={cerrarModalAprobacion}
        title="Confirmar aprobación de corrección"
        description="Revise los datos anteriores y propuestos antes de aprobar la solicitud."
        width="max-w-xl"
        footer={
          <div className="flex items-center justify-end gap-2.5">
            <Button
              type="button"
              variant="ghost"
              onClick={cerrarModalAprobacion}
              disabled={procesandoAprobacion}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              variant="primary"
              onClick={() => void confirmarAprobacion()}
              disabled={procesandoAprobacion || (solicitudAAprobar?.tipoDato !== 'CONTACTO' && !solicitudAAprobar?.tieneEvidencia)}
              icon={CheckIcon}
            >
              {procesandoAprobacion ? 'Aprobando...' : 'Confirmar aprobación'}
            </Button>
          </div>
        }
      >
        {solicitudAAprobar ? (
          <div className="space-y-4">
            <div>
              <p className="font-medium text-brand-900">
                {solicitudAAprobar.nombreCompleto || 'Nombre no disponible'}
              </p>
              <p className="text-[12px] text-brand-400">
                {solicitudAAprobar.codigoTrabajador || 'Código laboral no disponible'}
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-md border border-brand-100 p-3">
                <p className="text-[11px] font-medium uppercase text-brand-400">Documento actual</p>
                <p className="mt-1 font-mono text-sm text-brand-800">
                  {solicitudAAprobar.tipoDato === 'CONTACTO' ? 'Correo: ' + (solicitudAAprobar.valorAnterior || '—') : (solicitudAAprobar.tipoDocumentoActual || '—') + ': ' + (solicitudAAprobar.numeroDocumentoActual || '—')}
                </p>
              </div>
              <div className="rounded-md border border-brand-100 p-3">
                <p className="text-[11px] font-medium uppercase text-brand-400">Documento propuesto</p>
                <p className="mt-1 font-mono text-sm font-semibold text-brand-900">
                  {solicitudAAprobar.tipoDato === 'CONTACTO' ? 'Correo: ' + (solicitudAAprobar.valorPropuesto || '—') : (solicitudAAprobar.tipoDocumentoPropuesto || '—') + ': ' + (solicitudAAprobar.numeroDocumentoPropuesto || '—')}
                </p>
              </div>
            </div>

            <Alert tone="warning" title="Advertencia sobre los datos de identidad">
              {solicitudAAprobar.tipoDato === 'CONTACTO'
                ? 'Se autorizara el envio de un enlace al nuevo correo. El correo actual solo cambiara cuando el trabajador confirme el enlace.'
                : 'Al aprobar, se modificaran los datos documentales del trabajador.'}
            </Alert>

            {solicitudAAprobar.tipoDato !== 'CONTACTO' && !solicitudAAprobar.tieneEvidencia ? (
              <Alert tone="danger" title="No se puede aprobar sin evidencia">
                Esta solicitud todavía no tiene evidencia adjunta. La aprobación permanecerá bloqueada hasta que se registre.
              </Alert>
            ) : null}
          </div>
        ) : null}
      </Modal>

      {/* Modal visor de evidencia fotografica con URL firmada */}
      <Modal
        open={modalFotoOpen}
        onClose={() => setModalFotoOpen(false)}
        title={`Evidencia fotografica — Solicitud #${solicitudFoto?.idSolicitud ?? ''}`}
        description="Fotografia de respaldo almacenada de forma privada en Supabase Storage con acceso temporal firmado."
        width="max-w-2xl"
        footer={
          <div className="flex justify-end">
            <Button variant="ghost" onClick={() => setModalFotoOpen(false)}>
              Cerrar
            </Button>
          </div>
        }
      >
        <div className="flex min-h-[240px] items-center justify-center p-6">
          {cargandoFoto ? (
            <div className="text-center text-[13px] text-brand-500">
              Generando URL firmada y cargando imagen de respaldo...
            </div>
          ) : urlFoto ? (
            <div className="space-y-3 text-center">
              <img
                src={urlFoto}
                alt="Evidencia documental"
                className="max-h-[70vh] max-w-full rounded-md border border-brand-200 object-contain shadow-sm"
              />
              <p className="text-[11px] text-brand-400">
                Acceso temporal protegido emitido exclusivamente para revisión y dictamen.
              </p>
            </div>
          ) : (
            <div className="text-center text-[13px] text-rose-600">
              No se pudo cargar la fotografia de respaldo.
            </div>
          )}
        </div>
      </Modal>

      {/* Modal para justificacion obligatoria de rechazo */}
      <Modal
        open={modalRechazoOpen}
        onClose={() => {
          if (!procesandoRechazo) setModalRechazoOpen(false);
        }}
        title={`Rechazar correccion — Solicitud #${solicitudARechazar?.idSolicitud ?? ''}`}
        description="Indique el motivo técnico o legal por el cual se deniega la corrección propuesta."
        width="max-w-lg"
        footer={
          <div className="flex items-center justify-end gap-2.5">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setModalRechazoOpen(false)}
              disabled={procesandoRechazo}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={procesandoRechazo || motivoRechazo.trim().length < 10}
              onClick={confirmarRechazo}
              className="bg-rose-700 hover:bg-rose-800"
            >
              {procesandoRechazo ? 'Rechazando...' : 'Confirmar rechazo'}
            </Button>
          </div>
        }
      >
        <form onSubmit={confirmarRechazo} className="space-y-4 p-5">
          <div>
            <div className="flex items-center justify-between">
              <FieldLabel htmlFor="motivo-rechazo">
                Motivo del rechazo (10 a 1000 caracteres)
              </FieldLabel>
              <span
                className={`text-[11px] ${
                  motivoRechazo.trim().length < 10 || motivoRechazo.trim().length > 1000
                    ? 'text-amber-600'
                    : 'text-brand-400'
                }`}
              >
                {motivoRechazo.trim().length} / 1000
              </span>
            </div>
            <textarea
              id="motivo-rechazo"
              rows={4}
              value={motivoRechazo}
              onChange={(e) => setMotivoRechazo(e.target.value)}
              disabled={procesandoRechazo}
              placeholder="Describa la razon del rechazo (por ejemplo, fotografia ilegible, discordancia de datos, documento caducado)..."
              className="mt-1 w-full rounded-md border border-brand-200 px-3 py-2 text-[13px] text-brand-900 shadow-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 disabled:bg-brand-50"
            />
          </div>
        </form>
      </Modal>
    </div>
  );
}
