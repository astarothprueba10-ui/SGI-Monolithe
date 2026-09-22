import React, { useState } from 'react';
import { toast } from 'sonner';
import { CheckIcon, DownloadIcon, PlusIcon } from 'lucide-react';
import { PageHeader } from '../components/ui/PageHeader';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { SearchInput, Select } from '../components/ui/Field';
import { Table, TD, TH, TR } from '../components/ui/Table';
import { StatusBadge, Badge } from '../components/ui/Badge';
import { EmptyState } from '../components/ui/Feedback';
import { Gate } from '../components/auth/PermissionRoute';
import { WORKERS } from '../data/people';
import { currency, number } from '../utils/format';

export function Workers() {
  const [query, setQuery] = useState('');
  const [areaFilter, setAreaFilter] = useState('all');

  const areas = Array.from(new Set(WORKERS.map((w) => w.area)));
  const rows = WORKERS.filter((worker) => {
    const q = query.trim().toLowerCase();
    const byArea = areaFilter === 'all' || worker.area === areaFilter;
    const byQuery =
    q.length === 0 ||
    worker.name.toLowerCase().includes(q) ||
    worker.position.toLowerCase().includes(q);
    return byArea && byQuery;
  });

  return (
    <div>
      <PageHeader
        title="Trabajadores"
        description="Planilla de MONOLITHE: áreas, contratos, horarios, faltas justificadas y descuentos."
        actions={
        <>
            <Gate permission="hr.export">
              <Button icon={DownloadIcon}>Exportar planilla</Button>
            </Gate>
            <Gate permission="hr.create">
              <Button icon={PlusIcon} variant="primary">
                Nuevo trabajador
              </Button>
            </Gate>
          </>
        } />
      

      <div className="mb-5 grid grid-cols-1 gap-4 sm:grid-cols-3">
        {[
        {
          label: 'Trabajadores activos',
          value: number(WORKERS.filter((w) => w.status === 'Activo').length)
        },
        {
          label: 'Faltas justificadas del mes',
          value: number(WORKERS.reduce((s, w) => s + w.justifiedAbsences, 0))
        },
        {
          label: 'Descuentos aplicados',
          value: currency(WORKERS.reduce((s, w) => s + w.discounts, 0))
        }].
        map((item) =>
        <Card key={item.label} className="p-5">
            <p className="text-[12px] text-brand-400">{item.label}</p>
            <p className="mt-1.5 text-[22px] font-semibold tabular text-brand-900">{item.value}</p>
          </Card>
        )}
      </div>

      <Card>
        <div className="flex flex-wrap items-center gap-3 border-b border-brand-100 px-5 py-3.5">
          <SearchInput
            value={query}
            onValueChange={setQuery}
            placeholder="Buscar trabajador o cargo…"
            className="w-full sm:w-72" />
          
          <Select
            value={areaFilter}
            onChange={(e) => setAreaFilter(e.target.value)}
            aria-label="Filtrar por área"
            className="w-[180px]">
            
            <option value="all">Todas las áreas</option>
            {areas.map((a) =>
            <option key={a} value={a}>
                {a}
              </option>
            )}
          </Select>
        </div>

        {rows.length === 0 ?
        <EmptyState title="Sin trabajadores" description="Ajusta los filtros aplicados." /> :

        <Table
          head={
          <>
                <TH>Trabajador</TH>
                <TH>Área</TH>
                <TH>Cargo</TH>
                <TH>Contrato</TH>
                <TH>Horario</TH>
                <TH align="right">Faltas</TH>
                <TH align="right">Descuentos</TH>
                <TH>Estado</TH>
                <TH align="right">Acciones</TH>
              </>
          }>
          
            {rows.map((worker) =>
          <TR key={worker.id}>
                <TD>
                  <div className="flex items-center gap-2.5">
                    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-brand-50 text-[11px] font-semibold text-brand-600">
                      {worker.initials}
                    </span>
                    <span>
                      <span className="block font-medium text-brand-900">{worker.name}</span>
                      <span className="block text-[11px] text-brand-300">
                        {worker.id} · desde {worker.entryDate}
                      </span>
                    </span>
                  </div>
                </TD>
                <TD className="text-brand-500">{worker.area}</TD>
                <TD>{worker.position}</TD>
                <TD>
                  <Badge tone="neutral">{worker.contract}</Badge>
                </TD>
                <TD className="text-brand-500">{worker.schedule}</TD>
                <TD align="right">{worker.justifiedAbsences}</TD>
                <TD align="right" className={worker.discounts > 0 ? 'text-rose-700' : ''}>
                  {worker.discounts > 0 ? currency(worker.discounts) : '—'}
                </TD>
                <TD>
                  <StatusBadge status={worker.status} />
                </TD>
                <TD align="right">
                  <Gate
                permission="hr.approve"
                fallback={<span className="text-[12px] text-brand-300">Solo lectura</span>}>
                
                    <Button
                  size="sm"
                  icon={CheckIcon}
                  onClick={() =>
                  toast.success('Falta justificada', {
                    description: `Registro de ${worker.name} aprobado.`
                  })
                  }>
                  
                      Justificar
                    </Button>
                  </Gate>
                </TD>
              </TR>
          )}
          </Table>
        }
      </Card>
    </div>);

}