import React, { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { CalendarIcon, CheckCircleIcon, DownloadIcon, PhoneIcon, PlusIcon, UserPlusIcon, XCircleIcon } from 'lucide-react';
import { PageHeader } from '../components/ui/PageHeader';
import { Card, CardHeader } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input, SearchInput, Select } from '../components/ui/Field';
import { Table, TD, TH, TR } from '../components/ui/Table';
import { Badge } from '../components/ui/Badge';
import { Tabs } from '../components/ui/Tabs';
import { EmptyState } from '../components/ui/Feedback';
import { Modal } from '../components/ui/Modal';
import { Gate } from '../components/auth/PermissionRoute';
import { LEADS as INITIAL_LEADS, LEAD_SOURCES } from '../data/crm';
import { SALES } from '../data/sales';
import { crmService, type Advisor, type CreateLeadInput, type Visit } from '../services/crmService';
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

const FUNNEL: Array<{ stage: Lead['stage']; label: string }> = [
  { stage: 'Nuevo', label: 'Nuevos' },
  { stage: 'Contactado', label: 'Contactados' },
  { stage: 'Visita', label: 'En visita' },
  { stage: 'Negociación', label: 'En negociación' },
  { stage: 'Convertido', label: 'Convertidos' }
];

const INITIAL_FORM: CreateLeadInput = {
  names: '',
  paternalSurname: '',
  maternalSurname: '',
  phone: '',
  email: '',
  sourceCode: 'WEB',
  interest: 'Los Jardines de Lurin · Mz. A',
  notes: ''
};

