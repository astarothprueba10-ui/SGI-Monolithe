import React, { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { CheckIcon, DownloadIcon, EyeIcon, PlusIcon, XIcon, RefreshCw } from 'lucide-react';
import { PageHeader } from '../components/ui/PageHeader';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { SearchInput, Select } from '../components/ui/Field';
import { Table, TD, TH, TR } from '../components/ui/Table';
import { StatusBadge, Badge } from '../components/ui/Badge';
import { Tabs } from '../components/ui/Tabs';
import { Alert, EmptyState } from '../components/ui/Feedback';
import { Modal } from '../components/ui/Modal';
import { Gate } from '../components/auth/PermissionRoute';
import { useAuth } from '../contexts/AuthContext';
import { FINANCING_PLANS, INSTALLMENTS, VOUCHERS } from '../data/financing';
import { currency, percent } from '../utils/format';
import { financingService, OverdueContractAlert } from '../services/financingService';
import type { PaymentStatus, Voucher, Installment } from '../types';

export function Financing() {
  const { can } = useAuth();
  const [tab, setTab] = useState('cuotas');
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<'all' | PaymentStatus>('all');
  const [voucher, setVoucher] = useState<Voucher | null>(null);

  const [installmentsList, setInstallmentsList] = useState<Installment[]>(INSTALLMENTS);
  const [vouchersList, setVouchersList] = useState<Voucher[]>(VOUCHERS);
  const [resolutoryAlerts, setResolutoryAlerts] = useState<OverdueContractAlert[]>([]);
  const [loading, setLoading] = useState(false);

  const canValidate = can('financing.approve');

  const loadFinancingData = async () => {
    setLoading(true);
    try {
      // 1. Cargar cuotas de la venta financiada en curso (VTA-2026-0001, id_venta = 2)
      const liveCuotas = await financingService.getInstallments(2);
      if (liveCuotas && liveCuotas.length > 0) {
        const mergedCuotas = [
          ...liveCuotas,
          ...INSTALLMENTS.filter((i) => !liveCuotas.some((lc) => lc.id === i.id))
        ];
        setInstallmentsList(mergedCuotas);
      }

      // 2. Cargar bandeja de vouchers en vivo
      const liveVouchers = await financingService.getVouchers();
      if (liveVouchers && liveVouchers.length > 0) {
        const mergedVouchers = [
          ...liveVouchers,
          ...VOUCHERS.filter((v) => !liveVouchers.some((lv) => lv.code === v.code))
        ];
        setVouchersList(mergedVouchers);
      }

      // 3. Evaluar alertas de clausula resolutoria
      const alerts = await financingService.evaluateResolutoryClause();
      setResolutoryAlerts(alerts.filter((a) => a.applicableClause));
    } catch (err: any) {
      console.error('Error al cargar datos financieros:', err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFinancingData();
  }, []);

  const handleUpdateOverdue = async () => {
    try {
      const res = await financingService.updateInstallmentsOverdue();
      toast.success(res?.mensaje || 'Cartera y semáforo actualizados');
      await loadFinancingData();
    } catch (err: any) {
      toast.error('Error al actualizar cartera: ' + err.message);
    }
  };

  const handleProcessVoucher = async (voucherIdStr: string, action: 'APROBAR' | 'RECHAZAR', reason?: string) => {
    try {
      const vId = parseInt(voucherIdStr, 10);
      if (isNaN(vId)) {
        // Voucher mockeado
        toast.success(action === 'APROBAR' ? 'Voucher aprobado' : 'Voucher rechazado');
        setVouchersList((prev) =>
          prev.map((v) => (v.id === voucherIdStr ? { ...v, status: action === 'APROBAR' ? 'Aprobado' : 'Rechazado' } : v))
        );
        setVoucher(null);
        return;
      }

      await financingService.validateVoucher(vId, action, reason);
      toast.success(action === 'APROBAR' ? 'Voucher validado y cuota amortizada' : 'Voucher rechazado');
      setVoucher(null);
      await loadFinancingData();
    } catch (err: any) {
      toast.error('Error en validación: ' + err.message);
    }
  };

  const installments = useMemo(() => {
    const q = query.trim().toLowerCase();
    return installmentsList.filter((row) => {
      const byStatus = status === 'all' || row.status === status;
      const byQuery =
        q.length === 0 ||
        row.buyer.toLowerCase().includes(q) ||
        row.saleCode.toLowerCase().includes(q);
      return byStatus && byQuery;
    });
  }, [installmentsList, query, status]);

  const overdue = installmentsList.filter((i) => i.status === 'Vencido');

  return (
    <div>
      <PageHeader
        title="Financiamiento y pagos"
        description="Planes de financiamiento, cronogramas, cuotas, saldos y validación de vouchers de pago."
        actions={
          <div className="flex items-center gap-2">
            <Button icon={RefreshCw} variant="secondary" onClick={handleUpdateOverdue}>
              Actualizar cartera
            </Button>
            <Gate permission="financing.export">
              <Button icon={DownloadIcon}>Exportar cartera</Button>
            </Gate>
            <Gate permission="financing.create">
              <Button icon={PlusIcon} variant="primary">
                Registrar pago
              </Button>
            </Gate>
          </div>
        }
      />

      {resolutoryAlerts.length > 0 && (
        <Alert
          tone="danger"
          title="Alerta de Cláusula Resolutoria Activa"
          className="mb-5"
        >
          {resolutoryAlerts.map((a) => (
            <div key={a.saleId}>
              El contrato {a.saleCode} ({a.buyer}, Lote {a.lotCode}) acumula {a.overdueCount} cuotas impagas consecutivas por un total de {currency(a.overdueAmount)}. Corresponde activar el procedimiento de resolución contractual.
            </div>
          ))}
        </Alert>
      )}

      {overdue.length > 0 ? (
        <Alert
          tone="danger"
          title={`${overdue.length} cuotas vencidas en la cartera`}
          className="mb-5"
        >
          Suman {currency(overdue.reduce((sum, i) => sum + (i.amount - i.paid), 0))} pendientes de cobranza.
        </Alert>
      ) : null}

      {!canValidate ? (
        <Alert tone="info" title="Consulta sin validación" className="mb-5">
          Tu rol puede ver cuotas, pagos y vouchers, pero la aprobación o rechazo de vouchers corresponde al área de Finanzas.
        </Alert>
      ) : null}

      <Tabs
        className="mb-5"
        active={tab}
        onChange={setTab}
        items={[
          { id: 'cuotas', label: 'Cuotas y saldos', count: installmentsList.length },
          { id: 'vouchers', label: 'Vouchers', count: vouchersList.length },
          { id: 'planes', label: 'Planes de financiamiento', count: FINANCING_PLANS.length }
        ]}
      />

      {tab === 'cuotas' ? (
        <Card>
          <div className="flex flex-wrap items-center gap-3 border-b border-brand-100 px-5 py-3.5">
            <SearchInput
              value={query}
              onValueChange={setQuery}
              placeholder="Buscar por cliente o contrato…"
              className="w-full sm:w-72"
            />
            <Select
              value={status}
              onChange={(e) => setStatus(e.target.value as 'all' | PaymentStatus)}
              aria-label="Filtrar por estado"
              className="w-[170px]"
            >
              <option value="all">Todos los estados</option>
              <option value="Pagado">Pagado</option>
              <option value="Pendiente">Pendiente</option>
              <option value="Vencido">Vencido</option>
            </Select>
          </div>
          {installments.length === 0 ? (
            <EmptyState title="Sin cuotas" description="Ajusta los filtros aplicados." />
          ) : (
            <Table>
              <thead>
                <TR isHeader>
                  <TH>Cliente</TH>
                  <TH>Contrato</TH>
                  <TH>Cuota</TH>
                  <TH>Vencimiento</TH>
                  <TH align="right">Monto</TH>
                  <TH align="right">Pagado</TH>
                  <TH align="right">Saldo</TH>
                  <TH>Estado</TH>
                </TR>
              </thead>
              <tbody>
                {installments.map((row) => (
                  <TR key={row.id}>
                    <TD className="font-medium text-brand-900">{row.buyer}</TD>
                    <TD className="text-brand-500 font-mono text-[12px]">{row.saleCode}</TD>
                    <TD className="tabular font-medium">{row.number}</TD>
                    <TD className="text-brand-500">{row.dueDate}</TD>
                    <TD align="right" className="font-mono">{currency(row.amount)}</TD>
                    <TD align="right" className="font-mono text-emerald-600">{currency(row.paid)}</TD>
                    <TD align="right" className="font-medium text-brand-900 font-mono">
                      {currency(row.amount - row.paid)}
                    </TD>
                    <TD>
                      <StatusBadge status={row.status} />
                    </TD>
                  </TR>
                ))}
              </tbody>
            </Table>
          )}
        </Card>
      ) : null}

      {tab === 'vouchers' ? (
        <Card>
          <Table>
            <thead>
              <TR isHeader>
                <TH>Código</TH>
                <TH>Cliente</TH>
                <TH>Contrato / Lote</TH>
                <TH>Método / Banco</TH>
                <TH align="right">Monto</TH>
                <TH>Cargado</TH>
                <TH>Estado</TH>
                <TH align="right">Acciones</TH>
              </TR>
            </thead>
            <tbody>
              {vouchersList.map((v) => (
                <TR key={v.id}>
                  <TD className="font-mono text-[12px] font-semibold text-brand-900">{v.code}</TD>
                  <TD className="font-medium">{v.buyer}</TD>
                  <TD className="text-brand-500 font-mono text-[12px]">{v.saleCode}</TD>
                  <TD>
                    <Badge variant="gray">{v.bank}</Badge>
                  </TD>
                  <TD align="right" className="font-mono font-medium">{currency(v.amount)}</TD>
                  <TD className="text-brand-500">{v.uploadedAt}</TD>
                  <TD>
                    <StatusBadge status={v.status} />
                  </TD>
                  <TD align="right">
                    <div className="flex justify-end gap-1.5">
                      <Button size="sm" icon={EyeIcon} onClick={() => setVoucher(v)}>
                        Ver
                      </Button>
                      {v.status === 'En revisión' ? (
                        <>
                          <Gate permission="financing.approve">
                            <Button
                              size="sm"
                              variant="primary"
                              icon={CheckIcon}
                              onClick={() => handleProcessVoucher(v.id, 'APROBAR')}
                            >
                              Validar
                            </Button>
                          </Gate>
                          <Gate permission="financing.reject">
                            <Button
                              size="sm"
                              variant="danger"
                              icon={XIcon}
                              onClick={() => handleProcessVoucher(v.id, 'RECHAZAR', 'Observado por tesorería')}
                            >
                              Rechazar
                            </Button>
                          </Gate>
                        </>
                      ) : null}
                    </div>
                  </TD>
                </TR>
              ))}
            </tbody>
          </Table>
        </Card>
      ) : null}

      {tab === 'planes' ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          {FINANCING_PLANS.map((plan) => (
            <Card key={plan.id} className="flex flex-col p-5">
              <div className="flex items-start justify-between gap-3">
                <h3 className="text-[14px] font-semibold leading-snug text-brand-900">
                  {plan.name}
                </h3>
                <StatusBadge status={plan.status} />
              </div>
              <dl className="mt-4 space-y-2 text-[13px]">
                <div className="flex justify-between gap-3">
                  <dt className="text-brand-400">Cuota inicial</dt>
                  <dd className="font-medium tabular text-brand-800">
                    {percent(plan.downPayment, 0)}
                  </dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-brand-400">Plazo</dt>
                  <dd className="font-medium tabular text-brand-800">{plan.months} meses</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-brand-400">Tasa</dt>
                  <dd className="font-medium tabular text-brand-800">
                    {plan.rate === 0 ? 'Sin interés (TEA 0%)' : percent(plan.rate)}
                  </dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-brand-400">Contratos activos</dt>
                  <dd className="font-medium tabular text-brand-800">{plan.activeContracts}</dd>
                </div>
              </dl>
              <div className="mt-auto pt-4">
                <Gate
                  permission="financing.edit"
                  fallback={
                    <p className="text-[12px] text-brand-300">Consulta habilitada para tu rol.</p>
                  }
                >
                  <Button size="sm" className="w-full">
                    Editar plan
                  </Button>
                </Gate>
              </div>
            </Card>
          ))}
        </div>
      ) : null}

      {/* Modal Detalle de Voucher */}
      <Modal
        open={Boolean(voucher)}
        onClose={() => setVoucher(null)}
        title={`Voucher ${voucher?.code ?? ''}`}
        description={voucher ? `${voucher.buyer} · ${voucher.bank}` : undefined}
        footer={
          <div className="flex justify-end gap-2">
            <Button onClick={() => setVoucher(null)}>Cerrar</Button>
            {voucher?.status === 'En revisión' && canValidate && (
              <Button
                variant="primary"
                icon={CheckIcon}
                onClick={() => handleProcessVoucher(voucher.id, 'APROBAR')}
              >
                Validar voucher
              </Button>
            )}
          </div>
        }
      >
        {voucher ? (
          <div className="space-y-4">
            <div className="flex h-36 items-center justify-center rounded-md border border-dashed border-brand-200 bg-brand-50/60 text-[12px] text-brand-500 font-mono">
              Vista previa del comprobante · {voucher.code}.pdf (SHA-256 Validado)
            </div>
            <dl className="divide-y divide-brand-50">
              {[
                { label: 'Contrato / Lote', value: voucher.saleCode },
                { label: 'Monto declarado', value: currency(voucher.amount) },
                { label: 'Método / Banco', value: voucher.bank },
                { label: 'Fecha de carga', value: voucher.uploadedAt },
                { label: 'Estado', value: voucher.status }
              ].map((row) => (
                <div key={row.label} className="flex items-baseline justify-between gap-4 py-2.5">
                  <dt className="text-[12px] text-brand-400">{row.label}</dt>
                  <dd className="text-[13px] font-medium text-brand-800">{row.value}</dd>
                </div>
              ))}
            </dl>
          </div>
        ) : null}
      </Modal>
    </div>
  );
}