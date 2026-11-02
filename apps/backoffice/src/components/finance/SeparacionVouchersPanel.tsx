import React, { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { CheckCircleIcon, XCircleIcon, SearchIcon, EyeIcon } from 'lucide-react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Input, Select } from '../ui/Field';
import { Table, TD, TH, TR } from '../ui/Table';
import { Badge } from '../ui/Badge';
import { EmptyState } from '../ui/Feedback';
import { Modal } from '../ui/Modal';
import { Gate } from '../auth/PermissionRoute';
import { currency } from '../../utils/format';
import { crmBackend, type CrmSeparacionVoucherItem } from '../../services/crmBackend';

export function SeparacionVouchersPanel() {
  const [items, setItems] = useState<CrmSeparacionVoucherItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState<'TODOS' | 'PENDIENTE' | 'APROBADO' | 'RECHAZADO'>('PENDIENTE');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Modal Rechazo
  const [rejectingItem, setRejectingItem] = useState<CrmSeparacionVoucherItem | null>(null);
  const [rejectMotive, setRejectMotive] = useState('');
  const [rejectNotes, setRejectNotes] = useState('');
  const [processingAction, setProcessingAction] = useState(false);

  // Modal Confirmar Aprobacion
  const [approvingItem, setApprovingItem] = useState<CrmSeparacionVoucherItem | null>(null);

  const fetchVouchers = async () => {
    setLoading(true);
    try {
      const res = await crmBackend.listarVouchersSeparacion({
        estado: statusFilter,
        busqueda: search.trim() || undefined,
        pagina: page,
        tamano: 20
      });
      setItems(res?.items ?? []);
      setTotalPages(res?.paginas ?? 1);
      setTotalCount(res?.total ?? 0);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al consultar vouchers.';
      toast.error('No se pudieron cargar los comprobantes.', { description: msg });
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchVouchers();
  }, [statusFilter, page]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    void fetchVouchers();
  };

  const handleViewReceipt = async (item: CrmSeparacionVoucherItem) => {
    try {
      const enlace = await crmBackend.prepararLecturaVoucherSeparacion(item.id_voucher);
      if (enlace?.urlDescarga) {
        window.open(enlace.urlDescarga, '_blank', 'noopener,noreferrer');
      } else {
        toast.error('No se pudo obtener el enlace de lectura.');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error de visualizacion.';
      toast.error('Error al abrir comprobante', { description: msg });
    }
  };

  const handleApprove = async () => {
    if (!approvingItem) return;
    setProcessingAction(true);
    try {
      await crmBackend.revisarVoucherSeparacion(approvingItem.id_voucher, {
        aprobar: true
      });
      toast.success('Comprobante aprobado exitosamente', {
        description: `Pago confirmado y reserva ${approvingItem.codigo_reserva} activada.`
      });
      setApprovingItem(null);
      await fetchVouchers();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al aprobar comprobante.';
      toast.error('Error al aprobar', { description: msg });
    } finally {
      setProcessingAction(false);
    }
  };

  const handleReject = async () => {
    if (!rejectingItem) return;
    if (!rejectMotive.trim() || rejectMotive.trim().length < 5) {
      toast.error('Debe indicar un motivo claro de rechazo (minimo 5 caracteres).');
      return;
    }
    setProcessingAction(true);
    try {
      await crmBackend.revisarVoucherSeparacion(rejectingItem.id_voucher, {
        aprobar: false,
        motivo: rejectMotive.trim(),
        observaciones: rejectNotes.trim() || undefined
      });
      toast.success('Comprobante rechazado', {
        description: `Pago anulado y reserva ${rejectingItem.codigo_reserva} cancelada.`
      });
      setRejectingItem(null);
      setRejectMotive('');
      setRejectNotes('');
      await fetchVouchers();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al rechazar comprobante.';
      toast.error('Error al rechazar', { description: msg });
    } finally {
      setProcessingAction(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Filtros */}
      <Card className="p-4">
        <form onSubmit={handleSearchSubmit} className="flex flex-col sm:flex-row gap-3 items-center justify-between">
          <div className="flex flex-1 gap-2 w-full sm:max-w-md">
            <Input
              type="text"
              placeholder="Buscar por cliente, lote, operacion o codigo..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full text-xs"
            />
            <Button type="submit" variant="secondary" icon={SearchIcon}>
              Buscar
            </Button>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <span className="text-xs text-brand-600 font-medium">Estado:</span>
            <Select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value as any);
                setPage(1);
              }}
              className="text-xs"
            >
              <option value="TODOS">Todos los estados</option>
              <option value="PENDIENTE">Pendientes de auditoria</option>
              <option value="APROBADO">Aprobados</option>
              <option value="RECHAZADO">Rechazados</option>
            </Select>
          </div>
        </form>
      </Card>

      {/* Tabla de Vouchers */}
      <Card>
        {loading ? (
          <div className="py-12 text-center text-xs text-brand-500">
            Cargando comprobantes de separacion...
          </div>
        ) : items.length === 0 ? (
          <EmptyState
            title="No hay comprobantes de separacion"
            description="Los vouchers registrados apareceran en esta bandeja para validacion por Finanzas."
          />
        ) : (
          <Table
            head={
              <>
                <TH>Codigo Voucher</TH>
                <TH>Cliente</TH>
                <TH>Lote</TH>
                <TH>Metodo / Operacion</TH>
                <TH align="right">Monto</TH>
                <TH>Fecha Carga</TH>
                <TH>Estado Voucher</TH>
                <TH align="right">Acciones</TH>
              </>
            }
          >
            {items.map((row) => (
              <TR key={row.id_voucher}>
                <TD className="font-mono text-xs font-semibold text-brand-900">
                  {row.codigo_voucher}
                </TD>
                <TD>
                  <p className="font-medium text-brand-900 text-xs">{row.nombre_cliente}</p>
                  <p className="text-[11px] text-brand-500 font-mono">{row.documento_cliente}</p>
                </TD>
                <TD className="text-xs font-medium text-brand-800">
                  {row.codigo_lote || `Lote #${row.id_lote}`}
                </TD>
                <TD className="text-xs">
                  <p className="font-medium text-brand-900">{row.nombre_metodo_pago || row.metodo_pago}</p>
                  {row.numero_operacion && (
                    <p className="text-[11px] text-brand-500 font-mono">OP: {row.numero_operacion}</p>
                  )}
                </TD>
                <TD align="right" className="font-bold text-xs text-brand-900">
                  {currency(row.monto ?? 500)}
                </TD>
                <TD className="text-xs text-brand-600">
                  {row.fecha_carga ? new Date(row.fecha_carga).toLocaleDateString('es-PE', {
                    day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
                  }) : '-'}
                </TD>
                <TD>
                  <Badge
                    tone={
                      row.estado_voucher === 'APROBADO'
                        ? 'brand'
                        : row.estado_voucher === 'RECHAZADO'
                        ? 'neutral'
                        : 'brand'
                    }
                  >
                    {row.nombre_estado_voucher || row.estado_voucher}
                  </Badge>
                </TD>
                <TD align="right">
                  <div className="flex items-center justify-end gap-1.5">
                    <Button
                      variant="secondary"
                      size="sm"
                      icon={EyeIcon}
                      onClick={() => handleViewReceipt(row)}
                      title="Ver comprobante privado"
                    >
                      Ver
                    </Button>

                    {row.estado_voucher === 'PENDIENTE' && (
                      <Gate permission="finance.edit">
                        <Button
                          variant="primary"
                          size="sm"
                          icon={CheckCircleIcon}
                          onClick={() => setApprovingItem(row)}
                          title="Aprobar pago y activar reserva"
                        >
                          Aprobar
                        </Button>
                        <Button
                          variant="danger"
                          size="sm"
                          icon={XCircleIcon}
                          onClick={() => {
                            setRejectingItem(row);
                            setRejectMotive('');
                            setRejectNotes('');
                          }}
                          title="Rechazar voucher y cancelar reserva"
                        >
                          Rechazar
                        </Button>
                      </Gate>
                    )}
                  </div>
                </TD>
              </TR>
            ))}
          </Table>
        )}

        {/* Paginacion */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between p-3 border-t border-brand-100 text-xs text-brand-600">
            <span>Total: {totalCount} vouchers</span>
            <div className="flex gap-1">
              <Button
                variant="secondary"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                Anterior
              </Button>
              <span className="px-2 py-1 font-medium">{page} / {totalPages}</span>
              <Button
                variant="secondary"
                size="sm"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              >
                Siguiente
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* Modal Confirmar Aprobacion */}
      <Modal
        open={approvingItem !== null}
        onClose={() => setApprovingItem(null)}
        title="Confirmar Aprobacion de Separacion"
        description="Esta accion confirmara el pago reglamentario de S/ 500.00 PEN y activara la reserva formalmente."
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setApprovingItem(null)}>
              Cancelar
            </Button>
            <Button
              variant="primary"
              disabled={processingAction}
              onClick={handleApprove}
            >
              {processingAction ? 'Procesando...' : 'Confirmar Aprobacion'}
            </Button>
          </div>
        }
      >
        {approvingItem && (
          <div className="space-y-3 text-xs text-brand-800">
            <p><span className="font-semibold text-brand-950">Cliente:</span> {approvingItem.nombre_cliente}</p>
            <p><span className="font-semibold text-brand-950">Lote:</span> {approvingItem.codigo_lote}</p>
            <p><span className="font-semibold text-brand-950">Monto:</span> {currency(approvingItem.monto ?? 500)} PEN</p>
            <p><span className="font-semibold text-brand-950">Metodo:</span> {approvingItem.nombre_metodo_pago || approvingItem.metodo_pago} {approvingItem.numero_operacion ? `(OP: ${approvingItem.numero_operacion})` : ''}</p>
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-900">
              Al aprobar, el voucher pasara a estado APROBADO, el pago a CONFIRMADO y la reserva a VIGENTE.
            </div>
          </div>
        )}
      </Modal>

      {/* Modal Rechazo */}
      <Modal
        open={rejectingItem !== null}
        onClose={() => setRejectingItem(null)}
        title="Rechazar Comprobante de Separacion"
        description="Esta accion anulara el pago registrado, cancelara la reserva y liberara el lote a DISPONIBLE (salvo que exista una venta en curso)."
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setRejectingItem(null)}>
              Cancelar
            </Button>
            <Button
              variant="danger"
              disabled={processingAction || !rejectMotive.trim() || rejectMotive.trim().length < 5}
              onClick={handleReject}
            >
              {processingAction ? 'Procesando...' : 'Confirmar Rechazo'}
            </Button>
          </div>
        }
      >
        {rejectingItem && (
          <div className="space-y-3 text-xs">
            <div>
              <label className="mb-1 block font-medium text-brand-700">
                Motivo del Rechazo * (Minimo 5 caracteres)
              </label>
              <Input
                type="text"
                placeholder="Ej: Monto incompleto, constancia ilegible, operacion no habida..."
                value={rejectMotive}
                onChange={(e) => setRejectMotive(e.target.value)}
              />
            </div>
            <div>
              <label className="mb-1 block font-medium text-brand-700">
                Observaciones adicionales (Opcional)
              </label>
              <Input
                type="text"
                placeholder="Detalle para auditoria interna..."
                value={rejectNotes}
                onChange={(e) => setRejectNotes(e.target.value)}
              />
            </div>
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-900">
              Al confirmar el rechazo, el voucher pasara a RECHAZADO, el pago a ANULADO y la reserva a CANCELADA.
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

