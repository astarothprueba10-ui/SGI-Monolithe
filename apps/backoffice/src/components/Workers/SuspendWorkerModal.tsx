import { useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import { ApiError } from '../../lib/apiClient';
import { coreService } from '../../services/coreService';
import type { TrabajadorResponse } from '../../types/workers';
import { Alert } from '../ui/Feedback';
import { Button } from '../ui/Button';
import { FieldLabel, Input, Select } from '../ui/Field';
import { Modal } from '../ui/Modal';
import {
  calcularFechaFinSuspension,
  formatPeruDateTime,
  getPeruNowInputString,
  isSuspensionProgramada,
  toPeruISOString
} from './workerDateUtils';

interface SuspendWorkerModalProps {
  open: boolean;
  worker: TrabajadorResponse | null;
  onClose: () => void;
  onSuccess: () => void;
}

type Modalidad = 'horas' | 'dias' | 'semanas' | 'rango';

export function SuspendWorkerModal({
  open,
  worker,
  onClose,
  onSuccess
}: SuspendWorkerModalProps) {
  const [modalidad, setModalidad] = useState<Modalidad>('dias');
  const [duracion, setDuracion] = useState<number>(3);
  const [fechaInicio, setFechaInicio] = useState<string>('');
  const [fechaFinManual, setFechaFinManual] = useState<string>('');
  const [motivo, setMotivo] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [confirmStep, setConfirmStep] = useState(false);
  const submitLock = useRef(false);

  useEffect(() => {
    if (!open) return;
    const now = getPeruNowInputString();
    setFechaInicio(now);
    setModalidad('dias');
    setDuracion(3);
    setFechaFinManual('');
    setMotivo('');
    setErrorMsg(null);
    setConfirmStep(false);
  }, [open]);

  const fechaFinCalculada = useMemo(() => {
    return calcularFechaFinSuspension(fechaInicio, modalidad, duracion, fechaFinManual);
  }, [fechaInicio, modalidad, duracion, fechaFinManual]);

  const isoInicio = useMemo(() => toPeruISOString(fechaInicio), [fechaInicio]);
  const isoFin = useMemo(() => toPeruISOString(fechaFinCalculada), [fechaFinCalculada]);
  const esProgramada = useMemo(() => isSuspensionProgramada(isoInicio), [isoInicio]);

  function validarFormulario(): string | null {
    if (!fechaInicio) return 'La fecha y hora de inicio son obligatorias.';
    if (!fechaFinCalculada) return 'La fecha y hora de finalizacion son obligatorias.';
    if (fechaFinCalculada <= fechaInicio) {
      return 'La fecha de finalizacion debe ser posterior al inicio.';
    }
    const cleanMotivo = motivo.trim();
    if (cleanMotivo.length < 10) {
      return 'El motivo debe tener al menos 10 caracteres.';
    }
    if (cleanMotivo.length > 1000) {
      return 'El motivo no puede superar los 1000 caracteres.';
    }
    return null;
  }

  function handleContinuar(event: React.FormEvent) {
    event.preventDefault();
    setErrorMsg(null);
    const validacion = validarFormulario();
    if (validacion) {
      setErrorMsg(validacion);
      return;
    }
    setConfirmStep(true);
  }

  async function handleConfirmarSuspension() {
    if (!worker || submitLock.current) return;
    submitLock.current = true;
    setSubmitting(true);
    setErrorMsg(null);
    try {
      await coreService.programarSuspension(worker.idTrabajador, {
        fechaInicio: isoInicio,
        fechaFin: isoFin,
        motivo: motivo.trim()
      });
      const mensajeExito = esProgramada
        ? 'Suspension programada registrada con exito. Se activara en la fecha configurada.'
        : 'Suspension laboral aplicada de manera inmediata.';
      toast.success(mensajeExito);
      onSuccess();
      onClose();
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'Error al registrar la suspension.';
      setErrorMsg(msg);
      setConfirmStep(false);
    } finally {
      setSubmitting(false);
      submitLock.current = false;
    }
  }

  if (!worker) return null;

  const nombreTrabajador = [
    worker.informacionPersonal.nombres,
    worker.informacionPersonal.apellidoPaterno,
    worker.informacionPersonal.apellidoMaterno
  ].filter(Boolean).join(' ');

  return (
    <Modal
      open={open}
      onClose={() => { if (!submitting) onClose(); }}
      title={confirmStep ? 'Confirmar suspension laboral' : 'Suspender trabajador'}
      description={`Trabajador: ${nombreTrabajador} (${worker.codigo})`}
      width="max-w-xl"
    >
      <div className="space-y-4">
        {errorMsg && <Alert variant="danger">{errorMsg}</Alert>}

        {!confirmStep ? (
          <form onSubmit={handleContinuar} className="space-y-4">
            <div>
              <FieldLabel htmlFor="modalidadSuspension">Modalidad de suspension</FieldLabel>
              <Select
                id="modalidadSuspension"
                value={modalidad}
                onChange={(e) => setModalidad(e.target.value as Modalidad)}
                disabled={submitting}
              >
                <option value="horas">Por horas</option>
                <option value="dias">Por dias</option>
                <option value="semanas">Por semanas</option>
                <option value="rango">Rango de fechas y horas especificas</option>
              </Select>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <FieldLabel htmlFor="fechaInicioSuspension">Fecha y hora de inicio *</FieldLabel>
                <Input
                  id="fechaInicioSuspension"
                  type="datetime-local"
                  value={fechaInicio}
                  onChange={(e) => setFechaInicio(e.target.value)}
                  disabled={submitting}
                  required
                />
              </div>

              {modalidad === 'rango' ? (
                <div>
                  <FieldLabel htmlFor="fechaFinSuspension">Fecha y hora de finalizacion *</FieldLabel>
                  <Input
                    id="fechaFinSuspension"
                    type="datetime-local"
                    value={fechaFinManual}
                    onChange={(e) => setFechaFinManual(e.target.value)}
                    disabled={submitting}
                    required
                  />
                </div>
              ) : (
                <div>
                  <FieldLabel htmlFor="duracionSuspension">
                    Duracion ({modalidad}) *
                  </FieldLabel>
                  <Input
                    id="duracionSuspension"
                    type="number"
                    min={1}
                    max={modalidad === 'horas' ? 720 : modalidad === 'dias' ? 365 : 52}
                    value={duracion}
                    onChange={(e) => setDuracion(Math.max(1, Number(e.target.value)))}
                    disabled={submitting}
                    required
                  />
                </div>
              )}
            </div>

            <div className="rounded-md border border-brand-100 bg-brand-50/50 p-3 text-xs text-brand-700">
              <span className="font-semibold">Calculo preliminar de periodo: </span>
              {fechaInicio && fechaFinCalculada ? (
                <span>
                  Del {formatPeruDateTime(isoInicio)} al {formatPeruDateTime(isoFin)}
                  {esProgramada ? ' (Programada a futuro)' : ' (Inmediata)'}
                </span>
              ) : (
                <span>Indique los parametros para calcular la fecha fin</span>
              )}
            </div>

            <div>
              <div className="flex items-center justify-between">
                <FieldLabel htmlFor="motivoSuspension">Motivo obligatorio *</FieldLabel>
                <span className="text-[11px] text-brand-400">
                  {motivo.trim().length} / 1000 (minimo 10)
                </span>
              </div>
              <textarea
                id="motivoSuspension"
                rows={3}
                value={motivo}
                onChange={(e) => setMotivo(e.target.value)}
                maxLength={1000}
                required
                disabled={submitting}
                placeholder="Describa el motivo formal de la suspension..."
                className="w-full rounded-md border border-brand-200 px-3 py-2 text-[13px] text-brand-800 focus:border-brand-500 focus:outline-none disabled:bg-brand-50"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-brand-100">
              <Button type="button" variant="secondary" onClick={onClose} disabled={submitting}>
                Cancelar
              </Button>
              <Button type="submit" variant="primary" disabled={submitting}>
                Revisar y continuar
              </Button>
            </div>
          </form>
        ) : (
          <div className="space-y-4">
            <div className="rounded-md border border-brand-200 bg-brand-50/40 p-4 space-y-2 text-sm text-brand-800">
              <h4 className="font-semibold text-brand-900 border-b border-brand-200 pb-1">
                Resumen de la suspension
              </h4>
              <p><span className="text-brand-500">Tipo de inicio:</span> {esProgramada ? 'Programada a futuro' : 'Inmediata'}</p>
              <p><span className="text-brand-500">Inicio:</span> {formatPeruDateTime(isoInicio)}</p>
              <p><span className="text-brand-500">Fin:</span> {formatPeruDateTime(isoFin)}</p>
              <p><span className="text-brand-500">Motivo:</span> {motivo.trim()}</p>
              {esProgramada && (
                <div className="mt-2 rounded bg-amber-50 p-2 text-xs text-amber-800 border border-amber-200">
                  Aviso: Al tratarse de una suspension futura, el trabajador mantendra su estado laboral actual hasta la fecha y hora de inicio programada.
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-brand-100">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setConfirmStep(false)}
                disabled={submitting}
              >
                Volver a editar
              </Button>
              <Button
                type="button"
                variant="danger"
                onClick={handleConfirmarSuspension}
                disabled={submitting}
              >
                {submitting ? 'Procesando...' : 'Confirmar suspension'}
              </Button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
