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
import { crmService } from '../services/crmService';
import { ContratosPendientesPanel } from '../components/sales/ContratosPendientesPanel';
import type { Sale, Lot, Lead } from '../types';

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
  const [leadsList, setLeadsList] = useState<Lead[]>([]);
  const [selectedLeadId, setSelectedLeadId] = useState('');
  const [formLotId, setFormLotId] = useState('');
  const [formModality, setFormModality] = useState<'Contado' | 'Financiado'>('Contado');
  const [formTotal, setFormTotal] = useState('108000');
  const [formInitial, setFormInitial] = useState('21600');
  const [formInstallments, setFormInstallments] = useState('36');
  const [formObservations, setFormObservations] = useState('');
  const [submitting, setSubmitting] = useState(false);


  const fetchSalesData = async () => {
    setLoading(true);

    try {
      const liveSales = await salesService.getSales();
      setSalesList(liveSales ?? []);

    } catch (err: any) {
      console.error('Error al cargar ventas:', err.message);
      setSalesList([]);
      toast.error('No se pudieron cargar las operaciones.');
    } finally {
      setLoading(false);
    }
  };

  const loadFormData = async () => {
    try {
      const [lots, leads] = await Promise.all([
        lotsService.getLots(),
        crmService.getLeads()
      ]);
      setAvailableLots(lots.filter((l) => l.status === 'Disponible' || l.status === 'Separado'));
      const validLeads = leads.filter((l) => l.personaId);
      setLeadsList(validLeads.length > 0 ? validLeads : leads);
      if (validLeads.length > 0) {
        setSelectedLeadId(validLeads[0].id);
      }
    } catch (err: any) {
      console.error('Error al cargar datos del formulario:', err.message);
    }
  };

  useEffect(() => {
    fetchSalesData();
  }, []);

  const handleOpenModal = () => {
    loadFormData();
    setIsModalOpen(true);
  };

  const handleSelectLot = (lotIdStr: string) => {
    setFormLotId(lotIdStr);
    const found = availableLots.find((l) => l.id === lotIdStr);
    if (found && found.price) {
      setFormTotal(found.price.toString());
      setFormInitial((found.price * 0.2).toFixed(0));
    }
  };

  const handleExpireOverdue = async () => {
    try {
      const res = await salesService.expireOverdueReservations();
      toast.success(res?.mensaje || 'Control de caducidad ejecutado correctamente');
      await fetchSalesData();
    } catch (err: any) {
      toast.error('Error al ejecutar control de caducidad: ' + err.message);
    }
  };

  const submitSeparation = async (lotIdNum: number, personaId: number) => {
    const res = await salesService.registerSeparation({
      lotId: lotIdNum,
      personaId,
      notes: formObservations || 'Separacion registrada desde Backoffice'
    });
    toast.success(`Separacion registrada exitosamente (#${res.id_reserva}). Vigencia: 7 dias.`);
  };

  const submitCashSale = async (lotIdNum: number, personaId: number, advisorId?: number | null) => {
    const res = await salesService.formalizeCashSale({
      lotId: lotIdNum,
      personaId,
      advisorId: advisorId ?? undefined,
      totalAmount: parseFloat(formTotal),
      notes: formObservations || 'Venta al contado formalizada'
    });
    toast.success(`Venta al contado formalizada: ${res.codigo_venta}`);
  };

  const submitFinancedSale = async (lotIdNum: number, personaId: number, advisorId?: number | null) => {
    const res = await salesService.formalizeFinancedSale({
      lotId: lotIdNum,
      personaId,
      advisorId: advisorId ?? undefined,
      totalAmount: parseFloat(formTotal),
      downPayment: parseFloat(formInitial),
      installmentsCount: parseInt(formInstallments, 10),
      notes: formObservations || 'Venta financiada formalizada'
    });
    toast.success(`Venta financiada: ${res.codigo_venta} (${res.numero_cuotas} cuotas)`);
  };

  const handleProcessOperation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formLotId) {
      toast.error('Por favor seleccione un lote');
      return;
    }
    const lead = leadsList.find((l) => l.id === selectedLeadId);

    if (!lead?.personaId || lead.personaId <= 0) {
      toast.error('Debe seleccionar un prospecto válido.');
      return;
    }

    if (opType === 'Venta' && (!lead.advisorId || lead.advisorId <= 0)) {
      toast.error('El prospecto necesita un asesor comercial asignado.');
      return;
    }

    const personaId = lead.personaId;
    const advisorId = lead.advisorId ?? null;
    const lotIdNum = parseInt(formLotId, 10);

    setSubmitting(true);
    try {
      if (opType === 'Separacion') {
        await submitSeparation(lotIdNum, personaId);
      } else if (formModality === 'Contado') {
        await submitCashSale(lotIdNum, personaId, advisorId);
      } else {
        await submitFinancedSale(lotIdNum, personaId, advisorId);
      }
      setIsModalOpen(false);
      await fetchSalesData();
    } catch (err: any) {
      toast.error('Error al procesar operacion: ' + err.message);
    } finally {
      setSubmitting(false);
    }
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
              <Button icon={PlusIcon} variant="primary" disabled onClick={handleOpenModal}>
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
          <Select
            value={modality}
            onChange={(e) => setModality(e.target.value as typeof modality)}
            className="w-full sm:w-48"
          >
            <option value="all">Todas las modalidades</option>
            <option value="Contado">Contado</option>
            <option value="Financiado">Financiado</option>
            <option value="Crédito bancario">Crédito bancario</option>
          </Select>
        </div>

        {rows.length === 0 ? (
          <EmptyState
            icon={FileTextIcon}
            title="Sin operaciones"
            description="No hay separaciones ni ventas con los filtros aplicados."
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
            {rows.map((sale) => (
              <TR key={sale.id} onClick={() => setDetail(sale)}>
                <TD className="font-mono text-brand-900 font-semibold">{sale.code}</TD>
                <TD>
                  <Badge tone={sale.type === 'Venta' ? 'brand' : 'neutral'}>
                    {sale.type}
                  </Badge>
                </TD>
                <TD>
                  <div className="font-medium text-brand-900">{sale.buyer}</div>
                  <div className="text-[11px] text-brand-400">{sale.document}</div>
                </TD>
                <TD>
                  <div className="font-medium text-brand-800">{sale.lot}</div>
                  <div className="text-[11px] text-brand-400">{sale.project}</div>
                </TD>
                <TD className="text-brand-600">{sale.modality}</TD>
                <TD align="right" className="font-mono font-medium text-brand-900">
                  {currency(sale.amount)}
                </TD>
                <TD className="text-brand-600">{sale.advisor}</TD>
                <TD>
                  <Badge tone={sale.contract === 'Firmado' ? 'brand' : 'info'}>
                    {sale.contract}
                  </Badge>
                </TD>
                <TD>
                  <StatusBadge status={sale.status} />
                </TD>
                <TD align="right">
                  <div className="flex items-center justify-end gap-1.5">
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={(e) => {
                        e.stopPropagation();
                        setDetail(sale);
                      }}
                    >
                      Ver detalle
                    </Button>
                  </div>
                </TD>
              </TR>
            ))}
          </Table>
        )}
      </Card>

      {/* Modal Detalle de Operacion */}
      <Modal
        open={Boolean(detail)}
        onClose={() => setDetail(null)}
        title={detail?.code ?? ''}
        description={detail ? `${detail.type} · ${detail.date}` : undefined}
        footer={<Button onClick={() => setDetail(null)}>Cerrar</Button>}
      >
        {detail ? (
          <dl className="divide-y divide-brand-50">
            {[
              { label: 'Comprador', value: detail.buyer },
              { label: 'Documento', value: detail.document },
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
            <Button variant="primary" disabled={submitting} onClick={handleProcessOperation}>
              {submitting ? 'Procesando…' : opType === 'Separacion' ? 'Registrar Separación' : 'Formalizar Venta'}
            </Button>
          </div>
        }
      >
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
                Venta (Contado / Financiada)
              </button>
            </div>
          </div>

          <div>
            <label className="mb-1 block text-[12px] font-medium text-brand-700">
              Prospecto / Comprador (CRM)
            </label>
            <Select value={selectedLeadId} onChange={(e) => setSelectedLeadId(e.target.value)}>
              {leadsList.map((lead) => (
                <option key={lead.id} value={lead.id}>
                  {lead.name} - {lead.stage}
                </option>
              ))}
            </Select>
          </div>

          <div>
            <label className="mb-1 block text-[12px] font-medium text-brand-700">
              Lote Seleccionado
            </label>
            <Select value={formLotId} onChange={(e) => handleSelectLot(e.target.value)}>
              <option value="">Seleccione un lote disponible o reservado…</option>
              {availableLots.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.code} ({l.block}) - {l.area}m² - {currency(l.price || 108000)} [{l.status}]
                </option>
              ))}
            </Select>
          </div>

          {opType === 'Separacion' ? (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-900 space-y-1">
              <p className="font-semibold text-amber-950">Condiciones de Separación:</p>
              <p>Monto reglamentario: <span className="font-bold">S/ 500.00 PEN</span></p>
              <p>Plazo de vigencia: <span className="font-bold">7 días calendario</span> (vence automáticamente si no se formaliza venta).</p>
              <p>El lote cambiará a estado <span className="font-bold text-amber-800">RESERVADO</span> en el mapa interactivo.</p>
            </div>
          ) : (
            <>
              <div>
                <label className="mb-1 block text-[12px] font-medium text-brand-700">
                  Modalidad de Venta
                </label>
                <Select
                  value={formModality}
                  onChange={(e) => setFormModality(e.target.value as any)}
                >
                  <option value="Contado">Al Contado</option>
                  <option value="Financiado">Financiamiento Directo</option>
                </Select>
              </div>

              <div>
                <label className="mb-1 block text-[12px] font-medium text-brand-700">
                  Monto Total (PEN)
                </label>
                <Input
                  type="number"
                  value={formTotal}
                  onChange={(e) => setFormTotal(e.target.value)}
                />
              </div>

              {formModality === 'Financiado' && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-1 block text-[12px] font-medium text-brand-700">
                      Cuota Inicial (PEN)
                    </label>
                    <Input
                      type="number"
                      value={formInitial}
                      onChange={(e) => setFormInitial(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-[12px] font-medium text-brand-700">
                      Número de Cuotas
                    </label>
                    <Select
                      value={formInstallments}
                      onChange={(e) => setFormInstallments(e.target.value)}
                    >
                      <option value="12">12 meses</option>
                      <option value="24">24 meses</option>
                      <option value="36">36 meses</option>
                      <option value="48">48 meses</option>
                    </Select>
                  </div>
                </div>
              )}
            </>
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
      </Modal>
    </div>
  );
}