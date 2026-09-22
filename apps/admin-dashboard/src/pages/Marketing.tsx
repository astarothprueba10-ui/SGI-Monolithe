import React from 'react';
import { DownloadIcon, PlusIcon } from 'lucide-react';
import { PageHeader } from '../components/ui/PageHeader';
import { Card, CardHeader } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Table, TD, TH, TR } from '../components/ui/Table';
import { StatusBadge, Badge } from '../components/ui/Badge';
import { Gate } from '../components/auth/PermissionRoute';
import { TrendChart } from '../components/dashboard/TrendChart';
import { CAMPAIGNS, LEAD_SOURCES } from '../data/crm';
import { currency, percent } from '../utils/format';

export function Marketing() {
  return (
    <div>
      <PageHeader
        title="Marketing y campañas"
        description="Rendimiento de campañas, fuentes de captación y calidad de los leads generados."
        actions={
        <>
            <Gate permission="marketing.export">
              <Button icon={DownloadIcon}>Exportar reporte</Button>
            </Gate>
            <Gate permission="marketing.create">
              <Button icon={PlusIcon} variant="primary">
                Nueva campaña
              </Button>
            </Gate>
          </>
        } />
      

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader
            title="Leads por fuente"
            description="Volumen captado y leads convertidos a separación"
            actions={<Badge tone="neutral">Agosto 2026</Badge>} />
          
          <div className="px-3 py-4">
            <TrendChart
              data={LEAD_SOURCES}
              series={[
              { key: 'leads', label: 'Leads', type: 'bar', color: '#C7D8E8' },
              { key: 'converted', label: 'Convertidos', type: 'line', color: '#1E3A5C' }]
              }
              height={272} />
            
          </div>
        </Card>

        <Card>
          <CardHeader title="Efectividad por canal" description="Conversión lead → separación" />
          <ul className="divide-y divide-brand-50">
            {[...LEAD_SOURCES].
            sort((a, b) => b.converted / b.leads - a.converted / a.leads).
            map((source) => {
              const rate = source.converted / source.leads * 100;
              return (
                <li key={source.source} className="px-5 py-3">
                    <div className="flex items-baseline justify-between gap-3">
                      <p className="text-[13px] font-medium text-brand-800">{source.source}</p>
                      <p className="text-[13px] font-semibold tabular text-brand-900">
                        {percent(rate)}
                      </p>
                    </div>
                    <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-brand-50">
                      <span
                      className="block h-full rounded-full bg-emerald-500"
                      style={{ width: `${Math.min(rate * 4, 100)}%` }} />
                    
                    </div>
                    <p className="mt-1 text-[11px] text-brand-300 tabular">
                      {source.converted} de {source.leads} leads
                    </p>
                  </li>);

            })}
          </ul>
        </Card>
      </div>

      <Card className="mt-4">
        <CardHeader
          title="Campañas"
          description="Presupuesto, costo por lead y conversión por campaña" />
        
        <Table
          head={
          <>
              <TH>Campaña</TH>
              <TH>Canal</TH>
              <TH align="right">Presupuesto</TH>
              <TH align="right">Leads</TH>
              <TH align="right">CPL</TH>
              <TH align="right">Conversión</TH>
              <TH>Estado</TH>
              <TH align="right">Acciones</TH>
            </>
          }>
          
          {CAMPAIGNS.map((campaign) =>
          <TR key={campaign.id}>
              <TD>
                <span className="block font-medium text-brand-900">{campaign.name}</span>
                <span className="block text-[11px] text-brand-300">{campaign.id}</span>
              </TD>
              <TD>
                <Badge tone="neutral">{campaign.channel}</Badge>
              </TD>
              <TD align="right">{currency(campaign.budget)}</TD>
              <TD align="right">{campaign.leads}</TD>
              <TD align="right">{currency(campaign.cpl)}</TD>
              <TD align="right">{percent(campaign.conversion)}</TD>
              <TD>
                <StatusBadge status={campaign.status} />
              </TD>
              <TD align="right">
                <Gate
                permission="marketing.edit"
                fallback={<span className="text-[12px] text-brand-300">Solo lectura</span>}>
                
                  <Button size="sm">Editar</Button>
                </Gate>
              </TD>
            </TR>
          )}
        </Table>
      </Card>
    </div>);

}