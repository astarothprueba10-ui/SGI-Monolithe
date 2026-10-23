import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { ApiError } from '../../lib/apiClient';
import { coreService } from '../../services/coreService';
import type { TrabajadorResponse } from '../../types/workers';
import { Alert } from '../ui/Feedback';
import { Button } from '../ui/Button';
import { FieldLabel, Input } from '../ui/Field';
import { Modal } from '../ui/Modal';
import { getPeruTodayDateString } from './workerDateUtils';

interface ReincorporarWorkerModalProps {
  open: boolean;
  worker: TrabajadorResponse | null;
  onClose: () => void;
  onSuccess: () => void;
}

export function ReincorporarWorkerModal({
  open,
  worker,
  onClose,
  onSuccess
}: ReincorporarWorkerModalProps) {
  const [nuevaFechaIngreso, setNuevaFechaIngreso] = useState('');
  const [motivo, setMotivo] = useState('');
  const [confirmStep, setConfirmStep] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const submitLock = useRef(false);

  useEffect(() => {
    if (!open) return;
    setNuevaFechaIngreso(getPeruTodayDateString());
    setMotivo('');
    setConfirmStep(false);
    setErrorMsg(null);
  }, [open]);

  function validar(): string | null {
    if (!nuevaFechaIngreso) return 'La nueva fecha de ingreso es obligatoria.';
    if (worker?.informacionLaboral.fechaCese) {
      const cese = worker.informacionLaboral.fechaCese.slice(0, 10);
      if (nuevaFechaIngreso < cese) {
        return `La nueva fecha de ingreso no puede ser anterior a la fecha de cese (${cese}).`;
      }
    }
    const cleanMotivo = motivo.trim();
    if (cleanMotivo.length < 10) return 'El motivo debe tener al menos 10 caracteres.';
    if (cleanMotivo.length > 1000) return 'El motivo no puede exceder 1000 caracteres.';
    return null;
  }

  function handleRevisar(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg(null);
    const err = validar();
    if (err) {
      setErrorMsg(err);
      return;
    }
    setConfirmStep(true);
  }

  async function handleConfirmarReincorporacion() {
    if (!worker || submitLock.current) return;
    submitLock.current = true;
    setSubmitting(true);
    setErrorMsg(null);
    try {
      await coreService.solicitarReincorporacion(worker.idTrabajador, {
        nuevaFechaIngreso,
        motivo: motivo.trim()
      });
      toast.success('Solicitud de reincorporacion registrada. Estado: Solicitud pendiente de aprobacion.');
      onSuccess();
      onClose();
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'Error al solicitar la reincorporacion.';
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
      title={confirmStep ? 'Confirmar solicitud de reincorporacion' : 'Solicitar reincorporacion'}
      description={`Trabajador: ${nombreTrabajador} (${worker.codigo})`}
      width="max-w-lg"
    >
      <div className="space-y-4">
        {errorMsg && <Alert variant="danger">{errorMsg}</Alert>}

        {!confirmStep ? (
          <form onSubmit={handleRevisar} className="space-y-4">
            <div>
              <FieldLabel htmlFor="nuevaFechaIngresoInput">Nueva fecha de ingreso propuesta *</FieldLabel>
              <Input
                id="nuevaFechaIngresoInput"
                type="date"
                value={nuevaFechaIngreso}
                onChange={(e) => setNuevaFechaIngreso(e.target.value)}
                disabled={submitting}
                required
              />
            </div>

            <div>
              <div className="flex items-center justify-between">
                <FieldLabel htmlFor="motivoReincorporacionInput">Motivo o justificacion *</FieldLabel>
                <span className="text-[11px] text-brand-400">
                  {motivo.trim().length} / 1000 (minimo 10)
                </span>
              </div>
              <textarea
                id="motivoReincorporacionInput"
                rows={3}
                value={motivo}
                onChange={(e) => setMotivo(e.target.value)}
                maxLength={1000}
                required
                disabled={submitting}
                placeholder="Fundamento tecnico o legal de la reincorporacion laboral..."
                className="w-full rounded-md border border-brand-200 px-3 py-2 text-[13px] text-brand-800 focus:border-brand-500 focus:outline-none disabled:bg-brand-50"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-brand-100">
              <Button type="button" variant="secondary" onClick={onClose} disabled={submitting}>
                Cancelar
              </Button>
              <Button type="submit" variant="primary" disabled={submitting}>
                Revisar solicitud
              </Button>
            </div>
          </form>
        ) : (
          <div className="space-y-4">
            <div className="rounded-md border border-brand-200 bg-brand-50/40 p-4 space-y-2 text-sm text-brand-800">
              <h4 className="font-semibold text-brand-900 border-b border-brand-200 pb-1">
                Resumen de la solicitud
              </h4>
              <p><span className="text-brand-500">Trabajador:</span> {nombreTrabajador}</p>
              <p><span className="text-brand-500">Nueva fecha de ingreso:</span> {nuevaFechaIngreso}</p>
              <p><span className="text-brand-500">Motivo:</span> {motivo.trim()}</p>
              <p className="text-xs text-brand-600 mt-2">
                Nota: El trabajador permanecera en estado CESADO hasta que la solicitud sea evaluada y aprobada por la administracion.
              </p>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-brand-100">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setConfirmStep(false)}
                disabled={submitting}
              >
                Modificar
              </Button>
              <Button
                type="button"
                variant="primary"
                onClick={handleConfirmarReincorporacion}
                disabled={submitting}
              >
                {submitting ? 'Enviando...' : 'Enviar solicitud'}
              </Button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
