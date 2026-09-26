import React, { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { CheckIcon, DownloadIcon, FileTextIcon, PlusIcon, XIcon, Clock } from 'lucide-react';
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
import { SALES } from '../data/sales';
import { currency } from '../utils/format';
import { salesService } from '../services/salesService';
import { lotsService } from '../services/lotsService';
import type { Sale, Lot } from '../types';

export function Sales() {
  const [tab, setTab] = useState<'todas' | 'Separación' | 'Venta'>('todas');
  const [query, setQuery] = useState('');
  const [modality, setModality] = useState<'all' | Sale['modality']>('all');
  const [detail, setDetail] = useState<Sale | null>(null);
  const [salesList, setSalesList] = useState<Sale[]>(SALES);
  const [loading, setLoading] = useState(false);

  // Modal para nueva formalización
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [availableLots, setAvailableLots] = useState<Lot[]>([]);
  const [formLotId, setFormLotId] = useState('');
  const [formModality, setFormModality] = useState<'Contado' | 'Financiado'>('Contado');
  const [formTotal, setFormTotal] = useState('108000');
  const [formInitial, setFormInitial] = useState('21600');
  const [formInstallments, setFormInstallments] = useState('36');
  const [submitting, setSubmitting] = useState(false);

  const fetchSalesData = async () => {
    setLoading(true);
    try {
      const liveSales = await salesService.getSales();
      if (liveSales && liveSales.length > 0) {
        // Combinar ventas en vivo con mock de separaciones para vista completa
        const merged = [
          ...liveSales,
          ...SALES.filter((s) => !liveSales.some((ls) => ls.code === s.code))
        ];
        setSalesList(merged);
      }
    } catch (err: any) {
      console.error('Error al cargar ventas:', err.message);
    } finally {
      setLoading(false);
    }
  };

  const loadLotsForSale = async () => {
    try {
      const lots = await lotsService.getLots();
      setAvailableLots(lots.filter((l) => l.status === 'Disponible'));
    } catch (err: any) {
      console.error('Error al cargar lotes:', err.message);
    }
  };

  useEffect(() => {
    fetchSalesData();
  }, []);

  const handleOpenModal = () => {
    loadLotsForSale();
    setIsModalOpen(true);
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

  const handleFormalizeSale = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formLotId) {
      toast.error('Por favor seleccione un lote');
      return;
    }
    setSubmitting(true);
    try {
      const lotIdNum = parseInt(formLotId, 10);
      const totalNum = parseFloat(formTotal);
      if (formModality === 'Contado') {
        await salesService.formalizeCashSale({
          lotId: lotIdNum,
          personaId: 13, // Persona regular por defecto
          totalAmount: totalNum
        });
        toast.success('Venta al contado formalizada exitosamente');
      } else {
        await salesService.formalizeFinancedSale({
          lotId: lotIdNum,
          personaId: 13,
          totalAmount: totalNum,
          downPayment: parseFloat(formInitial),
          installmentsCount: parseInt(formInstallments, 10)
        });
        toast.success('Venta financiada y cronograma generados exitosamente');
      }
      setIsModalOpen(false);
      await fetchSalesData();
    } catch (err: any) {
      toast.error('Error al formalizar: ' + err.message);
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
            <Button icon={Clock} variant="secondary" onClick={handleExpireOverdue}>
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
          <Table>
            <thead>
              <TR isHeader>
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
              </TR>
            </thead>
            <tbody>
              {rows.map((sale) => (
                <TR key={sale.id} onClick={() => setDetail(sale)}>
                  <TD className="font-mono text-brand-900 font-semibold">{sale.code}</TD>
                  <TD>
                    <Badge variant={sale.type === 'Venta' ? 'brand' : 'gray'}>
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
                    <Badge variant={sale.contract === 'Firmado' ? 'success' : 'warning'}>
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
            </tbody>
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

      {/* Modal Formalizar Nueva Operacion */}
      <Modal
        open={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Formalización de Venta / Separación"
        description="Formaliza una venta con contrato de compraventa y cronograma en Supabase."
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setIsModalOpen(false)}>
              Cancelar
            </Button>
            <Button variant="primary" disabled={submitting} onClick={handleFormalizeSale}>
              {submitting ? 'Procesando…' : 'Formalizar Operación'}
            </Button>
          </div>
        }
      >
        <form onSubmit={handleFormalizeSale} className="space-y-4">
          <div>
            <label className="mb-1 block text-[12px] font-medium text-brand-700">Lote</label>
            <Select value={formLotId} onChange={(e) => setFormLotId(e.target.value)}>
              <option value="">Seleccione un lote disponible…</option>
              {availableLots.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.code} ({l.block}) - {l.area}m² - {currency(l.price || 108000)}
                </option>
              ))}
            </Select>
          </div>

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
        </form>
      </Modal>
    </div>
  );
}