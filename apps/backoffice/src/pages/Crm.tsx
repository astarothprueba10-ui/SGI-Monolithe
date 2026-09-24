import React, { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { DownloadIcon, PhoneIcon, PlusIcon, UserPlusIcon } from 'lucide-react';
import { PageHeader } from '../components/ui/PageHeader';
import { Card, CardHeader } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { SearchInput, Select } from '../components/ui/Field';
import { Table, TD, TH, TR } from '../components/ui/Table';
import { Badge } from '../components/ui/Badge';
import { Tabs } from '../components/ui/Tabs';
import { EmptyState } from '../components/ui/Feedback';
import { Modal } from '../components/ui/Modal';
import { Gate } from '../components/auth/PermissionRoute';
import { LEADS, LEAD_SOURCES } from '../data/crm';
import { SALES } from '../data/sales';
import { cn } from '../utils/cn';
import { currency, percent } from '../utils/format';
import type { Lead } from '../types';

const STAGE_TONES: Record<Lead['stage'], string> = {
  Nuevo: 'bg-slate-100 text-slate-600 border-slate-200',
  Contactado: 'bg-sky-50 text-sky-700 border-sky-200',
  Visita: 'bg-brand-50 text-brand-700 border-brand-200',
  Negociación: 'bg-amber-50 text-amber-800 border-amber-200',
  Convertido: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  Perdido: 'bg-rose-50 text-rose-700 border-rose-200'
};

const FUNNEL: Array<{stage: Lead['stage'];label: string;}> = [
{ stage: 'Nuevo', label: 'Nuevos' },
{ stage: 'Contactado', label: 'Contactados' },
{ stage: 'Visita', label: 'En visita' },
{ stage: 'Negociación', label: 'En negociación' },
{ stage: 'Convertido', label: 'Convertidos' }];


export function Crm() {
  const [tab, setTab] = useState('leads');
  const [query, setQuery] = useState('');
  const [stage, setStage] = useState<'all' | Lead['stage']>('all');
  const [assignLead, setAssignLead] = useState<Lead | null>(null);

  const leads = useMemo(() => {
    const q = query.trim().toLowerCase();
    return LEADS.filter((lead) => {
      const byStage = stage === 'all' || lead.stage === stage;
      const byQuery =
      q.length === 0 ||
      lead.name.toLowerCase().includes(q) ||
      lead.interest.toLowerCase().includes(q) ||
      lead.advisor.toLowerCase().includes(q);
      return byStage && byQuery;
    });
  }, [query, stage]);

  const buyers = SALES.filter((s) => s.type === 'Venta');

  return (
    <div>
      <PageHeader
        title="CRM y clientes"
        description="Leads, clientes potenciales y compradores con su fuente de captación, asesor asignado y seguimiento comercial."
        actions={
        <>
            <Gate permission="crm.export">
              <Button icon={DownloadIcon}>Exportar</Button>
            </Gate>
            <Gate permission="crm.create">
              <Button icon={PlusIcon} variant="primary">
                Nuevo lead
              </Button>
            </Gate>
          </>
        } />
      

      <div className="mb-5 grid grid-cols-2 gap-3 md:grid-cols-5">
        {FUNNEL.map((step) => {
          const count = LEADS.filter((l) => l.stage === step.stage).length;
          return (
            <button
              key={step.stage}
              type="button"
              onClick={() => {
                setTab('leads');
                setStage(stage === step.stage ? 'all' : step.stage);
              }}
              aria-pressed={stage === step.stage}
              className={cn(
                'rounded-lg border bg-white px-4 py-3 text-left shadow-card transition-colors duration-150 ease-smooth',
                stage === step.stage ?
                'border-brand-700 ring-1 ring-brand-700' :
                'border-brand-100 hover:border-brand-300'
              )}>
              
              <p className="text-[12px] text-brand-400">{step.label}</p>
              <p className="mt-1 text-[20px] font-semibold tabular text-brand-900">{count}</p>
            </button>);

        })}
      </div>

      <Tabs
        className="mb-5"
        active={tab}
        onChange={setTab}
        items={[
        { id: 'leads', label: 'Leads y potenciales', count: LEADS.length },
        { id: 'compradores', label: 'Compradores', count: buyers.length },
        { id: 'fuentes', label: 'Fuentes de captación' }]
        } />
      

      {tab === 'leads' ?
      <Card>
          <div className="flex flex-wrap items-center gap-3 border-b border-brand-100 px-5 py-3.5">
            <SearchInput
            value={query}
            onValueChange={setQuery}
            placeholder="Buscar lead, interés o asesor…"
            className="w-full sm:w-72" />
          
            <Select
            value={stage}
            onChange={(e) => setStage(e.target.value as 'all' | Lead['stage'])}
            aria-label="Filtrar por etapa"
            className="w-[180px]">
            
              <option value="all">Todas las etapas</option>
              {Object.keys(STAGE_TONES).map((s) =>
            <option key={s} value={s}>
                  {s}
                </option>
            )}
            </Select>
          </div>
          {leads.length === 0 ?
        <EmptyState title="Sin leads" description="Ajusta los filtros para ver resultados." /> :

        <Table
          head={
          <>
                  <TH>Lead</TH>
                  <TH>Contacto</TH>
                  <TH>Fuente</TH>
                  <TH>Interés</TH>
                  <TH>Etapa</TH>
                  <TH>Calificación</TH>
                  <TH>Asesor</TH>
                  <TH>Último contacto</TH>
                  <TH align="right">Acciones</TH>
                </>
          }>
          
              {leads.map((lead) =>
          <TR key={lead.id}>
                  <TD>
                    <span className="block font-medium text-brand-900">{lead.name}</span>
                    <span className="block text-[11px] text-brand-300">{lead.id}</span>
                  </TD>
                  <TD className="text-brand-500">
                    <span className="block">{lead.phone}</span>
                    <span className="block text-[11px] text-brand-300">{lead.email}</span>
                  </TD>
                  <TD>
                    <Badge tone="neutral">{lead.source}</Badge>
                  </TD>
                  <TD className="text-brand-500">{lead.interest}</TD>
                  <TD>
                    <span
                className={cn(
                  'inline-flex rounded-full border px-2 py-0.5 text-[12px] font-medium',
                  STAGE_TONES[lead.stage]
                )}>
                
                      {lead.stage}
                    </span>
                  </TD>
                  <TD>
                    <Badge tone={lead.score === 'Alto' ? 'accent' : 'neutral'}>{lead.score}</Badge>
                  </TD>
                  <TD
              className={cn(
                lead.advisor === 'Sin asignar' ? 'text-amber-700' : 'text-brand-600'
              )}>
              
                    {lead.advisor}
                  </TD>
                  <TD className="text-brand-500">{lead.lastContact}</TD>
                  <TD align="right">
                    <div className="flex justify-end gap-1.5">
                      <Button
                  size="sm"
                  icon={PhoneIcon}
                  onClick={() =>
                  toast.success('Seguimiento registrado', {
                    description: `Llamada registrada para ${lead.name}.`
                  })
                  }>
                  
                        Registrar
                      </Button>
                      <Gate permission="crm.edit">
                        <Button
                    size="sm"
                    variant="primary"
                    icon={UserPlusIcon}
                    onClick={() => setAssignLead(lead)}>
                    
                          Asignar
                        </Button>
                      </Gate>
                    </div>
                  </TD>
                </TR>
          )}
            </Table>
        }
        </Card> :
      null}

      {tab === 'compradores' ?
      <Card>
          <CardHeader
          title="Compradores"
          description="Clientes con venta registrada y contrato asociado" />
        
          <Table
          head={
          <>
                <TH>Comprador</TH>
                <TH>Documento</TH>
                <TH>Lote</TH>
                <TH>Proyecto</TH>
                <TH>Modalidad</TH>
                <TH align="right">Monto</TH>
                <TH>Asesor</TH>
              </>
          }>
          
            {buyers.map((sale) =>
          <TR key={sale.id}>
                <TD className="font-medium text-brand-900">{sale.buyer}</TD>
                <TD className="text-brand-500">{sale.document}</TD>
                <TD>{sale.lot}</TD>
                <TD className="text-brand-500">{sale.project}</TD>
                <TD>
                  <Badge tone="neutral">{sale.modality}</Badge>
                </TD>
                <TD align="right">{currency(sale.amount)}</TD>
                <TD className="text-brand-500">{sale.advisor}</TD>
              </TR>
          )}
          </Table>
        </Card> :
      null}

      {tab === 'fuentes' ?
      <Card>
          <CardHeader
          title="Fuentes de captación"
          description="Volumen y efectividad por canal de origen del lead" />
        
          <Table
          head={
          <>
                <TH>Fuente</TH>
                <TH align="right">Leads</TH>
                <TH align="right">Convertidos</TH>
                <TH align="right">Conversión</TH>
                <TH>Participación</TH>
              </>
          }>
          
            {LEAD_SOURCES.map((source) => {
            const max = Math.max(...LEAD_SOURCES.map((s) => s.leads));
            return (
              <TR key={source.source}>
                  <TD className="font-medium text-brand-900">{source.source}</TD>
                  <TD align="right">{source.leads}</TD>
                  <TD align="right">{source.converted}</TD>
                  <TD align="right">{percent(source.converted / source.leads * 100)}</TD>
                  <TD className="w-56">
                    <div className="h-2 w-full overflow-hidden rounded-full bg-brand-50">
                      <span
                      className="block h-full rounded-full bg-brand-600"
                      style={{ width: `${source.leads / max * 100}%` }} />
                    
                    </div>
                  </TD>
                </TR>);

          })}
          </Table>
        </Card> :
      null}

      <Modal
        open={Boolean(assignLead)}
        onClose={() => setAssignLead(null)}
        title="Asignar asesor"
        description={assignLead ? `Lead ${assignLead.id} · ${assignLead.name}` : undefined}
        footer={
        <>
            <Button onClick={() => setAssignLead(null)}>Cancelar</Button>
            <Button
            variant="primary"
            onClick={() => {
              toast.success('Lead asignado', {
                description: `${assignLead?.name} fue asignado y notificado al asesor.`
              });
              setAssignLead(null);
            }}>
            
              Asignar lead
            </Button>
          </>
        }>
        
        <div className="space-y-3">
          <Select aria-label="Asesor" defaultValue="Camila Ordoñez">
            {['Camila Ordoñez', 'Marco Ledesma', 'Silvana Rojas', 'Teo Aguilar'].map((a) =>
            <option key={a} value={a}>
                {a}
              </option>
            )}
          </Select>
          <p className="text-[12px] text-brand-400">
            El asesor recibirá el lead en su bandeja de seguimiento comercial.
          </p>
        </div>
      </Modal>
    </div>);

}