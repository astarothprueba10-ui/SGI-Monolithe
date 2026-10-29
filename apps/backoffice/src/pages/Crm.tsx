import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { toast } from 'sonner';
import {
  CalendarIcon,
  CheckCircleIcon,
  DownloadIcon,
  EyeIcon,
  PencilIcon,
  PhoneIcon,
  PlusIcon,
  RefreshCw,
  UserPlusIcon,
  XCircleIcon,
  Users,
  TrendingUp,
} from 'lucide-react';
import { PageHeader } from '../components/ui/PageHeader';
import { Card, CardHeader } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input, SearchInput, Select } from '../components/ui/Field';
import { ProspectSearchAutocomplete } from '../components/ui/ProspectSearchAutocomplete';
import { Table, TD, TH, TR } from '../components/ui/Table';
import { Badge, StatusBadge } from '../components/ui/Badge';
import { Tabs } from '../components/ui/Tabs';
import { Alert, EmptyState } from '../components/ui/Feedback';
import { Pagination } from '../components/ui/Pagination';
import { Modal } from '../components/ui/Modal';
import { Gate } from '../components/auth/PermissionRoute';
import { calcularRangoCrm } from '../utils/crmPeriodo';
import { CrmActionsMenu, type CrmMenuAction } from '../components/crm/CrmActionsMenu';
import { CrmCategoriaLegend } from '../components/crm/CrmCategoriaLegend';
import {
  crmBackend,
  type CrmAdvisor,
  type CrmBuyer,
  type CrmCatalogs,
  type CrmCategory,
  type CrmDetail,
  type CrmFollowUpCreate,
  type CrmFollowUpItem,
  type CrmProspect,
  type CrmSummary,
  type CrmVisit,
  type CrmAssignment,
  type CrmFuentesPeriodo,
  type CrmAsesoresPeriodo,
  type CrmVisitaPeriodo,
} from '../services/crmBackend';
import { cn } from '../utils/cn';
import { currency } from '../utils/format';
import {
  CrmPeriodoGlobal,
  type PeriodoCrmModo
} from '../components/crm/CrmPeriodoGlobal';
import { CrmEvolucionChart } from '../components/crm/CrmEvolucionChart';
import type { CrmEvolucionMes } from '../services/crmBackend';
import {
  sanitizarLead, validarNuevoLead,
  type LeadField,
  type LeadFormValues
} from '../utils/crmLeadValidation'; const STAGE_TONES: Record<string, string> = {
  NUEVO: 'bg-slate-100 text-slate-700 border-slate-200',
  CONTACTADO: 'bg-sky-50 text-sky-700 border-sky-200',
  EN_SEGUIMIENTO: 'bg-sky-50 text-sky-700 border-sky-200',
  INTERESADO: 'bg-brand-50 text-brand-700 border-brand-200',
  NEGOCIACION: 'bg-amber-50 text-amber-800 border-amber-200',
  CONVERTIDO: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  NO_INTERESADO: 'bg-rose-50 text-rose-700 border-rose-200',
  DESCARTADO: 'bg-rose-50 text-rose-700 border-rose-200'
};

function formatDateTimeLima(dateStr: string | null | undefined): string {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return new Intl.DateTimeFormat('es-PE', {
    timeZone: 'America/Lima',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  }).format(d);
}

function formatDateLima(dateStr: string | null | undefined): string {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return new Intl.DateTimeFormat('es-PE', {
    timeZone: 'America/Lima',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  }).format(d);
}

function validateFollowUpForm(form: CrmFollowUpCreate): { valid: boolean; error?: string; fechaIso?: string | null } {
  const asunto = form.asunto.trim();
  if (!asunto) return { valid: false, error: 'Ingrese el asunto de la bitacora de contacto.' };
  if (asunto.length > 150) return { valid: false, error: 'El asunto no debe superar 150 caracteres.' };
  if (!form.requiereSeguimiento) return { valid: true, fechaIso: null };
  if (!form.fechaProximoSeguimiento) {
    return { valid: false, error: 'Seleccione fecha y hora para el proximo seguimiento programado.' };
  }
  const d = new Date(form.fechaProximoSeguimiento);
  if (isNaN(d.getTime())) return { valid: false, error: 'La fecha del proximo seguimiento no es valida.' };
  if (d <= new Date()) return { valid: false, error: 'La fecha y hora del proximo contacto debe ser estrictamente futura.' };
  const pad2 = (n: number) => String(n).padStart(2, '0');
  const fy = d.getFullYear();
  const fm = pad2(d.getMonth() + 1);
  const fd = pad2(d.getDate());
  const fh = pad2(d.getHours());
  const fmin = pad2(d.getMinutes());
  return { valid: true, fechaIso: `${fy}-${fm}-${fd}T${fh}:${fmin}:00-05:00` };
}

function validateVisitForm(form: {
  prospectId: number;
  projectId: number;
  advisorId: number;
  visitDate: string;
  shift: string;
}): { valid: boolean; error?: string; fechaIso?: string } {
  if (!form.prospectId || !form.projectId || !form.visitDate) {
    return { valid: false, error: 'Seleccione prospecto, proyecto y fecha de visita.' };
  }
  if (!form.advisorId) {
    return { valid: false, error: 'Seleccione un asesor responsable para la visita.' };
  }
  const [year, month, day] = form.visitDate.split('-').map(Number);
  const [hours, minutes] = form.shift.split(':').map(Number);
  const d = new Date(year, month - 1, day, hours, minutes);
  if (isNaN(d.getTime())) return { valid: false, error: 'Seleccione una fecha valida para la visita.' };
  if (d <= new Date()) return { valid: false, error: 'La fecha y hora de la visita debe ser estrictamente futura.' };
  const dow = d.getDay();
  if (dow === 1 || dow === 2) {
    return { valid: false, error: 'Las visitas oficiales guiadas solo se realizan de Miercoles a Domingo (11:00 AM y 3:00 PM).' };
  }
  const maxDate = new Date();
  maxDate.setDate(maxDate.getDate() + 180);
  if (d > maxDate) {
    return { valid: false, error: 'La visita debe programarse dentro de los proximos 180 dias autorizados por el backend.' };
  }
  const pad2 = (n: number) => String(n).padStart(2, '0');
  return { valid: true, fechaIso: `${year}-${pad2(month)}-${pad2(day)}T${pad2(hours)}:${pad2(minutes)}:00-05:00` };
}

type LeadFormData = LeadFormValues;

const INITIAL_FORM: LeadFormData = {
  names: '',
  paternalSurname: '',
  maternalSurname: '',
  phone: '',
  email: '',
  idProyecto: '',
  origenCodigo: 'WEB',
  motivoContacto: 'Interes en adquisicion de lote residencial',
  mensaje: '',
  idAsesor: '',
  tipoDocumento: 'DNI',
  numeroDocumento: '',
  direccion: ''
};


function obtenerFechaHoyLima(): string {
  const partes = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Lima',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).formatToParts(new Date());

  const valor = (tipo: string) =>
    partes.find((parte) => parte.type === tipo)?.value ?? '';

  return `${valor('year')}-${valor('month')}-${valor('day')}`;
}


const KPI_CRM = [
  {
    key: 'total',
    label: 'Total cartera',
    description: 'Prospectos registrados',
    icon: Users,
    color: 'bg-blue-50 text-blue-700'
  },
  {
    key: 'leads',
    label: 'Leads',
    description: 'Registrados en el período',
    icon: UserPlusIcon,
    color: 'bg-emerald-50 text-emerald-700'
  },
  {
    key: 'potenciales',
    label: 'Clientes potenciales',
    description: 'Registrados en el período',
    icon: TrendingUp,
    color: 'bg-amber-50 text-amber-700'
  },
  {
    key: 'compradores',
    label: 'Clientes compradores',
    description: 'Formalizados en el período',
    icon: CheckCircleIcon,
    color: 'bg-violet-50 text-violet-700'
  },
  {
    key: 'cerrados',
    label: 'Cerrados',
    description: 'Registrados en el período',
    icon: XCircleIcon,
    color: 'bg-rose-50 text-rose-700'
  }
] as const;

