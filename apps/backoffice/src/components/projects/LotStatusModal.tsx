import { useEffect, useState, type FormEvent } from 'react';
import { toast } from 'sonner';

import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { FieldLabel, Select } from '../ui/Field';

import { coreService } from '../../services/coreService';

import { HistorialLotePanel } from '../lots/HistorialLotePanel';
import { HistorialComercialLotePanel } from '../lots/HistorialComercialLotePanel';
import { Gate } from '../auth/PermissionRoute';
import type {
  LoteResponse,
  EstadoLoteResponse
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
  const [refreshHistoryKey, setRefreshHistoryKey] = useState(0);

  useEffect(() => {
    if (open && lot) {
      setSelectedStatus('');
      setMotivo('');
    }
  }, [open, lot]);

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

      setRefreshHistoryKey((k) => k + 1);
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
          <HistorialLotePanel
            idLote={lot.idLote}
            codigoLote={lot.codigo}
            refreshKey={refreshHistoryKey}
          />
        </div>
        <Gate permission="sales.view">
          <div className="border-t pt-4">
            <HistorialComercialLotePanel
              idLote={lot.idLote}
              refreshKey={refreshHistoryKey}
            />
          </div>
        </Gate>
      </div>
    </Modal>
  );
}
