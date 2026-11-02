import React, { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { DownloadIcon, FileTextIcon, PlusIcon, Clock } from 'lucide-react';
import { PageHeader } from '../components/ui/PageHeader';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { SearchInput, Select, Input } from '../components/ui/Field';
import { Table, TD, TH, TR } from '../components/ui/Table';
import { StatusBadge, Badge } from '../components/ui/Badge';
import { Tabs } from '../components/ui/Tabs';
import { EmptyState } from '../components/ui/Feedback';
import { Modal } from '../components/ui/Modal';
import { Gate } from '../components/auth/PermissionRoute';
import { currency } from '../utils/format';
import { salesService } from '../services/salesService';
import { lotsService } from '../services/lotsService';
import { crmBackend, type CrmProspect } from '../services/crmBackend';
import { ContratosPendientesPanel } from '../components/sales/ContratosPendientesPanel';
import type { Sale, Lot } from '../types';

// Envio real habilitado tras validacion del flujo seguro con comprobante de pago S/ 500.
const SEPARACION_ENVIO_DESHABILITADO = false;

export function Sales() {
  const [tab, setTab] = useState<'todas' | 'Separación' | 'Venta'>('todas');
  const [query, setQuery] = useState('');
  const [modality, setModality] = useState<'all' | Sale['modality']>('all');
  const [detail, setDetail] = useState<Sale | null>(null);
  const [salesList, setSalesList] = useState<Sale[]>([]);
  const [, setLoading] = useState(false);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [opType, setOpType] = useState<'Separacion' | 'Venta'>('Separacion');
  const [availableLots, setAvailableLots] = useState<Lot[]>([]);
  const [prospectsList, setProspectsList] = useState<CrmProspect[]>([]);
  const [selectedProspectId, setSelectedProspectId] = useState<number | ''>('');
  const [formLotId, setFormLotId] = useState('');
  const [formObservations, setFormObservations] = useState('');
  const [formPaymentMethod, setFormPaymentMethod] = useState<'TRANSFERENCIA' | 'DEPOSITO' | 'YAPE_PLIN' | 'EFECTIVO' | 'OTRO'>('TRANSFERENCIA');
  const [formOperationNumber, setFormOperationNumber] = useState('');
  const [voucherFile, setVoucherFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [loadingFormData, setLoadingFormData] = useState(false);
  const [formTouched, setFormTouched] = useState(false);

  const fetchSalesData = async () => {
    setLoading(true);
    try {
      const liveSales = await salesService.getSales();
      setSalesList(liveSales ?? []);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al cargar ventas.';
      setSalesList([]);
      toast.error('No se pudieron cargar las operaciones.', { description: msg });
    } finally {
      setLoading(false);
    }
  };

  const loadFormData = async () => {
    setLoadingFormData(true);
    try {
      const [lots, prospects] = await Promise.all([
        lotsService.getLots(),
        crmBackend.prospectos()
      ]);
      setAvailableLots(lots.filter((l) => l.status === 'Disponible'));
      setProspectsList(prospects ?? []);
      if (prospects && prospects.length > 0) {
        setSelectedProspectId(prospects[0].id_prospecto);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al cargar datos.';
      toast.error('Error al cargar datos del formulario', { description: msg });
    } finally {
      setLoadingFormData(false);
    }
  };

  useEffect(() => {
    void fetchSalesData();
  }, []);

  const handleOpenModal = () => {
    void loadFormData();
    setFormTouched(false);
    setFormPaymentMethod('TRANSFERENCIA');
    setFormOperationNumber('');
    setVoucherFile(null);
    setFormObservations('');
    setIsModalOpen(true);
  };

  const handleSelectLot = (lotIdStr: string) => {
    setFormLotId(lotIdStr);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const allowed = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];
    if (!allowed.includes(file.type)) {
      toast.error('Formato no permitido', { description: 'Utilice archivos PDF, JPG, PNG o WebP.' });
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Archivo demasiado grande', { description: 'El comprobante no debe superar 5 MB.' });
      return;
    }
    setVoucherFile(file);
  };

  const handleExpireOverdue = async () => {
    try {
      const res = await salesService.expireOverdueReservations();
      toast.success(res?.mensaje || 'Control de caducidad ejecutado correctamente');
      await fetchSalesData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al ejecutar control de caducidad.';
      toast.error(msg);
    }
  };

  const validarFormularioSeparacion = (): boolean => {
    setFormTouched(true);
    if (!selectedProspectId) {
      toast.error('Debe seleccionar un prospecto del CRM.');
      return false;
    }
    if (!formLotId) {
      toast.error('Debe seleccionar un lote disponible.');
      return false;
    }
    if (formPaymentMethod !== 'EFECTIVO' && !formOperationNumber.trim()) {
      toast.error('El número de operación es obligatorio para este método de pago.');
      return false;
    }
    if (!voucherFile) {
      toast.error('Debe adjuntar el comprobante de pago de S/ 500.');
      return false;
    }
    return true;
  };

  const ejecutarRegistroSeparacion = async () => {
    setSubmitting(true);
    try {
      if (!voucherFile) throw new Error('Comprobante requerido.');
      const prospectId = Number(selectedProspectId);
      const lotIdNum = Number(formLotId);

      const carga = await crmBackend.subirComprobanteSeparacion(
        prospectId,
        lotIdNum,
        voucherFile
      );

      const res = await crmBackend.registrarSeparacion({
        idProspecto: prospectId,
        idLote: lotIdNum,
        metodoPago: formPaymentMethod,
        numeroOperacion: formOperationNumber.trim() || null,
        monto: 500.00,
        observaciones: formObservations.trim() || null,
        claveArchivo: carga.claveArchivo,
        nombreArchivo: carga.nombreArchivo,
        tipoMime: carga.tipoMime,
        tamanioBytes: carga.tamanioBytes
      });

      const vencimiento = res.fecha_vencimiento
        ? new Date(res.fecha_vencimiento).toLocaleDateString('es-PE')
        : '7 días';

      toast.success('Separación registrada exitosamente', {
        description: `Código: ${res.codigo_reserva || res.id_reserva}. Monto: S/ 500.00 PEN. Vence: ${vencimiento}. Comprobante pendiente de auditoría.`
      });

      setIsModalOpen(false);
      await fetchSalesData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al registrar separación.';
      toast.error('Error al registrar separación', { description: msg });
    } finally {
      setSubmitting(false);
    }
  };

  const handleProcessOperation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validarFormularioSeparacion()) return;
    if (opType === 'Venta') {
      toast.info('Flujo de venta inactivo', {
        description: 'La formalización de ventas se realiza desde el CRM.'
      });
      return;
    }
    if (SEPARACION_ENVIO_DESHABILITADO) {
      toast.info('Envío deshabilitado', {
        description: 'El envío real está deshabilitado temporalmente hasta implementar la evidencia de pago de S/ 500.'
      });
      return;
    }
    await ejecutarRegistroSeparacion();
  };

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return salesList.filter((sale) => {
      const byTab = tab === 'todas' || sale.type === tab;
      const byModality = modality === 'all' || sale.modality === modality;
      const byQuery =
        q.length === 0 ||
        sale.buyer.toLowerCase().includes(q) ||
        sale.code.toLowerCase().includes(q) ||
        sale.lot.toLowerCase().includes(q);
      return byTab && byModality && byQuery;
    });
  }, [salesList, tab, query, modality]);

  const separationsCount = salesList.filter((s) => s.type === 'Separación').length;
  const salesCount = salesList.filter((s) => s.type === 'Venta').length;

  return (
    <div>
      <PageHeader
        title="Separaciones y ventas"
        description="Operaciones comerciales con su comprador, lote, modalidad de venta y contrato asociado."
        actions={
          <div className="flex items-center gap-2">
            <Button icon={Clock} variant="secondary" disabled onClick={handleExpireOverdue}>
              Control de caducidad (7 d)
            </Button>
            <Gate permission="sales.export">
              <Button icon={DownloadIcon}>Exportar</Button>
            </Gate>
            <Gate permission="sales.create">
              <Button icon={PlusIcon} variant="primary" onClick={handleOpenModal}>
                Nueva operación
              </Button>
            </Gate>
          </div>
        }
      />

      <Tabs
        className="mb-5"
        active={tab}
        onChange={(id) => setTab(id as typeof tab)}
        items={[
          { id: 'todas', label: 'Todas', count: salesList.length },
          { id: 'Separación', label: 'Separaciones', count: separationsCount },
          { id: 'Venta', label: 'Ventas', count: salesCount }
        ]}
      />

      <Gate permission="sales.view">
        <ContratosPendientesPanel />
      </Gate>

      <Card>
        <div className="flex flex-wrap items-center gap-3 border-b border-brand-100 px-5 py-3.5">
          <SearchInput
            value={query}
            onValueChange={setQuery}
            placeholder="Buscar por comprador, código o lote…"
            className="w-full sm:w-72"
          />
          <div className="flex items-center gap-2">
            <span className="text-[12px] font-medium text-brand-600">Modalidad:</span>
            <Select
              value={modality}
              onChange={(e) => setModality(e.target.value as typeof modality)}
              className="w-36"
            >
              <option value="all">Todas</option>
              <option value="Contado">Contado</option>
              <option value="Financiado">Financiado</option>
              <option value="Reserva">Reserva</option>
            </Select>
          </div>
        </div>

        {rows.length === 0 ? (
          <EmptyState
            title="No hay operaciones registradas"
            description="Las separaciones y ventas se registrarán aquí con su documentación asociada."
          />
        ) : (

          <Table
            head={
              <>
                <TH>Código</TH>
                <TH>Tipo</TH>
                <TH>Comprador</TH>
                <TH>Lote / Proyecto</TH>
                <TH>Modalidad</TH>
                <TH align="right">Monto</TH>
                <TH>Asesor</TH>
                <TH>Contrato</TH>
                <TH>Estado</TH>
                <TH align="right">Acciones</TH>
              </>
            }
          >
            <tbody>
              {rows.map((sale) => (
                <TR key={sale.id}>
                  <TD className="font-mono text-[12px] font-semibold text-brand-900">{sale.code}</TD>
                  <TD>
                    <Badge tone={sale.type === 'Venta' ? 'brand' : 'neutral'}>                      {sale.type}
                    </Badge>
                  </TD>
                  <TD className="font-medium text-brand-900">{sale.buyer}</TD>
                  <TD className="font-mono text-[12px] text-brand-700">{sale.lot}</TD>
                  <TD className="text-brand-600">{sale.project}</TD>
                  <TD className="text-brand-600">{sale.modality}</TD>
                  <TD className="text-right font-mono font-semibold text-brand-900">
                    {currency(sale.amount)}
                  </TD>
                  <TD className="text-[12px] text-brand-500">{sale.date}</TD>
                  <TD>
                    <StatusBadge status={sale.status} />
                  </TD>
                  <TD className="text-right">
                    <Button
                      size="sm"
                      variant="ghost"
                      icon={FileTextIcon}
                      onClick={() => setDetail(sale)}
                    >
                      Ver
                    </Button>
                  </TD>
                </TR>
              ))}
            </tbody>
          </Table>
        )}
      </Card>

      {/* Modal Detalle de Operación */}
      <Modal
        open={detail !== null}
        onClose={() => setDetail(null)}
        title={detail ? `Operación ${detail.code}` : ''}
        description={detail ? `${detail.type} · ${detail.buyer}` : ''}
      >
        {detail ? (
          <dl className="divide-y divide-brand-100 text-sm">
            {[
              { label: 'Código', value: detail.code },
              { label: 'Tipo de operación', value: detail.type },
              { label: 'Comprador', value: detail.buyer },
              { label: 'Lote', value: detail.lot },
              { label: 'Proyecto', value: detail.project },
              { label: 'Modalidad de venta', value: detail.modality },
              { label: 'Monto de la operación', value: currency(detail.amount) },
              { label: 'Asesor', value: detail.advisor },
              { label: 'Contrato', value: detail.contract },
              { label: 'Estado', value: detail.status }
            ].map((row) => (
              <div key={row.label} className="flex items-baseline justify-between gap-4 py-2.5">
                <dt className="text-[12px] text-brand-400">{row.label}</dt>
                <dd className="text-right text-[13px] font-medium text-brand-800">{row.value}</dd>
              </div>
            ))}
          </dl>
        ) : null}
      </Modal>

      {/* Modal Operación Inmobiliaria: Separación o Venta */}
      <Modal
        open={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={opType === 'Separacion' ? 'Registrar Separación de Lote' : 'Formalización de Venta'}
        description="Selecciona prospecto, lote y condiciones comerciales para registrar en Supabase."
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setIsModalOpen(false)}>
              Cancelar
            </Button>
            <Button
              variant="primary"
              disabled={submitting || SEPARACION_ENVIO_DESHABILITADO || opType === 'Venta'}
              onClick={handleProcessOperation}
            >
              {submitting
                ? 'Procesando…'
                : opType === 'Separacion'
                  ? 'Registrar Separación'
                  : 'Venta inactiva'}
            </Button>
          </div>
        }
      >
        {loadingFormData ? (
          <div className="py-8 text-center text-xs text-brand-500">
            Cargando prospectos y lotes disponibles…
          </div>
        ) : (
          <form onSubmit={handleProcessOperation} className="space-y-4">
            <div>
              <label className="mb-1 block text-[12px] font-medium text-brand-700">
                Tipo de Operación
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setOpType('Separacion')}
                  className={`py-2 px-3 text-xs font-semibold rounded-lg border transition-all ${opType === 'Separacion'
                    ? 'bg-brand-900 text-white border-brand-900 shadow-sm'
                    : 'bg-white text-brand-700 border-brand-200 hover:bg-brand-50'
                    }`}
                >
                  Separación (S/ 500)
                </button>
                <button
                  type="button"
                  onClick={() => setOpType('Venta')}
                  className={`py-2 px-3 text-xs font-semibold rounded-lg border transition-all ${opType === 'Venta'
                    ? 'bg-brand-900 text-white border-brand-900 shadow-sm'
                    : 'bg-white text-brand-700 border-brand-200 hover:bg-brand-50'
                    }`}
                >
                  Venta (Inactiva)
                </button>
              </div>
            </div>

            <div>
              <label className="mb-1 block text-[12px] font-medium text-brand-700">
                Prospecto (CRM) *
              </label>
              <Select
                value={selectedProspectId === '' ? '' : String(selectedProspectId)}
                onChange={(e) => setSelectedProspectId(e.target.value ? Number(e.target.value) : '')}
              >
                <option value="">Seleccione un prospecto del CRM…</option>
                {prospectsList.map((p) => (
                  <option key={p.id_prospecto} value={p.id_prospecto}>
                    {p.nombre_completo} ({p.codigo}) - {p.estado_nombre || p.estado_codigo}
                  </option>
                ))}
              </Select>
              {!selectedProspectId && formTouched && (
                <p className="mt-1 text-[11px] font-medium text-rose-600">
                  Debe seleccionar un prospecto del CRM.
                </p>
              )}
            </div>

            <div>
              <label className="mb-1 block text-[12px] font-medium text-brand-700">
                Lote Disponible *
              </label>
              <Select value={formLotId} onChange={(e) => handleSelectLot(e.target.value)}>
                <option value="">Seleccione un lote disponible…</option>
                {availableLots.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.code} ({l.block}) - {l.area}m² - {currency(l.price)} [{l.status}]
                  </option>
                ))}
              </Select>
              {!formLotId && formTouched && (
                <p className="mt-1 text-[11px] font-medium text-rose-600">
                  Debe seleccionar un lote disponible.
                </p>
              )}
            </div>

            {opType === 'Separacion' ? (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="mb-1 block text-[12px] font-medium text-brand-700">
                      Método de pago (S/ 500.00) *
                    </label>
                    <Select
                      value={formPaymentMethod}
                      onChange={(e) => setFormPaymentMethod(e.target.value as any)}
                    >
                      <option value="TRANSFERENCIA">Transferencia Bancaria</option>
                      <option value="DEPOSITO">Depósito en Cuenta</option>
                      <option value="YAPE_PLIN">Billetera (Yape / Plin)</option>
                      <option value="EFECTIVO">Efectivo en Caja</option>
                      <option value="OTRO">Otro Medio</option>
                    </Select>
                  </div>

                  {formPaymentMethod !== 'EFECTIVO' ? (
                    <div>
                      <label className="mb-1 block text-[12px] font-medium text-brand-700">
                        N° de Operación *
                      </label>
                      <Input
                        type="text"
                        placeholder="Ej: 00982341..."
                        value={formOperationNumber}
                        onChange={(e) => setFormOperationNumber(e.target.value)}
                      />
                      {!formOperationNumber.trim() && formTouched && (
                        <p className="mt-1 text-[11px] font-medium text-rose-600">
                          Número de operación obligatorio.
                        </p>
                      )}
                    </div>
                  ) : (
                    <div>
                      <label className="mb-1 block text-[12px] font-medium text-brand-700">
                        Caja / Modalidad
                      </label>
                      <div className="py-2 px-3 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-600">
                        Pago directo en efectivo (S/ 500)
                      </div>
                    </div>
                  )}
                </div>

                <div>
                  <label className="mb-1 block text-[12px] font-medium text-brand-700">
                    Comprobante de Pago * (PDF, JPG, PNG - Máx. 5 MB)
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="file"
                      id="voucher-input"
                      accept=".pdf,image/jpeg,image/png,image/webp"
                      className="hidden"
                      onChange={handleFileChange}
                    />
                    <label
                      htmlFor="voucher-input"
                      className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border border-brand-300 rounded-md bg-white hover:bg-brand-50 text-brand-800"
                    >
                      <FileTextIcon className="w-3.5 h-3.5 text-brand-600" />
                      {voucherFile ? 'Cambiar comprobante' : 'Adjuntar comprobante'}
                    </label>
                    {voucherFile && (
                      <span className="text-xs text-brand-700 font-medium truncate max-w-[220px]">
                        {voucherFile.name} ({(voucherFile.size / 1024).toFixed(0)} KB)
                      </span>
                    )}
                  </div>
                  {!voucherFile && formTouched && (
                    <p className="mt-1 text-[11px] font-medium text-rose-600">
                      Debe adjuntar el comprobante o voucher de pago de S/ 500.00.
                    </p>
                  )}
                </div>

                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-900 space-y-1">
                  <p className="font-semibold text-emerald-950">Condiciones de Separación:</p>
                  <p>Monto reglamentario: <span className="font-bold">S/ 500.00 PEN</span></p>
                  <p>Plazo de vigencia: <span className="font-bold">7 días calendario</span> (vence automáticamente si no se formaliza venta).</p>
                  <p>El lote cambiará a estado <span className="font-bold text-emerald-800">RESERVADO</span> en el mapa interactivo.</p>
                  <p>El pago ingresará en estado <span className="font-bold text-emerald-800">REGISTRADO</span> y el comprobante quedará <span className="font-bold text-emerald-800">PENDIENTE</span> de auditoría por Finanzas.</p>
                </div>
              </>
            ) : (
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 space-y-1">
                <p className="font-semibold text-slate-900">Flujo de ventas inactivo:</p>
                <p>La formalización de ventas se gestiona desde el expediente comercial en el CRM tras la separación.</p>
              </div>
            )}

            <div>
              <label className="mb-1 block text-[12px] font-medium text-brand-700">
                Observaciones (Opcional)
              </label>
              <Input
                type="text"
                placeholder="Detalle o nota interna..."
                value={formObservations}
                onChange={(e) => setFormObservations(e.target.value)}
              />
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}
