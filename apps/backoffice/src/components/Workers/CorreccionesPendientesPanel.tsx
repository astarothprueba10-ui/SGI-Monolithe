import React, { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Table, TD, TH, TR } from '../ui/Table';
import { Badge } from '../ui/Badge';
import { EmptyState } from '../ui/Feedback';
import { Modal } from '../ui/Modal';
import { FieldLabel } from '../ui/Field';
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

  // Estado para aprobacion
  const [resolviendoId, setResolviendoId] = useState<number | null>(null);

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

  async function handleAprobar(item: CorreccionDocumentalItem) {
    if (!window.confirm(`¿Confirma la aprobacion de la correccion para la solicitud #${item.idSolicitud}?`)) {
      return;
    }

    setResolviendoId(item.idSolicitud);
    try {
      await coreService.resolverCorreccionDocumental(item.idSolicitud, {
        decision: 'APROBAR'
      });
      toast.success(`Solicitud #${item.idSolicitud} aprobada exitosamente.`);
      await cargarSolicitudes();
      onSuccessAction?.();
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'Error al aprobar la correccion.';
      toast.error(msg);
    } finally {
      setResolviendoId(null);
    }
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

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-[15px] font-semibold text-brand-900">
            Correcciones documentales pendientes
          </h2>
          <p className="text-[13px] text-brand-400">
            Revisión y dictamen de rectificaciones de identidad respaldadas con evidencia fotográfica.
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
        ) : solicitudes.length === 0 ? (
          <EmptyState
            title="Sin correcciones pendientes"
            description="No existen solicitudes de corrección de documento pendientes de aprobación."
          />
        ) : (
          <Table
            head={
              <>
                <TH>ID / Fecha</TH>
                <TH>Trabajador</TH>
                <TH>Documento actual</TH>
                <TH>Documento propuesto</TH>
                <TH>Motivo</TH>
                <TH>Evidencia</TH>
                <TH>Estado</TH>
                <TH className="text-right">Acciones</TH>
              </>
            }
          >
            {solicitudes.map((item) => {
              const nombreTrabajador = item.trabajador || [item.nombres, item.apellidoPaterno, item.apellidoMaterno].filter(Boolean).join(' ') || `Trabajador #${item.idTrabajador}`;
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
                    {item.codigoTrabajador && (
                      <span className="block text-[11px] text-brand-400">{item.codigoTrabajador}</span>
                    )}
                  </TD>

                  <TD className="text-brand-600">
                    <span className="block text-[11px] text-brand-400">
                      {item.tipoDocumentoActual ?? 'Actual'}
                    </span>
                    <span className="font-mono text-[13px]">
                      {item.numeroDocumentoActual || '—'}
                    </span>
                  </TD>

                  <TD className="text-brand-900">
                    <span className="block text-[11px] font-medium text-brand-500">
                      {item.tipoDocumentoPropuesto ?? 'Propuesto'}
                    </span>
                    <span className="font-mono text-[13px] font-semibold text-brand-900">
                      {item.numeroDocumentoPropuesto ?? '—'}
                    </span>
                  </TD>

                  <TD className="max-w-xs">
                    <p className="line-clamp-2 text-[12px] text-brand-600" title={item.motivo}>
                      {item.motivo || 'Sin motivo'}
                    </p>
                  </TD>

                  <TD>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => void verEvidencia(item)}
                      icon={EyeIcon}
                    >
                      Ver foto
                    </Button>
                  </TD>

                  <TD>
                    <Badge tone="accent">
                      {item.estado ?? 'PENDIENTE'}
                    </Badge>
                  </TD>

                  <TD className="text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <Button
                        size="sm"
                        variant="primary"
                        disabled={estaResolviendo}
                        onClick={() => void handleAprobar(item)}
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
