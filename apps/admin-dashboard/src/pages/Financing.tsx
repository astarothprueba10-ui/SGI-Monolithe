import React, { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { CheckIcon, DownloadIcon, EyeIcon, PlusIcon, XIcon } from 'lucide-react';
import { PageHeader } from '../components/ui/PageHeader';
import { Card, CardHeader } from '../components/ui/Card';
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
import type { PaymentStatus, Voucher } from '../types';

export function Financing() {
  const { can } = useAuth();
  const [tab, setTab] = useState('cuotas');
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<'all' | PaymentStatus>('all');
  const [voucher, setVoucher] = useState<Voucher | null>(null);

  const canValidate = can('financing.approve');

  const installments = useMemo(() => {
    const q = query.trim().toLowerCase();
    return INSTALLMENTS.filter((row) => {
      const byStatus = status === 'all' || row.status === status;
      const byQuery =
      q.length === 0 ||
      row.buyer.toLowerCase().includes(q) ||
      row.saleCode.toLowerCase().includes(q);
      return byStatus && byQuery;
    });
  }, [query, status]);

  const overdue = INSTALLMENTS.filter((i) => i.status === 'Vencido');
  const inReview = VOUCHERS.filter((v) => v.status === 'En revisión');

  return (
    <div>
      <PageHeader
        title="Financiamiento y pagos"
        description="Planes de financiamiento, cronogramas, cuotas, saldos y validación de vouchers de pago."
        actions={
        <>
            <Gate permission="financing.export">
              <Button icon={DownloadIcon}>Exportar cartera</Button>
            </Gate>
            <Gate permission="financing.create">
              <Button icon={PlusIcon} variant="primary">
                Registrar pago
              </Button>
            </Gate>
          </>
        } />
      

      {overdue.length > 0 ?
      <Alert
        tone="danger"
        title={`${overdue.length} cuotas vencidas en la cartera`}
        className="mb-5">
        
          Suman{' '}
          {currency(overdue.reduce((sum, i) => sum + (i.amount - i.paid), 0))} pendientes de
          cobranza.
        </Alert> :
      null}

      {!canValidate ?
      <Alert tone="info" title="Consulta sin validación" className="mb-5">
          Tu rol puede ver cuotas, pagos y vouchers, pero la aprobación o rechazo de vouchers
          corresponde al área de Finanzas.
        </Alert> :
      null}

      <Tabs
        className="mb-5"
        active={tab}
        onChange={setTab}
        items={[
        { id: 'cuotas', label: 'Cuotas y saldos', count: INSTALLMENTS.length },
        { id: 'vouchers', label: 'Vouchers', count: VOUCHERS.length },
        { id: 'planes', label: 'Planes de financiamiento', count: FINANCING_PLANS.length }]
        } />
      

      {tab === 'cuotas' ?
      <Card>
          <div className="flex flex-wrap items-center gap-3 border-b border-brand-100 px-5 py-3.5">
            <SearchInput
            value={query}
            onValueChange={setQuery}
            placeholder="Buscar por cliente o contrato…"
            className="w-full sm:w-72" />
          
            <Select
            value={status}
            onChange={(e) => setStatus(e.target.value as 'all' | PaymentStatus)}
            aria-label="Filtrar por estado"
            className="w-[170px]">
            
              <option value="all">Todos los estados</option>
              <option value="Pagado">Pagado</option>
              <option value="Pendiente">Pendiente</option>
              <option value="Vencido">Vencido</option>
            </Select>
          </div>
          {installments.length === 0 ?
        <EmptyState title="Sin cuotas" description="Ajusta los filtros aplicados." /> :

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
                  <TH align="right">Acciones</TH>
                </>
          }>
          
              {installments.map((row) =>
          <TR key={row.id}>
                  <TD className="font-medium text-brand-900">{row.buyer}</TD>
                  <TD className="text-brand-500">{row.saleCode}</TD>
                  <TD className="tabular">{row.number}</TD>
                  <TD className="text-brand-500">{row.dueDate}</TD>
                  <TD align="right">{currency(row.amount)}</TD>
                  <TD align="right">{currency(row.paid)}</TD>
                  <TD align="right" className="font-medium text-brand-900">
                    {currency(row.amount - row.paid)}
                  </TD>
                  <TD>
                    <StatusBadge status={row.status} />
                  </TD>
                  <TD align="right">
                    <Gate
                permission="financing.edit"
                fallback={<span className="text-[12px] text-brand-300">Solo lectura</span>}>
                
                      <Button
                  size="sm"
                  onClick={() =>
                  toast.success('Pago registrado', {
                    description: `Cuota ${row.number} de ${row.buyer} actualizada.`
                  })
                  }>
                  
                        Registrar pago
                      </Button>
                    </Gate>
                  </TD>
                </TR>
          )}
            </Table>
        }
        </Card> :
      null}

      {tab === 'vouchers' ?
      <Card>
          <CardHeader
          title="Vouchers de pago"
          description="Comprobantes cargados por los clientes desde el portal"
          actions={<Badge tone="info">{inReview.length} en revisión</Badge>} />
        
          <Table
          head={
          <>
                <TH>Voucher</TH>
                <TH>Cliente</TH>
                <TH>Contrato</TH>
                <TH>Banco</TH>
                <TH align="right">Monto</TH>
                <TH>Cargado</TH>
                <TH>Estado</TH>
                <TH align="right">Acciones</TH>
              </>
          }>
          
            {VOUCHERS.map((v) =>
          <TR key={v.id}>
                <TD className="font-medium text-brand-900">{v.code}</TD>
                <TD>{v.buyer}</TD>
                <TD className="text-brand-500">{v.saleCode}</TD>
                <TD>
                  <Badge tone="neutral">{v.bank}</Badge>
                </TD>
                <TD align="right">{currency(v.amount)}</TD>
                <TD className="text-brand-500">{v.uploadedAt}</TD>
                <TD>
                  <StatusBadge status={v.status} />
                </TD>
                <TD align="right">
                  <div className="flex justify-end gap-1.5">
                    <Button size="sm" icon={EyeIcon} onClick={() => setVoucher(v)}>
                      Ver
                    </Button>
                    {v.status === 'En revisión' ?
                <>
                        <Gate permission="financing.approve">
                          <Button
                      size="sm"
                      variant="success"
                      icon={CheckIcon}
                      onClick={() =>
                      toast.success('Voucher validado', {
                        description: `${v.code} aprobado por ${currency(v.amount)}.`
                      })
                      }>
                      
                            Validar
                          </Button>
                        </Gate>
                        <Gate permission="financing.reject">
                          <Button
                      size="sm"
                      variant="danger"
                      icon={XIcon}
                      onClick={() =>
                      toast.error('Voucher rechazado', {
                        description: `${v.code} devuelto al cliente con observación.`
                      })
                      }>
                      
                            Rechazar
                          </Button>
                        </Gate>
                      </> :
                null}
                  </div>
                </TD>
              </TR>
          )}
          </Table>
        </Card> :
      null}

      {tab === 'planes' ?
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          {FINANCING_PLANS.map((plan) =>
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
                    {plan.rate === 0 ? 'Sin interés' : percent(plan.rate)}
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
              }>
              
                  <Button size="sm" className="w-full">
                    Editar plan
                  </Button>
                </Gate>
              </div>
            </Card>
        )}
        </div> :
      null}

      <Modal
        open={Boolean(voucher)}
        onClose={() => setVoucher(null)}
        title={`Voucher ${voucher?.code ?? ''}`}
        description={voucher ? `${voucher.buyer} · ${voucher.bank}` : undefined}
        footer={
        <>
            <Button onClick={() => setVoucher(null)}>Cerrar</Button>
            <Gate permission="financing.approve">
              <Button
              variant="success"
              icon={CheckIcon}
              onClick={() => {
                toast.success('Voucher validado', {
                  description: `${voucher?.code} aprobado correctamente.`
                });
                setVoucher(null);
              }}>
              
                Validar voucher
              </Button>
            </Gate>
          </>
        }>
        
        {voucher ?
        <div className="space-y-4">
            <div className="flex h-40 items-center justify-center rounded-md border border-dashed border-brand-200 bg-brand-50/60 text-[12px] text-brand-400">
              Vista previa del comprobante · {voucher.code}.jpg
            </div>
            <dl className="divide-y divide-brand-50">
              {[
            { label: 'Contrato', value: voucher.saleCode },
            { label: 'Monto declarado', value: currency(voucher.amount) },
            { label: 'Banco', value: voucher.bank },
            { label: 'Fecha de carga', value: voucher.uploadedAt },
            { label: 'Estado', value: voucher.status }].
            map((row) =>
            <div key={row.label} className="flex items-baseline justify-between gap-4 py-2.5">
                  <dt className="text-[12px] text-brand-400">{row.label}</dt>
                  <dd className="text-[13px] font-medium text-brand-800">{row.value}</dd>
                </div>
            )}
            </dl>
          </div> :
        null}
      </Modal>
    </div>);

}