export function Crm() {
  const [tab, setTab] = useState('leads');
  const [query, setQuery] = useState('');
  const [stage, setStage] = useState<'all' | Lead['stage']>('all');
  const [assignLead, setAssignLead] = useState<Lead | null>(null);
  const [selectedAdvisorId, setSelectedAdvisorId] = useState<number | null>(null);
  const [isNewLeadOpen, setIsNewLeadOpen] = useState(false);
  const [isNewVisitOpen, setIsNewVisitOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [form, setForm] = useState<CreateLeadInput>(INITIAL_FORM);
  const [leadsList, setLeadsList] = useState<Lead[]>(INITIAL_LEADS);
  const [advisorsList, setAdvisorsList] = useState<Advisor[]>([]);
  const [visitsList, setVisitsList] = useState<Visit[]>([]);

  const [visitForm, setVisitForm] = useState({
    prospectId: 0,
    advisorId: 0,
    visitDate: '',
    shift: '11:00' as '11:00' | '15:00',
    meetingPoint: 'Oficina de Ventas - Lurin',
    notes: ''
  });

  const loadData = async () => {
    try {
      const [leads, advisors, visits] = await Promise.all([
        crmService.getLeads(),
        crmService.getAdvisors(),
        crmService.getVisits()
      ]);
      if (leads.length > 0) setLeadsList(leads);
      if (advisors.length > 0) {
        setAdvisorsList(advisors);
        setSelectedAdvisorId(advisors[0].id);
      }
      if (visits.length > 0) setVisitsList(visits);
    } catch (err) {
      console.warn('Cargando con datos locales fallback:', err);
    }
  };

  useEffect(() => {
    void loadData();
  }, []);

  const leads = useMemo(() => {
    const q = query.trim().toLowerCase();
    return leadsList.filter((lead) => {
      const byStage = stage === 'all' || lead.stage === stage;
      const byQuery =
        q.length === 0 ||
        lead.name.toLowerCase().includes(q) ||
        lead.interest.toLowerCase().includes(q) ||
        lead.advisor.toLowerCase().includes(q);
      return byStage && byQuery;
    });
  }, [leadsList, query, stage]);

  const handleAssignSubmit = async () => {
    if (!assignLead || !selectedAdvisorId) return;
    setIsSubmitting(true);
    try {
      const rawId = assignLead.rawId || Number(assignLead.id.replace(/\D/g, ''));
      await crmService.assignLead(rawId, selectedAdvisorId);
      toast.success('Lead asignado', {
        description: `${assignLead.name} fue asignado al asesor comercial.`
      });
      setAssignLead(null);
      await loadData();
    } catch (err: any) {
      toast.error('Error al asignar', { description: err.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.names || !form.paternalSurname) {
      toast.error('Campos requeridos', { description: 'Ingrese nombres y apellido paterno.' });
      return;
    }
    setIsSubmitting(true);
    try {
      await crmService.createLead(form);
      toast.success('Lead registrado', {
        description: `${form.names} ${form.paternalSurname} registrado en el embudo comercial.`
      });
      setIsNewLeadOpen(false);
      setForm(INITIAL_FORM);
      await loadData();
    } catch (err: any) {
      toast.error('Error al registrar lead', { description: err.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleScheduleVisitSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!visitForm.prospectId || !visitForm.advisorId || !visitForm.visitDate) {
      toast.error('Campos requeridos', { description: 'Seleccione lead, asesor y fecha.' });
      return;
    }
    setIsSubmitting(true);
    try {
      await crmService.scheduleVisit({
        prospectId: visitForm.prospectId,
        advisorId: visitForm.advisorId,
        visitDate: new Date(`${visitForm.visitDate}T${visitForm.shift}:00Z`).toISOString(),
        shift: visitForm.shift,
        meetingPoint: visitForm.meetingPoint,
        notes: visitForm.notes
      });
      toast.success('Visita agendada', { description: 'Visita oficial al terreno agendada con exito.' });
      setIsNewVisitOpen(false);
      await loadData();
    } catch (err: any) {
      toast.error('Error al agendar visita', { description: err.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmVisit = async (id: number) => {
    try {
      await crmService.confirmVisit(id);
      toast.success('Visita confirmada', { description: 'La asistencia ha sido confirmada.' });
      await loadData();
    } catch (err: any) {
      toast.error('Error al confirmar', { description: err.message });
    }
  };

  const handleCancelVisit = async (id: number) => {
    try {
      await crmService.cancelVisit(id, 'Cancelada por coordinacion');
      toast.success('Visita cancelada', { description: 'La visita fue marcada como cancelada.' });
      await loadData();
    } catch (err: any) {
      toast.error('Error al cancelar', { description: err.message });
    }
  };

  const buyers = SALES.filter((s) => s.type === 'Venta');

  return (
    <div>
      <PageHeader
        title="CRM y clientes"
        description="Leads, clientes potenciales y compradores con su fuente de captacion, asesor asignado y seguimiento comercial."
        actions={
          <>
            <Gate permission="crm.export">
              <Button icon={DownloadIcon}>Exportar</Button>
            </Gate>
            <Gate permission="crm.create">
              <Button icon={PlusIcon} variant="primary" onClick={() => setIsNewLeadOpen(true)}>
                Nuevo lead
              </Button>
            </Gate>
          </>
        }
      />

      <div className="mb-5 grid grid-cols-2 gap-3 md:grid-cols-5">
        {FUNNEL.map((step) => {
          const count = leadsList.filter((l) => l.stage === step.stage).length;
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
                stage === step.stage
                  ? 'border-brand-700 ring-1 ring-brand-700'
                  : 'border-brand-100 hover:border-brand-300'
              )}
            >
              <p className="text-[12px] text-brand-400">{step.label}</p>
              <p className="mt-1 text-[20px] font-semibold tabular text-brand-900">{count}</p>
            </button>
          );
        })}
      </div>

      <Tabs
        className="mb-5"
        active={tab}
        onChange={setTab}
        items={[
          { id: 'leads', label: 'Leads y potenciales', count: leadsList.length },
          { id: 'visitas', label: 'Agenda de visitas', count: visitsList.length },
          { id: 'asesores', label: 'Equipo de asesores', count: advisorsList.length },
          { id: 'compradores', label: 'Compradores', count: buyers.length },
          { id: 'fuentes', label: 'Fuentes de captacion' }
        ]}
      />

      {tab === 'leads' && (
        <Card>
          <div className="flex flex-col gap-3 border-b border-brand-100 p-4 md:flex-row md:items-center md:justify-between">
            <SearchInput
              placeholder="Buscar por nombre, proyecto o asesor..."
              value={query}
              onValueChange={setQuery}
              className="w-full md:w-80"
            />
            <div className="flex items-center gap-2 text-[12px] text-brand-400">
              <span>Etapa:</span>
              <Select
                value={stage}
                onChange={(e) => setStage(e.target.value as any)}
                className="w-40"
              >
                <option value="all">Todas ({leadsList.length})</option>
                {FUNNEL.map((f) => (
                  <option key={f.stage} value={f.stage}>
                    {f.label}
                  </option>
                ))}
              </Select>
            </div>
          </div>

          {leads.length === 0 ? (
            <EmptyState
              title="No se encontraron leads"
              description="Intente modificar el termino de busqueda o la etapa seleccionada."
            />
          ) : (
            <Table
              head={
                <>
                  <TH>Lead / Contacto</TH>
                  <TH>Interes / Proyecto</TH>
                  <TH>Origen</TH>
                  <TH>Etapa</TH>
                  <TH>Asesor</TH>
                  <TH>Puntuacion</TH>
                  <TH>Ultimo contacto</TH>
                  <TH align="right">Acciones</TH>
                </>
              }
            >
              {leads.map((lead) => (
                <TR key={lead.id}>
                  <TD>
                    <div>
                      <p className="font-medium text-brand-900">{lead.name}</p>
                      <p className="text-[12px] text-brand-400">
                        {lead.phone} · {lead.email}
                      </p>
                    </div>
                  </TD>
                  <TD className="text-brand-700">{lead.interest}</TD>
                  <TD>
                    <Badge tone="neutral">{lead.source}</Badge>
                  </TD>
                  <TD>
                    <span
                      className={cn(
                        'inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium',
                        STAGE_TONES[lead.stage]
                      )}
                    >
                      {lead.stage}
                    </span>
                  </TD>
                  <TD className="text-brand-600">{lead.advisor}</TD>
                  <TD>
                    <Badge tone={lead.score === 'Alto' ? 'warning' : 'neutral'}>
                      {lead.score}
                    </Badge>
                  </TD>
                  <TD className="tabular text-brand-400">{lead.lastContact}</TD>
                  <TD align="right">
                    <div className="flex justify-end gap-1.5">
                      <Button
                        size="sm"
                        icon={PhoneIcon}
                        onClick={() =>
                          toast.success('Seguimiento registrado', {
                            description: `Bitacora de contacto actualizada para ${lead.name}.`
                          })
                        }
                      >
                        Registrar
                      </Button>
                      <Gate permission="crm.edit">
                        <Button
                          size="sm"
                          variant="primary"
                          icon={UserPlusIcon}
                          onClick={() => {
                            setAssignLead(lead);
                            if (advisorsList.length > 0) setSelectedAdvisorId(advisorsList[0].id);
                          }}
                        >
                          Asignar
                        </Button>
                      </Gate>
                    </div>
                  </TD>
                </TR>
              ))}
            </Table>
          )}
        </Card>
      )}

      {tab === 'visitas' && (
        <Card>
          <div className="flex flex-col gap-3 border-b border-brand-100 p-4 md:flex-row md:items-center md:justify-between">
            <CardHeader
              title="Agenda de visitas guiadas al terreno"
              description="Coordinacion de traslados y visitas oficiales al proyecto (Miercoles a Domingo 11:00 AM y 3:00 PM)."
            />
            <Button
              icon={CalendarIcon}
              variant="primary"
              onClick={() => {
                if (leadsList.length > 0 && advisorsList.length > 0) {
                  setVisitForm({
                    prospectId: leadsList[0].rawId || 1,
                    advisorId: advisorsList[0].id,
                    visitDate: '',
                    shift: '11:00',
                    meetingPoint: 'Oficina de Ventas - Lurin',
                    notes: ''
                  });
                }
                setIsNewVisitOpen(true);
              }}
            >
              Agendar visita
            </Button>
          </div>

          {visitsList.length === 0 ? (
            <EmptyState
              title="No hay visitas agendadas"
              description="Haga clic en 'Agendar visita' para coordinar un traslado con un prospecto."
            />
          ) : (
            <Table
              head={
                <>
                  <TH>Prospecto / Contacto</TH>
                  <TH>Fecha y Turno</TH>
                  <TH>Asesor comercial</TH>
                  <TH>Punto de encuentro</TH>
                  <TH align="center">Estado</TH>
                  <TH align="right">Acciones</TH>
                </>
              }
            >
              {visitsList.map((vis) => (
                <TR key={vis.id}>
                  <TD>
                    <p className="font-medium text-brand-900">{vis.prospectName}</p>
                    <p className="text-[12px] text-brand-400">{vis.prospectPhone}</p>
                  </TD>
                  <TD>
                    <p className="font-semibold text-brand-800">{vis.date}</p>
                    <p className="text-[12px] text-brand-500">Turno {vis.shift}</p>
                  </TD>
                  <TD className="text-brand-700">{vis.advisorName}</TD>
                  <TD className="text-brand-500 text-[12px]">{vis.meetingPoint}</TD>
                  <TD align="center">
                    <Badge
                      tone={
                        vis.status === 'CONFIRMADA'
                          ? 'success'
                          : vis.status === 'CANCELADA'
                          ? 'danger'
                          : 'brand'
                      }
                    >
                      {vis.status}
                    </Badge>
                  </TD>
                  <TD align="right">
                    <div className="flex justify-end gap-1.5">
                      {vis.status === 'PROGRAMADA' && (
                        <Button
                          size="sm"
                          icon={CheckCircleIcon}
                          onClick={() => handleConfirmVisit(vis.id)}
                        >
                          Confirmar
                        </Button>
                      )}
                      {vis.status !== 'CANCELADA' && (
                        <Button
                          size="sm"
                          icon={XCircleIcon}
                          onClick={() => handleCancelVisit(vis.id)}
                        >
                          Cancelar
                        </Button>
                      )}
                    </div>
                  </TD>
                </TR>
              ))}
            </Table>
          )}
        </Card>
      )}

      {tab === 'asesores' && (
        <Card>
          <CardHeader
            title="Equipo comercial de asesores"
            description="Distribucion del equipo de ventas y balance de cartera de prospectos activos."
          />
          <Table
            head={
              <>
                <TH>Codigo</TH>
                <TH>Asesor comercial</TH>
                <TH>Correo corporativo</TH>
                <TH>Telefono directo</TH>
                <TH align="center">Estado</TH>
                <TH align="right">Leads asignados</TH>
              </>
            }
          >
            {advisorsList.map((adv) => (
              <TR key={adv.id}>
                <TD className="font-mono text-[12px] font-semibold text-brand-600">{adv.code}</TD>
                <TD className="font-medium text-brand-900">{adv.name}</TD>
                <TD className="text-brand-600">{adv.email}</TD>
                <TD className="tabular text-brand-500">{adv.phone}</TD>
                <TD align="center">
                  <Badge tone={adv.active ? 'success' : 'neutral'}>
                    {adv.active ? 'Activo' : 'Inactivo'}
                  </Badge>
                </TD>
                <TD align="right" className="font-semibold text-brand-900">
                  {adv.activeLeads} prospectos
                </TD>
              </TR>
            ))}
          </Table>
        </Card>
      )}

      {tab === 'compradores' && (
        <Card>
          <CardHeader
            title="Compradores formalizados"
            description="Clientes con contrato o separacion vigente."
          />
          <Table
            head={
              <>
                <TH>Codigo</TH>
                <TH>Cliente</TH>
                <TH>Lote / Manzana</TH>
                <TH>Modalidad</TH>
                <TH align="right">Monto total</TH>
                <TH>Asesor responsable</TH>
              </>
            }
          >
            {buyers.map((sale) => (
              <TR key={sale.id}>
                <TD className="font-mono text-[12px] text-brand-500">{sale.code}</TD>
                <TD className="font-medium text-brand-900">{sale.buyer}</TD>
                <TD className="text-brand-700">{sale.lot}</TD>
                <TD>
                  <Badge tone="brand">{sale.modality}</Badge>
                </TD>
                <TD align="right">{currency(sale.amount)}</TD>
                <TD className="text-brand-500">{sale.advisor}</TD>
              </TR>
            ))}
          </Table>
        </Card>
      )}

      {tab === 'fuentes' && (
        <Card>
          <CardHeader
            title="Fuentes de captacion"
            description="Volumen y efectividad por canal de origen del lead comercial."
          />
          <Table
            head={
              <>
                <TH>Fuente</TH>
                <TH align="right">Leads</TH>
                <TH align="right">Convertidos</TH>
                <TH align="right">Conversion</TH>
                <TH>Participacion</TH>
              </>
            }
          >
            {LEAD_SOURCES.map((source) => {
              const max = Math.max(...LEAD_SOURCES.map((s) => s.leads));
              return (
                <TR key={source.source}>
                  <TD className="font-medium text-brand-900">{source.source}</TD>
                  <TD align="right">{source.leads}</TD>
                  <TD align="right">{source.converted}</TD>
                  <TD align="right">{percent((source.converted / source.leads) * 100)}</TD>
                  <TD className="w-56">
                    <div className="h-2 w-full overflow-hidden rounded-full bg-brand-50">
                      <span
                        className="block h-full rounded-full bg-brand-600"
                        style={{ width: `${(source.leads / max) * 100}%` }}
                      />
                    </div>
                  </TD>
                </TR>
              );
            })}
          </Table>
        </Card>
      )}

      {/* Modal Asignar Asesor */}
      <Modal
        open={Boolean(assignLead)}
        onClose={() => setAssignLead(null)}
        title="Asignar asesor comercial"
        description={assignLead ? `Lead ${assignLead.id} · ${assignLead.name}` : undefined}
        footer={
          <>
            <Button onClick={() => setAssignLead(null)} disabled={isSubmitting}>
              Cancelar
            </Button>
            <Button
              variant="primary"
              onClick={handleAssignSubmit}
              disabled={isSubmitting || !selectedAdvisorId}
            >
              {isSubmitting ? 'Asignando...' : 'Asignar lead'}
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <label className="text-[13px] font-medium text-brand-700">Seleccionar asesor del equipo</label>
          <Select
            aria-label="Asesor"
            value={selectedAdvisorId || undefined}
            onChange={(e) => setSelectedAdvisorId(Number(e.target.value))}
          >
            {advisorsList.map((a) => (
              <option key={a.id} value={a.id}>
                {a.code} - {a.name} ({a.activeLeads} activos)
              </option>
            ))}
          </Select>
          <p className="text-[12px] text-brand-400">
            El asesor comercial recibira la notificacion del prospecto en su cartera activa.
          </p>
        </div>
      </Modal>

      {/* Modal Nuevo Lead */}
      <Modal
        open={isNewLeadOpen}
        onClose={() => setIsNewLeadOpen(false)}
        title="Registrar nuevo lead"
        description="Captacion manual de prospecto para ingreso al embudo comercial."
        footer={
          <>
            <Button onClick={() => setIsNewLeadOpen(false)} disabled={isSubmitting}>
              Cancelar
            </Button>
            <Button variant="primary" onClick={handleCreateSubmit} disabled={isSubmitting}>
              {isSubmitting ? 'Guardando...' : 'Registrar lead'}
            </Button>
          </>
        }
      >
        <form onSubmit={handleCreateSubmit} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[12px] font-medium text-brand-700">Nombres *</label>
              <Input
                required
                value={form.names}
                onChange={(e) => setForm({ ...form, names: e.target.value })}
                placeholder="Ej. Juan Carlos"
              />
            </div>
            <div>
              <label className="text-[12px] font-medium text-brand-700">Apellido paterno *</label>
              <Input
                required
                value={form.paternalSurname}
                onChange={(e) => setForm({ ...form, paternalSurname: e.target.value })}
                placeholder="Ej. Perez"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[12px] font-medium text-brand-700">Telefono / WhatsApp</label>
              <Input
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                placeholder="+51 987 654 321"
              />
            </div>
            <div>
              <label className="text-[12px] font-medium text-brand-700">Correo electronico</label>
              <Input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="cliente@ejemplo.com"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[12px] font-medium text-brand-700">Canal de captacion</label>
              <Select
                value={form.sourceCode}
                onChange={(e) => setForm({ ...form, sourceCode: e.target.value })}
              >
                <option value="WEB">Pagina Web</option>
                <option value="FACEBOOK">Facebook</option>
                <option value="INSTAGRAM">Instagram</option>
                <option value="WHATSAPP">WhatsApp</option>
                <option value="FERIA">Feria / Evento</option>
                <option value="REFERIDO">Referido</option>
              </Select>
            </div>
            <div>
              <label className="text-[12px] font-medium text-brand-700">Asignar a asesor inicial</label>
              <Select
                value={form.advisorId || ''}
                onChange={(e) => setForm({ ...form, advisorId: e.target.value ? Number(e.target.value) : undefined })}
              >
                <option value="">Sin asignar (Rotativo)</option>
                {advisorsList.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </Select>
            </div>
          </div>

          <div>
            <label className="text-[12px] font-medium text-brand-700">Interes inicial / Proyecto</label>
            <Input
              value={form.interest}
              onChange={(e) => setForm({ ...form, interest: e.target.value })}
              placeholder="Ej. Los Jardines de Lurin · Mz. B"
            />
          </div>
        </form>
      </Modal>

      {/* Modal Agendar Visita */}
      <Modal
        open={isNewVisitOpen}
        onClose={() => setIsNewVisitOpen(false)}
        title="Agendar visita guiada al terreno"
        description="Coordinacion de visita bajo horarios oficiales (Miercoles a Domingo, 11:00 AM y 3:00 PM)."
        footer={
          <>
            <Button onClick={() => setIsNewVisitOpen(false)} disabled={isSubmitting}>
              Cancelar
            </Button>
            <Button variant="primary" onClick={handleScheduleVisitSubmit} disabled={isSubmitting}>
              {isSubmitting ? 'Agendando...' : 'Confirmar visita'}
            </Button>
          </>
        }
      >
        <form onSubmit={handleScheduleVisitSubmit} className="space-y-3">
          <div>
            <label className="text-[12px] font-medium text-brand-700">Prospecto interesado *</label>
            <Select
              value={visitForm.prospectId || ''}
              onChange={(e) => setVisitForm({ ...visitForm, prospectId: Number(e.target.value) })}
            >
              {leadsList.map((l) => (
                <option key={l.id} value={l.rawId || Number(l.id.replace(/\D/g, ''))}>
                  {l.id} - {l.name} ({l.phone})
                </option>
              ))}
            </Select>
          </div>

          <div>
            <label className="text-[12px] font-medium text-brand-700">Asesor responsable *</label>
            <Select
              value={visitForm.advisorId || ''}
              onChange={(e) => setVisitForm({ ...visitForm, advisorId: Number(e.target.value) })}
            >
              {advisorsList.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name} ({a.code})
                </option>
              ))}
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[12px] font-medium text-brand-700">Fecha de visita *</label>
              <Input
                type="date"
                required
                value={visitForm.visitDate}
                onChange={(e) => setVisitForm({ ...visitForm, visitDate: e.target.value })}
              />
            </div>
            <div>
              <label className="text-[12px] font-medium text-brand-700">Turno oficial *</label>
              <Select
                value={visitForm.shift}
                onChange={(e) => setVisitForm({ ...visitForm, shift: e.target.value as any })}
              >
                <option value="11:00">11:00 AM (Manana)</option>
                <option value="15:00">3:00 PM (Tarde)</option>
              </Select>
            </div>
          </div>

          <div>
            <label className="text-[12px] font-medium text-brand-700">Punto de encuentro</label>
            <Input
              value={visitForm.meetingPoint}
              onChange={(e) => setVisitForm({ ...visitForm, meetingPoint: e.target.value })}
              placeholder="Ej. Oficina de Ventas - Lurin"
            />
          </div>

          <div>
            <label className="text-[12px] font-medium text-brand-700">Notas de traslado</label>
            <Input
              value={visitForm.notes}
              onChange={(e) => setVisitForm({ ...visitForm, notes: e.target.value })}
              placeholder="Ej. 2 personas, movilidad de la empresa"
            />
          </div>

          <p className="text-[11px] text-brand-400">
            Regla de negocio: Las visitas oficiales solo se programan de Miercoles a Domingo en los turnos autorizados de 11:00 y 15:00.
          </p>
        </form>
      </Modal>
    </div>
  );
}