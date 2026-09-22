import React, { useState } from 'react';
import { toast } from 'sonner';
import { CheckIcon, DownloadIcon, PlusIcon } from 'lucide-react';
import { PageHeader } from '../components/ui/PageHeader';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { SearchInput } from '../components/ui/Field';
import { Table, TD, TH, TR } from '../components/ui/Table';
import { StatusBadge, Badge } from '../components/ui/Badge';
import { Tabs } from '../components/ui/Tabs';
import { Gate } from '../components/auth/PermissionRoute';
import { ADVISORS } from '../data/people';
import { currency, number } from '../utils/format';

export function Advisors() {
  const [tab, setTab] = useState('cartera');
  const [query, setQuery] = useState('');

  const rows = ADVISORS.filter((a) => {
    const q = query.trim().toLowerCase();
    return q.length === 0 || a.name.toLowerCase().includes(q) || a.team.toLowerCase().includes(q);
  });

  const totalCommission = ADVISORS.reduce((s, a) => s + a.commission, 0);
  const totalBonus = ADVISORS.reduce((s, a) => s + a.bonus, 0);

  return (
    <div>
      <PageHeader
        title="Asesores"
        description="Asesores internos y externos con sus ventas, comisiones, bonos, horarios y descuentos."
        actions={
        <>
            <Gate permission="advisors.export">
              <Button icon={DownloadIcon}>Exportar liquidación</Button>
            </Gate>
            <Gate permission="advisors.create">
              <Button icon={PlusIcon} variant="primary">
                Nuevo asesor
              </Button>
            </Gate>
          </>
        } />
      

      <div className="mb-5 grid grid-cols-1 gap-4 sm:grid-cols-3">
        {[
        { label: 'Asesores activos', value: number(ADVISORS.filter((a) => a.status === 'Activo').length) },
        { label: 'Comisiones del periodo', value: currency(totalCommission) },
        { label: 'Bonos aprobados', value: currency(totalBonus) }].
        map((item) =>
        <Card key={item.label} className="p-5">
            <p className="text-[12px] text-brand-400">{item.label}</p>
            <p className="mt-1.5 text-[22px] font-semibold tabular text-brand-900">{item.value}</p>
          </Card>
        )}
      </div>

      <Tabs
        className="mb-5"
        active={tab}
        onChange={setTab}
        items={[
        { id: 'cartera', label: 'Ventas y comisiones', count: ADVISORS.length },
        { id: 'asistencia', label: 'Horarios y asistencia' }]
        } />
      

      <Card>
        <div className="flex flex-wrap items-center gap-3 border-b border-brand-100 px-5 py-3.5">
          <SearchInput
            value={query}
            onValueChange={setQuery}
            placeholder="Buscar asesor o equipo…"
            className="w-full sm:w-72" />
          
        </div>

        {tab === 'cartera' ?
        <Table
          head={
          <>
                <TH>Asesor</TH>
                <TH>Tipo</TH>
                <TH>Equipo</TH>
                <TH align="right">Ventas</TH>
                <TH align="right">Monto vendido</TH>
                <TH align="right">Comisión</TH>
                <TH align="right">Bono</TH>
                <TH>Estado</TH>
                <TH align="right">Acciones</TH>
              </>
          }>
          
            {rows.map((advisor) =>
          <TR key={advisor.id}>
                <TD>
                  <div className="flex items-center gap-2.5">
                    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-brand-50 text-[11px] font-semibold text-brand-600">
                      {advisor.initials}
                    </span>
                    <span className="font-medium text-brand-900">{advisor.name}</span>
                  </div>
                </TD>
                <TD>
                  <Badge tone={advisor.type === 'Interno' ? 'brand' : 'neutral'}>
                    {advisor.type}
                  </Badge>
                </TD>
                <TD className="text-brand-500">{advisor.team}</TD>
                <TD align="right">{advisor.salesCount}</TD>
                <TD align="right">{currency(advisor.salesAmount)}</TD>
                <TD align="right" className="font-medium text-brand-900">
                  {currency(advisor.commission)}
                </TD>
                <TD align="right">{advisor.bonus > 0 ? currency(advisor.bonus) : '—'}</TD>
                <TD>
                  <StatusBadge status={advisor.status} />
                </TD>
                <TD align="right">
                  <Gate
                permission="advisors.approve"
                fallback={<span className="text-[12px] text-brand-300">Solo lectura</span>}>
                
                    <Button
                  size="sm"
                  variant="success"
                  icon={CheckIcon}
                  onClick={() =>
                  toast.success('Comisión aprobada', {
                    description: `${advisor.name} · ${currency(advisor.commission)} liquidada.`
                  })
                  }>
                  
                      Aprobar
                    </Button>
                  </Gate>
                </TD>
              </TR>
          )}
          </Table> :

        <Table
          head={
          <>
                <TH>Asesor</TH>
                <TH>Horario</TH>
                <TH align="right">Faltas justificadas</TH>
                <TH align="right">Descuentos</TH>
                <TH>Estado</TH>
                <TH align="right">Acciones</TH>
              </>
          }>
          
            {rows.map((advisor) =>
          <TR key={advisor.id}>
                <TD className="font-medium text-brand-900">{advisor.name}</TD>
                <TD className="text-brand-500">{advisor.schedule}</TD>
                <TD align="right">{advisor.absences}</TD>
                <TD align="right" className={advisor.discount > 0 ? 'text-rose-700' : ''}>
                  {advisor.discount > 0 ? currency(advisor.discount) : '—'}
                </TD>
                <TD>
                  <StatusBadge status={advisor.status} />
                </TD>
                <TD align="right">
                  <Gate
                permission="advisors.edit"
                fallback={<span className="text-[12px] text-brand-300">Solo lectura</span>}>
                
                    <Button size="sm">Editar horario</Button>
                  </Gate>
                </TD>
              </TR>
          )}
          </Table>
        }
      </Card>
    </div>);

}