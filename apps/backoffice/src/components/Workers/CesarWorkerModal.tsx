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

interface CesarWorkerModalProps {
  open: boolean;
  worker: TrabajadorResponse | null;
  onClose: () => void;
  onSuccess: () => void;
}

export function CesarWorkerModal({
  open,
  worker,
  onClose,
  onSuccess
}: CesarWorkerModalProps) {
  const [fechaCese, setFechaCese] = useState('');
  const [motivo, setMotivo] = useState('');
  const [confirmStep, setConfirmStep] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const submitLock = useRef(false);

  useEffect(() => {
    if (!open) return;
    setFechaCese(getPeruTodayDateString());
    setMotivo('');
    setConfirmStep(false);
    setErrorMsg(null);
  }, [open]);

  function validar(): string | null {
    if (!fechaCese) return 'La fecha de cese es obligatoria.';
    if (worker?.informacionLaboral.fechaIngreso) {
      const ingreso = worker.informacionLaboral.fechaIngreso.slice(0, 10);
      if (fechaCese < ingreso) {
        return `La fecha de cese no puede ser anterior a la fecha de ingreso (${ingreso}).`;
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

  async function handleConfirmarCese() {
    if (!worker || submitLock.current) return;
    submitLock.current = true;
    setSubmitting(true);
    setErrorMsg(null);
    try {
      await coreService.cesarTrabajador(worker.idTrabajador, {
        fechaCese,
        motivo: motivo.trim()
      });
      toast.success('El cese laboral se registro con exito y se notifico al administrador.');
      onSuccess();
      onClose();
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'Error al registrar el cese.';
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
      title={confirmStep ? 'Confirmar cese definitivo' : 'Cesar trabajador'}
      description={`Trabajador: ${nombreTrabajador} (${worker.codigo})`}
      width="max-w-lg"
    >
      <div className="space-y-4">
        {errorMsg && <Alert variant="danger">{errorMsg}</Alert>}

        {!confirmStep ? (
          <form onSubmit={handleRevisar} className="space-y-4">
            <div>
              <FieldLabel htmlFor="fechaCeseInput">Fecha de cese *</FieldLabel>
              <Input
                id="fechaCeseInput"
                type="date"
                value={fechaCese}
                onChange={(e) => setFechaCese(e.target.value)}
                disabled={submitting}
                required
              />
            </div>

            <div>
              <div className="flex items-center justify-between">
                <FieldLabel htmlFor="motivoCeseInput">Motivo del cese *</FieldLabel>
                <span className="text-[11px] text-brand-400">
                  {motivo.trim().length} / 1000 (minimo 10)
                </span>
              </div>
              <textarea
                id="motivoCeseInput"
                rows={3}
                value={motivo}
                onChange={(e) => setMotivo(e.target.value)}
                maxLength={1000}
                required
                disabled={submitting}
                placeholder="Indique las razones formales del cese laboral..."
                className="w-full rounded-md border border-brand-200 px-3 py-2 text-[13px] text-brand-800 focus:border-brand-500 focus:outline-none disabled:bg-brand-50"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-brand-100">
              <Button type="button" variant="secondary" onClick={onClose} disabled={submitting}>
                Cancelar
              </Button>
              <Button type="submit" variant="primary" disabled={submitting}>
                Revisar y confirmar
              </Button>
            </div>
          </form>
        ) : (
          <div className="space-y-4">
            <div className="rounded-md border border-rose-200 bg-rose-50/50 p-4 space-y-2 text-sm text-brand-800">
              <h4 className="font-semibold text-rose-900 border-b border-rose-200 pb-1">
                Atencion: Operacion irrevocable
              </h4>
              <p><span className="text-brand-500">Trabajador:</span> {nombreTrabajador}</p>
              <p><span className="text-brand-500">Fecha de cese:</span> {fechaCese}</p>
              <p><span className="text-brand-500">Motivo:</span> {motivo.trim()}</p>
              <p className="text-xs text-rose-700 mt-2">
                El trabajador pasara a estado CESADO. El sistema notificara inmediatamente al administrador.
              </p>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-brand-100">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setConfirmStep(false)}
                disabled={submitting}
              >
                Modificar datos
              </Button>
              <Button
                type="button"
                variant="danger"
                onClick={handleConfirmarCese}
                disabled={submitting}
              >
                {submitting ? 'Procesando...' : 'Confirmar cese definitivo'}
              </Button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