export function Crm() {
  const [tab, setTab] = useState('leads');
  const [query, setQuery] = useState('');
  const [stage, setStage] = useState('all');
  const [origin, setOrigin] = useState('all');
  const [category, setCategory] = useState<CrmCategory>('LEAD');
  const [advisorFilter, setAdvisorFilter] = useState<number | ''>('');
  const [projectFilter, setProjectFilter] = useState<number | ''>('');
  const [fechaTablaDesde, setFechaTablaDesde] = useState('');
  const [fechaTablaHasta, setFechaTablaHasta] = useState('');
  const [onlyUnassigned, setOnlyUnassigned] = useState(false);
  const [page, setPage] = useState(1);
  const pageSize = 15;

  const [leadsList, setLeadsList] = useState<CrmProspect[]>([]);
  const [totalLeads, setTotalLeads] = useState(0);
  const [summary, setSummary] = useState<CrmSummary | null>(null);
  const [catalogs, setCatalogs] = useState<CrmCatalogs | null>(null);
  const [advisorsList, setAdvisorsList] = useState<CrmAdvisor[]>([]);
  const [asesoresPeriodoData, setAsesoresPeriodoData] = useState<CrmAsesoresPeriodo | null>(null);
  const [asesoresPeriodoLoading, setAsesoresPeriodoLoading] = useState(false);

  const [visitsList, setVisitsList] = useState<CrmVisit[]>([]);
  const [agendaVisits, setAgendaVisits] = useState<CrmVisitaPeriodo[]>([]);
  const [agendaTotal, setAgendaTotal] = useState(0);
  const [agendaPage, setAgendaPage] = useState(1);
  const [agendaLoading, setAgendaLoading] = useState(false);
  const [agendaError, setAgendaError] = useState<string | null>(null);
  const [agendaRefreshKey, setAgendaRefreshKey] = useState(0);


  const [buyersList, setBuyersList] = useState<CrmBuyer[]>([]);
  const [buyersTotal, setBuyersTotal] = useState(0);
  const [buyersPage, setBuyersPage] = useState(1);
  const [buyersQuery, setBuyersQuery] = useState('');
  const [buyersLoading, setBuyersLoading] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [periodoModo, setPeriodoModo] = useState<PeriodoCrmModo>('HOY');
  const [fechaReferencia, setFechaReferencia] = useState(obtenerFechaHoyLima);
  const [fechaDesde, setFechaDesde] = useState(obtenerFechaHoyLima);
  const [fechaHasta, setFechaHasta] = useState(obtenerFechaHoyLima);

  const rangoPeriodo = useMemo(
    () =>
      calcularRangoCrm(
        periodoModo,
        fechaReferencia,
        fechaDesde,
        fechaHasta
      ),
    [
      periodoModo,
      fechaReferencia,
      fechaDesde,
      fechaHasta
    ]
  );


  const rangoTabla = useMemo(() => {
    if (!fechaTablaDesde && !fechaTablaHasta) {
      return rangoPeriodo;
    }

    if (!fechaTablaDesde || !fechaTablaHasta) {
      return null;
    }

    return calcularRangoCrm(
      'RANGO',
      fechaReferencia,
      fechaTablaDesde,
      fechaTablaHasta
    );
  }, [
    fechaTablaDesde,
    fechaTablaHasta,
    fechaReferencia,
    rangoPeriodo
  ]);


  const rangoEvolucion = useMemo(() => {
    if (!rangoPeriodo) return null;

    const fechaBase =
      periodoModo === 'RANGO' ? fechaHasta : fechaReferencia;

    const anio = Number(fechaBase.slice(0, 4));
    const mes = Number(fechaBase.slice(5, 7));

    if (!anio || mes < 1 || mes > 12) return null;

    const inicio = new Date(Date.UTC(anio, mes - 6, 1));
    const fin = new Date(Date.UTC(anio, mes, 1));

    return {
      desde: `${inicio.toISOString().slice(0, 10)}T00:00:00-05:00`,
      hastaExclusivo:
        `${fin.toISOString().slice(0, 10)}T00:00:00-05:00`
    };
  }, [rangoPeriodo, periodoModo, fechaReferencia, fechaHasta]);

  const [evolucionItems, setEvolucionItems] = useState<CrmEvolucionMes[]>([]);
  const [evolucionLoading, setEvolucionLoading] = useState(false);
  const [evolucionError, setEvolucionError] = useState<string | null>(null);



  // Solicitud UUID estable para registrar leads
  const [solicitudId, setSolicitudId] = useState<string>(() => crypto.randomUUID());
  const [isNewLeadOpen, setIsNewLeadOpen] = useState(false);
  const [form, setForm] = useState<LeadFormData>(INITIAL_FORM);
  const [leadIntentoGuardar, setLeadIntentoGuardar] = useState(false);

  const [leadCamposVisitados, setLeadCamposVisitados] =
    useState<Partial<Record<LeadField, boolean>>>({});

  const leadErrores = validarNuevoLead(form);

  const mostrarError = (campo: LeadField) => {
    if (!leadIntentoGuardar && !leadCamposVisitados[campo]) {
      return undefined;
    }
    return leadErrores[campo];
  };

  const actualizarCampoTexto = (
    campo: 'names' | 'paternalSurname' | 'maternalSurname'
      | 'phone' | 'numeroDocumento',
    valor: string
  ) => {
    const limpio = sanitizarLead(
      campo,
      valor,
      form.tipoDocumento
    );

    setForm((prev) => ({
      ...prev,
      [campo]: limpio
    }));
  };

  const propiedadesError = (campo: LeadField) => {
    const error = mostrarError(campo);

    return {
      'aria-invalid': Boolean(error),
      'aria-describedby': error
        ? `lead-error-${campo}`
        : undefined,
      className: error
        ? 'border-red-500 focus:border-red-500'
        : undefined,
      onBlur: () => {
        setLeadCamposVisitados((prev) => ({
          ...prev,
          [campo]: true
        }));
      }
    };
  };

  const mensajeError = (campo: LeadField) => {
    const error = mostrarError(campo);
    if (!error) return null;

    return (
      <p
        id={`lead-error-${campo}`}
        role="alert"
        className="mt-1 text-[11px] font-medium text-red-600"
      >
        {error}
      </p>
    );
  };

  // Expediente / Detalle
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [leadDetail, setLeadDetail] = useState<CrmDetail | null>(null);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);
  const [followUpsList, setFollowUpsList] = useState<CrmFollowUpItem[]>([]);
  const [isLoadingFollowUps, setIsLoadingFollowUps] = useState(false);
  const [detailVisitsList, setDetailVisitsList] = useState<CrmVisit[]>([]);
  const [assignmentsList, setAssignmentsList] = useState<CrmAssignment[]>([]);

  // Modales de gestion
  const [assignLead, setAssignLead] = useState<CrmProspect | null>(null);
  const [selectedAdvisorId, setSelectedAdvisorId] = useState<number | null>(null);
  const [assignReason, setAssignReason] = useState('');

  const [stageLead, setStageLead] = useState<CrmProspect | null>(null);
  const [newStageCode, setNewStageCode] = useState('');
  const [stageObservation, setStageObservation] = useState('');

  const [editLead, setEditLead] = useState<CrmProspect | null>(null);
  const [editOrigen, setEditOrigen] = useState('');
  const [editProyecto, setEditProyecto] = useState<number | ''>('');
  const [editObservaciones, setEditObservaciones] = useState('');

  const [deactivateLead, setDeactivateLead] = useState<CrmProspect | null>(null);
  const [deactivateReason, setDeactivateReason] = useState('');

  const [followUpLead, setFollowUpLead] = useState<CrmProspect | null>(null);
  const [followUpForm, setFollowUpForm] = useState<CrmFollowUpCreate>({
    tipoCodigo: 'LLAMADA',
    asunto: 'Contacto comercial de seguimiento',
    detalle: '',
    resultado: '',
    requiereSeguimiento: false,
    fechaProximoSeguimiento: null
  });

  const [isNewVisitOpen, setIsNewVisitOpen] = useState(false);
  const [selectedVisitProspectId, setSelectedVisitProspectId] = useState<number | null>(null);
  const [, setIsLoadingVisits] = useState(false);
  const [, setVisitsError] = useState<string | null>(null);

  const [visitForm, setVisitForm] = useState({
    prospectId: 0,
    projectId: 0,
    advisorId: 0,
    visitDate: '',
    shift: '11:00' as '11:00' | '15:00',
    meetingPoint: 'Oficina de Ventas - Lurin',
    notes: ''
  });

  const [fuentesData, setFuentesData] = useState<CrmFuentesPeriodo | null>(null);
  const [isLoadingPortfolio, setIsLoadingPortfolio] = useState(false);

  const loadCatalogsAndAdvisors = useCallback(async () => {
    try {

      const [cats, advs, sum] = await Promise.all([
        crmBackend.catalogos(),
        crmBackend.asesores(),
        rangoPeriodo
          ? crmBackend.resumenPeriodo(
            rangoPeriodo.desde,
            rangoPeriodo.hastaExclusivo
          )
          : Promise.resolve(null)
      ]);

      setCatalogs(cats);
      setAdvisorsList(advs);
      setSummary(sum);
      if (advs.length > 0 && selectedAdvisorId === null) {
        setSelectedAdvisorId(advs[0].id_asesor);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al cargar catalogos CRM.';
      setErrorMsg(msg);
    }
  }, [selectedAdvisorId, rangoPeriodo]);


  const loadLeads = useCallback(async () => {
    setIsLoading(true);
    setErrorMsg(null);

    try {
      const rangoConsulta = tab === 'visitas'
        ? rangoPeriodo
        : rangoTabla;

      if (!rangoConsulta) {
        setLeadsList([]);
        setTotalLeads(0);
        setErrorMsg(
          'Complete Fecha desde y Fecha hasta con un rango válido.'
        );
        return;
      }

      const filtros = {
        consulta: query.trim() || undefined,
        etapa: stage === 'all' ? undefined : stage,
        origen: origin === 'all' ? undefined : origin,
        idAsesor: typeof advisorFilter === 'number'
          ? advisorFilter
          : undefined,
        sinAsignar: onlyUnassigned || undefined,
        pagina: page,
        tamano: pageSize
      };

      const res = tab === 'visitas'
        ? await crmBackend.buscar({
          ...filtros,
          categoria: 'TODOS'
        })
        : await crmBackend.buscarPeriodo({
          ...filtros,
          categoria: tab === 'potenciales'
            ? 'POTENCIAL'
            : 'LEAD',
          idProyecto: projectFilter === ''
            ? undefined
            : projectFilter,
          desde: rangoConsulta.desde,
          hastaExclusivo: rangoConsulta.hastaExclusivo
        });

      setLeadsList(res.items ?? []);
      setTotalLeads(res.total ?? 0);

    } catch (err: unknown) {
      const msg = err instanceof Error
        ? err.message
        : 'Error al consultar lista de prospectos.';

      setErrorMsg(msg);
      setLeadsList([]);
      setTotalLeads(0);

    } finally {
      setIsLoading(false);
    }
  }, [query, stage, origin, advisorFilter, onlyUnassigned, page, pageSize, tab, projectFilter, rangoPeriodo, rangoTabla]);


  const loadBuyers = useCallback(async () => {
    setBuyersLoading(true);

    try {
      if (!rangoPeriodo) {
        setBuyersList([]);
        setBuyersTotal(0);
        return;
      }

      const res = await crmBackend.compradoresPeriodo(
        buyersQuery.trim() || undefined,
        buyersPage,
        15,
        rangoPeriodo.desde,
        rangoPeriodo.hastaExclusivo
      );

      setBuyersList(res.items ?? []);
      setBuyersTotal(res.total ?? 0);

    } catch (err: unknown) {
      const msg = err instanceof Error
        ? err.message
        : 'Error al cargar compradores.';

      toast.error('Error en compradores', {
        description: msg
      });

      setBuyersList([]);
      setBuyersTotal(0);

    } finally {
      setBuyersLoading(false);
    }
  }, [buyersQuery, buyersPage, rangoPeriodo]
  );


  const loadVisits = useCallback(async (prospectId: number) => {
    setIsLoadingVisits(true);
    setVisitsError(null);
    try {
      const v = await crmBackend.visitas(prospectId);
      setVisitsList(v || []);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al consultar visitas del prospecto.';
      setVisitsError(msg);
      toast.error('Error al cargar visitas', { description: msg });
      setVisitsList([]);
    } finally {
      setIsLoadingVisits(false);
    }
  }, []);


  const loadPortfolioLeads = useCallback(async () => {
    setIsLoadingPortfolio(true);

    try {
      if (!rangoPeriodo) {
        setFuentesData(null);
        return;
      }

      const res = await crmBackend.fuentesPeriodo(
        rangoPeriodo.desde,
        rangoPeriodo.hastaExclusivo
      );

      setFuentesData(res);

    } catch (err: unknown) {
      const msg = err instanceof Error
        ? err.message
        : 'No se pudieron cargar las fuentes de captación.';

      toast.error('Error en fuentes de captación', {
        description: msg
      });

      setFuentesData(null);

    } finally {
      setIsLoadingPortfolio(false);
    }
  }, [rangoPeriodo]);


  useEffect(() => {
    void loadCatalogsAndAdvisors();
  }, [loadCatalogsAndAdvisors]);

  useEffect(() => {
    if (tab === 'leads' || tab === 'potenciales') {
      void loadLeads();
    } else if (tab === 'visitas') {
      if (leadsList.length === 0) {
        void loadLeads();
      }
    } else if (tab === 'compradores') {
      void loadBuyers();
    } else if (tab === 'fuentes') {
      void loadPortfolioLeads();
    }
  }, [tab, leadsList.length, loadLeads, loadBuyers, loadPortfolioLeads]);


  useEffect(() => {
    if (tab !== 'visitas') return;

    if (!rangoPeriodo) {
      setAgendaVisits([]);
      setAgendaTotal(0);
      setAgendaError('Seleccione un rango de fechas válido.');
      setAgendaLoading(false);
      return;
    }

    let activo = true;

    setAgendaLoading(true);
    setAgendaError(null);

    void crmBackend.visitasPeriodo(
      rangoPeriodo.desde,
      rangoPeriodo.hastaExclusivo,
      selectedVisitProspectId ?? undefined,
      agendaPage,
      15
    )
      .then((res) => {
        if (!activo) return;

        setAgendaVisits(res.items ?? []);
        setAgendaTotal(res.total ?? 0);
      })
      .catch((err: unknown) => {
        if (!activo) return;

        const msg = err instanceof Error
          ? err.message
          : 'No se pudo cargar la agenda de visitas.';

        setAgendaError(msg);
        setAgendaVisits([]);
        setAgendaTotal(0);
      })
      .finally(() => {
        if (activo) {
          setAgendaLoading(false);
        }
      });

    return () => {
      activo = false;
    };
  }, [tab, rangoPeriodo, selectedVisitProspectId, agendaPage, agendaRefreshKey]);



  useEffect(() => {
    if (!rangoEvolucion) {
      setEvolucionItems([]);
      setEvolucionLoading(false);
      return;
    }

    let activo = true;

    setEvolucionLoading(true);
    setEvolucionError(null);

    crmBackend.evolucionMensual(
      rangoEvolucion.desde,
      rangoEvolucion.hastaExclusivo
    )
      .then((resultado) => {
        if (activo) {
          setEvolucionItems(resultado.items ?? []);
        }
      })
      .catch((error: unknown) => {
        if (activo) {
          setEvolucionItems([]);
          setEvolucionError(
            error instanceof Error
              ? error.message
              : 'No se pudo cargar la evolución comercial.'
          );
        }
      })
      .finally(() => {
        if (activo) setEvolucionLoading(false);
      });

    return () => {
      activo = false;
    };
  }, [rangoEvolucion]);


  useEffect(() => {
    if (tab !== 'asesores') return;

    if (!rangoPeriodo) {
      setAsesoresPeriodoData(null);
      setAsesoresPeriodoLoading(false);
      return;
    }

    let activo = true;

    setAsesoresPeriodoLoading(true);

    void crmBackend.asesoresPeriodo(
      rangoPeriodo.desde,
      rangoPeriodo.hastaExclusivo
    )
      .then((res) => {
        if (activo) {
          setAsesoresPeriodoData(res);
        }
      })
      .catch((err: unknown) => {
        if (!activo) return;

        const msg = err instanceof Error
          ? err.message
          : 'No se pudieron consultar los asesores.';

        toast.error('Error en estadísticas de asesores', {
          description: msg
        });

        setAsesoresPeriodoData(null);
      })
      .finally(() => {
        if (activo) {
          setAsesoresPeriodoLoading(false);
        }
      });

    return () => {
      activo = false;
    };
  }, [tab, rangoPeriodo]);

  const handleOpenNewLead = () => {
    setSolicitudId(crypto.randomUUID());
    setLeadIntentoGuardar(false);
    setLeadCamposVisitados({});
    setForm({
      ...INITIAL_FORM,
      idProyecto: catalogs?.proyectos?.[0]?.id ?? ''
    });
    setIsNewLeadOpen(true);
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (isSubmitting) return;

    setLeadIntentoGuardar(true);
    const errores = validarNuevoLead(form);

    if (Object.keys(errores).length > 0) {
      toast.error('Formulario incompleto o incorrecto', {
        description: 'Revisa los campos resaltados en rojo.'
      });
      return;
    }

    setIsSubmitting(true);

    try {
      await crmBackend.crear({
        idSolicitud: solicitudId,
        nombres: form.names.trim(),
        apellidoPaterno: form.paternalSurname.trim(),
        apellidoMaterno: form.maternalSurname.trim() || undefined,
        correo: form.email.trim().toLowerCase(),
        telefono: form.phone.trim(),
        idProyecto: Number(form.idProyecto),
        origenCodigo: form.origenCodigo,
        motivoContacto: form.motivoContacto.trim(),
        mensaje: form.mensaje.trim() || undefined,
        idAsesor: form.idAsesor
          ? Number(form.idAsesor)
          : undefined,
        tipoDocumento: form.tipoDocumento,
        numeroDocumento: form.numeroDocumento.trim(),
        direccion: form.direccion.trim() || undefined
      });

      toast.success('Lead registrado correctamente', {
        description: `${form.names.trim()} ${form.paternalSurname.trim()} ingresó exitosamente al CRM.`
      });

      setIsNewLeadOpen(false);

      setForm(INITIAL_FORM);
      setLeadIntentoGuardar(false);
      setLeadCamposVisitados({});
      setSolicitudId(crypto.randomUUID());

      await Promise.all([
        loadLeads(),
        loadCatalogsAndAdvisors()
      ]);

    } catch (err: unknown) {
      const msg = err instanceof Error
        ? err.message
        : 'Error desconocido al registrar prospecto.';

      toast.error('Error al registrar lead', {
        description: msg
      });

      setLeadIntentoGuardar(true);

    } finally {
      setIsSubmitting(false);
    }
  };


  const handleOpenDetail = async (id: number) => {
    setDetailModalOpen(true);
    setIsLoadingDetail(true);
    setIsLoadingFollowUps(true);
    setLeadDetail(null);
    setFollowUpsList([]);
    setDetailVisitsList([]);
    setAssignmentsList([]);
    try {
      const [det, follows, visits, assignments] = await Promise.all([
        crmBackend.detalle(id),
        crmBackend.listarSeguimientos(id, 100).catch(() => []),
        crmBackend.visitas(id).catch(() => []),
        crmBackend.listarAsignaciones(id).catch(() => [])
      ]);
      setLeadDetail(det);
      setFollowUpsList(follows || []);
      setDetailVisitsList(visits || []);
      setAssignmentsList(assignments || []);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'No se pudo obtener el expediente.';
      toast.error('Error al consultar expediente', { description: msg });
      setDetailModalOpen(false);
    } finally {
      setIsLoadingDetail(false);
      setIsLoadingFollowUps(false);
    }
  };

  const handleAssignSubmit = async () => {
    if (!assignLead || !selectedAdvisorId) return;
    setIsSubmitting(true);
    try {
      await crmBackend.asesor(assignLead.id_prospecto, selectedAdvisorId, assignReason.trim() || undefined);
      toast.success('Asesor asignado', {
        description: `${assignLead.nombre_completo} fue asignado al asesor seleccionado.`
      });
      setAssignLead(null);
      setAssignReason('');
      await Promise.all([loadLeads(), loadCatalogsAndAdvisors()]);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Fallo en la asignacion de asesor.';
      toast.error('Error al asignar', { description: msg });
    } finally {
      setIsSubmitting(false);
    }
  };


  const handleVerifySale = async (lead: CrmProspect) => {
    try {
      const resultado = await crmBackend.verificarCompra(
        lead.id_prospecto
      );

      if (!resultado.esComprador) {
        toast.info('Compra pendiente de formalización', {
          description: resultado.mensaje
        });
        return;
      }

      await Promise.all([
        loadLeads(),
        loadCatalogsAndAdvisors(),
        loadBuyers()
      ]);

      setCategory('COMPRADOR');
      setPage(1);

      toast.success('Comprador verificado', {
        description:
          `${lead.nombre_completo} tiene una compra formalizada. ` +
          `Venta: ${resultado.compra?.codigoVenta ?? 'Registrada'}. ` +
          `Contrato: ${resultado.compra?.codigoContrato ?? 'Válido'}.`
      });

    } catch (err: unknown) {
      toast.error('No se pudo verificar la compra', {
        description:
          err instanceof Error
            ? err.message
            : 'Error al consultar al servidor.'
      });
    }
  };

  const handleStageSubmit = async () => {
    if (!stageLead || !newStageCode) return;
    if (newStageCode === stageLead.estado_codigo) {
      toast.error('Etapa sin cambios', {
        description: `El prospecto ya se encuentra en la etapa ${stageLead.estado_codigo}. Seleccione una etapa diferente.`
      });
      return;
    }
    const estadoActual = catalogs?.estados.find((e) => e.codigo === stageLead.estado_codigo);
    if (estadoActual?.final || stageLead.categoria === 'COMPRADOR' || stageLead.categoria === 'CERRADO') {
      toast.error('Etapa definitiva', {
        description: `No se puede modificar la etapa de un prospecto en estado ${stageLead.estado_codigo} segun las reglas.`
      });
      return;
    }
    setIsSubmitting(true);
    try {
      await crmBackend.etapa(stageLead.id_prospecto, newStageCode, stageObservation.trim() || undefined);
      toast.success('Etapa actualizada', {
        description: `Prospecto ${stageLead.codigo} cambiado a la etapa ${newStageCode}.`
      });
      const prospectId = stageLead.id_prospecto;
      setStageLead(null);
      setStageObservation('');
      if (leadDetail && leadDetail.prospecto.id_prospecto === prospectId) {
        const det = await crmBackend.detalle(prospectId);
        setLeadDetail(det);
      }
      await Promise.all([loadLeads(), loadCatalogsAndAdvisors()]);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Transicion de etapa no permitida.';
      toast.error('Error al cambiar etapa', { description: msg });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditSubmit = async () => {
    if (!editLead) return;
    if (!editOrigen && !editProyecto && !editObservaciones) {
      toast.error('Campos requeridos', { description: 'Modifique al menos un campo comercial.' });
      return;
    }
    setIsSubmitting(true);
    try {
      await crmBackend.actualizar(editLead.id_prospecto, {
        origenCodigo: editOrigen || undefined,
        idProyectoInteres: editProyecto ? Number(editProyecto) : undefined,
        observaciones: editObservaciones.trim() || undefined
      });
      toast.success('Expediente actualizado', {
        description: `Informacion comercial de ${editLead.nombre_completo} guardada con exito.`
      });
      setEditLead(null);
      await Promise.all([loadLeads(), loadCatalogsAndAdvisors()]);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'No se pudo actualizar el expediente comercial.';
      toast.error('Error al actualizar', { description: msg });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeactivateSubmit = async () => {
    if (!deactivateLead) return;
    const motivoLimpio = deactivateReason.trim();
    if (motivoLimpio.length < 10 || motivoLimpio.length > 500) {
      toast.error('Motivo invalido', {
        description: 'El motivo de baja debe tener entre 10 y 500 caracteres obligatoriamente.'
      });
      return;
    }
    setIsSubmitting(true);
    try {
      await crmBackend.desactivar(deactivateLead.id_prospecto, motivoLimpio);
      toast.success('Prospecto desactivado', {
        description: `${deactivateLead.nombre_completo} fue dado de baja logicamente del CRM.`
      });
      setDeactivateLead(null);
      setDeactivateReason('');
      await Promise.all([loadLeads(), loadCatalogsAndAdvisors()]);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'No se pudo desactivar el prospecto.';
      toast.error('Error al desactivar', { description: msg });
    } finally {
      setIsSubmitting(false);
    }
  };

  const refreshFollowUpsAndLeads = async (prospectoId: number) => {
    if (leadDetail && leadDetail.prospecto.id_prospecto === prospectoId) {
      const [det, follows] = await Promise.all([
        crmBackend.detalle(prospectoId),
        crmBackend.listarSeguimientos(prospectoId, 100).catch(() => [])
      ]);
      setLeadDetail(det);
      setFollowUpsList(follows || []);
    }
    await Promise.all([loadLeads(), loadCatalogsAndAdvisors()]);
  };

  const handleFollowUpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!followUpLead) return;
    const val = validateFollowUpForm(followUpForm);
    if (!val.valid) {
      toast.error('Validacion de seguimiento', { description: val.error });
      return;
    }
    setIsSubmitting(true);
    try {
      await crmBackend.registrarSeguimiento(followUpLead.id_prospecto, {
        tipoCodigo: followUpForm.tipoCodigo.trim().toUpperCase(),
        asunto: followUpForm.asunto.trim(),
        detalle: followUpForm.detalle.trim(),
        resultado: followUpForm.resultado?.trim() || undefined,
        requiereSeguimiento: followUpForm.requiereSeguimiento,
        fechaProximoSeguimiento: val.fechaIso
      });
      toast.success('Seguimiento registrado', {
        description: `Bitacora de contacto guardada para ${followUpLead.nombre_completo}.`
      });
      const pid = followUpLead.id_prospecto;
      setFollowUpLead(null);
      await refreshFollowUpsAndLeads(pid);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al registrar seguimiento.';
      toast.error('Error en seguimiento', { description: msg });
    } finally {
      setIsSubmitting(false);
    }
  };

  const refreshVisitDetails = async (targetId: number) => {
    await loadVisits(targetId);
    if (leadDetail && leadDetail.prospecto.id_prospecto === targetId) {
      const [det, v, follows] = await Promise.all([
        crmBackend.detalle(targetId),
        crmBackend.visitas(targetId),
        crmBackend.listarSeguimientos(targetId, 100).catch(() => [])
      ]);
      setLeadDetail(det);
      setDetailVisitsList(v || []);
      setFollowUpsList(follows || []);
    }
    await Promise.all([loadLeads(), loadCatalogsAndAdvisors()]);
  };

  const handleScheduleVisitSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const val = validateVisitForm(visitForm);
    if (!val.valid || !val.fechaIso) {
      toast.error('Validacion de visita', { description: val.error });
      return;
    }
    setIsSubmitting(true);
    try {
      await crmBackend.agendarVisita(visitForm.prospectId, {
        idProyecto: visitForm.projectId,
        fechaVisita: val.fechaIso,
        turno: visitForm.shift,
        puntoEncuentro: visitForm.meetingPoint.trim() || undefined,
        observaciones: visitForm.notes.trim() || undefined
      });
      toast.success('Visita agendada', {
        description: 'Visita guiada oficial al terreno agendada con exito en el backend.'
      });
      setIsNewVisitOpen(false);
      setAgendaPage(1);
      setAgendaRefreshKey((prev) => prev + 1);
      const targetId = visitForm.prospectId;
      setSelectedVisitProspectId(targetId);
      await refreshVisitDetails(targetId);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al agendar visita.';
      toast.error('Error al agendar visita', { description: msg });
    } finally {
      setIsSubmitting(false);
    }
  };

  const updateVisitStatusHelper = async (
    visitaId: number,
    estadoCodigo: 'CONFIRMADA' | 'REALIZADA' | 'CANCELADA',
    successMsg: string,
    observaciones?: string
  ) => {
    try {
      await crmBackend.actualizarEstadoVisita(visitaId, { estadoCodigo, observaciones });
      toast.success(successMsg, { description: `Estado actualizado a ${estadoCodigo}.` });

      setAgendaRefreshKey((prev) => prev + 1);

      if (selectedVisitProspectId) {
        await refreshVisitDetails(selectedVisitProspectId);
      } else {
        await Promise.all([loadLeads(), loadCatalogsAndAdvisors()]);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al actualizar estado de visita.';
      toast.error('Error al actualizar visita', { description: msg });
    }
  };

  const handleConfirmVisit = (visitaId: number) =>
    updateVisitStatusHelper(visitaId, 'CONFIRMADA', 'Visita confirmada');

  const handleCancelVisit = (visitaId: number) =>
    updateVisitStatusHelper(visitaId, 'CANCELADA', 'Visita cancelada', 'Cancelada por coordinacion comercial');

  const handleCompleteVisit = (visitaId: number) =>
    updateVisitStatusHelper(visitaId, 'REALIZADA', 'Visita realizada');

  const handleExportCsv = async () => {
    try {
      const csvData = await crmBackend.exportarCsv(
        query.trim() || undefined,
        stage === 'all' ? undefined : stage,
        category,
        5000
      );
      const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'prospectos-crm.csv';
      link.click();
      URL.revokeObjectURL(url);
      toast.success('Exportacion completada', {
        description: 'Se ha descargado el archivo CSV con los datos reales del CRM.'
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Fallo en la exportacion.';
      toast.error('Error al exportar', { description: msg });
    }
  };

  return (
    <div>
      <PageHeader
        title="CRM y clientes"
        description="Gestion integral de leads, prospectos y compradores con integracion al Core Service."
        actions={
          <>
            <Gate permission="crm.export">
              <Button icon={DownloadIcon} onClick={handleExportCsv}>
                Exportar
              </Button>
            </Gate>
            <Gate permission="crm.create">
              <Button icon={PlusIcon} variant="primary" onClick={handleOpenNewLead}>
                Nuevo lead
              </Button>
            </Gate>
          </>
        }
      />

      <CrmPeriodoGlobal
        modo={periodoModo}
        onModoChange={(modo) => {
          setPeriodoModo(modo);
          setPage(1);
          setBuyersPage(1);
        }}
        fechaReferencia={fechaReferencia}
        onFechaReferenciaChange={(fecha) => {
          setFechaReferencia(fecha);
          setPage(1);
          setBuyersPage(1);
        }}
        fechaDesde={fechaDesde}
        onFechaDesdeChange={(fecha) => {
          setFechaDesde(fecha);
          setPage(1);
          setBuyersPage(1);
        }}
        fechaHasta={fechaHasta}
        onFechaHastaChange={(fecha) => {
          setFechaHasta(fecha);
          setPage(1);
          setBuyersPage(1);
        }}
      />

      {/* Indicadores del período comercial */}
      <section className="mb-5">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-sm font-semibold text-brand-900">
              Resumen comercial
            </h2>
            <p className="mt-1 text-xs text-brand-400">
              Indicadores correspondientes al período seleccionado.
            </p>
          </div>

          <span className="rounded-full border border-brand-100 bg-brand-50 px-3 py-1 text-xs font-medium text-brand-700">
            {periodoModo === 'HOY'
              ? 'Día'
              : periodoModo === 'SEMANA'
                ? 'Semana'
                : periodoModo === 'MES'
                  ? 'Mes'
                  : periodoModo === 'ANIO'
                    ? 'Año'
                    : 'Rango'}
            {' · '}
            {periodoModo === 'RANGO'
              ? `${fechaDesde} — ${fechaHasta}`
              : fechaReferencia}
          </span>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
          {KPI_CRM.map((item) => {
            const Icon = item.icon;
            const valor = summary?.[item.key];

            return (
              <div
                key={item.key}
                className="rounded-xl border border-brand-100 bg-white p-4 shadow-sm transition-shadow hover:shadow-md"
              >
                <div className="mb-4 flex items-start justify-between gap-2">
                  <span className="text-xs font-semibold text-brand-700">
                    {item.label}
                  </span>

                  <div className={`rounded-lg p-2 ${item.color}`}>
                    <Icon className="h-5 w-5" />
                  </div>
                </div>

                <p className="text-3xl font-bold tabular-nums text-brand-950">
                  {typeof valor === 'number' ? valor : '—'}
                </p>

                <p className="mt-2 text-xs text-brand-400">
                  {item.description}
                </p>
              </div>
            );
          })}
        </div>
      </section>


      {/* Gráfico de evolución comercial */}
      {evolucionError && (
        <p
          role="alert"
          className="mb-3 rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700"
        >
          {evolucionError}
        </p>
      )}

      <CrmEvolucionChart
        items={evolucionItems}
        loading={evolucionLoading}
      />


      <Tabs
        className="mb-5"
        active={tab}
        onChange={(newTab) => {
          setTab(newTab);

          if (newTab === 'leads') {
            setCategory('LEAD');
          } else if (newTab === 'potenciales') {
            setCategory('POTENCIAL');
          }

          setPage(1);
        }}
        items={[
          {
            id: 'leads',
            label: 'Leads',
            count: summary?.leads
          },
          {
            id: 'potenciales',
            label: 'Clientes potenciales',
            count: summary?.potenciales
          },
          {
            id: 'compradores',
            label: 'Clientes compradores',
            count: summary?.compradores
          },
          {
            id: 'fuentes',
            label: 'Fuentes de captación'
          },
          {
            id: 'asesores',
            label: 'Equipo de asesores',
            count: advisorsList.length
          },
          {
            id: 'visitas',
            label: 'Agenda de visitas',
            count: visitsList.length
          }
        ]}
      />

      {/* PESTANA 1: Leads y potenciales */}
      {(tab === 'leads' || tab === 'potenciales') && (
        <Card>

          {/* FILTROS COMERCIALES */}
          <div className="border-b border-brand-100 p-4">
            <div className="flex flex-col gap-4">

              {/* FILA 1: Buscador y filtros desplegables */}
              <div className="flex flex-wrap items-end gap-3">

                {/* BUSCADOR ORIGINAL - SIN MODIFICACIONES */}
                <SearchInput
                  placeholder="Buscar por nombre, correo, telefono o codigo..."
                  value={query}
                  onValueChange={(val) => {
                    setQuery(val);
                    setPage(1);
                  }}
                  className="w-full md:w-80"
                />

                {/* Etapa */}
                <div className="w-full sm:w-36">
                  <label className="mb-1.5 block text-xs font-medium text-brand-600">
                    Etapa
                  </label>
                  <Select
                    aria-label="Filtrar por etapa"
                    value={stage}
                    onChange={(e) => {
                      setStage(e.target.value);
                      setPage(1);
                    }}
                    className="w-full"
                  >
                    <option value="all">Todas</option>
                    {(catalogs?.estados ?? []).map((est) => (
                      <option key={est.codigo} value={est.codigo}>
                        {est.nombre}
                      </option>
                    ))}
                  </Select>
                </div>

                {/* Origen */}
                <div className="w-full sm:w-48">
                  <label className="mb-1.5 block text-xs font-medium text-brand-600">
                    Origen
                  </label>
                  <Select
                    aria-label="Filtrar por origen"
                    value={origin}
                    onChange={(e) => {
                      setOrigin(e.target.value);
                      setPage(1);
                    }}
                    className="w-full"
                  >
                    <option value="all">Todos los orígenes</option>
                    {(catalogs?.origenes ?? []).map((origen) => (
                      <option key={origen.codigo} value={origen.codigo}>
                        {origen.nombre}
                      </option>
                    ))}
                  </Select>
                </div>

                {/* Asesor */}
                <div className="w-full sm:w-52">
                  <label className="mb-1.5 block text-xs font-medium text-brand-600">
                    Asesor
                  </label>
                  <Select
                    aria-label="Filtrar por asesor"
                    value={onlyUnassigned ? 'sin_asignar' : String(advisorFilter)}
                    onChange={(e) => {
                      const value = e.target.value;

                      if (value === 'sin_asignar') {
                        setOnlyUnassigned(true);
                        setAdvisorFilter('');
                      } else {
                        setOnlyUnassigned(false);
                        setAdvisorFilter(value ? Number(value) : '');
                      }

                      setPage(1);
                    }}
                    className="w-full"
                  >
                    <option value="">Todos los asesores</option>
                    <option value="sin_asignar">Sin asesor asignado</option>
                    {advisorsList.map((adv) => (
                      <option key={adv.id_asesor} value={adv.id_asesor}>
                        {adv.nombre_completo}
                      </option>
                    ))}
                  </Select>
                </div>

                {/* Proyecto */}
                <div className="w-full sm:w-52">
                  <label className="mb-1.5 block text-xs font-medium text-brand-600">
                    Proyecto
                  </label>
                  <Select
                    aria-label="Filtrar por proyecto"
                    value={projectFilter}
                    onChange={(e) => {
                      setProjectFilter(
                        e.target.value ? Number(e.target.value) : ''
                      );
                      setPage(1);
                    }}
                    className="w-full"
                  >
                    <option value="">Todos los proyectos</option>
                    {(catalogs?.proyectos ?? []).map((proyecto) => (
                      <option key={proyecto.id} value={proyecto.id}>
                        {proyecto.nombre}
                      </option>
                    ))}
                  </Select>
                </div>
              </div>

              {/* FILA 2: Fechas y limpieza de filtros */}
              <div className="flex flex-wrap items-end gap-3">

                {/* Fecha desde */}
                <div className="w-full sm:w-48">
                  <label className="mb-1.5 block text-xs font-medium text-brand-600">
                    Fecha desde
                  </label>
                  <Input
                    type="date"
                    value={fechaTablaDesde}
                    max={fechaTablaHasta || undefined}
                    onChange={(e) => {
                      setFechaTablaDesde(e.target.value);
                      setPage(1);
                    }}
                    className="w-full"
                  />
                </div>

                {/* Fecha hasta */}
                <div className="w-full sm:w-48">
                  <label className="mb-1.5 block text-xs font-medium text-brand-600">
                    Fecha hasta
                  </label>
                  <Input
                    type="date"
                    value={fechaTablaHasta}
                    min={fechaTablaDesde || undefined}
                    onChange={(e) => {
                      setFechaTablaHasta(e.target.value);
                      setPage(1);
                    }}
                    className="w-full"
                  />
                </div>

                {/* Limpiar filtros */}
                <Button
                  size="sm"
                  icon={RefreshCw}
                  onClick={() => {
                    setQuery('');
                    setStage('all');
                    setOrigin('all');
                    setAdvisorFilter('');
                    setOnlyUnassigned(false);
                    setProjectFilter('');
                    setFechaTablaDesde('');
                    setFechaTablaHasta('');
                    setPage(1);
                  }}
                >
                  Limpiar filtros
                </Button>
                
                <div className="mt-3 flex justify-end">
                  <CrmCategoriaLegend />
                </div>

              </div>
            </div>
          </div>


          {errorMsg && (
            <div className="p-4">
              <Alert
                tone="danger"
                title="Error de comunicacion con el Core Service"
                actions={
                  <Button size="sm" onClick={() => void Promise.all([loadLeads(), loadCatalogsAndAdvisors()])}>
                    Reintentar
                  </Button>
                }
              >
                {errorMsg}
              </Alert>
            </div>
          )}

          {isLoading ? (
            <div className="flex items-center justify-center p-12 text-brand-500">
              <RefreshCw className="h-6 w-6 animate-spin mr-2" />
              <span>Cargando prospectos del servidor...</span>
            </div>
          ) : leadsList.length === 0 ? (
            <EmptyState
              title="No se encontraron prospectos"
              description="Intente modificar el termino de busqueda o la etapa comercial seleccionada."
            />
          ) : (
            <>
              <Table

                head={
                  <>
                    <TH>Fecha de registro</TH>
                    <TH>{tab === 'leads' ? 'Lead' : 'Cliente potencial'}</TH>
                    <TH>Contacto</TH>
                    <TH>Interés / Proyecto</TH>
                    <TH>Origen</TH>
                    <TH>Asesor</TH>
                    <TH>Estado</TH>
                    <TH>Último contacto</TH>
                    <TH align="right">Acciones</TH>
                  </>
                }
              >
                {leadsList.map((lead) => {
                  const stageTone =
                    STAGE_TONES[lead.estado_codigo] ||
                    STAGE_TONES[lead.estado_nombre] ||
                    'bg-slate-100 text-slate-700 border-slate-200';

                  const isLeadFinal = Boolean(
                    catalogs?.estados.find(e => e.codigo === lead.estado_codigo)?.final ||
                    lead.categoria === 'COMPRADOR' || lead.categoria === 'CERRADO'
                  );

                  const acciones: CrmMenuAction[] = [
                    ...(lead.categoria === 'POTENCIAL' ? [{
                      label: 'Verificar compra', icon: CheckCircleIcon, permission: 'crm.view' as const,
                      onClick: () => void handleVerifySale(lead)
                    }] : []),
                    {
                      label: 'Cambiar etapa', icon: RefreshCw, permission: 'crm.edit',
                      disabled: isLeadFinal,
                      onClick: () => { setStageLead(lead); setNewStageCode(lead.estado_codigo); }
                    },
                    {
                      label: 'Editar ficha comercial', icon: PencilIcon, permission: 'crm.edit',
                      onClick: () => {
                        setEditLead(lead);
                        setEditOrigen(lead.origen_codigo);
                        setEditObservaciones(lead.observaciones || '');
                      }
                    },
                    {
                      label: 'Registrar seguimiento', icon: PhoneIcon, permission: 'crm.edit',
                      onClick: () => {
                        setFollowUpLead(lead);
                        setFollowUpForm({
                          tipoCodigo: 'LLAMADA',
                          asunto: `Contacto de seguimiento con ${lead.nombre_completo}`,
                          detalle: '', resultado: '', requiereSeguimiento: false,
                          fechaProximoSeguimiento: null
                        });
                      }
                    },
                    {
                      label: 'Asignar asesor', icon: UserPlusIcon, permission: 'crm.edit',
                      onClick: () => {
                        setAssignLead(lead);
                        if (advisorsList.length > 0) setSelectedAdvisorId(advisorsList[0].id_asesor);
                      }
                    },
                    {
                      label: 'Agendar visita', icon: CalendarIcon, permission: 'crm.edit',
                      onClick: () => {
                        setVisitForm({
                          prospectId: lead.id_prospecto,
                          projectId: catalogs?.proyectos?.[0]?.id || 1,
                          advisorId: lead.id_asesor || advisorsList[0]?.id_asesor || 0,
                          visitDate: '', shift: '11:00',
                          meetingPoint: 'Oficina de Ventas - Lurin', notes: ''
                        });
                        setIsNewVisitOpen(true);
                      }
                    },
                    {
                      label: 'Desactivar prospecto', icon: XCircleIcon, permission: 'crm.delete',
                      danger: true,
                      onClick: () => { setDeactivateLead(lead); setDeactivateReason(''); }
                    }
                  ];
                  return (
                    <TR key={lead.id_prospecto}>

                      <TD className="whitespace-nowrap text-xs text-brand-500">
                        {formatDateLima(lead.fecha_registro)}
                      </TD>
                      <TD>
                        <p className="font-semibold text-brand-900">{lead.nombre_completo}</p>
                        <p className="font-mono text-[11px] text-brand-400">{lead.codigo}</p>
                      </TD>
                      <TD>
                        <p className="whitespace-nowrap text-brand-700">{lead.telefono}</p>
                        <p className="text-xs text-brand-400">{lead.email}</p>
                      </TD>
                      <TD className="min-w-44 text-brand-700">{lead.interes || 'Sin proyecto asignado'}</TD>
                      <TD><Badge tone="neutral">{lead.origen_nombre || lead.origen_codigo}</Badge></TD>
                      <TD className="text-brand-600">
                        {lead.asesor_nombre || <span className="italic text-brand-400">Sin asignar</span>}
                      </TD>
                      <TD>
                        <span className={cn('inline-flex rounded-full border px-2 py-0.5 text-[11px] font-medium whitespace-nowrap', stageTone)}>
                          {lead.estado_nombre || lead.estado_codigo}
                        </span>
                      </TD>
                      <TD className="whitespace-nowrap text-xs text-brand-500">
                        {formatDateTimeLima(lead.ultimo_contacto)}
                      </TD>


                      <TD align="right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            size="sm"
                            icon={EyeIcon}
                            title="Ver expediente"
                            onClick={() => handleOpenDetail(lead.id_prospecto)}
                          >
                            Expediente
                          </Button>
                          <CrmActionsMenu
                            label={`Acciones de ${lead.nombre_completo}`}
                            actions={acciones}
                          />
                        </div>
                      </TD>
                    </TR>
                  );
                })}
              </Table>
              <Pagination
                page={page}
                pageSize={pageSize}
                total={totalLeads}
                onPageChange={(p) => setPage(p)}
              />
            </>
          )}
        </Card>
      )}


      {/* PESTAÑA: Agenda de visitas */}
      {tab === 'visitas' && (
        <Card>
          <div className="flex flex-col gap-3 border-b border-brand-100 p-4 md:flex-row md:items-center md:justify-between">
            <CardHeader
              title="Agenda de visitas guiadas"
              description="Visitas comerciales programadas durante el período seleccionado."
            />

            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-medium text-brand-600">
                Prospecto:
              </span>

              <ProspectSearchAutocomplete
                value={selectedVisitProspectId}
                initialLeads={leadsList}
                onSelect={(p) => {
                  setSelectedVisitProspectId(p.id_prospecto);
                  setAgendaPage(1);
                }}
                className="w-72"
              />

              {selectedVisitProspectId !== null && (
                <Button
                  size="sm"
                  onClick={() => {
                    setSelectedVisitProspectId(null);
                    setAgendaPage(1);
                  }}
                >
                  Ver todos
                </Button>
              )}

              <Button
                icon={CalendarIcon}
                variant="primary"
                onClick={() => {
                  if (!selectedVisitProspectId) {
                    toast.error('Seleccione un prospecto', {
                      description:
                        'Seleccione primero el prospecto para agendar una visita.'
                    });
                    return;
                  }

                  setVisitForm({
                    prospectId: selectedVisitProspectId,
                    projectId: catalogs?.proyectos?.[0]?.id || 1,
                    advisorId: advisorsList[0]?.id_asesor || 0,
                    visitDate: '',
                    shift: '11:00',
                    meetingPoint: 'Oficina de Ventas - Lurin',
                    notes: ''
                  });

                  setIsNewVisitOpen(true);
                }}
              >
                Agendar visita
              </Button>
            </div>
          </div>

          {agendaError ? (
            <div className="flex items-center justify-between gap-3 border-b border-rose-200 bg-rose-50 p-4">
              <div className="flex items-center gap-2 text-xs text-rose-700">
                <XCircleIcon className="h-4 w-4 shrink-0" />
                <span>{agendaError}</span>
              </div>

              <Button
                size="sm"
                onClick={() => {
                  setAgendaRefreshKey((prev) => prev + 1);
                }}
              >
                Reintentar
              </Button>
            </div>
          ) : agendaLoading ? (
            <div className="flex items-center justify-center p-12 text-brand-500">
              <RefreshCw className="mr-2 h-6 w-6 animate-spin" />
              <span>Consultando agenda de visitas...</span>
            </div>
          ) : agendaVisits.length === 0 ? (
            <EmptyState
              title="No se encontraron visitas"
              description={
                selectedVisitProspectId
                  ? 'El prospecto seleccionado no tiene visitas dentro del período indicado.'
                  : 'No existen visitas programadas dentro del período seleccionado.'
              }
            />
          ) : (
            <>
              <Table
                head={
                  <>
                    <TH>Prospecto / Proyecto</TH>
                    <TH>Fecha y turno</TH>
                    <TH>Asesor comercial</TH>
                    <TH>Punto de encuentro</TH>
                    <TH align="center">Estado</TH>
                    <TH align="right">Acciones</TH>
                  </>
                }
              >
                {agendaVisits.map((vis) => (
                  <TR key={vis.id_visita}>
                    <TD>
                      <div>
                        <p className="font-medium text-brand-900">
                          {vis.prospecto_nombre}
                        </p>

                        <p className="font-mono text-[11px] text-brand-500">
                          {vis.prospecto_codigo}
                        </p>

                        <p className="text-[12px] text-brand-400">
                          {vis.proyecto_nombre}
                        </p>
                      </div>
                    </TD>

                    <TD>
                      <p className="font-semibold text-brand-800">
                        {formatDateLima(vis.fecha_visita)}
                      </p>

                      <p className="text-[12px] text-brand-500">
                        Turno {vis.turno}
                      </p>
                    </TD>

                    <TD className="text-brand-700">
                      {vis.asesor_nombre}
                    </TD>

                    <TD className="text-[12px] text-brand-500">
                      {vis.punto_encuentro}
                    </TD>

                    <TD align="center">
                      <StatusBadge
                        status={
                          vis.estado === 'REALIZADA'
                            ? 'Realizada'
                            : vis.estado === 'CONFIRMADA'
                              ? 'Aprobado'
                              : vis.estado === 'CANCELADA'
                                ? 'Rechazado'
                                : 'Pendiente'
                        }
                        className={
                          vis.estado === 'REALIZADA'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : undefined
                        }
                      />
                    </TD>

                    <TD align="right">
                      <div className="flex justify-end gap-1.5">
                        {vis.estado === 'PROGRAMADA' && (
                          <Button
                            size="sm"
                            icon={CheckCircleIcon}
                            onClick={() => handleConfirmVisit(vis.id_visita)}
                          >
                            Confirmar
                          </Button>
                        )}

                        {vis.estado === 'CONFIRMADA' && (
                          <Button
                            size="sm"
                            icon={CheckCircleIcon}
                            onClick={() => handleCompleteVisit(vis.id_visita)}
                          >
                            Realizada
                          </Button>
                        )}

                        {vis.estado !== 'CANCELADA' &&
                          vis.estado !== 'REALIZADA' && (
                            <Button
                              size="sm"
                              icon={XCircleIcon}
                              onClick={() =>
                                handleCancelVisit(vis.id_visita)
                              }
                            >
                              Cancelar
                            </Button>
                          )}
                      </div>
                    </TD>
                  </TR>
                ))}
              </Table>

              <Pagination
                page={agendaPage}
                pageSize={15}
                total={agendaTotal}
                onPageChange={(p) => setAgendaPage(p)}
              />
            </>
          )}
        </Card>
      )}

      {/* PESTAÑA 3: Equipo de asesores */}
      {tab === 'asesores' && (
        <Card>
          <CardHeader
            title="Equipo comercial de asesores"
            description="Distribución del equipo comercial, cartera actual y asignaciones realizadas durante el período seleccionado."
          />

          {asesoresPeriodoLoading ? (
            <div className="flex items-center justify-center p-12 text-brand-500">
              <RefreshCw className="mr-2 h-6 w-6 animate-spin" />
              <span>Consultando estadísticas de asesores...</span>
            </div>
          ) : (
            <Table
              head={
                <>
                  <TH>Código</TH>
                  <TH>Asesor comercial</TH>
                  <TH>Correo corporativo</TH>
                  <TH>Teléfono directo</TH>
                  <TH align="center">Estado</TH>
                  <TH align="right">Cartera actual</TH>
                  <TH align="right">Asignaciones del período</TH>
                </>
              }
            >
              {(asesoresPeriodoData?.items ?? []).map((adv) => (
                <TR key={adv.id_asesor}>
                  <TD className="font-mono text-[12px] font-semibold text-brand-600">
                    {adv.codigo}
                  </TD>

                  <TD className="font-medium text-brand-900">
                    {adv.nombre_completo}
                  </TD>

                  <TD className="text-brand-600">
                    {adv.email}
                  </TD>

                  <TD className="tabular text-brand-500">
                    {adv.telefono}
                  </TD>

                  <TD align="center">
                    <Badge tone={adv.activo ? 'brand' : 'neutral'}>
                      {adv.activo ? 'Activo' : 'Inactivo'}
                    </Badge>
                  </TD>

                  <TD align="right" className="font-semibold text-brand-900">
                    {adv.leads_activos} prospectos
                  </TD>

                  <TD align="right" className="font-semibold text-brand-900">
                    {adv.asignaciones_periodo}
                  </TD>
                </TR>
              ))}
            </Table>
          )}
        </Card>
      )}


      {/* PESTANA 4: Compradores */}
      {tab === 'compradores' && (
        <Card>
          <div className="flex flex-col gap-3 border-b border-brand-100 p-4 md:flex-row md:items-center md:justify-between">
            <CardHeader
              title="Compradores en cartera"
              description="Clientes con contrato o separacion formal registrada."
            />
            <SearchInput
              placeholder="Buscar comprador o contrato..."
              value={buyersQuery}
              onValueChange={(val) => {
                setBuyersQuery(val);
                setBuyersPage(1);
              }}
              className="w-full md:w-72"
            />
          </div>

          {buyersLoading ? (
            <div className="flex items-center justify-center p-12 text-brand-500">
              <RefreshCw className="h-6 w-6 animate-spin mr-2" />
              <span>Cargando compradores...</span>
            </div>
          ) : buyersList.length === 0 ? (
            <EmptyState
              title="No hay compradores encontrados"
              description="Ajuste el termino de busqueda o verifique los contratos formalizados en el modulo de Ventas."
            />
          ) : (
            <>
              <Table
                head={
                  <>
                    <TH>Codigo Cliente</TH>
                    <TH>Cliente</TH>
                    <TH>Lote adjudicado</TH>
                    <TH>Contrato / Estado</TH>
                    <TH align="right">Monto venta</TH>
                    <TH>Fecha formalizacion</TH>
                  </>
                }
              >
                {buyersList.map((buyer) => (
                  <TR key={buyer.id_cliente}>
                    <TD className="font-mono text-[12px] text-brand-500">{buyer.codigo_cliente}</TD>
                    <TD className="font-medium text-brand-900">{buyer.nombre_completo}</TD>
                    <TD className="text-brand-700 font-semibold">{buyer.codigo_lote}</TD>
                    <TD>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-[12px]">{buyer.codigo_contrato}</span>
                        <Badge tone="brand">{buyer.estado_contrato}</Badge>
                      </div>
                    </TD>
                    <TD align="right" className="font-semibold text-brand-900">
                      {currency(buyer.precio_venta)}
                    </TD>
                    <TD className="text-brand-500 tabular text-[12px]">{formatDateLima(buyer.fecha_venta)}</TD>
                  </TR>
                ))}
              </Table>
              <Pagination
                page={buyersPage}
                pageSize={15}
                total={buyersTotal}
                onPageChange={(p) => setBuyersPage(p)}
              />
            </>
          )}
        </Card>
      )}

      {/* PESTANA 5: Fuentes de captacion */}
      {tab === 'fuentes' && (
        <Card>
          <CardHeader
            title="Fuentes de captacion oficiales"
            description="Estadisticas reales de canal de origen calculadas sobre la cartera completa del Core Service."
          />
          {isLoadingPortfolio ? (
            <div className="flex items-center justify-center p-12 text-brand-500">
              <RefreshCw className="h-6 w-6 animate-spin mr-2" />
              <span>Calculando estadisticas de captacion...</span>
            </div>
          ) : (
            <Table
              head={
                <>
                  <TH>Codigo</TH>
                  <TH>Canal de captacion</TH>
                  <TH align="right">Prospectos en cartera</TH>
                  <TH align="right">Activos</TH>
                  <TH align="right">Convertidos</TH>
                  <TH>Participacion real</TH>
                </>
              }
            >

              {(fuentesData?.items ?? []).map((source) => (
                <TR key={source.codigo}>
                  <TD className="font-mono text-[12px] font-semibold text-brand-600">
                    {source.codigo}
                  </TD>

                  <TD className="font-medium text-brand-900">
                    {source.nombre}
                  </TD>

                  <TD align="right" className="font-semibold text-brand-900">
                    {source.total}
                  </TD>

                  <TD align="right" className="text-sky-700 font-medium">
                    {source.activos}
                  </TD>

                  <TD align="right" className="text-emerald-700 font-medium">
                    {source.convertidos}
                  </TD>

                  <TD className="w-56">
                    <div className="flex items-center gap-2">
                      <div className="h-2 flex-1 overflow-hidden rounded-full bg-brand-50">
                        <span
                          className="block h-full rounded-full bg-brand-600 transition-all duration-300"
                          style={{
                            width: `${Math.min(100, Math.max(0, source.participacion))}%`
                          }}
                        />
                      </div>

                      <span className="text-[11px] text-brand-400 tabular">
                        {source.participacion.toFixed(1)}%
                      </span>
                    </div>
                  </TD>
                </TR>
              ))}

            </Table>
          )}
        </Card>
      )}

      {/* MODAL: Expediente comercial (Detalle) */}
      <Modal
        open={detailModalOpen}
        onClose={() => setDetailModalOpen(false)}
        title="Expediente comercial del prospecto"
        description="Ficha completa de identidad, medios de contacto e historial de interaccion comercial."
        footer={
          <Button onClick={() => setDetailModalOpen(false)}>Cerrar expediente</Button>
        }
      >
        {isLoadingDetail || !leadDetail ? (
          <div className="flex items-center justify-center p-8 text-brand-500">
            <RefreshCw className="h-5 w-5 animate-spin mr-2" />
            <span>Consultando expediente en el Core Service...</span>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="rounded-lg bg-brand-50 p-4 border border-brand-100">
              <div className="flex items-center justify-between">
                <div>
                  <span className="font-mono text-xs font-semibold text-brand-600">
                    {leadDetail.prospecto.codigo}
                  </span>
                  <h3 className="text-base font-bold text-brand-900">
                    {leadDetail.prospecto.nombre_completo}
                  </h3>
                </div>
                <div className="flex gap-2">
                  <Badge tone="brand">{leadDetail.prospecto.categoria}</Badge>
                  <span className="inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium bg-white text-brand-800">
                    {leadDetail.prospecto.estado_nombre}
                  </span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 text-[13px]">
              <div>
                <p className="text-brand-400">Documento principal</p>
                <p className="font-medium text-brand-900">
                  {leadDetail.documentoPrincipal
                    ? `${leadDetail.documentoPrincipal.tipoCodigo}: ${leadDetail.documentoPrincipal.numero}`
                    : 'Sin documento verificado'}
                </p>
              </div>
              <div>
                <p className="text-brand-400">Asesor comercial responsable</p>
                <p className="font-medium text-brand-900">
                  {leadDetail.prospecto.asesor_nombre || 'Sin asesor asignado'}
                </p>
              </div>
              <div>
                <p className="text-brand-400">Canal de origen</p>
                <p className="font-medium text-brand-900">{leadDetail.prospecto.origen_nombre}</p>
              </div>
              <div>
                <p className="text-brand-400">Puntuacion de interes</p>
                <p className="font-medium text-brand-900">{leadDetail.prospecto.puntuacion || 'Medio'}</p>
              </div>
            </div>

            <div>
              <h4 className="text-[12px] font-semibold uppercase tracking-wide text-brand-500 mb-1">
                Contactos registrados
              </h4>
              <div className="rounded border border-brand-100 divide-y divide-brand-50">
                {leadDetail.contactos && leadDetail.contactos.length > 0 ? (
                  leadDetail.contactos.map((c, i) => (
                    <div key={i} className="flex justify-between p-2 text-[12px]">
                      <span className="font-mono text-brand-600">{c.tipoCodigo}</span>
                      <span className="font-medium text-brand-900">{c.valor}</span>
                    </div>
                  ))
                ) : (
                  <p className="p-2 text-[12px] text-brand-400">
                    {leadDetail.prospecto.telefono} · {leadDetail.prospecto.email}
                  </p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="rounded border border-brand-100 p-2">
                <p className="text-[11px] text-brand-400">Seguimientos</p>
                <p className="text-lg font-bold text-brand-900">{leadDetail.totalSeguimientos}</p>
              </div>
              <div className="rounded border border-brand-100 p-2">
                <p className="text-[11px] text-brand-400">Visitas guiadas</p>
                <p className="text-lg font-bold text-brand-900">{leadDetail.totalVisitas}</p>
              </div>
              <div className="rounded border border-brand-100 p-2">
                <p className="text-[11px] text-brand-400">Comprador</p>
                <p className="text-lg font-bold text-brand-900">
                  {leadDetail.esComprador ? 'Si' : 'No'}
                </p>
              </div>
            </div>

            {leadDetail.prospecto.observaciones && (
              <div>
                <h4 className="text-[12px] font-semibold text-brand-700">Observaciones comerciales</h4>
                <p className="text-[12px] text-brand-600 bg-brand-50 rounded p-2">
                  {leadDetail.prospecto.observaciones}
                </p>
              </div>
            )}

            {/* Historial de asignaciones comerciales */}
            <div className="pt-2 border-t border-brand-100">
              <h4 className="text-[12px] font-semibold uppercase text-brand-700 mb-2">
                Historial de asignaciones ({assignmentsList.length})
              </h4>

              {assignmentsList.length === 0 ? (
                <p className="text-xs text-brand-400">
                  Sin asignaciones registradas.
                </p>
              ) : (
                <div className="space-y-2">
                  {assignmentsList.map((a) => (
                    <div
                      key={a.id_asignacion}
                      className="rounded border border-brand-100 p-3 text-xs"
                    >
                      <div className="flex justify-between">
                        <strong>{a.asesor_nombre}</strong>
                        <span className={a.vigente ? 'text-emerald-700' : 'text-brand-400'}>
                          {a.vigente ? 'Vigente' : 'Finalizada'}
                        </span>
                      </div>

                      <p>Asignación: {formatDateTimeLima(a.fecha_asignacion)}</p>

                      {a.fecha_fin && (
                        <p>Finalización: {formatDateTimeLima(a.fecha_fin)}</p>
                      )}

                      {a.motivo_asignacion && (
                        <p>Motivo: {a.motivo_asignacion}</p>
                      )}

                      {a.motivo_cierre && (
                        <p>Motivo de cierre: {a.motivo_cierre}</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Historial de Seguimientos Comerciales */}
            <div className="pt-2 border-t border-brand-100">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-[12px] font-semibold uppercase tracking-wide text-brand-700">
                  Historial de seguimientos ({followUpsList.length})
                </h4>
                <Gate permission="crm.edit">
                  <Button
                    size="sm"
                    icon={PhoneIcon}
                    onClick={() => {
                      setFollowUpLead(leadDetail.prospecto);
                      setFollowUpForm({
                        tipoCodigo: 'LLAMADA',
                        asunto: `Seguimiento comercial con ${leadDetail.prospecto.nombre_completo}`,
                        detalle: '',
                        resultado: '',
                        requiereSeguimiento: false,
                        fechaProximoSeguimiento: null
                      });
                    }}
                  >
                    Nuevo seguimiento
                  </Button>
                </Gate>
              </div>

              {isLoadingFollowUps ? (
                <div className="flex items-center justify-center p-4 text-brand-500 text-xs">
                  <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                  <span>Cargando bitacora de contactos...</span>
                </div>
              ) : followUpsList.length === 0 ? (
                <p className="text-xs text-brand-400 bg-brand-50 p-3 rounded text-center">
                  Sin bitacoras de seguimiento registradas para este prospecto.
                </p>
              ) : (
                <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                  {followUpsList.map((f, idx) => (
                    <div
                      key={f.id_seguimiento || idx}
                      className="rounded border border-brand-100 bg-white p-2.5 text-xs shadow-xs"
                    >
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-1.5">
                          <span className="font-semibold text-brand-800">
                            {f.tipo_nombre || f.tipo_codigo || 'CONTACTO'}
                          </span>
                          <span className="text-brand-400">·</span>
                          <span className="font-medium text-brand-900">{f.asunto}</span>
                        </div>
                        <span className="text-[11px] text-brand-400 tabular">
                          {formatDateTimeLima(f.fecha_seguimiento)}
                        </span>
                      </div>
                      {f.detalle && <p className="text-brand-600 mb-1">{f.detalle}</p>}
                      {f.resultado && (
                        <p className="text-brand-500 text-[11px]">
                          <strong>Resultado:</strong> {f.resultado}
                        </p>
                      )}
                      {f.requiere_seguimiento && f.fecha_proximo_seguimiento && (
                        <div className="mt-1 inline-flex items-center gap-1 text-[11px] font-medium text-amber-700 bg-amber-50 px-2 py-0.5 rounded">
                          <CalendarIcon className="h-3 w-3" />
                          <span>Proximo contacto: {formatDateTimeLima(f.fecha_proximo_seguimiento)}</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Visitas guiadas en el Expediente */}
            <div className="pt-2 border-t border-brand-100">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-[12px] font-semibold uppercase tracking-wide text-brand-700">
                  Visitas guiadas ({detailVisitsList.length})
                </h4>
                <Gate permission="crm.edit">
                  <Button
                    size="sm"
                    icon={CalendarIcon}
                    onClick={() => {
                      setVisitForm({
                        prospectId: leadDetail.prospecto.id_prospecto,
                        projectId: leadDetail.intereses?.[0]?.idProyecto || catalogs?.proyectos?.[0]?.id || 1,
                        advisorId: leadDetail.prospecto.id_asesor || advisorsList[0]?.id_asesor || 0,
                        visitDate: '',
                        shift: '11:00',
                        meetingPoint: 'Oficina de Ventas - Lurin',
                        notes: ''
                      });
                      setIsNewVisitOpen(true);
                    }}
                  >
                    Agendar visita
                  </Button>
                </Gate>
              </div>
              {detailVisitsList.length === 0 ? (
                <p className="text-xs text-brand-400 bg-brand-50 p-3 rounded text-center">
                  Sin visitas guiadas programadas para este prospecto.
                </p>
              ) : (
                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {detailVisitsList.map((v) => (
                    <div
                      key={v.id_visita}
                      className="rounded border border-brand-100 bg-white p-2 text-xs flex justify-between items-center"
                    >
                      <div>
                        <p className="font-semibold text-brand-900">
                          {formatDateLima(v.fecha_visita)} (Turno {v.turno})
                        </p>
                        <p className="text-[11px] text-brand-500">{v.punto_encuentro}</p>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <StatusBadge
                          status={
                            v.estado === 'REALIZADA' ? 'Realizada' :
                              v.estado === 'CONFIRMADA' ? 'Aprobado' :
                                v.estado === 'CANCELADA' ? 'Rechazado' : 'Pendiente'
                          }
                          className={
                            v.estado === 'REALIZADA'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : undefined
                          }
                        />
                        {v.estado === 'PROGRAMADA' && (
                          <Button size="sm" onClick={() => handleConfirmVisit(v.id_visita)}>
                            Confirmar
                          </Button>
                        )}
                        {v.estado === 'CONFIRMADA' && (
                          <Button size="sm" onClick={() => handleCompleteVisit(v.id_visita)}>
                            Realizada
                          </Button>
                        )}
                        {v.estado !== 'CANCELADA' && v.estado !== 'REALIZADA' && (
                          <Button size="sm" onClick={() => handleCancelVisit(v.id_visita)}>
                            Cancelar
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </Modal>

      {/* MODAL: Registrar nuevo lead */}
      <Modal
        open={isNewLeadOpen}
        onClose={() => setIsNewLeadOpen(false)}
        title="Registrar nuevo lead"
        description="Captacion comercial."
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

        <form noValidate onSubmit={handleCreateSubmit} className="space-y-3">
          <div className="rounded border border-slate-200 bg-slate-50 p-2 font-mono text-[11px] text-slate-500">
            ID Solicitud: {solicitudId}
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="text-xs font-medium text-brand-700">Nombres *</label>
              <Input required maxLength={120} value={form.names}
                onChange={e => actualizarCampoTexto('names', e.target.value)}
                placeholder="Ej. Juan Carlos" {...propiedadesError('names')} />
              {mensajeError('names')}
            </div>

            <div>
              <label className="text-xs font-medium text-brand-700">Apellido paterno *</label>
              <Input required maxLength={80} value={form.paternalSurname}
                onChange={e => actualizarCampoTexto('paternalSurname', e.target.value)}
                placeholder="Ej. Pérez" {...propiedadesError('paternalSurname')} />
              {mensajeError('paternalSurname')}
            </div>

            <div>
              <label className="text-xs font-medium text-brand-700">Apellido materno</label>
              <Input maxLength={80} value={form.maternalSurname}
                onChange={e => actualizarCampoTexto('maternalSurname', e.target.value)}
                placeholder="Ej. Gómez" {...propiedadesError('maternalSurname')} />
              {mensajeError('maternalSurname')}
            </div>

            <div>
              <label className="text-xs font-medium text-brand-700">Teléfono / WhatsApp *</label>
              <Input required type="tel" inputMode="tel" maxLength={16} value={form.phone}
                onChange={e => actualizarCampoTexto('phone', e.target.value)}
                placeholder="+51987654321" {...propiedadesError('phone')} />
              {mensajeError('phone')}
            </div>

            <div>
              <label className="text-xs font-medium text-brand-700">Correo electrónico *</label>
              <Input required type="email" maxLength={180} value={form.email}
                onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
                placeholder="persona@example.com" {...propiedadesError('email')} />
              {mensajeError('email')}
            </div>

            <div>
              <label className="text-xs font-medium text-brand-700">Proyecto de interés *</label>
              <Select aria-label="Proyecto de interés" value={form.idProyecto}
                onChange={e => setForm(p => ({ ...p, idProyecto: e.target.value ? Number(e.target.value) : '' }))}
                {...propiedadesError('idProyecto')}>
                <option value="">Seleccione un proyecto...</option>
                {catalogs?.proyectos?.map(p => (
                  <option key={p.id} value={p.id}>{p.nombre} {p.distrito ? `(${p.distrito})` : ''}</option>
                ))}
              </Select>
              {mensajeError('idProyecto')}
            </div>

            <div>
              <label className="text-xs font-medium text-brand-700">Canal de origen *</label>
              <Select aria-label="Canal de origen" value={form.origenCodigo}
                onChange={e => setForm(p => ({ ...p, origenCodigo: e.target.value }))}
                {...propiedadesError('origenCodigo')}>
                {(catalogs?.origenes ?? [
                  { codigo: 'WEB', nombre: 'Página Web' }, { codigo: 'FACEBOOK', nombre: 'Facebook' },
                  { codigo: 'INSTAGRAM', nombre: 'Instagram' }, { codigo: 'WHATSAPP', nombre: 'WhatsApp' },
                  { codigo: 'FERIA', nombre: 'Feria comercial' }, { codigo: 'REFERIDO', nombre: 'Referido' }
                ]).map(o => <option key={o.codigo} value={o.codigo}>{o.nombre}</option>)}
              </Select>
              {mensajeError('origenCodigo')}
            </div>

            <div>
              <label className="text-xs font-medium text-brand-700">Asesor inicial</label>
              <Select aria-label="Asesor inicial" value={form.idAsesor}
                onChange={e => setForm(p => ({ ...p, idAsesor: e.target.value ? Number(e.target.value) : '' }))}>
                <option value="">Sin asignar (Rotativo)</option>
                {advisorsList.map(a => (
                  <option key={a.id_asesor} value={a.id_asesor}>
                    {a.nombre_completo} ({a.leads_activos} activos)
                  </option>
                ))}
              </Select>
            </div>

            <div>
              <label className="text-xs font-medium text-brand-700">Tipo de documento *</label>
              <Select aria-label="Tipo de documento" value={form.tipoDocumento}
                onChange={e => setForm(p => ({ ...p, tipoDocumento: e.target.value, numeroDocumento: '' }))}
                {...propiedadesError('tipoDocumento')}>
                <option value="DNI">DNI</option>
                <option value="CE">Carné de extranjería</option>
                <option value="PASAPORTE">Pasaporte</option>
                <option value="RUC">RUC</option>
              </Select>
              {mensajeError('tipoDocumento')}
            </div>

            <div>
              <label className="text-xs font-medium text-brand-700">Número de documento *</label>
              <Input required value={form.numeroDocumento}
                maxLength={form.tipoDocumento === 'DNI' ? 8 : form.tipoDocumento === 'RUC' ? 11 : form.tipoDocumento === 'CE' ? 12 : 20}
                inputMode={form.tipoDocumento === 'PASAPORTE' ? 'text' : 'numeric'}
                onChange={e => actualizarCampoTexto('numeroDocumento', e.target.value)}
                placeholder={form.tipoDocumento === 'DNI' ? '8 dígitos' : form.tipoDocumento === 'RUC' ? '11 dígitos' : form.tipoDocumento === 'CE' ? '12 dígitos' : 'Letras y números'}
                {...propiedadesError('numeroDocumento')} />
              {mensajeError('numeroDocumento')}
            </div>

            <div className="sm:col-span-2">
              <label className="text-xs font-medium text-brand-700">Dirección (opcional)</label>
              <Input maxLength={255} value={form.direccion}
                onChange={e => setForm(p => ({ ...p, direccion: e.target.value }))}
                placeholder="Ej. Av. Los Incas 123, Chiclayo" {...propiedadesError('direccion')} />
              {mensajeError('direccion')}
            </div>

            <div className="sm:col-span-2">
              <label className="text-xs font-medium text-brand-700">Motivo de contacto *</label>
              <Input required maxLength={150} value={form.motivoContacto}
                onChange={e => setForm(p => ({ ...p, motivoContacto: e.target.value }))}
                placeholder="Ej. Consulta sobre financiamiento" {...propiedadesError('motivoContacto')} />
              {mensajeError('motivoContacto')}
            </div>

            <div className="sm:col-span-2">
              <label className="text-xs font-medium text-brand-700">Nota adicional</label>
              <Input maxLength={4000} value={form.mensaje}
                onChange={e => setForm(p => ({ ...p, mensaje: e.target.value }))}
                placeholder="Notas comerciales del primer contacto..." {...propiedadesError('mensaje')} />
              {mensajeError('mensaje')}
            </div>
          </div>
        </form>
      </Modal>

      {/* MODAL: Asignar asesor */}
      <Modal
        open={Boolean(assignLead)}
        onClose={() => setAssignLead(null)}
        title="Asignar asesor comercial"
        description={
          assignLead
            ? `Prospecto ${assignLead.codigo} · ${assignLead.nombre_completo}`
            : undefined
        }
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
              {isSubmitting ? 'Asignando...' : 'Confirmar asignacion'}
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <label className="text-[13px] font-medium text-brand-700">
            Seleccionar asesor comercial
          </label>
          <Select
            aria-label="Asesor"
            value={selectedAdvisorId || undefined}
            onChange={(e) => setSelectedAdvisorId(Number(e.target.value))}
          >
            {advisorsList.map((a) => (
              <option key={a.id_asesor} value={a.id_asesor}>
                {a.codigo} - {a.nombre_completo} ({a.leads_activos} activos)
              </option>
            ))}
          </Select>

          <div>
            <label className="text-[12px] font-medium text-brand-700">Motivo de reasignacion</label>
            <Input
              value={assignReason}
              onChange={(e) => setAssignReason(e.target.value)}
              placeholder="Ej. Reasignacion por cartera o zona geografica"
            />
          </div>
          <p className="text-[12px] text-brand-400">
            El asesor comercial recibira la notificacion del prospecto en su cartera activa.
          </p>
        </div>
      </Modal>

      {/* MODAL: Cambiar etapa comercial */}
      <Modal
        open={Boolean(stageLead)}
        onClose={() => setStageLead(null)}
        title={
          stageLead?.categoria === 'LEAD' && newStageCode === 'INTERESADO'
            ? 'Convertir Lead a Potencial'
            : 'Cambiar etapa comercial'
        }
        description={
          stageLead
            ? `Prospecto ${stageLead.codigo} · ${stageLead.nombre_completo} (Etapa actual: ${stageLead.estado_nombre || stageLead.estado_codigo})`
            : undefined
        }
        footer={
          <>
            <Button onClick={() => setStageLead(null)} disabled={isSubmitting}>
              Cancelar
            </Button>
            <Button
              variant="primary"
              onClick={handleStageSubmit}
              disabled={
                isSubmitting ||
                !newStageCode ||
                newStageCode === stageLead?.estado_codigo ||
                Boolean(
                  catalogs?.estados.find((e) => e.codigo === stageLead?.estado_codigo)?.final ||
                  stageLead?.categoria === 'COMPRADOR' ||
                  stageLead?.categoria === 'CERRADO'
                )
              }
            >
              {isSubmitting ? 'Guardando...' : 'Actualizar etapa'}
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          {stageLead &&
            (catalogs?.estados.find((e) => e.codigo === stageLead.estado_codigo)?.final ||
              stageLead.categoria === 'COMPRADOR' ||
              stageLead.categoria === 'CERRADO') && (
              <Alert tone="danger" title="Etapa comercial definitiva">
                {`El prospecto se encuentra en estado ${stageLead.estado_nombre || stageLead.estado_codigo}. Las reglas del negocio bloquean cambios de etapa en prospectos cerrados o con venta.`}
              </Alert>
            )}

          <div>
            <label className="text-[12px] font-medium text-brand-700">Nueva etapa comercial *</label>
            <Select
              aria-label="Nueva etapa"
              value={newStageCode}
              onChange={(e) => setNewStageCode(e.target.value)}
              disabled={
                Boolean(
                  catalogs?.estados.find((e) => e.codigo === stageLead?.estado_codigo)?.final ||
                  stageLead?.categoria === 'COMPRADOR' ||
                  stageLead?.categoria === 'CERRADO'
                )
              }
            >
              {catalogs?.estados ? (
                catalogs.estados
                  .filter((est) => est.codigo !== 'CONVERTIDO')
                  .map((est) => (
                    <option key={est.codigo} value={est.codigo}>
                      {est.nombre} {est.final ? '(Definitiva)' : ''}
                    </option>
                  ))
              ) : (
                <>
                  <option value="NUEVO">Nuevo</option>
                  <option value="CONTACTADO">Contactado</option>
                  <option value="INTERESADO">Interesado</option>
                  <option value="NEGOCIACION">En negociacion</option>
                  <option value="NO_INTERESADO">No interesado (Definitiva)</option>
                  <option value="DESCARTADO">Descartado (Definitiva)</option>
                </>
              )}
            </Select>
            {newStageCode === stageLead?.estado_codigo && (
              <p className="mt-1 text-[11px] text-amber-600">
                Seleccione una etapa diferente a la actual ({stageLead?.estado_codigo}) para avanzar el prospecto.
              </p>
            )}
            {catalogs?.estados.find((e) => e.codigo === newStageCode)?.final && (
              <p className="mt-1 text-[11px] text-rose-600 font-medium">
                Atencion: La etapa seleccionada es definitiva. Una vez guardada, no podra revertirse.
              </p>
            )}
          </div>
          <div>
            <label className="text-[12px] font-medium text-brand-700">
              Observacion del cambio de etapa
            </label>
            <Input
              value={stageObservation}
              onChange={(e) => setStageObservation(e.target.value)}
              placeholder="Ej. Interesado tras primera llamada comercial"
            />
          </div>
        </div>
      </Modal>

      {/* MODAL: Editar ficha comercial */}
      <Modal
        open={Boolean(editLead)}
        onClose={() => setEditLead(null)}
        title="Editar informacion comercial"
        description={
          editLead ? `Prospecto ${editLead.codigo} · ${editLead.nombre_completo}` : undefined
        }
        footer={
          <>
            <Button onClick={() => setEditLead(null)} disabled={isSubmitting}>
              Cancelar
            </Button>
            <Button variant="primary" onClick={handleEditSubmit} disabled={isSubmitting}>
              {isSubmitting ? 'Guardando...' : 'Guardar cambios'}
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <div>
            <label className="text-[12px] font-medium text-brand-700">Canal de origen</label>
            <Select
              aria-label="Canal de origen"
              value={editOrigen}
              onChange={(e) => setEditOrigen(e.target.value)}
            >
              {catalogs?.origenes ? (
                catalogs.origenes.map((o) => (
                  <option key={o.codigo} value={o.codigo}>
                    {o.nombre}
                  </option>
                ))
              ) : (
                <>
                  <option value="WEB">Web</option>
                  <option value="FACEBOOK">Facebook</option>
                  <option value="INSTAGRAM">Instagram</option>
                  <option value="WHATSAPP">WhatsApp</option>
                  <option value="FERIA">Feria</option>
                </>
              )}
            </Select>
          </div>

          <div>
            <label className="text-[12px] font-medium text-brand-700">
              Cambiar proyecto de interes
            </label>
            <Select
              aria-label="Proyecto de interes"
              value={editProyecto}
              onChange={(e) => setEditProyecto(e.target.value ? Number(e.target.value) : '')}
            >
              <option value="">Mantener proyecto actual</option>
              {catalogs?.proyectos?.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nombre} {p.distrito ? `(${p.distrito})` : ''}
                </option>
              ))}
            </Select>
          </div>

          <div>
            <label className="text-[12px] font-medium text-brand-700">Observaciones</label>
            <Input
              value={editObservaciones}
              onChange={(e) => setEditObservaciones(e.target.value)}
              placeholder="Notas comerciales de la ficha..."
            />
          </div>
        </div>
      </Modal>

      {/* MODAL: Desactivacion Logica */}
      <Modal
        open={Boolean(deactivateLead)}
        onClose={() => setDeactivateLead(null)}
        title="Desactivar prospecto comercial"
        description="Esta accion realizara la baja logica del lead en el sistema CRM."
        footer={
          <>
            <Button onClick={() => setDeactivateLead(null)} disabled={isSubmitting}>
              Cancelar
            </Button>
            <Button
              variant="primary"
              onClick={handleDeactivateSubmit}
              disabled={isSubmitting || deactivateReason.trim().length < 10}
              className="bg-rose-600 hover:bg-rose-700 text-white"
            >
              {isSubmitting ? 'Desactivando...' : 'Confirmar desactivacion'}
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <p className="text-[13px] text-brand-700">
            Esta a punto de dar de baja al prospecto{' '}
            <strong className="text-brand-900">{deactivateLead?.nombre_completo}</strong> (
            {deactivateLead?.codigo}).
          </p>

          <div>
            <label className="text-[12px] font-medium text-brand-700">
              Motivo de baja obligatorio (entre 10 y 500 caracteres) *
            </label>
            <Input
              required
              value={deactivateReason}
              onChange={(e) => setDeactivateReason(e.target.value)}
              placeholder="Indique el motivo detallado de la baja comercial..."
            />
            <p className="mt-1 text-[11px] text-brand-400">
              Caracteres: {deactivateReason.trim().length} / 500 (Minimo 10 caracteres requeridos por
              el backend).
            </p>
          </div>
        </div>
      </Modal>

      {/* MODAL: Registrar seguimiento */}
      <Modal
        open={Boolean(followUpLead)}
        onClose={() => setFollowUpLead(null)}
        title="Registrar seguimiento comercial"
        description={
          followUpLead
            ? `Bitacora de contacto para ${followUpLead.nombre_completo}`
            : undefined
        }
        footer={
          <>
            <Button onClick={() => setFollowUpLead(null)} disabled={isSubmitting}>
              Cancelar
            </Button>
            <Button variant="primary" onClick={handleFollowUpSubmit} disabled={isSubmitting}>
              {isSubmitting ? 'Guardando...' : 'Registrar seguimiento'}
            </Button>
          </>
        }
      >
        <form onSubmit={handleFollowUpSubmit} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[12px] font-medium text-brand-700">Medio de contacto</label>
              <Select
                aria-label="Medio de contacto"
                value={followUpForm.tipoCodigo}
                onChange={(e) => setFollowUpForm({ ...followUpForm, tipoCodigo: e.target.value })}
              >
                {catalogs?.tiposSeguimiento && catalogs.tiposSeguimiento.length > 0 ? (
                  catalogs.tiposSeguimiento.map((t) => (
                    <option key={t.codigo} value={t.codigo}>
                      {t.nombre}
                    </option>
                  ))
                ) : (
                  <>
                    <option value="LLAMADA">Llamada telefonica</option>
                    <option value="WHATSAPP">WhatsApp</option>
                    <option value="EMAIL">Correo electronico</option>
                    <option value="REUNION">Reunion presencial</option>
                  </>
                )}
              </Select>
            </div>
            <div>
              <label className="text-[12px] font-medium text-brand-700">Asunto *</label>
              <Input
                required
                value={followUpForm.asunto}
                onChange={(e) => setFollowUpForm({ ...followUpForm, asunto: e.target.value })}
                placeholder="Ej. Consulta de formas de pago"
              />
            </div>
          </div>

          <div>
            <label className="text-[12px] font-medium text-brand-700">Detalle de la conversacion</label>
            <Input
              value={followUpForm.detalle}
              onChange={(e) => setFollowUpForm({ ...followUpForm, detalle: e.target.value })}
              placeholder="Resumen del intercambio comercial..."
            />
          </div>

          <div>
            <label className="text-[12px] font-medium text-brand-700">Resultado obtenido</label>
            <Input
              value={followUpForm.resultado || ''}
              onChange={(e) => setFollowUpForm({ ...followUpForm, resultado: e.target.value })}
              placeholder="Ej. Interes confirmado, solicita agendar visita"
            />
          </div>

          <div className="flex items-center gap-2 pt-1">
            <input
              type="checkbox"
              id="req-seg"
              checked={followUpForm.requiereSeguimiento}
              onChange={(e) =>
                setFollowUpForm({
                  ...followUpForm,
                  requiereSeguimiento: e.target.checked
                })
              }
              className="h-4 w-4 rounded border-brand-300 text-brand-600 focus:ring-brand-500"
            />
            <label htmlFor="req-seg" className="text-[12px] text-brand-700 font-medium">
              Requiere proximo seguimiento programado
            </label>
          </div>

          {followUpForm.requiereSeguimiento && (
            <div>
              <label className="text-[12px] font-medium text-brand-700">
                Fecha y hora de proximo contacto *
              </label>
              <Input
                type="datetime-local"
                required={followUpForm.requiereSeguimiento}
                value={followUpForm.fechaProximoSeguimiento || ''}
                onChange={(e) =>
                  setFollowUpForm({
                    ...followUpForm,
                    fechaProximoSeguimiento: e.target.value || null
                  })
                }
              />
            </div>
          )}
        </form>
      </Modal>

      {/* MODAL: Agendar Visita */}
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
            <ProspectSearchAutocomplete
              value={visitForm.prospectId}
              initialLeads={leadsList}
              onSelect={(p) => setVisitForm({ ...visitForm, prospectId: p.id_prospecto })}
              className="mt-1 w-full"
            />
          </div>

          <div>
            <label className="text-[12px] font-medium text-brand-700">Proyecto destino *</label>
            <Select
              aria-label="Proyecto destino"
              value={visitForm.projectId || ''}
              onChange={(e) => setVisitForm({ ...visitForm, projectId: Number(e.target.value) })}
            >
              {catalogs?.proyectos?.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nombre} {p.distrito ? `(${p.distrito})` : ''}
                </option>
              ))}
            </Select>
          </div>

          <div>
            <label className="text-[12px] font-medium text-brand-700">Asesor responsable *</label>
            <Select
              aria-label="Asesor responsable"
              value={visitForm.advisorId || ''}
              onChange={(e) => setVisitForm({ ...visitForm, advisorId: Number(e.target.value) })}
            >
              {advisorsList.map((a) => (
                <option key={a.id_asesor} value={a.id_asesor}>
                  {a.nombre_completo} ({a.codigo})
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
                min={new Date().toISOString().slice(0, 10)}
                value={visitForm.visitDate}
                onChange={(e) => setVisitForm({ ...visitForm, visitDate: e.target.value })}
              />
            </div>
            <div>
              <label className="text-[12px] font-medium text-brand-700">Turno oficial *</label>
              <Select
                aria-label="Turno oficial"
                value={visitForm.shift}
                onChange={(e) =>
                  setVisitForm({
                    ...visitForm,
                    shift: e.target.value as '11:00' | '15:00'
                  })
                }
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
            Regla de negocio: Las visitas oficiales se programan de Miercoles a Domingo en turnos
            autorizados de 11:00 y 15:00.
          </p>
        </form>
      </Modal>
    </div>
  );
}