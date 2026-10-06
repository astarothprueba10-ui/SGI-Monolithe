import { useEffect, useState, type FormEvent } from 'react';
import { toast } from 'sonner';

import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { FieldLabel, Select } from '../ui/Field';

import { coreService } from '../../services/coreService';

import type {
  LoteResponse,
  EstadoLoteResponse,
  LoteHistorialEstadoResponse
} from '../../types/core';

interface Props {
  open: boolean;
  onClose: () => void;
  onSuccess: () => Promise<void> | void;
  lot: LoteResponse | null;
  statuses: EstadoLoteResponse[];
  canEdit: boolean;
}

export function LotStatusModal({
  open,
  onClose,
  onSuccess,
  lot,
  statuses,
  canEdit
}: Props) {
  const [selectedStatus, setSelectedStatus] = useState<string>('');
  const [motivo, setMotivo] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [history, setHistory] = useState<LoteHistorialEstadoResponse[]>([]);

  useEffect(() => {
    if (open && lot) {
      loadHistory();
      setSelectedStatus('');
      setMotivo('');
    } else {
      setHistory([]);
    }
  }, [open, lot]);

  const loadHistory = async () => {
    if (!lot) return;
    try {
      setHistoryLoading(true);
      const data = await coreService.getLotStatusHistory(lot.idLote);
      setHistory(data);
    } catch (err: unknown) {
      console.error(err);
      toast.error('No se pudo cargar el historial de estados');
    } finally {
      setHistoryLoading(false);
    }
  };

  const getValidDestinations = (currentCode?: string): string[] => {
    if (!currentCode) return [];
    switch (currentCode) {
      case 'DISPONIBLE':
        return ['BLOQUEADO', 'NO_DISPONIBLE'];
      case 'BLOQUEADO':
        return ['DISPONIBLE', 'NO_DISPONIBLE'];
      case 'NO_DISPONIBLE':
        return ['DISPONIBLE', 'BLOQUEADO'];
      default:
        return [];
    }
  };

  const validDestinations = getValidDestinations(lot?.codigoEstadoLote);
  const options = statuses
    .filter(s => validDestinations.includes(s.codigo))
    .map(s => ({
      value: s.codigo,
      label: s.nombre
    }));

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!lot) return;

    if (!selectedStatus) {
      toast.error('Debe seleccionar un estado destino');
      return;
    }

    const trimmedMotivo = motivo.trim();
    if (!trimmedMotivo) {
      toast.error('El motivo es obligatorio');
      return;
    }

    if (trimmedMotivo.length > 255) {
      toast.error('El motivo no puede exceder 255 caracteres');
      return;
    }

    try {
      setLoading(true);
      const res = await coreService.changeLotStatus(lot.idLote, {
        codigoNuevoEstado: selectedStatus,
        motivo: trimmedMotivo
      });

      toast.success(res.message ?? 'Estado del lote actualizado correctamente');
      setSelectedStatus('');
      setMotivo('');

      await loadHistory();
      await onSuccess();
      // Notice: Modal remains open per requirement
    } catch (err: unknown) {
      if (err instanceof Error) {
        toast.error(err.message);
      } else if (typeof err === 'object' && err !== null && 'data' in err) {
        const apiErr = err as { data?: { message?: string } };
        toast.error(apiErr.data?.message || 'Ocurrió un error al cambiar el estado');
      } else {
        toast.error('Ocurrió un error al cambiar el estado');
      }
    } finally {
      setLoading(false);
    }
  };

  if (!lot) return null;

  const isReserved = lot.codigoEstadoLote === 'RESERVADO';
  const isSold = lot.codigoEstadoLote === 'VENDIDO';

  return (
    <Modal open={open} onClose={onClose} title="Estado del Lote" width="max-w-2xl">
      <div className="space-y-6">
        <div className="bg-gray-50 p-4 rounded-md">
          <p className="text-sm text-gray-700 font-medium">Lote: {lot.codigo} {lot.numero ? `- ${lot.numero}` : ''}</p>
          <p className="text-sm text-gray-600">Manzana: {lot.nombreManzana} ({lot.codigoManzana})</p>
          <p className="text-sm text-gray-600">Etapa: {lot.nombreEtapa} ({lot.codigoEtapa})</p>
          <p className="text-sm text-gray-600 font-medium mt-2">Estado actual: {lot.nombreEstadoLote}</p>
        </div>

        {canEdit && isReserved && (
          <div className="bg-amber-50 text-amber-800 p-4 rounded-md border border-amber-200">
            <p className="text-sm font-medium">Este lote se encuentra reservado. Su estado debe gestionarse mediante el proceso de reserva.</p>
          </div>
        )}

        {canEdit && isSold && (
          <div className="bg-slate-50 text-slate-800 p-4 rounded-md border border-slate-200">
            <p className="text-sm font-medium">Este lote se encuentra vendido. Su estado solo puede modificarse mediante un proceso formal de anulación de venta.</p>
          </div>
        )}

        {canEdit && !isReserved && !isSold && options.length > 0 && (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <FieldLabel>Estado nuevo *</FieldLabel>
              <Select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                disabled={loading}
              >
                <option value="">Seleccione un estado...</option>

                {options.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </Select>
            </div>

            <div>
              <FieldLabel>Motivo *</FieldLabel>
              <textarea
                className="w-full border border-gray-300 rounded-md shadow-sm p-2 text-sm focus:ring-blue-500 focus:border-blue-500"
                rows={3}
                value={motivo}
                onChange={(e) => setMotivo(e.target.value)}
                maxLength={255}
                disabled={loading}
                placeholder="Escriba el motivo del cambio..."
              />
              <p className="text-xs text-gray-500 mt-1 text-right">
                {motivo.length} / 255
              </p>
            </div>

            <div className="flex justify-end">
              <Button
                type="submit"
                disabled={loading}
              >
                {loading ? 'Actualizando...' : 'Actualizar estado'}
              </Button>
            </div>
          </form>
        )}

        {canEdit && !isReserved && !isSold && options.length === 0 && (
          <div className="text-sm text-gray-500 italic">
            No hay transiciones administrativas válidas desde el estado actual.
          </div>
        )}

        <div className="border-t pt-4 mt-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Historial de estados</h3>
          {historyLoading ? (
            <p className="text-sm text-gray-500">Cargando historial...</p>
          ) : history.length === 0 ? (
            <p className="text-sm text-gray-500 italic">Este lote aún no registra cambios de estado.</p>
          ) : (
            <div className="space-y-4 max-h-64 overflow-y-auto pr-2">
              {history.map((h) => (
                <div key={h.idHistorial} className="bg-white border rounded-md p-3 shadow-sm text-sm">
                  <div className="flex justify-between items-start mb-2">
                    <span className="font-semibold text-gray-800">
                      {new Intl.DateTimeFormat('es-PE', {
                        dateStyle: 'medium',
                        timeStyle: 'short'
                      }).format(new Date(h.fechaCambio))}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mb-2 text-gray-700">
                    <span className="bg-gray-100 px-2 py-1 rounded text-xs">
                      {h.nombreEstadoAnterior || 'N/A'}
                    </span>
                    <span>→</span>
                    <span className="bg-blue-50 text-blue-700 px-2 py-1 rounded text-xs font-medium">
                      {h.nombreEstadoNuevo}
                    </span>
                  </div>
                  {h.motivo && (
                    <p className="text-gray-600 italic">"{h.motivo}"</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}
