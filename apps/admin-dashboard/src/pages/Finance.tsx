import React, { useState } from 'react';
import { DownloadIcon, PlusIcon } from 'lucide-react';
import { PageHeader } from '../components/ui/PageHeader';
import { Card, CardHeader } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Select } from '../components/ui/Field';
import { Table, TD, TH, TR } from '../components/ui/Table';
import { StatusBadge, Badge } from '../components/ui/Badge';
import { Tabs } from '../components/ui/Tabs';
import { Gate } from '../components/auth/PermissionRoute';
import { TrendChart } from '../components/dashboard/TrendChart';
import { CASHFLOW, FINANCE_ENTRIES } from '../data/finance';
import { RECEIVABLES } from '../data/financing';
import { currency, number } from '../utils/format';

export function Finance() {
  const [tab, setTab] = useState('movimientos');

  const ingresos = FINANCE_ENTRIES.filter((e) => e.type === 'Ingreso').reduce(
    (s, e) => s + e.amount,
    0
  );
  const egresos = FINANCE_ENTRIES.filter((e) => e.type === 'Egreso').reduce(
    (s, e) => s + e.amount,
    0
  );
  const porCobrar = RECEIVABLES.reduce((s, r) => s + (r.total - r.paid), 0);

  return (
    <div>
      <PageHeader
        title="Finanzas"
        description="Ingresos, egresos, comisiones y cuentas por cobrar consolidados por proyecto y periodo."
        actions={
        <>
            <Select defaultValue="ago" aria-label="Periodo" className="w-[168px]">
              <option value="ago">Agosto 2026</option>
              <option value="jul">Julio 2026</option>
              <option value="q3">Trimestre III 2026</option>
            </Select>
            <Gate permission="finance.export">
              <Button icon={DownloadIcon}>Exportar</Button>
            </Gate>
            <Gate permission="finance.create">
              <Button icon={PlusIcon} variant="primary">
                Nuevo movimiento
              </Button>
            </Gate>
          </>
        } />
      

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader
            title="Ingresos vs. egresos"
            description="Flujo mensual consolidado de todos los proyectos"
            actions={<Badge tone="neutral">Últimos 6 meses</Badge>} />
          
          <div className="px-3 py-4">
            <TrendChart
              data={CASHFLOW}
              series={[
              { key: 'ingresos', label: 'Ingresos', type: 'bar', color: '#C7D8E8' },
              { key: 'egresos', label: 'Egresos', type: 'line', color: '#BE123C' }]
              }
              valuePrefix="S/ "
              height={272} />
            
          </div>
        </Card>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 xl:grid-cols-1">
          {[
          { label: 'Ingresos del periodo', value: currency(ingresos), tone: 'text-emerald-600' },
          { label: 'Egresos del periodo', value: currency(egresos), tone: 'text-rose-600' },
          { label: 'Cuentas por cobrar', value: currency(porCobrar), tone: 'text-brand-900' }].
          map((item) =>
          <Card key={item.label} className="p-5">
              <p className="text-[12px] text-brand-400">{item.label}</p>
              <p className={`mt-1.5 text-[22px] font-semibold tabular ${item.tone}`}>
                {item.value}
              </p>
            </Card>
          )}
        </div>
      </div>

      <Tabs
        className="mb-5 mt-6"
        active={tab}
        onChange={setTab}
        items={[
        { id: 'movimientos', label: 'Movimientos', count: FINANCE_ENTRIES.length },
        { id: 'cobrar', label: 'Cuentas por cobrar', count: RECEIVABLES.length }]
        } />
      

      {tab === 'movimientos' ?
      <Card>
          <Table
          head={
          <>
                <TH>Concepto</TH>
                <TH>Tipo</TH>
                <TH>Categoría</TH>
                <TH>Proyecto</TH>
                <TH>Fecha</TH>
                <TH align="right">Monto</TH>
                <TH>Estado</TH>
              </>
          }>
          
            {FINANCE_ENTRIES.map((entry) =>
          <TR key={entry.id}>
                <TD className="font-medium text-brand-900">{entry.concept}</TD>
                <TD>
                  <Badge tone={entry.type === 'Ingreso' ? 'brand' : 'neutral'}>{entry.type}</Badge>
                </TD>
                <TD className="text-brand-500">{entry.category}</TD>
                <TD className="text-brand-500">{entry.project}</TD>
                <TD className="text-brand-500">{entry.date}</TD>
                <TD
              align="right"
              className={
              entry.type === 'Ingreso' ?
              'font-medium text-emerald-700' :
              'font-medium text-rose-700'
              }>
              
                  {entry.type === 'Ingreso' ? '+' : '−'} {currency(entry.amount)}
                </TD>
                <TD>
                  <StatusBadge status={entry.status} />
                </TD>
              </TR>
          )}
          </Table>
        </Card> :

      <Card>
          <Table
          head={
          <>
                <TH>Cliente</TH>
                <TH>Contrato</TH>
                <TH align="right">Total</TH>
                <TH align="right">Pagado</TH>
                <TH align="right">Saldo</TH>
                <TH align="right">Días de mora</TH>
                <TH>Estado</TH>
              </>
          }>
          
            {RECEIVABLES.map((row) =>
          <TR key={row.id}>
                <TD className="font-medium text-brand-900">{row.buyer}</TD>
                <TD className="text-brand-500">{row.saleCode}</TD>
                <TD align="right">{currency(row.total)}</TD>
                <TD align="right">{currency(row.paid)}</TD>
                <TD align="right" className="font-medium text-brand-900">
                  {currency(row.total - row.paid)}
                </TD>
                <TD align="right" className={row.overdueDays > 0 ? 'text-rose-700' : ''}>
                  {number(row.overdueDays)}
                </TD>
                <TD>
                  <StatusBadge status={row.status} />
                </TD>
              </TR>
          )}
          </Table>
        </Card>
      }
    </div>);

}