import { useEffect, useMemo, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { PageHeader } from '../components/ui/PageHeader';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { SearchInput, Select } from '../components/ui/Field';
import { Table, TD, TH, TR } from '../components/ui/Table';
import { StatusBadge } from '../components/ui/Badge';
import { Tabs } from '../components/ui/Tabs';
import { Alert, EmptyState } from '../components/ui/Feedback';
import { Gate } from '../components/auth/PermissionRoute';
import { FINANCING_PLANS, INSTALLMENTS } from '../data/financing';
import { currency, percent } from '../utils/format';
import { financingService } from '../services/financingService';
import { AlertasCuotasPanel } from '../components/financing/AlertasCuotasPanel';
import { RevisionClausulaPanel } from '../components/financing/RevisionClausulaPanel';
import type { PaymentStatus, Installment } from '../types';
import { VouchersCuotasPanel } from '../components/finance/VouchersCuotasPanel';

export function Financing() {
  const [tab, setTab] = useState('cuotas');
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<'all' | PaymentStatus>('all');

  const [installmentsList, setInstallmentsList] = useState<Installment[]>(INSTALLMENTS);
  const [revisionAlertas, setRevisionAlertas] = useState(0);
  const [, setLoading] = useState(false);


  const loadFinancingData = async () => {
    setLoading(true);
    try {
      const liveCuotas = await financingService.getInstallments(2);
      if (liveCuotas && liveCuotas.length > 0) {
        const mergedCuotas = [
          ...liveCuotas,
          ...INSTALLMENTS.filter((i) => !liveCuotas.some((lc) => lc.id === i.id))
        ];
        setInstallmentsList(mergedCuotas);
      }


    } catch (err: any) {
      console.error('Error al cargar datos financieros:', err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFinancingData();
  }, []);

  // Refresca la consulta autorizada, sin alterar id_estado_cuota ni llamar al SP legado.
  const handleRefreshAlerts = () => setRevisionAlertas(n => n + 1);


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


  return (
    <div>
      <PageHeader
        title="Financiamiento y pagos"
        description="Planes de financiamiento, cronogramas, cuotas, saldos y validación de vouchers de pago."
        actions={
          <div className="flex items-center gap-2">
            <Button icon={RefreshCw} variant="secondary" onClick={handleRefreshAlerts}>
              Actualizar alertas
            </Button>
          </div>
        }
      />

      <AlertasCuotasPanel revision={revisionAlertas}/>
      <RevisionClausulaPanel revision={revisionAlertas}/>

      <Alert tone="info" title="Listados de demostración en integración" className="mb-5">
        Las pestañas de cuotas y planes todavía contienen datos de prueba.
        No constituyen un estado de cuenta oficial. Las alertas superiores y
        la bandeja de vouchers de cuotas sí consultan datos reales autorizados.
        El registro y la validación de nuevos pagos se completarán en 5.3.
      </Alert>



      <Tabs
        className="mb-5"
        active={tab}
        onChange={setTab}
        items={[
          { id: 'cuotas', label: 'Cuotas (demo)', count: installmentsList.length },
          { id: 'vouchers', label: 'Vouchers de cuotas' },
          { id: 'planes', label: 'Planes (demo)', count: FINANCING_PLANS.length }
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
            <Table
              head={
                <>
                  <TH>Cliente</TH>
                  <TH>Contrato</TH>
                  <TH>Cuota</TH>
                  <TH>Vencimiento</TH>
                  <TH align="right">Monto</TH>
                  <TH align="right">Pagado</TH>
                  <TH align="right">Saldo</TH>
                  <TH>Estado</TH>
                </>
              }
            >
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
            </Table>
          )}
        </Card>
      ) : null}

      {tab === 'vouchers' ? (
        <Gate permission="finance.view">
          <VouchersCuotasPanel />
        </Gate>
      ) : null
}

{
  tab === 'planes' ? (
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
  ) : null
}


    </div >
  );
}