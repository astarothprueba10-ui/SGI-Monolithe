
import { useState, type FormEvent } from 'react';
import { toast } from 'sonner';
import { crmBackend } from '../../services/crmBackend';
import { Modal } from '../ui/Modal';

interface Props {
  idContrato: number;
  idContratoArchivo: number;
  codigoContrato: string;
  revisadoEnSesion: boolean;
  onClose: () => void;
  onAprobado: () => void | Promise<void>;
}

const fechaLocalHoy = () => {
  const ahora = new Date();
  const local = new Date(
    ahora.getTime() - ahora.getTimezoneOffset() * 60000
  );

  return local.toISOString().slice(0, 10);
};

export function AprobarFirmaContratoModal({
  idContrato,
  idContratoArchivo,
  codigoContrato,
  revisadoEnSesion,
  onClose,
  onAprobado
}: Props) {
  const [fechaFirma, setFechaFirma] = useState('');
  const [observaciones, setObservaciones] = useState('');
  const [firmaRevisada, setFirmaRevisada] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [confirmacionPendiente, setConfirmacionPendiente] = useState(false);


  const confirmarAprobacion = async (e?: FormEvent) => {
    e?.preventDefault();

    if (guardando) return;

    if (!revisadoEnSesion) {
      toast.error('Primero debes abrir el PDF para revisarlo.');
      return;
    }

    if (!firmaRevisada) {
      toast.error('Confirma que revisaste la firma.');
      return;
    }

    if (!fechaFirma || fechaFirma > fechaLocalHoy()) {
      toast.error('Ingresa una fecha de firma válida.');
      return;
    }

    const comentario = observaciones.trim();

    if (comentario.length < 15 || comentario.length > 500) {
      toast.error('Las observaciones deben tener entre 15 y 500 caracteres.');
      return;
    }

    if (!confirmacionPendiente) {
      setConfirmacionPendiente(true);
      return;
    }

    setGuardando(true);

    try {
      const resultado = await crmBackend.aprobarFirmaContrato(
        idContrato,
        {
          idContratoArchivo,
          fechaFirma,
          firmaRevisada: true,
          observaciones: comentario
        }
      );

      if (!resultado.success) {
        throw new Error('No se confirmó la aprobación.');
      }

      toast.success(
        resultado.mensaje || 'Contrato aprobado correctamente.'
      );

      await onAprobado();
      onClose();

    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : 'No fue posible aprobar el contrato.'
      );
    } finally {
      setGuardando(false);
    }
  };


  if (confirmacionPendiente) {
    return (
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirmacion-firma-titulo"
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      >
        <div className="w-full max-w-lg overflow-hidden rounded-xl bg-white shadow-xl">

          <div className="border-b border-brand-100 px-6 py-4">
            <h2
              id="confirmacion-firma-titulo"
              className="text-lg font-semibold text-brand-900"
            >
              Confirmar aprobación contractual
            </h2>

            <p className="mt-1 text-sm text-brand-500">
              Revise las consecuencias antes de continuar.
            </p>
          </div>

          <div className="space-y-4 px-6 py-5">
            <div className="rounded-lg border border-brand-200 bg-brand-50 p-4">
              <p className="text-xs text-brand-500">
                Contrato
              </p>

              <p className="mt-1 font-semibold text-brand-900">
                {codigoContrato}
              </p>

              <p className="mt-3 text-xs text-brand-500">
                Fecha de firma declarada
              </p>

              <p className="font-medium text-brand-900">
                {fechaFirma}
              </p>
            </div>

            <div className="rounded-lg border border-amber-300 bg-amber-50 p-4">
              <p className="text-sm font-semibold text-amber-900">
                Esta operación modificará los registros comerciales
              </p>

              <ul className="mt-3 list-disc space-y-2 pl-5 text-xs text-amber-900">
                <li>
                  La venta pasará a estado CONTRATADA.
                </li>
                <li>
                  El lote cambiará a VENDIDO.
                </li>
                <li>
                  El prospecto se convertirá en comprador.
                </li>
                <li>
                  Si corresponde, se activará el plan financiado
                  y se generarán las cuotas.
                </li>
                <li>
                  Los S/ 500 de separación confirmados se
                  aplicarán a la venta correspondiente.
                </li>
              </ul>
            </div>

            <p className="text-xs text-brand-600">
              Confirme únicamente si comprobó que el documento
              contiene las firmas reales y corresponde a esta
              operación. Esta acción no debe utilizarse con
              documentos de prueba.
            </p>
          </div>

          <div className="flex justify-end gap-3 border-t border-brand-100 bg-brand-50/50 px-6 py-4">
            <button
              type="button"
              disabled={guardando}
              onClick={() => setConfirmacionPendiente(false)}
              className="rounded-lg border border-brand-200 bg-white px-4 py-2 text-sm font-medium text-brand-800 disabled:opacity-50"
            >
              Volver
            </button>

            <button
              type="button"
              disabled={guardando}
              onClick={() => void confirmarAprobacion()}
              className="rounded-lg bg-brand-900 px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-50"
            >
              {guardando
                ? 'Aprobando...'
                : 'Confirmar aprobación definitiva'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <Modal open onClose={onClose} title="Aprobar firma contractual" width="max-w-lg">
        <p className="mt-2 text-sm text-slate-600">
          Contrato: <strong>{codigoContrato}</strong>
        </p>

        <p className="mt-3 text-sm text-amber-700">
          La aprobación modificará los estados comerciales
          del comprador y del lote. Verifica cuidadosamente
          el documento antes de continuar.
        </p>

        <form
          onSubmit={(e) => void confirmarAprobacion(e)}
          className="mt-5 space-y-4"
        >
          <div>
            <label
              htmlFor="fecha-firma"
              className="mb-1 block text-sm font-medium"
            >
              Fecha real de firma
            </label>

            <input
              id="fecha-firma"
              type="date"
              required
              max={fechaLocalHoy()}
              value={fechaFirma}
              onChange={(e) => setFechaFirma(e.target.value)}
              disabled={guardando}
              className="w-full rounded-lg border border-slate-300 p-2"
            />
          </div>

          <div>
            <label
              htmlFor="observaciones-firma"
              className="mb-1 block text-sm font-medium"
            >
              Observaciones de revisión
            </label>

            <textarea
              id="observaciones-firma"
              required
              minLength={15}
              maxLength={500}
              rows={4}
              value={observaciones}
              onChange={(e) => setObservaciones(e.target.value)}
              placeholder="Indica qué verificaste en el documento firmado."
              disabled={guardando}
              className="w-full rounded-lg border border-slate-300 p-2"
            />

            <p className="mt-1 text-xs text-slate-500">
              {observaciones.length}/500 caracteres
            </p>
          </div>

          <label className="flex items-start gap-2 text-sm">
            <input
              type="checkbox"
              checked={firmaRevisada}
              onChange={(e) => setFirmaRevisada(e.target.checked)}
              disabled={guardando || !revisadoEnSesion}
              className="mt-1"
            />

            <span>
              Confirmo que revisé el PDF contractual y comprobé
              manualmente la firma correspondiente.
            </span>
          </label>

          {!revisadoEnSesion && (
            <p className="text-sm text-red-600">
              Debes seleccionar «Revisar PDF» antes de aprobar.
            </p>
          )}

          <div className="dialog-actions flex flex-wrap justify-end gap-3 pt-3">
            <button
              type="button"
              disabled={guardando}
              onClick={onClose}
              className="min-h-11 rounded-lg border border-slate-300 px-4 py-2 text-sm"
            >
              Cancelar
            </button>

            <button
              type="submit"
              disabled={
                guardando ||
                !revisadoEnSesion ||
                !firmaRevisada ||
                !fechaFirma ||
                observaciones.trim().length < 15
              }
              className="min-h-11 rounded-lg bg-blue-900 px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-50"
            >
              {guardando
                ? 'Procesando...'
                : 'Continuar a confirmación'}
            </button>
          </div>
        </form>
    </Modal>
  );
}
