import React, { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { DownloadIcon, FileTextIcon, EyeIcon, PlusIcon, UserCheckIcon, AlertTriangleIcon, RotateCcwIcon, CreditCardIcon } from 'lucide-react';
import { PageHeader } from '../components/ui/PageHeader';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { SearchInput, Select, Input } from '../components/ui/Field';
import { Table, TD, TH, TR } from '../components/ui/Table';
import { Pagination } from '../components/ui/Pagination';
import { StatusBadge } from '../components/ui/Badge';
import { Tabs } from '../components/ui/Tabs';
import { Alert, EmptyState } from '../components/ui/Feedback';
import { Modal } from '../components/ui/Modal';
import { Gate } from '../components/auth/PermissionRoute';
import { useAuth } from '../contexts/AuthContext';
import { formatSoles } from '../utils/financeMoney';
import { salesService } from '../services/salesService';
import {
  crmBackend,
  type CrmProspect,
  type CrmAdvisor,
  type CrmEtapaOperacion,
  type CrmSaleValidationInput,
  type CrmDatosCompradorVenta,
  type CrmVoucherVenta,
  type CrmReservaVigenteVenta,
  type CrmContratoDocumentacion
} from '../services/crmBackend';
import { ContratosPendientesPanel } from '../components/sales/ContratosPendientesPanel';
import { DocumentacionContratosPanel } from '../components/sales/DocumentacionContratosPanel';
import { OperacionesAgrupadasPanel } from '../components/sales/OperacionesAgrupadasPanel';
import type { Sale } from '../types';
import { coreService, type LotePrecioVigente } from '../services/coreService';
import { ApiError } from '../lib/apiClient';
import type { ProyectoResponse, LoteResponse } from '../types/core';
import { AnexosContratoPanel } from '../components/sales/AnexosContratoPanel';
import { ComprobanteSeparacionPreview } from '../components/sales/ComprobanteSeparacionPreview';
import { DetalleVentaAmpliadoPanel } from '../components/sales/DetalleVentaAmpliadoPanel';
import { EditarDatosCompradorModal } from '../components/sales/EditarDatosCompradorModal';
import {
  FILTROS_SEPARACIONES_INICIALES,
  filtrarSeparaciones, leyendaVencimiento, opcionesUnicasSeparaciones,
  type FiltrosSeparaciones
} from '../utils/separacionesFiltros';
import { exportarSeparacionesExcel } from '../utils/separacionesExportExcel';
import { exportarVentasExcel } from '../utils/ventasExportExcel';
import { ResumenComercialOperaciones } from '../components/sales/ResumenComercialOperaciones';
import {
  FILTROS_VENTAS_INICIALES, crearPeriodoComercial, filtrarVentas,
  opcionesUnicasVentas, periodoValido,
  type FiltrosVentas
} from '../utils/ventasComercial';
import { validarPagoVenta } from '../utils/crmPagoVenta';
import { PagoSeparacionPanel } from '../components/sales/PagoSeparacionPanel';
import { crearPagoSeparacion, resolverPagosSeparacion, validarPagosSeparacion, type PagoSeparacionBorrador } from '../utils/pagosSeparacion';
import { calcularVenta, validarInicialTotal, type ResumenVentaCalculado, type CondicionesFrancesas } from '../utils/financiamientoFrances';

// Fase 2: no enviar pagos globales al contrato antiguo (un comprobante por lote).
const SEPARACION_ENVIO_DESHABILITADO = true;
type LoteAdicionalSeparacion = {
  idLote:number; codigo:string; precio:number; monto:number; dias:number;
};


function AdvisorBadge({ advisor, type }: { advisor?: string | null; type: string }) {
  if (advisor && advisor.trim()) {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-brand-800">
        <UserCheckIcon className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
        {advisor}
      </span>
    );
  }
  if (type === 'Venta') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-800">
        <AlertTriangleIcon className="h-3 w-3 text-amber-600 shrink-0" />
        Sin asesor
      </span>
    );
  }
  return <span className="text-xs text-brand-400 italic">No aplica</span>;
}

function ProspectAdvisorInfo({ prospect, onAssign, disabled }: { prospect?: CrmProspect; onAssign?: () => void; disabled?: boolean }) {
  if (!prospect) return null;
  const tieneAsesor = (prospect.id_asesor ?? 0) > 0;
  return (
    <div className="mt-2 rounded-md border border-brand-100 bg-brand-50/50 p-2.5 text-xs">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-brand-600 font-medium">Asesor asignado en CRM:</span>
        <span className={`inline-flex items-center gap-1 font-semibold ${tieneAsesor ? 'text-emerald-800' : 'text-amber-800'}`}>
          {tieneAsesor ? <UserCheckIcon className="h-3.5 w-3.5 text-emerald-600" /> : <AlertTriangleIcon className="h-3.5 w-3.5 text-amber-600" />}
          {tieneAsesor ? prospect.asesor_nombre : 'Sin asesor asignado'}
        </span>
      </div>
      <p className="mt-1 text-[11px] text-brand-500">
        {tieneAsesor ? 'Se conservará el asesor registrado en CRM para la gestión comercial.' : 'El cliente no tiene asesor activo asignado.'}
      </p>
      {!tieneAsesor && onAssign && (
        <Button size="sm" variant="secondary" icon={UserCheckIcon} className="mt-2 w-full sm:w-auto"
          disabled={disabled} onClick={onAssign}>Asignar asesor</Button>
      )}
    </div>
  );
}


const ESTADOS_SEPARACION = {
  PENDIENTE: {
    etiqueta: 'Pendiente',
    estilo: 'bg-amber-50 text-amber-800 border-amber-200',
    punto: 'bg-amber-500'
  },
  VIGENTE: {
    etiqueta: 'Vigente',
    estilo: 'bg-sky-50 text-sky-800 border-sky-200',
    punto: 'bg-sky-500'
  },
  CONVERTIDA: {
    etiqueta: 'Convertida',
    estilo: 'bg-emerald-50 text-emerald-800 border-emerald-200',
    punto: 'bg-emerald-500'
  },
  VENCIDA: {
    etiqueta: 'Vencida',
    estilo: 'bg-red-50 text-red-800 border-red-200',
    punto: 'bg-red-500'
  },
  CANCELADA: {
    etiqueta: 'Anulada',
    estilo: 'bg-slate-100 text-slate-700 border-slate-300',
    punto: 'bg-slate-500'
  }
} as const;

const ESTADOS_VENTA = {
  PENDIENTE: {etiqueta:'Pendiente',estilo:'bg-amber-50 text-amber-800 border-amber-200',punto:'bg-amber-500'},
  CONTRATADA: {etiqueta:'Contratada',estilo:'bg-sky-50 text-sky-800 border-sky-200',punto:'bg-sky-500'},
  VIGENTE: {etiqueta:'Vigente',estilo:'bg-emerald-50 text-emerald-800 border-emerald-200',punto:'bg-emerald-500'},
  FORMALIZADA: {etiqueta:'Formalizada',estilo:'bg-emerald-50 text-emerald-800 border-emerald-200',punto:'bg-emerald-500'},
  APROBADA: {etiqueta:'Aprobada',estilo:'bg-emerald-50 text-emerald-800 border-emerald-200',punto:'bg-emerald-500'},
  RECHAZADA: {etiqueta:'Rechazada',estilo:'bg-rose-50 text-rose-800 border-rose-200',punto:'bg-rose-500'},
  CANCELADA: {etiqueta:'Anulada',estilo:'bg-slate-100 text-slate-700 border-slate-200',punto:'bg-slate-500'},
  ANULADA: {etiqueta:'Anulada',estilo:'bg-slate-100 text-slate-700 border-slate-200',punto:'bg-slate-500'}
} as const;

function EstadoVentaBadge({estado}: {estado:string}) {
  const codigo=estado.trim().toUpperCase();
  const config=ESTADOS_VENTA[codigo as keyof typeof ESTADOS_VENTA] ?? {
    etiqueta:codigo.replace(/_/g, ' '),
    estilo:'bg-slate-50 text-slate-700 border-slate-200',
    punto:'bg-slate-400'
  };
  return <span className={`inline-flex max-w-full items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold ${config.estilo}`}>
    <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${config.punto}`} aria-hidden="true"/>
    <span className="whitespace-nowrap">{config.etiqueta}</span>
  </span>;
}

function EstadoSeparacionBadge({ estado }: { estado: string }) {
  const codigo = estado.trim().toUpperCase();

  const config = ESTADOS_SEPARACION[
    codigo as keyof typeof ESTADOS_SEPARACION
  ];

  if (!config) {
    return <StatusBadge status={estado} />;
  }

  return (
    <span
      className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 py-1 text-xs font-semibold ${config.estilo}`}
    >
      <span
        className={`h-1.5 w-1.5 rounded-full ${config.punto}`}
      />
      {config.etiqueta}
    </span>
  );
}


export function Sales() {
  const { can, user } = useAuth();
  const puedeReasignarComprador = can('crm.edit') && user.roles.some((r) =>
    r === 'Gerencia' || r === 'Supervisor comercial');
  const [tab, setTab] = useState<
    'Separación' | 'Venta' | 'Agrupadas' | 'Contratos' | 'Anexos'
  >('Separación');
  const [filtrosVenta, setFiltrosVenta] = useState<FiltrosVentas>(FILTROS_VENTAS_INICIALES);
  const [paginaVentas, setPaginaVentas] = useState(1);
  const tamanoPaginaVentas = 15;
  const [periodoComercial, setPeriodoComercial] = useState(() => crearPeriodoComercial('tres_meses'));
  const [exportandoVentas, setExportandoVentas] = useState(false);
  const [filtrosSeparacion, setFiltrosSeparacion] = useState<FiltrosSeparaciones>(FILTROS_SEPARACIONES_INICIALES);
  const [paginaSeparaciones, setPaginaSeparaciones] = useState(1);
  const tamanoPaginaSeparaciones = 15;
  const [exportandoSeparaciones, setExportandoSeparaciones] = useState(false);
  const [instanteActual, setInstanteActual] = useState(() => Date.now());
  const [detail, setDetail] = useState<Sale | null>(null);
  const [salesList, setSalesList] = useState<Sale[]>([]);
  const [documentosPorVenta, setDocumentosPorVenta] = useState<
    Record<string, CrmContratoDocumentacion>
  >({});

  const [estadoDocumentos, setEstadoDocumentos] = useState<
    'cargando' | 'listo' | 'error'
  >('cargando');
  const [, setLoading] = useState(false);

  const [isModalOpen, setIsModalOpen] = useState(false);
  // Una solicitud desde el plano solo propone proyecto y lote; nunca omite seleccionar el prospecto.
  const [preseleccionAgrupada,setPreseleccionAgrupada] = useState<{
    idOperacion:number;idProspecto:number;idProyecto:number;idEtapa:number;idLote:number;
    modalidad:'CONTADO'|'FINANCIADA';
  }|null>(null);
  const [asociacionAgrupadaPendiente,setAsociacionAgrupadaPendiente] = useState<{
    idOperacion:number;idLote:number;idProspecto:number;modalidad:'CONTADO'|'FINANCIADA';
  }|null>(null);
  const [origenPlano, setOrigenPlano] = useState<{
    idProyecto:number; idEtapa:number; idLote:number; operacion:'Separacion'|'Venta'
  } | null>(() => {
    const q = new URLSearchParams(window.location.search);
    if (q.get('origen') !== 'plano') return null;
    const idProyecto=Number(q.get('idProyecto')), idEtapa=Number(q.get('idEtapa')),
      idLote=Number(q.get('idLote'));
    const operacion=q.get('operacion');
    if (![idProyecto,idEtapa,idLote].every(Number.isSafeInteger) ||
      [idProyecto,idEtapa,idLote].some(n=>n<=0) ||
      (operacion!=='Venta' && operacion!=='Separacion')) return null;
    return {idProyecto,idEtapa,idLote,operacion};
  });
  // El formulario pertenece a la pestaña; no se cambia el tipo dentro del modal.
  const opType: 'Separacion' | 'Venta' = tab === 'Venta' ? 'Venta' : 'Separacion';
  const [availableLots, setAvailableLots] = useState<LoteResponse[]>([]);
  const [lotesDisponiblesProyecto,setLotesDisponiblesProyecto]=useState<LoteResponse[]>([]);
  const [loadingLots, setLoadingLots] = useState(false); const [prospectsList, setProspectsList] = useState<CrmProspect[]>([]);
  const [selectedProspectId, setSelectedProspectId] = useState<number | ''>('');
  const [availableProjects, setAvailableProjects] = useState<ProyectoResponse[]>([]);
  const [formProjectId, setFormProjectId] = useState('');
  const [availableStages, setAvailableStages] = useState<CrmEtapaOperacion[]>([]);
  const [interesesOperacion, setInteresesOperacion] = useState<number[]>([]);
  const [registrandoInteres, setRegistrandoInteres] = useState(false);
  const [editorInteres, setEditorInteres] = useState(false);
  const [proyectoInteresNuevo, setProyectoInteresNuevo] = useState('');
  const [proyectoInteresAnterior, setProyectoInteresAnterior] = useState('');
  const [motivoCambioInteres, setMotivoCambioInteres] = useState('');
  const [errorCambioInteres, setErrorCambioInteres] = useState('');
  const puedeEditarInteres = can('crm.edit');
  const puedeAsignarAsesorOperacion = can('crm.edit') && user.roles.some(r =>
    ['Administrador', 'Gerencia', 'Supervisor comercial', 'Administración'].includes(r));
  const [editorAsesor, setEditorAsesor] = useState(false);
  const [asesoresOperacion, setAsesoresOperacion] = useState<CrmAdvisor[]>([]);
  const [asesorOperacion, setAsesorOperacion] = useState('');
  const [cargandoAsesoresOperacion, setCargandoAsesoresOperacion] = useState(false);
  const [guardandoAsesorOperacion, setGuardandoAsesorOperacion] = useState(false);
  const [errorAsesorOperacion, setErrorAsesorOperacion] = useState('');
  const clienteOperacion = prospectsList.find(p => p.id_prospecto === selectedProspectId);
  const compradorOperacion = clienteOperacion?.estado_codigo?.toUpperCase() === 'CONVERTIDO';
  const esCambioInteres = !compradorOperacion && interesesOperacion.length > 0;
  const origenCambioInteres = interesesOperacion.length === 1
    ? interesesOperacion[0] : Number(proyectoInteresAnterior);
  const proyectosConInteres = availableProjects.filter(p => interesesOperacion.includes(p.idProyecto));
  const proyectosSinInteres = availableProjects.filter(p => !interesesOperacion.includes(p.idProyecto));
  const proyectoConInteres = interesesOperacion.includes(Number(formProjectId));
  const [formStageId, setFormStageId] = useState('');
  const [loadingStages, setLoadingStages] = useState(false);
  const [loadingProjects, setLoadingProjects] = useState(false);
  const [formLotId, setFormLotId] = useState('');
  const [preferenciasLote,setPreferenciasLote]=useState<Record<number,{id:number|null;codigo:string|null;comentario:string|null}>>({});
  const preferenciaLote=preferenciasLote[Number(formProjectId)];
  const [editorLote,setEditorLote]=useState(false);
  const [loteCandidato,setLoteCandidato]=useState('');
  const [motivoLote,setMotivoLote]=useState('');
  const [guardandoLote,setGuardandoLote]=useState(false);
  const [errorLote,setErrorLote]=useState('');
  const [lotesAdicionales,setLotesAdicionales]=useState<LoteAdicionalSeparacion[]>([]);
  const [editorAdicional,setEditorAdicional]=useState(false);
  const [candidatoAdicional,setCandidatoAdicional]=useState('');
  const [cargandoAdicional,setCargandoAdicional]=useState(false);
  const [errorAdicional,setErrorAdicional]=useState('');
  const revisionLotesAdicionales=React.useRef(0);
  const [politicaOperativa, setPoliticaOperativa] = useState<{
    idProspecto: number; idLote: number; condiciones: CondicionesFrancesas;
  } | null>(null);
  const [consultandoPolitica, setConsultandoPolitica] = useState(false);
  const [errorPolitica, setErrorPolitica] = useState<string | null>(null);
  const [revisionPolitica, setRevisionPolitica] = useState(0);
  const [precioLote, setPrecioLote] = useState<LotePrecioVigente | null>(null);
  const [estadoPrecio, setEstadoPrecio] = useState<
    'inicial' | 'cargando' | 'disponible' | 'sin_precio' | 'error'
  >('inicial');
  const [formObservations, setFormObservations] = useState('');
  const [formPaymentMethod, setFormPaymentMethod] = useState<'TRANSFERENCIA' | 'DEPOSITO' | 'YAPE_PLIN' | 'EFECTIVO' | 'OTRO'>('TRANSFERENCIA');
  const [formOperationNumber, setFormOperationNumber] = useState('');
  const [formSaleModality, setFormSaleModality] = useState<
    'CONTADO' | 'FINANCIADA'
  >('CONTADO');
  const [formSaleDownPayment, setFormSaleDownPayment] = useState('');
  const [formSaleInstallments, setFormSaleInstallments] = useState('12');
  const [reservasVigentes, setReservasVigentes] = useState<CrmReservaVigenteVenta[]>([]);
  const [autoseleccionPendiente, setAutoseleccionPendiente] = useState<{
    idProyecto: number; idEtapa: number; idLote: number;
  } | null>(null);
  const etapaConsulta = opType === 'Venta' ? formStageId : '';
  const destinoConsulta = opType === 'Venta' ? autoseleccionPendiente : null;
  const seleccionProspectoPeticionRef = React.useRef(0);
  const [pagosSeparacion,setPagosSeparacion]=useState<PagoSeparacionBorrador[]>(()=>[crearPagoSeparacion(1)]);
  const secuenciaPagoSeparacion=React.useRef(1);
  const reiniciarPagosSeparacion=()=>setPagosSeparacion([crearPagoSeparacion(++secuenciaPagoSeparacion.current)]);
  const [comprobantesVenta, setComprobantesVenta] = useState<File[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const registroSeparacionEnCursoRef = React.useRef(false);
  const registroVentaEnCursoRef = React.useRef(false);
  const [confirmacionVenta, setConfirmacionVenta] = useState<{
    datos: CrmSaleValidationInput;
    codigoProspecto: string;
    codigoLote: string;
    idAsesor?: number | null;
    resumen: ResumenVentaCalculado;
    tasaAnualPct: number;
    idPolitica: number;
  } | null>(null);

  const [datosVentaValidados, setDatosVentaValidados] = useState<{
    datos: CrmSaleValidationInput;
    codigoProspecto: string;
    codigoLote: string;
    idAsesor?: number | null;
    resumen: ResumenVentaCalculado;
    tasaAnualPct: number;
    idPolitica: number;
  } | null>(null);
  const [editandoComprador, setEditandoComprador] = useState(false);
  const [loadingFormData, setLoadingFormData] = useState(false);
  const [formTouched, setFormTouched] = useState(false);

  useEffect(() => {
    if (!detail || detail.type !== 'Separación') return;
    setInstanteActual(Date.now());
    const intervalo = window.setInterval(() => setInstanteActual(Date.now()), 60_000);
    const vencimiento = detail.expiresAtIso ? Date.parse(detail.expiresAtIso) : NaN;
    const milisegundos = vencimiento - Date.now();
    // Además de actualizar por minuto, pasar a «Vencida» al cumplirse la hora exacta.
    const timeout = Number.isFinite(milisegundos) && milisegundos > 0
      ? window.setTimeout(() => setInstanteActual(Date.now()), milisegundos + 100)
      : null;
    return () => {
      window.clearInterval(intervalo);
      if (timeout !== null) window.clearTimeout(timeout);
    };
  }, [detail]);

  const cambiarFiltroVenta = (campo: keyof FiltrosVentas, valor: string) => {
    setFiltrosVenta(prev => ({...prev,[campo]:valor}));
    setPaginaVentas(1);
  };
  const limpiarFiltrosVenta = () => {
    setFiltrosVenta(FILTROS_VENTAS_INICIALES);
    setPaginaVentas(1);
  };

  const cambiarFiltroSeparacion = (campo: keyof FiltrosSeparaciones, valor: string) => {
    setFiltrosSeparacion((previo) => ({ ...previo, [campo]: valor }));
    setPaginaSeparaciones(1);
  };

  const limpiarFiltrosSeparacion = () => {
    setFiltrosSeparacion(FILTROS_SEPARACIONES_INICIALES);
    setPaginaSeparaciones(1);
  };

  const proyectosFiltro = useMemo(
    () => opcionesUnicasSeparaciones(salesList, 'project'),
    [salesList]
  );
  const asesoresFiltro = useMemo(
    () => opcionesUnicasSeparaciones(salesList, 'advisor'),
    [salesList]
  );
  const metodosFiltro = useMemo(
    () => opcionesUnicasSeparaciones(salesList, 'paymentMethod'),
    [salesList]
  );
  const asesoresVentasFiltro = useMemo(
    () => opcionesUnicasVentas(salesList, 'advisor'),[salesList]
  );
  const proyectosVentasFiltro = useMemo(
    () => opcionesUnicasVentas(salesList, 'project'),[salesList]
  );
  const estadosVentasFiltro = useMemo(
    () => opcionesUnicasVentas(salesList, 'status'),[salesList]
  );

  const ejecutarExportacionSeparaciones = async () => {
    if (tab !== 'Separación' || exportandoSeparaciones) return;
    if (!can('sales.view') || !can('sales.export')) {
      toast.error('No tienes permiso para exportar separaciones.');
      return;
    }
    if (!periodoValido(periodoComercial)) {
      toast.error('Selecciona un período comercial válido para exportar.');
      return;
    }
    if (filtrosSeparacion.desde && filtrosSeparacion.hasta &&
        filtrosSeparacion.desde > filtrosSeparacion.hasta) {
      toast.error('La fecha desde no puede ser posterior a la fecha hasta.');
      return;
    }
    setExportandoSeparaciones(true);
    try {
      const resultado = await exportarSeparacionesExcel(filtrosSeparacion, periodoComercial);
      toast.success('Reporte Excel generado', {
        description: `${resultado.total} separaciones exportadas con el alcance de tu cartera autorizada.`
      });
    } catch (error: unknown) {
      toast.error('No se pudo exportar Separaciones', {
        description: error instanceof Error ? error.message : 'Revisa la conexión y los permisos.'
      });
    } finally {
      setExportandoSeparaciones(false);
    }
  };

  const ejecutarExportacionVentas = async () => {
    if (tab !== 'Venta' || exportandoVentas) return;
    if (!can('sales.view') || !can('sales.export')) {
      toast.error('No tienes permisos para exportar ventas.');
      return;
    }
    if (!periodoValido(periodoComercial)) {
      toast.error('Selecciona un período comercial global válido.');
      return;
    }
    setExportandoVentas(true);
    try {
      const resultado = await exportarVentasExcel(filtrosVenta, periodoComercial);
      toast.success('Reporte de ventas generado',{
        description:`${resultado.total} ventas exportadas de tu cartera autorizada.`
      });
    } catch(error:unknown) {
      toast.error('No se pudo exportar Ventas',{
        description:error instanceof Error ? error.message : 'Revisa tu conexión y permisos.'
      });
    } finally {
      setExportandoVentas(false);
    }
  };

  const fetchSalesData = async () => {
    setLoading(true);
    try {
      const liveSales = await salesService.getSales();
      setSalesList(liveSales ?? []);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al cargar ventas.';
      setSalesList([]);
      toast.error('No se pudieron cargar las operaciones.', { description: msg });
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    if (tab !== 'Venta') return;

    let activo = true;
    setEstadoDocumentos('cargando');

    const cargarDocumentacion = async () => {
      try {
        const documentos: Record<string, CrmContratoDocumentacion> = {};
        let consultados = 0;

        for (let pagina = 1; pagina <= 100; pagina++) {
          const respuesta = await crmBackend.listarContratosDocumentacion(
            '', pagina, 50
          );

          if (!Array.isArray(respuesta.items)) {
            throw new Error('Respuesta documental inválida.');
          }

          respuesta.items.forEach((contrato) => {
            documentos[`VENTA-${contrato.idVenta}`] = contrato;
          });

          consultados += respuesta.items.length;

          if (consultados >= respuesta.total) {
            if (activo) {
              setDocumentosPorVenta(documentos);
              setEstadoDocumentos('listo');
            }
            return;
          }

          if (respuesta.items.length === 0) {
            throw new Error('Listado documental incompleto.');
          }
        }

        throw new Error('Se excedió el límite de paginación documental.');
      } catch (error) {
        if (activo) {
          setEstadoDocumentos('error');
          toast.error(
            error instanceof Error
              ? error.message
              : 'No se pudo consultar la documentación.'
          );
        }
      }
    };

    void cargarDocumentacion();

    return () => {
      activo = false;
    };
  }, [tab, salesList]);

  const loadFormData = async () => {
    setLoadingFormData(true);
    ++seleccionProspectoPeticionRef.current;
    setEditorAsesor(false);
    setAsesorOperacion('');
    setErrorAsesorOperacion('');
    setSelectedProspectId('');
    setInteresesOperacion([]);
    setPreferenciasLote({});
    setEditorLote(false);
    setEditorInteres(false);
    setProyectoInteresNuevo('');
    setProyectoInteresAnterior('');
    setMotivoCambioInteres('');
    setErrorCambioInteres('');
    setAvailableProjects([]);
    setFormProjectId('');
    setAvailableLots([]);
    setLotesDisponiblesProyecto([]);
    setFormLotId('');

    try {
      const prospects = await crmBackend.prospectos();

      const elegibles = (prospects ?? []).filter((p) =>
        ['INTERESADO', 'NEGOCIACION', 'CON_RESERVA', 'CONVERTIDO'].includes(
          p.estado_codigo?.toUpperCase() ?? ''
        )
      );

      setProspectsList(elegibles);
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : 'Error al cargar prospectos.';

      toast.error('Error al consultar la cartera', {
        description: msg
      });
      setProspectsList([]);
    } finally {
      setLoadingFormData(false);
    }
  };


  const handleSelectProspect = async (id: number | '') => {
    const solicitud = ++seleccionProspectoPeticionRef.current;
    setSelectedProspectId(id);
    setEditorAsesor(false);
    setAsesorOperacion('');
    setErrorAsesorOperacion('');
    setInteresesOperacion([]);
    setPreferenciasLote({});
    setEditorLote(false);
    setEditorInteres(false);
    setProyectoInteresNuevo('');
    setProyectoInteresAnterior('');
    setMotivoCambioInteres('');
    setErrorCambioInteres('');
    setFormProjectId('');
    setFormStageId('');
    setAvailableStages([]);
    setAvailableProjects([]);
    setAvailableLots([]);
    setLotesDisponiblesProyecto([]);
    setFormLotId('');
    setReservasVigentes([]);
    setAutoseleccionPendiente(null);
    if (id === '') { setLoadingProjects(false); return; }

    setLoadingProjects(true);
    try {
      const [detalle, proyectos, consultaReservas] = await Promise.all([
        crmBackend.detalle(id),
        coreService.getActiveProjects(),
        opType === 'Venta'
          ? crmBackend.listarReservasVigentesParaVenta(id)
          : Promise.resolve({ reservas: [] as CrmReservaVigenteVenta[], idLotes: [] as number[] })
      ]);
      if (solicitud !== seleccionProspectoPeticionRef.current) return;
      const intereses = new Set((detalle.intereses ?? []).map((i) => i.idProyecto));
      setInteresesOperacion([...intereses]);
      const preferencias:typeof preferenciasLote={};
      for(const i of detalle.intereses??[]) {
        if(!preferencias[i.idProyecto]) preferencias[i.idProyecto]={
          id:i.idLoteInteres??null,codigo:i.codigoLoteInteres??null,comentario:i.comentario??null
        };
      }
      setPreferenciasLote(preferencias);
      setProspectsList(prev => prev.map(p => p.id_prospecto === id ? {...p,...detalle.prospecto} : p));
      // Una persona convertida puede comprar en otro proyecto; DB revalida permisos y disponibilidad.
      const compradorExistente = (detalle.prospecto.estado_codigo ?? '').toUpperCase() === 'CONVERTIDO';
      const elegibles = proyectos.filter((p) =>
        p.activo && (compradorExistente || intereses.has(p.idProyecto) || puedeEditarInteres)
      );
      setAvailableProjects(elegibles);
      setReservasVigentes(consultaReservas.reservas ?? []);

      const reserva = (consultaReservas.reservas ?? [])
        .find((r) => elegibles.some((p) => p.idProyecto === r.idProyecto));
      const destino = origenPlano && elegibles.some(p=>p.idProyecto===origenPlano.idProyecto)
        ? origenPlano : null;
      if (destino && intereses.has(destino.idProyecto)) {
        setAutoseleccionPendiente({idProyecto:destino.idProyecto,
          idEtapa:destino.idEtapa,idLote:destino.idLote});
        setFormProjectId(String(destino.idProyecto));
      } else if (reserva) {
        setAutoseleccionPendiente({
          idProyecto: reserva.idProyecto,
          idEtapa: reserva.idEtapa,
          idLote: reserva.idLote
        });
        setFormProjectId(String(reserva.idProyecto));
      } else {
        const registrado = [...intereses].find(idProyecto => elegibles.some(p => p.idProyecto === idProyecto));
        if (registrado !== undefined) setFormProjectId(String(registrado));
        if (destino && (compradorExistente || puedeEditarInteres)) {
          setProyectoInteresNuevo(String(destino.idProyecto));
          setProyectoInteresAnterior(registrado === undefined ? '' : String(registrado));
          setEditorInteres(true);
          toast.info('Confirme el interés en el proyecto del plano antes de continuar.');
        } else if (origenPlano) {
          toast.info('Este prospecto no tiene interés registrado en el proyecto del plano.');
        }
      }
    } catch (err: unknown) {
      if (solicitud !== seleccionProspectoPeticionRef.current) return;
      toast.error('No se pudieron cargar los datos del prospecto', {
        description: err instanceof Error ? err.message : 'Error al consultar proyectos y reservas.'
      });
    } finally {
      if (solicitud === seleccionProspectoPeticionRef.current) setLoadingProjects(false);
    }
  };

  const cerrarEditorInteres = () => {
    if (registrandoInteres) return;
    setEditorInteres(false);
    setProyectoInteresNuevo('');
    setProyectoInteresAnterior('');
    setMotivoCambioInteres('');
    setErrorCambioInteres('');
  };

  const abrirEditorInteres = () => {
    setProyectoInteresNuevo('');
    setProyectoInteresAnterior(formProjectId);
    setMotivoCambioInteres('');
    setErrorCambioInteres('');
    setEditorInteres(true);
  };

  const registrarInteresOperacion = async () => {
    if (!selectedProspectId || !proyectoInteresNuevo || registrandoInteres ||
        !proyectosSinInteres.some(p => p.idProyecto === Number(proyectoInteresNuevo))) return;
    if (esCambioInteres && (!interesesOperacion.includes(origenCambioInteres) ||
        origenCambioInteres === Number(proyectoInteresNuevo) || motivoCambioInteres.trim().length < 5)) return;
    setErrorCambioInteres('');
    const idProspecto = selectedProspectId;
    const idProyecto = Number(proyectoInteresNuevo);
    const solicitud = seleccionProspectoPeticionRef.current;
    setRegistrandoInteres(true);
    try {
      if (compradorOperacion) {
        await crmBackend.registrarInteresRecompra(idProspecto, idProyecto);
      } else {
        if (!puedeEditarInteres) return;
        if (esCambioInteres) {
          await crmBackend.cambiarInteresProyecto(idProspecto, idProyecto, origenCambioInteres, motivoCambioInteres.trim());
        } else {
          await crmBackend.actualizar(idProspecto, { idProyectoInteres: idProyecto });
        }
      }
      if (solicitud === seleccionProspectoPeticionRef.current) {
        setInteresesOperacion(prev => [...new Set([
          ...prev.filter(p => !esCambioInteres || p !== origenCambioInteres), idProyecto
        ])]);
        setPreferenciasLote(prev => {
          const siguientes = {...prev};
          if (esCambioInteres) delete siguientes[origenCambioInteres];
          delete siguientes[idProyecto];
          return siguientes;
        });
        // Cambiar el proyecto operativo solo tras la confirmación del CRM.
        const destino = origenPlano?.idProyecto === idProyecto ? origenPlano : null;
        setAutoseleccionPendiente(destino ? {idProyecto: destino.idProyecto, idEtapa: destino.idEtapa, idLote: destino.idLote} : null);
        setFormStageId('');
        setAvailableStages([]);
        setFormLotId('');
        setAvailableLots([]);
    setLotesDisponiblesProyecto([]);
        setFormProjectId(String(idProyecto));
        setEditorInteres(false);
        setProyectoInteresNuevo('');
        setProyectoInteresAnterior('');
        setMotivoCambioInteres('');
        setProspectsList(prev => prev.map(p => p.id_prospecto === idProspecto
          ? {...p,interes:availableProjects.find(proyecto => proyecto.idProyecto === idProyecto)?.nombre ?? p.interes} : p));
        toast.success(esCambioInteres ? 'Interés actualizado y registrado en el expediente CRM.'
          : 'Interés comercial registrado. Puedes continuar con la adquisición.');
      }
    } catch (err: unknown) {
      if (solicitud === seleccionProspectoPeticionRef.current)
        setErrorCambioInteres(err instanceof Error ? err.message : 'No se pudo actualizar el interés comercial.');
    } finally {
      setRegistrandoInteres(false);
    }
  };

  const abrirEditorAsesorOperacion = async () => {
    if (!clienteOperacion || !puedeAsignarAsesorOperacion || compradorOperacion ||
        (clienteOperacion.id_asesor ?? 0) > 0 || guardandoAsesorOperacion) return;
    const solicitud = seleccionProspectoPeticionRef.current;
    setEditorAsesor(true);
    setAsesorOperacion('');
    setErrorAsesorOperacion('');
    setAsesoresOperacion([]);
    setCargandoAsesoresOperacion(true);
    try {
      const asesores = await crmBackend.asesores();
      if (solicitud === seleccionProspectoPeticionRef.current)
        setAsesoresOperacion((asesores ?? []).filter(a => a.activo));
    } catch (err: unknown) {
      if (solicitud === seleccionProspectoPeticionRef.current)
        setErrorAsesorOperacion(err instanceof Error ? err.message : 'No se pudieron consultar los asesores.');
    } finally {
      if (solicitud === seleccionProspectoPeticionRef.current) setCargandoAsesoresOperacion(false);
    }
  };

  const guardarAsesorOperacion = async () => {
    if (!selectedProspectId || !puedeAsignarAsesorOperacion || compradorOperacion ||
        (clienteOperacion?.id_asesor ?? 0) > 0 || guardandoAsesorOperacion) return;
    const asesor = asesoresOperacion.find(a => a.id_asesor === Number(asesorOperacion));
    if (!asesor) return;
    const id = selectedProspectId;
    const solicitud = seleccionProspectoPeticionRef.current;
    setGuardandoAsesorOperacion(true);
    setErrorAsesorOperacion('');
    try {
      // Reutiliza el flujo CRM: valida rol, asesor habilitado y registra el seguimiento.
      const detalle = await crmBackend.detalle(id);
      if ((detalle.prospecto.id_asesor ?? 0) > 0) {
        setProspectsList(prev => prev.map(p => p.id_prospecto === id ? {...p,...detalle.prospecto} : p));
        setEditorAsesor(false);
        toast.info('El cliente ya tiene un asesor asignado.');
        return;
      }
      await crmBackend.asesor(id, asesor.id_asesor, 'Asignación desde Separaciones y Ventas');
      if (solicitud === seleccionProspectoPeticionRef.current) {
        setProspectsList(prev => prev.map(p => p.id_prospecto === id
          ? {...p,id_asesor:asesor.id_asesor,asesor_nombre:asesor.nombre_completo} : p));
        setEditorAsesor(false);
        toast.success('Asesor asignado en CRM. Puedes continuar con la operación.');
      }
    } catch (err: unknown) {
      if (solicitud === seleccionProspectoPeticionRef.current)
        setErrorAsesorOperacion(err instanceof Error ? err.message : 'No se pudo asignar el asesor.');
    } finally {
      setGuardandoAsesorOperacion(false);
    }
  };

  useEffect(() => {
    void fetchSalesData();
  }, []);

  const handleOpenModal = () => {
    void loadFormData();
    setFormTouched(false);
    setFormPaymentMethod('TRANSFERENCIA');
    setFormSaleModality('CONTADO');
    setFormSaleDownPayment('');
    setFormSaleInstallments('12');
    setFormOperationNumber('');
    reiniciarPagosSeparacion();
    setComprobantesVenta([]);
    setFormObservations('');
    setDatosVentaValidados(null);
    setEditandoComprador(false);
    setConfirmacionVenta(null);
    setIsModalOpen(true);
  };

  useEffect(() => {
    if(!origenPlano || !can('sales.create')) return;
    setTab(origenPlano.operacion === 'Venta' ? 'Venta' : 'Separación');
    handleOpenModal();
    window.history.replaceState(window.history.state,'',window.location.pathname);
    // Solo al entrar desde el plano; no reiniciar el formulario mientras se edita.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(()=>{
    if(!preseleccionAgrupada||!isModalOpen||loadingFormData||prospectsList.length===0
        ||tab!=='Venta')return;
    const seleccion=preseleccionAgrupada;
    if(!prospectsList.some(p=>p.id_prospecto===seleccion.idProspecto))return;
    setPreseleccionAgrupada(null);
    setFormSaleModality(seleccion.modalidad);
    void handleSelectProspect(seleccion.idProspecto);
    // Al seleccionar comprador se conserva el origenPlano para preseleccionar lote.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  },[preseleccionAgrupada,isModalOpen,loadingFormData,prospectsList,tab]);

  const cerrarModalOperacion = () => {
    if (
      registroSeparacionEnCursoRef.current ||
      registroVentaEnCursoRef.current ||
      confirmacionVenta || registrandoInteres || guardandoAsesorOperacion || guardandoLote || cargandoAdicional || submitting
    ) return;

    ++seleccionProspectoPeticionRef.current;
    setEditorAsesor(false);
    setIsModalOpen(false);
    setEditorLote(false);
    setPreseleccionAgrupada(null);
    setAsociacionAgrupadaPendiente(null);
    setOrigenPlano(null);
    setAutoseleccionPendiente(null);
    setDatosVentaValidados(null);
    setEditandoComprador(false);
  };

  useEffect(()=>{
    ++revisionLotesAdicionales.current;
    setLotesAdicionales([]);
    setCandidatoAdicional('');
    setEditorAdicional(false);
    setErrorAdicional('');
    setCargandoAdicional(false);
  },[selectedProspectId,formProjectId,formLotId,isModalOpen,revisionPolitica]);

  useEffect(()=>{
    setEditorLote(false);
    setLoteCandidato('');
    setMotivoLote('');
    setErrorLote('');
  },[selectedProspectId,formProjectId,isModalOpen]);

  const abrirEditorLote=()=>{
    setLoteCandidato('');
    setMotivoLote('');
    setErrorLote('');
    setEditorLote(true);
  };

  const confirmarLoteInteres=async()=>{
    const candidato=lotesDisponiblesProyecto.find(l=>l.idLote===Number(loteCandidato));
    if(!candidato||!selectedProspectId||guardandoLote||submitting) return;
    const solicitud=seleccionProspectoPeticionRef.current;
    const proyecto=Number(formProjectId);
    setGuardandoLote(true);
    setErrorLote('');
    try {
      if(puedeEditarInteres && candidato.idLote!==preferenciaLote?.id) {
        if(motivoLote.trim().length<5) return;
        const res=await crmBackend.cambiarLoteInteres(selectedProspectId,proyecto,candidato.idLote,preferenciaLote?.id??null,motivoLote.trim());
        if(solicitud!==seleccionProspectoPeticionRef.current) return;
        setPreferenciasLote(prev=>({...prev,[proyecto]:{
          id:res.idLoteInteres,codigo:res.codigoLoteInteres,comentario:prev[proyecto]?.comentario??null
        }}));
        toast.success('Lote de interés actualizado en el expediente CRM.');
      }
      if(solicitud!==seleccionProspectoPeticionRef.current) return;
      const etapaNueva=availableStages.find(e=>e.idLotes.includes(candidato.idLote));
      if(opType==='Venta' && etapaNueva && etapaNueva.codigo!==formStageId){
        setAutoseleccionPendiente({idProyecto:proyecto,idEtapa:candidato.idEtapa,idLote:candidato.idLote});
        setFormStageId(etapaNueva.codigo);
      }
      handleSelectLot(String(candidato.idLote));
      setEditorLote(false);
    } catch(err:unknown) {
      if(solicitud===seleccionProspectoPeticionRef.current)
        setErrorLote(err instanceof Error?err.message:'No se pudo confirmar el lote.');
    } finally {setGuardandoLote(false);}
  };

  const agregarLoteAdicional=async()=>{
    const lote=lotesDisponiblesProyecto.find(l=>l.idLote===Number(candidatoAdicional));
    if(!lote||!selectedProspectId||cargandoAdicional||submitting||lotesAdicionales.length>=19||
      lote.idLote===Number(formLotId)||lotesAdicionales.some(l=>l.idLote===lote.idLote))return;
    const revision=revisionLotesAdicionales.current;
    setCargandoAdicional(true);setErrorAdicional('');
    try{
      const [precio,politica]=await Promise.all([
        coreService.getCurrentLotPrice(lote.idLote,'PEN'),
        crmBackend.obtenerCondicionesVenta(selectedProspectId,lote.idLote)
      ]);
      if(revision!==revisionLotesAdicionales.current)return;
      if(!precio||precio.idLote!==lote.idLote||precio.codigoMoneda!=='PEN'||precio.activo!==true||!Number.isFinite(Number(precio.precio))||Number(precio.precio)<=0||
        !politica||!Number.isFinite(politica.montoSeparacion)||politica.montoSeparacion<=0||
        !Number.isInteger(politica.diasVencimientoSeparacion)||politica.diasVencimientoSeparacion<1)
        throw new Error('No se pudieron verificar el precio y la política del lote.');
      setLotesAdicionales(prev=>[...prev,{idLote:lote.idLote,codigo:lote.codigo,precio:Number(precio.precio),
        monto:politica.montoSeparacion,dias:politica.diasVencimientoSeparacion}]);
      setCandidatoAdicional('');setEditorAdicional(false);
    }catch(err:unknown){
      if(revision===revisionLotesAdicionales.current)setErrorAdicional(err instanceof Error?err.message:'No se pudo añadir el lote.');
    }finally{if(revision===revisionLotesAdicionales.current)setCargandoAdicional(false);}
  };

  const handleSelectLot = (lotIdStr: string) => {
    setFormLotId(lotIdStr);
    setComprobantesVenta([]);
  };

  useEffect(() => {
    setPoliticaOperativa(null);
    setErrorPolitica(null);
    if (!isModalOpen || !selectedProspectId || !formLotId) {
      setConsultandoPolitica(false);
      return;
    }
    let vigente = true;
    const idProspecto = Number(selectedProspectId);
    const idLote = Number(formLotId);
    setConsultandoPolitica(true);
    void crmBackend.obtenerCondicionesVenta(idProspecto, idLote)
      .then(condiciones => {
        if (!vigente) return;
        if (!condiciones || !Number.isFinite(condiciones.montoSeparacion) || condiciones.montoSeparacion <= 0
          || !Number.isInteger(condiciones.diasVencimientoSeparacion) || condiciones.diasVencimientoSeparacion < 1
          || !Number.isInteger(condiciones.idPolitica) || condiciones.idPolitica < 1) {
          setErrorPolitica('La política recibida no contiene condiciones de separación válidas.');
          return;
        }
        setPoliticaOperativa({ idProspecto, idLote, condiciones });
      })
      .catch(err => {
        if (vigente) setErrorPolitica(err instanceof Error ? err.message
          : 'No se pudo consultar la política financiera.');
      })
      .finally(() => { if (vigente) setConsultandoPolitica(false); });
    return () => { vigente = false; };
  }, [isModalOpen, selectedProspectId, formLotId, revisionPolitica]);

  useEffect(() => {
    reiniciarPagosSeparacion();
    setFormOperationNumber('');
    setComprobantesVenta([]);
  }, [
    selectedProspectId,
    formProjectId,
    formStageId,
    formLotId
  ]);

  const archivosVentaObligatorios = formPaymentMethod !== 'EFECTIVO';
  const requiereNumeroOperacionVenta = ['TRANSFERENCIA','DEPOSITO','YAPE_PLIN']
    .includes(formPaymentMethod);
  const agregarComprobantesVenta = (e: React.ChangeEvent<HTMLInputElement>) => {
    const candidatos = Array.from(e.target.files ?? []);
    e.target.value = '';
    if (!candidatos.length) return;
    if (comprobantesVenta.length + candidatos.length > 8) {
      toast.error('Se permiten como máximo 8 comprobantes por venta.');
      return;
    }
    const invalidos = candidatos.filter(f =>
      !['application/pdf','image/jpeg','image/png','image/webp'].includes(f.type)
      || f.size < 1 || f.size > 5242880 || f.name.length > 255);
    if (invalidos.length) {
      toast.error('Solo se admiten PDF, JPG, PNG o WebP, máximo 5 MB por archivo.');
      return;
    }
    setComprobantesVenta(prev => [...prev, ...candidatos]);
  };

  const validarFormularioSeparacion = (): boolean => {
    setFormTouched(true);
    if (!separacionCondicionesVerificadas || !lotePrincipal || cargandoAdicional) {
      toast.error('Verifica los lotes y las condiciones financieras antes de continuar.');
      return false;
    }
    if (!validacionPagosSeparacion.valido) {
      toast.error('Completa los comprobantes y verifica que los abonos coincidan con el total de separación.');
      return false;
    }
    return true;
  };

  const validarVentaAntesDeRevisarComprador = async () => {
    if (submitting || registroVentaEnCursoRef.current) return;

    const idProspecto = Number(selectedProspectId);
    const idLote = Number(formLotId);
    const lote = availableLots.find((item) => item.idLote === idLote);

    if (
      !Number.isSafeInteger(idProspecto) ||
      idProspecto <= 0 ||
      !lote ||
      loadingLots ||
      estadoPrecio !== 'disponible' ||
      precioLote?.idLote !== idLote
    ) {
      toast.error('Seleccione un comprador y un lote con precio verificado.');
      return;
    }

    if (!condicionesVenta || consultandoPolitica) {
      toast.error('No se pudieron cargar las condiciones contractuales de este lote. Actualiza la selección.');
      return;
    }
    const montoTotal = Number(precioLote.precio);
    const esFinanciada = formSaleModality === 'FINANCIADA';
    const montoInicial = Number(formSaleDownPayment);
    const numeroCuotas = Number(formSaleInstallments);

    if (!Number.isFinite(montoTotal) || montoTotal <= 0) {
      toast.error('El precio oficial no es válido.');
      return;
    }

    if (
      esFinanciada &&
      (
        !formSaleDownPayment.trim() ||
        !Number.isFinite(montoInicial) ||
        Boolean(validarInicialTotal(formSaleDownPayment,montoTotal,reservaAplicable,condicionesVenta)) ||
        montoInicial >= montoTotal ||
        !Number.isInteger(numeroCuotas) ||
        numeroCuotas < condicionesVenta.cuotasMin ||
        numeroCuotas > condicionesVenta.cuotasMax
      )
    ) {
      toast.error('La inicial o el número de cuotas no cumple la política financiera de esta operación.');
      return;
    }

    const errorPago = validarPagoVenta(formPaymentMethod, formOperationNumber, comprobantesVenta);
    if (errorPago) {
      toast.error(errorPago);
      return;
    }

    const datos = {
      idProspecto,
      idLote,
      modalidad: formSaleModality,
      montoTotal,
      montoInicial: esFinanciada ? montoInicial : null,
      numeroCuotas: esFinanciada ? numeroCuotas : null,
      tasaInteresMensualPct: null,
      observaciones: formObservations.trim() || null
    };

    registroVentaEnCursoRef.current = true;
    setSubmitting(true);

    try {
      // Revalidación obligatoria antes de registrar.
      const validacion = await crmBackend.validarVenta(datos);

      if (
        !resumenVenta ||
        !validacion.elegible ||
        validacion.idProspecto !== idProspecto ||
        validacion.idLote !== idLote ||
        validacion.modalidad !== formSaleModality ||
        Number(validacion.precioVigente) !== montoTotal ||
        Number(validacion.montoReservaAplicable) !== reservaAplicable ||
        validacion.idPolitica !== condicionesVenta.idPolitica ||
        (esFinanciada && !validacion.planFrances)
      ) {
        throw new Error('La validación comercial no coincide con la operación.');
      }

      // La simulación local es orientativa: el cronograma financiero que
      // prevalece es el de Core/Supabase, con redondeo decimal exacto.
      const plan = validacion.planFrances;
      const resumenValidado: ResumenVentaCalculado = esFinanciada && plan ? {
        ...resumenVenta!,
        capitalFinanciado: Number(plan.capitalFinanciado),
        interesTotal: Number(plan.interesTotal),
        totalCuotas: Number(plan.totalCuotas),
        totalOperacionConIntereses: Number(plan.totalOperacion),
        cuotaMensual: Number(plan.cuotaMensual),
        cuotas: plan.cuotas ?? resumenVenta!.cuotas
      } : resumenVenta!;
      setDatosVentaValidados({
        datos,
        codigoProspecto: validacion.codigoProspecto,
        codigoLote: validacion.codigoLote,
        idAsesor: validacion.idAsesor,
        tasaAnualPct: condicionesVenta.tasaNominalAnualPct,
        idPolitica: condicionesVenta.idPolitica,
        resumen: resumenValidado
      });
      setEditandoComprador(true);

    } catch (err: unknown) {
      toast.error('No se pudo confirmar el registro de venta', {
        description:
          (err instanceof Error ? err.message : 'Error inesperado.') +
          ' Revise las operaciones existentes antes de volver a intentarlo.',
        duration: 10000
      });
    } finally {
      registroVentaEnCursoRef.current = false;
      setSubmitting(false);
    }
  };

  const handleProcessOperation = async (e: React.FormEvent) => {
    e.preventDefault();

    if (submitting || registroSeparacionEnCursoRef.current || registrandoInteres || guardandoAsesorOperacion || editorAsesor || editorInteres || editorLote || guardandoLote || cargandoAdicional || editorAdicional) return;

    if (opType === 'Venta') {
      setFormTouched(true);
      await validarVentaAntesDeRevisarComprador();
      return;
    }

    // Separaciones usan la política vigente, sin montos fijos del frontend.
    if (!validarFormularioSeparacion()) return;

    if (SEPARACION_ENVIO_DESHABILITADO) {
      toast.info('El registro del pago acumulado requiere la integración financiera de la fase 3.');
      return;
    }
    // No se admite el contrato anterior. La fase 3 conectará el nuevo registro transaccional.
    toast.error('El servicio de pagos acumulados aún no está conectado.');
  };

  const confirmarRegistroVentaPendiente = async () => {
    if (
      !confirmacionVenta ||
      submitting ||
      registroVentaEnCursoRef.current
    ) return;

    const solicitud = confirmacionVenta;

    registroVentaEnCursoRef.current = true;
    setSubmitting(true);

    try {
      if (!solicitud.datos.datosComprador) {
        throw new Error('Revise primero los datos del comprador.');
      }
      // Una venta derivada de negociación no puede cambiar comprador, lote
      // ni modalidad y quedar vinculada incorrectamente.
      if(asociacionAgrupadaPendiente
        &&(solicitud.datos.idProspecto!==asociacionAgrupadaPendiente.idProspecto
          ||solicitud.datos.idLote!==asociacionAgrupadaPendiente.idLote
          ||solicitud.datos.modalidad!==asociacionAgrupadaPendiente.modalidad)){
        throw new Error('La venta no coincide con el comprador, lote y modalidad de la compra agrupada. Revisa la selección antes de registrar.');
      }
      const errorPago = validarPagoVenta(formPaymentMethod, formOperationNumber, comprobantesVenta);
      if (errorPago) throw new Error(errorPago);
      const cargados: CrmVoucherVenta[] = [];
      for (const archivo of comprobantesVenta) {
        const cargado = await crmBackend.subirComprobanteVenta(solicitud.datos, archivo);
        cargados.push(cargado);
      }
      if (solicitud.datos.datosComprador?.estadoCivil === 'CASADO'
          && !solicitud.datos.datosComprador.conyuge) {
        throw new Error('Debe completar los datos del cónyuge.');
      }
      const resultado = await crmBackend.registrarVentaPendiente({
        ...solicitud.datos,
        datosPago: {
          idPoliticaEsperada: solicitud.idPolitica,
          metodoPago: formPaymentMethod,
          numeroOperacion: formOperationNumber.trim() || null,
          comprobantes: cargados
        }
      });

      if (
        !resultado.success ||
        resultado.estadoVenta !== 'PENDIENTE' ||
        resultado.estadoContrato !== 'PENDIENTE_FIRMA'
      ) {
        throw new Error('La respuesta requiere revisión.');
      }

      setConfirmacionVenta(null);
      setIsModalOpen(false);
      setComprobantesVenta([]);

      toast.success('Venta pendiente registrada', {
        description:
          `Venta: ${resultado.codigoVenta}. ` +
          `Contrato: ${resultado.codigoContrato}. ` +
          'Pendiente de firma y aprobación.',
        duration: 10000
      });

      // El registro ya se confirmó; un error de agrupación nunca debe ocultar
      // ni reintentar la venta recién creada.
      if (asociacionAgrupadaPendiente
          &&asociacionAgrupadaPendiente.idLote===resultado.idLote
          &&asociacionAgrupadaPendiente.idProspecto===resultado.idProspecto
          &&asociacionAgrupadaPendiente.modalidad===resultado.modalidad) {
        try {
          await crmBackend.vincularVentaAgrupada(
            asociacionAgrupadaPendiente.idOperacion,resultado.idVenta
          );
          toast.success('Venta vinculada a su negociación agrupada',{
            description:'El contrato y cronograma permanecen individuales por lote.'
          });
        }catch(e){
          toast.warning('Venta creada, pero sin asociar a la negociación',{
            description:(e instanceof Error?e.message:'Error de vinculación.')
              +' Abre Compras agrupadas para vincularla sin registrar otra venta.',
            duration:12000
          });
        }finally{
          setAsociacionAgrupadaPendiente(null);
        }
      }

      // Evita que la próxima venta herede el origen de plano/negociación anterior.
      setOrigenPlano(null);
      setAsociacionAgrupadaPendiente(null);
      await fetchSalesData();
    } catch (err: unknown) {
      setConfirmacionVenta(null);
      const cambioPolitica = err instanceof ApiError && err.status === 409
        && err.message.includes('La política financiera cambió.');
      if (cambioPolitica) {
        // Invalida la cotización y exige una nueva revisión antes de intentar registrar.
        setDatosVentaValidados(null);
        setPoliticaOperativa(null);
        setRevisionPolitica(revision => revision + 1);
      }
      toast.error(cambioPolitica
        ? 'Las condiciones de financiamiento cambiaron'
        : 'No se pudo confirmar el registro', {
        description: cambioPolitica
          ? 'Se están consultando las condiciones actualizadas. Revise la inicial, las cuotas y vuelva a validar la venta.'
          : (err instanceof Error ? err.message : 'Error inesperado.')
            + ' Revise las operaciones antes de reintentar.',
        duration: 10000
      });
    } finally {
      registroVentaEnCursoRef.current = false;
      setSubmitting(false);
    }
  };

  const rows = useMemo(() => {
    if (tab === 'Separación') {
      return filtrarSeparaciones(salesList, filtrosSeparacion);
    }
    return filtrarVentas(salesList,filtrosVenta);
  }, [salesList, tab, filtrosSeparacion, filtrosVenta]);

  const textoVencimientoDetalle = detail?.type === 'Separación'
    ? leyendaVencimiento(detail.expiresAtIso, detail.status, instanteActual)
    : null;

  const totalPaginasSeparaciones = Math.max(1, Math.ceil(rows.length / tamanoPaginaSeparaciones));
  const paginaSeparacionesActual = Math.min(paginaSeparaciones, totalPaginasSeparaciones);
  const filasSeparacionesPagina = rows.slice(
    (paginaSeparacionesActual - 1) * tamanoPaginaSeparaciones,
    paginaSeparacionesActual * tamanoPaginaSeparaciones
  );
  const totalPaginasVentas = Math.max(1,Math.ceil(rows.length / tamanoPaginaVentas));
  const paginaVentasActual = Math.min(paginaVentas,totalPaginasVentas);
  const filasVentasPagina = rows.slice(
    (paginaVentasActual-1)*tamanoPaginaVentas,
    paginaVentasActual*tamanoPaginaVentas
  );
  const reservaAplicable = opType === 'Venta' && formLotId
    ? reservasVigentes.find((r) => r.idLote === Number(formLotId))?.montoReservaAplicable ?? 0
    : 0;
  const condicionesVenta = politicaOperativa
    && politicaOperativa.idProspecto === Number(selectedProspectId)
    && politicaOperativa.idLote === Number(formLotId)
    ? politicaOperativa.condiciones : null;
  const separacionCondicionesVerificadas = Boolean(selectedProspectId && formLotId && condicionesVenta
    && !consultandoPolitica && !errorPolitica && estadoPrecio === 'disponible'
    && precioLote?.idLote === Number(formLotId));
  const lotePrincipal = lotesDisponiblesProyecto.find(l=>l.idLote===Number(formLotId));
  const nombreEtapaLote = (id:number) => availableStages.find(e=>e.idLotes.includes(id))?.nombre;
  const totalSeparacionSeleccion = (condicionesVenta?.montoSeparacion ?? 0)+lotesAdicionales.reduce((sum,l)=>sum+l.monto,0);
  const totalPrecioSeleccion = (precioLote?.idLote===Number(formLotId)?Number(precioLote.precio):0)+lotesAdicionales.reduce((sum,l)=>sum+l.precio,0);
  const pagosSeparacionResueltos = resolverPagosSeparacion(pagosSeparacion,totalSeparacionSeleccion);
  const validacionPagosSeparacion = validarPagosSeparacion(pagosSeparacionResueltos,totalSeparacionSeleccion);
  const inicialMinimaVigente = condicionesVenta?.modoInicial === 'FIJA'
    ? Number(condicionesVenta.inicialFija)
    : Number(condicionesVenta?.inicialMinima ?? 0);
  const cuotasMinimas = condicionesVenta?.cuotasMin ?? 1;
  const cuotasMaximas = condicionesVenta?.cuotasMax ?? 36;

  const resumenVenta = useMemo(() => {
    if (opType !== 'Venta' || !precioLote || estadoPrecio !== 'disponible'
        || precioLote.idLote !== Number(formLotId) || !condicionesVenta) return null;
    try {
      if (formSaleModality === 'CONTADO')
        return calcularVenta(Number(precioLote.precio), reservaAplicable, 0, 0, condicionesVenta);
      if (!formSaleDownPayment.trim() || !formSaleInstallments.trim()
          || Number(formSaleDownPayment) < inicialMinimaVigente) return null;
      return calcularVenta(
        Number(precioLote.precio), reservaAplicable,
        Number(formSaleDownPayment), Number(formSaleInstallments), condicionesVenta);
    } catch {
      return null;
    }
  }, [opType, precioLote, estadoPrecio, formLotId, formSaleModality,
      formSaleDownPayment, formSaleInstallments, reservaAplicable, condicionesVenta, inicialMinimaVigente]);

  const errorMontoInicial = opType === 'Venta' && formSaleModality === 'FINANCIADA' && condicionesVenta
    ? validarInicialTotal(
        formSaleDownPayment,
        precioLote ? Number(precioLote.precio) : null,
        reservaAplicable,
        condicionesVenta
      )
    : null;
  const ventaFinanciadaInvalida = opType === 'Venta' && formSaleModality === 'FINANCIADA'
    && (!condicionesVenta || !formSaleDownPayment.trim() || Boolean(errorMontoInicial)
      || !/^[0-9]{1,2}$/.test(formSaleInstallments)
      || Number(formSaleInstallments) < cuotasMinimas
      || Number(formSaleInstallments) > cuotasMaximas);

  const separacionesPlazoVencido = salesList.filter(s =>
    s.type === 'Separación' &&
    leyendaVencimiento(s.expiresAtIso, s.status, instanteActual) === 'Vencida'
  ).length;
  const separationsCount = salesList.filter((s) => s.type === 'Separación').length;
  const salesCount = salesList.filter((s) => s.type === 'Venta').length;

  useEffect(() => {
    let vigente = true;
    setAvailableStages([]);
    setFormStageId('');
    if (!formProjectId || !selectedProspectId || !proyectoConInteres) {
      setLoadingStages(false);
      return;
    }
    setLoadingStages(true);
    void crmBackend.listarEtapasOperacion(selectedProspectId, Number(formProjectId), opType === 'Venta')
      .then(etapas => {
        if (!vigente) return;
        setAvailableStages(etapas ?? []);
        if (opType==='Venta' && etapas.length === 1) setFormStageId(etapas[0].codigo);
      })
      .catch((err: unknown) => {
        if (vigente) toast.error('No se pudieron cargar las etapas comerciales', {
          description: err instanceof Error ? err.message : 'Error de consulta.'
        });
      })
      .finally(() => { if (vigente) setLoadingStages(false); });
    return () => { vigente = false; };
  }, [formProjectId, selectedProspectId, proyectoConInteres, opType]);

  // El acceso desde el plano o desde una reserva conserva la ubicación física,
  // pero se selecciona el grupo comercial según el identificador real del lote.
  useEffect(() => {
    if (opType!=='Venta' || !autoseleccionPendiente || autoseleccionPendiente.idProyecto !== Number(formProjectId)) return;
    const destino = availableStages.find(e => e.idLotes.includes(autoseleccionPendiente.idLote));
    if (destino) setFormStageId(destino.codigo);
  }, [availableStages, autoseleccionPendiente, formProjectId, opType]);

  useEffect(() => {
    let vigente = true;

    setAvailableLots([]);
    setLotesDisponiblesProyecto([]);
    setFormLotId('');

    if (!formProjectId || !selectedProspectId || !proyectoConInteres || !availableStages.length || (opType==='Venta'&&!etapaConsulta)) {
      setLoadingLots(false);
      return;
    }

    const idProyecto = Number(formProjectId);
    const etapa = availableStages.find(e => e.codigo === etapaConsulta);
    if (opType==='Venta' && !etapa) { setLoadingLots(false); return; }
    const idsEtapa = new Set(opType==='Separacion'
      ? availableStages.flatMap(e=>e.idLotes)
      : etapa?.idLotes ?? []);

    setLoadingLots(true);

    const cargarLotes = async () => {
      try {
        const [lotes, reservas, comercializables] = await Promise.all([
          coreService.searchLots({
            idProyecto,
            activo: true
          }),

          opType === 'Venta'
            ? crmBackend.listarLotesReservadosDelProspecto(
              Number(selectedProspectId)
            )
            : Promise.resolve({ idLotes: [] as number[] }),
          coreService.getCommercializableLots(idProyecto)
        ]);

        if (!vigente) return;

        const idsReservados = new Set(
          (reservas.idLotes ?? []).filter(
            (id) => Number.isSafeInteger(id) && id > 0
          )
        );

        const idsComerciales = new Set(comercializables);
        const lotesPermitidos = (lotes ?? []).filter((lote) => {
          if (
            lote.activo !== true ||
            lote.idProyecto !== idProyecto ||
            !idsEtapa.has(lote.idLote)
          ) {
            return false;
          }

          const estado = lote.codigoEstadoLote?.toUpperCase();

          if (estado === 'DISPONIBLE') {
            return idsComerciales.has(lote.idLote);
          }

          return (
            opType === 'Venta' &&
            estado === 'RESERVADO' &&
            idsReservados.has(lote.idLote)
          );
        });

        const idsProyecto=new Set(availableStages.flatMap(e=>e.idLotes));
        setLotesDisponiblesProyecto((lotes??[]).filter(l=>l.activo===true&&l.idProyecto===idProyecto
          &&idsProyecto.has(l.idLote)&&l.codigoEstadoLote?.toUpperCase()==='DISPONIBLE'&&idsComerciales.has(l.idLote)));
        setAvailableLots(lotesPermitidos);
        if (destinoConsulta &&
            destinoConsulta.idProyecto === idProyecto &&
            lotesPermitidos.some((lote) => lote.idLote === destinoConsulta.idLote)) {
          setFormLotId(String(destinoConsulta.idLote));
        }
      } catch (err: unknown) {
        if (!vigente) return;

        setAvailableLots([]);
    setLotesDisponiblesProyecto([]);

        toast.error('No se pudieron consultar los lotes', {
          description:
            err instanceof Error
              ? err.message
              : 'Error al verificar los lotes autorizados.'
        });
      } finally {
        if (vigente) {
          setLoadingLots(false);
        }
      }
    };

    void cargarLotes();

    return () => {
      vigente = false;
    };
  }, [
    formProjectId,
    etapaConsulta,
    selectedProspectId,
    opType,
    proyectoConInteres,
    availableStages,
    destinoConsulta
  ]);

  // En separación se consulta todo el inventario del proyecto, sin exigir una etapa.
  // Solo se preselecciona una preferencia explícita del CRM si está comercializable.
  useEffect(()=>{
    if(opType!=='Separacion'||!isModalOpen||loadingProjects||loadingStages||loadingLots||
        !selectedProspectId||!formProjectId||formLotId||!lotesDisponiblesProyecto.length)return;
    const idPreferido=preferenciaLote?.id;
    const idDestino=autoseleccionPendiente?.idProyecto===Number(formProjectId)
      ? autoseleccionPendiente.idLote : null;
    const idElegible=idPreferido??idDestino;
    if(idElegible&&lotesDisponiblesProyecto.some(l=>l.idLote===idElegible))
      setFormLotId(String(idElegible));
  },[opType,isModalOpen,loadingProjects,loadingStages,loadingLots,selectedProspectId,formProjectId,
    formLotId,lotesDisponiblesProyecto,preferenciaLote?.id,autoseleccionPendiente]);



  useEffect(() => {
    let vigente = true;

    setPrecioLote(null);

    if (!formLotId) {
      setEstadoPrecio('inicial');
      return;
    }

    const idLote = Number(formLotId);

    setEstadoPrecio('cargando');

    void coreService
      .getCurrentLotPrice(idLote, 'PEN')
      .then((resultado) => {
        if (!vigente) return;

        const precio = Number(resultado.precio);

        if (
          resultado.idLote !== idLote ||
          resultado.codigoMoneda !== 'PEN' ||
          resultado.activo !== true ||
          !Number.isFinite(precio) ||
          precio <= 0
        ) {
          setEstadoPrecio('error');
          return;
        }

        setPrecioLote(resultado);
        setEstadoPrecio('disponible');
      })
      .catch((err: unknown) => {
        if (!vigente) return;

        setPrecioLote(null);

        if (err instanceof ApiError && err.status === 404) {
          setEstadoPrecio('sin_precio');
        } else {
          setEstadoPrecio('error');

          toast.error('No se pudo consultar el precio del lote', {
            description:
              err instanceof Error
                ? err.message
                : 'Error de comunicación con Core.'
          });
        }
      });

    return () => {
      vigente = false;
    };
  }, [formLotId]);


  return (
    <div>
      <PageHeader
        title="Separaciones y ventas"
        description={tab === 'Separación'
          ? 'Gestiona separaciones según la política vigente, métodos de pago y reservas de lotes.'
          : tab === 'Venta'
            ? 'Gestiona las ventas, modalidades de financiamiento y contratos asociados.'
            : tab === 'Agrupadas'
              ? 'Organiza compras de múltiples lotes por comprador, proyecto y modalidad.'
              : 'Gestiona los contratos y documentos comerciales de las operaciones.'}
        actions={
          <div className="flex items-center gap-2">
            {tab === 'Venta' && (
              <Gate permission="sales.export">
                <Button icon={DownloadIcon} disabled={exportandoVentas}
                  onClick={()=>void ejecutarExportacionVentas()}>
                  {exportandoVentas ? 'Exportando…' : 'Exportar Excel'}
                </Button>
              </Gate>
            )}
            {tab === 'Separación' && (
              <Gate permission="sales.export">
                <Button
                  icon={DownloadIcon}
                  disabled={exportandoSeparaciones}
                  onClick={() => void ejecutarExportacionSeparaciones()}
                >
                  {exportandoSeparaciones ? 'Exportando…' : 'Exportar Excel'}
                </Button>
              </Gate>
            )}
            {(tab === 'Separación' || tab === 'Venta') && (
              <Gate permission="sales.create">
                <Button icon={PlusIcon} variant="primary" onClick={handleOpenModal}>
                  {tab === 'Separación' ? 'Nueva Separación' : 'Nueva Venta'}
                </Button>
              </Gate>
            )}
          </div>
        }
      />

      {(tab === 'Separación' || tab === 'Venta') && (
        <ResumenComercialOperaciones
          operaciones={salesList}
          periodo={periodoComercial}
          onChange={setPeriodoComercial}
        />
      )}

      <Tabs
        className="mb-5"
        active={tab}
        onChange={(id) => {
          setTab(id as typeof tab);
          limpiarFiltrosVenta();
          limpiarFiltrosSeparacion();
        }}
        items={[
          {
            id: 'Separación',
            label: 'Separaciones',
            count: separationsCount
          },
          {
            id: 'Venta',
            label: 'Ventas',
            count: salesCount
          },
          {
            id: 'Agrupadas',
            label: 'Compras agrupadas'
          },
          {
            id: 'Contratos',
            label: 'Contratos pendientes de firma'
          },
          {
            id: 'Anexos',
            label: 'Gestionar anexos de ventas'
          }
        ]}
      />

      {tab === 'Separación' && separacionesPlazoVencido > 0 && (
        <Alert tone="warning" title="Separaciones con plazo vencido" className="mb-4">
          Hay {separacionesPlazoVencido} {separacionesPlazoVencido === 1 ? 'separación' : 'separaciones'}
          {' '}con fecha vencida dentro de tu cartera. El estado almacenado puede seguir siendo
          Pendiente o Vigente; el lote no debe liberarse ni el pago anularse sin revisión
          comercial y financiera documentada. Revisa la fecha en el detalle de cada separación.
        </Alert>
      )}

      {tab === 'Agrupadas' && (
        <Gate permission="sales.view">
          <OperacionesAgrupadasPanel onPrepararVenta={(datos)=>{
            setOrigenPlano({
              idProyecto:datos.idProyecto,idEtapa:datos.idEtapa,
              idLote:datos.idLote,operacion:'Venta'
            });
            setPreseleccionAgrupada(datos);
            setAsociacionAgrupadaPendiente({
              idOperacion:datos.idOperacion,idLote:datos.idLote,
              idProspecto:datos.idProspecto,modalidad:datos.modalidad
            });
            setTab('Venta');
            handleOpenModal();
            toast.info('Formaliza el lote de la negociación',{
              description:'Los datos del cliente y lote se preseleccionarán; la compra se valida individualmente.'
            });
          }}/>
        </Gate>
      )}

      {/* Contratos pendientes de firma */}
      {tab === 'Contratos' && (
        <Gate permission="sales.view">
          <ContratosPendientesPanel />
        </Gate>
      )}

      {/* Gestión de anexos de ventas */}
      {tab === 'Anexos' && (
        <Gate permission="sales.view">
          <DocumentacionContratosPanel />
        </Gate>
      )}

      {(tab === 'Separación' || tab === 'Venta') && (

        <Card>
          {tab === 'Separación' ? (
            <div className="space-y-4 border-b border-brand-100 bg-gradient-to-b from-slate-50/80 to-white px-4 py-5 sm:px-6">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h3 className="text-sm font-semibold text-brand-900">Filtros de separaciones</h3>
                  <p className="mt-1 text-xs text-brand-500">
                    Combina filtros; el Excel respeta la selección y tu alcance autorizado.
                  </p>
                </div>
                <span className="rounded-full border border-brand-200 bg-white px-3 py-1 text-xs font-semibold text-brand-700">
                  {rows.length} de {separationsCount} separaciones
                </span>
              </div>
              <div className="space-y-3">
                <div className="flex flex-wrap items-end gap-3">
<label className="flex w-full min-w-0 flex-col gap-1.5 sm:w-[300px]">
                  <span className="text-xs font-semibold text-brand-700">Buscar prospecto</span>
                  <SearchInput value={filtrosSeparacion.busqueda}
  onValueChange={(value) => cambiarFiltroSeparacion('busqueda', value)}
  placeholder="Nombre, DNI, código o lote…" className="w-full" />
                </label>
<label className="flex w-full min-w-0 flex-col gap-1.5 sm:w-[160px]">
                  <span className="text-xs font-semibold text-brand-700">Método de pago</span>
                  <Select value={filtrosSeparacion.metodoPago}
  onChange={(e) => cambiarFiltroSeparacion('metodoPago', e.target.value)}
  className="w-full">
  <option value="all">Todos los métodos</option>
  {metodosFiltro.map((metodo) => <option key={metodo} value={metodo}>{metodo}</option>)}
</Select>
                </label>
<label className="flex w-full min-w-0 flex-col gap-1.5 sm:w-[205px]">
                  <span className="text-xs font-semibold text-brand-700">Asesor</span>
                  <Select value={filtrosSeparacion.asesor}
  onChange={(e) => cambiarFiltroSeparacion('asesor', e.target.value)}
  className="w-full">
  <option value="all">Todos los asesores</option>
  {asesoresFiltro.map((asesor) => <option key={asesor} value={asesor}>{asesor}</option>)}
  {salesList.some((item) => item.type === 'Separación' && !item.advisor?.trim()) && (
    <option value="__sin_asesor__">Sin asesor</option>
  )}
</Select>
                </label>
<label className="flex w-full min-w-0 flex-col gap-1.5 sm:w-[205px]">
                  <span className="text-xs font-semibold text-brand-700">Proyecto</span>
                  <Select value={filtrosSeparacion.proyecto}
  onChange={(e) => cambiarFiltroSeparacion('proyecto', e.target.value)}
  className="w-full">
  <option value="all">Todos los proyectos</option>
  {proyectosFiltro.map((proyecto) => <option key={proyecto} value={proyecto}>{proyecto}</option>)}
</Select>
                </label>
                </div>
                <div className="flex flex-wrap items-end gap-3">
<label className="flex w-full min-w-0 flex-col gap-1.5 sm:w-[190px]">
                  <span className="text-xs font-semibold text-brand-700">Fecha desde</span>
                  <Input type="date" value={filtrosSeparacion.desde}
  max={filtrosSeparacion.hasta || undefined}
  onChange={(e) => cambiarFiltroSeparacion('desde', e.target.value)}
  className="w-full" />
                </label>
<label className="flex w-full min-w-0 flex-col gap-1.5 sm:w-[190px]">
                  <span className="text-xs font-semibold text-brand-700">Fecha hasta</span>
                  <Input type="date" value={filtrosSeparacion.hasta}
  min={filtrosSeparacion.desde || undefined}
  onChange={(e) => cambiarFiltroSeparacion('hasta', e.target.value)}
  className="w-full" />
                </label>
<label className="flex w-full min-w-0 flex-col gap-1.5 sm:w-[185px]">
                  <span className="text-xs font-semibold text-brand-700">Estado</span>
                  <Select value={filtrosSeparacion.estado}
  onChange={(e) => cambiarFiltroSeparacion('estado', e.target.value)}
  className="w-full">
  <option value="all">Todos los estados</option>
  {Object.entries(ESTADOS_SEPARACION).map(([codigo, config]) => (
    <option key={codigo} value={codigo}>{config.etiqueta}</option>
  ))}
</Select>
                </label>
<div className="flex w-full min-w-0 flex-col gap-1.5 sm:w-auto">
                  <span className="select-none text-xs font-semibold text-transparent" aria-hidden="true">Acciones</span>
                  <Button
                    variant="secondary"
                    icon={RotateCcwIcon}
                    className="w-full sm:w-auto"
                    onClick={limpiarFiltrosSeparacion}
                  >Limpiar filtros</Button>
                </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4 border-b border-brand-100 bg-gradient-to-b from-slate-50/80 to-white px-4 py-5 sm:px-6">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h3 className="text-sm font-semibold text-brand-900">Filtros de ventas</h3>
                  <p className="mt-1 text-xs text-brand-500">
                    Filtra únicamente la tabla. Los indicadores dependen del período comercial global.
                  </p>
                </div>
                <span className="rounded-full border border-brand-200 bg-white px-3 py-1 text-xs font-semibold text-brand-700">
                  {rows.length} de {salesCount} ventas
                </span>
              </div>
              <div className="space-y-3">
                <div className="flex flex-wrap items-end gap-3">
                  <label className="flex w-full min-w-0 flex-col gap-1.5 sm:w-[275px]">
                    <span className="text-xs font-semibold text-brand-700">Buscar comprador</span>
                    <SearchInput value={filtrosVenta.busqueda}
                      onValueChange={v=>cambiarFiltroVenta('busqueda',v)}
                      placeholder="Comprador, DNI, código o lote…" className="w-full"/>
                  </label>
                  <label className="flex w-full min-w-0 flex-col gap-1.5 sm:w-[165px]">
                    <span className="text-xs font-semibold text-brand-700">Modalidad de venta</span>
                    <Select value={filtrosVenta.modalidad}
                      onChange={e=>cambiarFiltroVenta('modalidad',e.target.value)} className="w-full">
                      <option value="all">Todas</option>
                      <option value="Contado">Contado</option>
                      <option value="Financiado">Financiado</option>
                    </Select>
                  </label>
                  <label className="flex w-full min-w-0 flex-col gap-1.5 sm:w-[195px]">
                    <span className="text-xs font-semibold text-brand-700">Asesor</span>
                    <Select value={filtrosVenta.asesor}
                      onChange={e=>cambiarFiltroVenta('asesor',e.target.value)} className="w-full">
                      <option value="all">Todos los asesores</option>
                      {asesoresVentasFiltro.map(asesor=>
                        <option key={asesor} value={asesor}>{asesor}</option>)}
                      {salesList.some(op=>op.type==='Venta' && !op.advisor?.trim()) &&
                        <option value="__sin_asesor__">Sin asesor</option>}
                    </Select>
                  </label>
                  <label className="flex w-full min-w-0 flex-col gap-1.5 sm:w-[195px]">
                    <span className="text-xs font-semibold text-brand-700">Proyecto</span>
                    <Select value={filtrosVenta.proyecto}
                      onChange={e=>cambiarFiltroVenta('proyecto',e.target.value)} className="w-full">
                      <option value="all">Todos los proyectos</option>
                      {proyectosVentasFiltro.map(proyecto=>
                        <option key={proyecto} value={proyecto}>{proyecto}</option>)}
                    </Select>
                  </label>
                  <label className="flex w-full min-w-0 flex-col gap-1.5 sm:w-[175px]">
                    <span className="text-xs font-semibold text-brand-700">Estado</span>
                    <Select value={filtrosVenta.estado}
                      onChange={e=>cambiarFiltroVenta('estado',e.target.value)} className="w-full">
                      <option value="all">Todos los estados</option>
                      {estadosVentasFiltro.map(estado=>
                        <option key={estado} value={estado}>{estado.replace(/_/g, ' ')}</option>)}
                    </Select>
                  </label>
                </div>
                <div className="flex flex-wrap items-end gap-3">
                  <label className="flex w-full min-w-0 flex-col gap-1.5 sm:w-[190px]">
                    <span className="text-xs font-semibold text-brand-700">Fecha desde</span>
                    <Input type="date" value={filtrosVenta.desde} className="w-full"
                      max={filtrosVenta.hasta || undefined}
                      onChange={e=>cambiarFiltroVenta('desde',e.target.value)}/>
                  </label>
                  <label className="flex w-full min-w-0 flex-col gap-1.5 sm:w-[190px]">
                    <span className="text-xs font-semibold text-brand-700">Fecha hasta</span>
                    <Input type="date" value={filtrosVenta.hasta} className="w-full"
                      min={filtrosVenta.desde || undefined}
                      onChange={e=>cambiarFiltroVenta('hasta',e.target.value)}/>
                  </label>
                  <div className="flex w-full min-w-0 flex-col gap-1.5 sm:w-auto">
                    <span className="select-none text-xs font-semibold text-transparent" aria-hidden="true">
                      Acciones
                    </span>
                    <Button icon={RotateCcwIcon} variant="secondary"
                      onClick={limpiarFiltrosVenta} className="w-full sm:w-auto">
                      Limpiar filtros
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {rows.length === 0 ? (
            <EmptyState
              title={tab === 'Separación' ? 'No hay separaciones para estos filtros' : 'No hay operaciones registradas'}
              description={tab === 'Separación'
                ? 'Prueba otros criterios o utiliza Limpiar filtros para ver tu cartera disponible.'
                : 'Las ventas se registrarán aquí con su documentación asociada.'}
            />
          ) : (


            <Table
              className={tab === 'Separación'
                ? '[&_table]:min-w-[1180px] [&_thead]:bg-slate-100/90 [&_th]:py-3.5 [&_th]:text-slate-600 [&_th]:font-bold [&_tbody_tr]:hover:bg-brand-50/50'
                : '[&_table]:min-w-[1480px] [&_thead]:bg-slate-100/90 [&_th]:py-3.5 [&_th]:text-slate-600 [&_th]:font-bold [&_tbody_tr]:hover:bg-brand-50/50'
              }
              head={tab === 'Separación' ? (
                <>
                  <TH>Fecha</TH>
                  <TH>Código</TH>
                  <TH>Prospecto</TH>
                  <TH>Proyecto</TH>
                  <TH>Lote</TH>
                  <TH align="right">Monto</TH>
                  <TH>Método de pago</TH>
                  <TH>Asesor</TH>
                  <TH>Estado</TH>
                  <TH align="right">Acciones</TH>
                </>
              ) : (
                <>
                  <TH>Fecha</TH>
                  <TH>Código</TH>
                  <TH>Cliente</TH>
                  <TH>Proyecto</TH>
                  <TH>Lote</TH>
                  <TH align="right">Monto</TH>
                  <TH>Modalidad</TH>
                  <TH>Asesor</TH>
                  <TH>Estado</TH>
                  <TH>Documentación</TH>
                  <TH align="right">Acciones</TH>
                </>
              )}
            >
              {(tab === 'Separación' ? filasSeparacionesPagina : filasVentasPagina).map((sale) => (
                tab === 'Separación' ? (
                  <TR key={sale.id} className="group hover:bg-brand-50/60">
                    <TD className="whitespace-nowrap py-4 text-xs font-medium tabular-nums text-brand-600">
                      {sale.date || '—'}
                    </TD>
                    <TD className="whitespace-nowrap">
                      <span className="inline-flex rounded-md border border-brand-200 bg-brand-50/70 px-2.5 py-1 font-mono text-xs font-semibold text-brand-900">
                        {sale.code}
                      </span>
                    </TD>
                    <TD className="min-w-[170px]">
                      <div className="flex flex-col gap-1">
                        <span className="font-semibold leading-snug text-brand-900">{sale.buyer || '—'}</span>
                        {sale.document && (
                          <span className="font-mono text-[11px] text-brand-500">
                            {/^\d{8}$/.test(sale.document) ? 'DNI' : 'Documento'}: {sale.document}
                          </span>
                        )}
                      </div>
                    </TD>
                    <TD className="min-w-[190px] text-[12px] leading-relaxed text-brand-700">
                      {sale.project || '—'}
                    </TD>
                    <TD className="whitespace-nowrap">
                      <span className="rounded-md bg-slate-100 px-2 py-1 font-mono text-xs font-semibold text-brand-800">
                        {sale.lot || '—'}
                      </span>
                    </TD>
                    <TD align="right" className="whitespace-nowrap font-semibold tabular-nums text-brand-900">
                      {formatSoles(sale.amount)}
                    </TD>
                    <TD className="min-w-[155px]">
                      <span className="inline-flex items-center gap-1.5 text-xs text-brand-700">
                        <CreditCardIcon className="h-3.5 w-3.5 shrink-0 text-brand-500" />
                        {sale.paymentMethod || 'No registrado'}
                      </span>
                    </TD>
                    <TD className="min-w-[140px] text-xs text-brand-700">
                      {sale.advisor?.trim() || '—'}
                    </TD>
                    <TD>
                      <div className="flex flex-col items-start gap-1.5">
                        <EstadoSeparacionBadge estado={sale.status} />
                        {leyendaVencimiento(sale.expiresAtIso, sale.status, instanteActual) === 'Vencida' && (
                          <span role="status" className="inline-flex items-center rounded-md border border-red-200 bg-red-50 px-2 py-1 text-[11px] font-bold text-red-700">
                            Plazo vencido · revisar
                          </span>
                        )}
                      </div>
                    </TD>
                    <TD align="right">
                      <Button
                        size="sm"
                        variant="ghost"
                        icon={EyeIcon}
                        onClick={() => setDetail(sale)}
                        className="font-semibold text-brand-700 hover:text-brand-900"
                      >
                        Ver
                      </Button>
                    </TD>
                  </TR>
                ) : (
                  <TR key={sale.id} className="group hover:bg-brand-50/60">
                    <TD className="whitespace-nowrap py-4 text-xs font-medium tabular-nums text-brand-600">
                      {sale.date || '—'}
                    </TD>

                    <TD className="whitespace-nowrap">
                      <span className="inline-flex rounded-md border border-brand-200 bg-brand-50/70 px-2.5 py-1 font-mono text-xs font-semibold text-brand-900">
                        {sale.code}
                      </span>
                    </TD>

                    <TD className="min-w-[160px] font-semibold leading-snug text-brand-900">
                      {sale.buyer || '—'}
                    </TD>

                    <TD className="min-w-[175px] text-xs leading-relaxed text-brand-700">
                      {sale.project || '—'}
                    </TD>

                    <TD className="whitespace-nowrap">
                      <span className="rounded-md bg-slate-100 px-2 py-1 font-mono text-xs font-semibold text-brand-800">
                        {sale.lot || '—'}
                      </span>
                    </TD>

                    <TD align="right" className="whitespace-nowrap font-semibold tabular-nums text-brand-900">
                      {formatSoles(sale.amount)}
                    </TD>

                    <TD className="whitespace-nowrap text-xs text-brand-700">
                      {sale.modality ?? 'Por definir'}
                    </TD>

                    <TD className="min-w-[140px]">
                      <AdvisorBadge advisor={sale.advisor} type={sale.type} />
                    </TD>

                    <TD>
                      <EstadoVentaBadge estado={sale.status} />
                    </TD>

                    <TD align="center" className="min-w-[135px]">
                      <span
                        className={`flex w-full items-center justify-center ${estadoDocumentos !== 'listo'
                          ? 'text-slate-400'
                          : documentosPorVenta[sale.id]?.tienePdfAprobado &&
                            documentosPorVenta[sale.id]?.tienePlanoLote &&
                            documentosPorVenta[sale.id]?.tieneMemoriaDescriptiva
                            ? 'text-emerald-600'
                            : 'text-red-600'
                          }`}
                        title={
                          estadoDocumentos !== 'listo'
                            ? 'Estado documental no disponible'
                            : documentosPorVenta[sale.id]?.tienePdfAprobado &&
                              documentosPorVenta[sale.id]?.tienePlanoLote &&
                              documentosPorVenta[sale.id]?.tieneMemoriaDescriptiva
                              ? 'Documentación completa'
                              : 'Documentación pendiente'
                        }
                      >
                        <FileTextIcon className="h-5 w-5" />
                      </span>
                    </TD>

                    <TD align="right">
                      <Button size="sm" variant="ghost" icon={EyeIcon}
                        onClick={() => setDetail(sale)}
                        className="font-semibold text-brand-700 hover:text-brand-900"
                      >Ver</Button>
                    </TD>
                  </TR>
                )
              ))}
            </Table>

          )}
          <Pagination
            page={tab === 'Separación' ? paginaSeparacionesActual : paginaVentasActual}
            pageSize={tab === 'Separación' ? tamanoPaginaSeparaciones : tamanoPaginaVentas}
            total={rows.length}
            onPageChange={tab === 'Separación' ? setPaginaSeparaciones : setPaginaVentas}
          />
        </Card>
      )}

      {/* Modal Detalle de Operación */}
      <Modal
        open={detail !== null}
        onClose={() => setDetail(null)}
        title={detail ? `Operación ${detail.code}` : ''}
        description={detail ? `${detail.type} · ${detail.buyer}` : ''}
        width={detail?.type === 'Venta' ? 'max-w-4xl' : 'max-w-3xl'}
      >
        {detail ? (
          <div className="space-y-5">
            <div className="flex flex-wrap items-start justify-between gap-4 rounded-xl border border-brand-200 bg-brand-50/70 p-4 sm:p-5">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-brand-500">
                  {detail.type === 'Separación' ? 'Reserva inmobiliaria' : 'Venta inmobiliaria'}
                </p>
                <p className="mt-1 font-mono text-lg font-bold text-brand-900">{detail.code}</p>
                <p className="mt-1 text-xs text-brand-600">
                  {detail.type === 'Separación'
                    ? 'Separación de lote con comprobante de pago asociado'
                    : 'Operación comercial y documentación de venta'}
                </p>
              </div>
              <div className="flex flex-col items-start gap-2 sm:items-end">
                <p className="text-xs text-brand-500">
                  {detail.type === 'Separación' ? 'Monto de separación' : 'Monto de venta'}
                </p>
                <p className="text-2xl font-bold tabular-nums text-brand-900">{formatSoles(detail.amount)}</p>
                {detail.type === 'Separación'
                  ? <EstadoSeparacionBadge estado={detail.status} />
                  : <EstadoVentaBadge estado={detail.status} />}
              </div>
            </div>

            <section className="rounded-xl border border-brand-100 bg-white px-4 py-2 sm:px-5">
              <h3 className="border-b border-brand-100 py-3 text-sm font-semibold text-brand-900">
                {detail.type === 'Separación' ? 'Información de la separación' : 'Resumen comercial'}
              </h3>
              <dl className="grid grid-cols-1 gap-x-7 sm:grid-cols-2">
                {[
                  ...(detail.type === 'Separación' ? [{
                    label: 'Prospecto',
                    value: (
                      <div className="flex flex-wrap items-center gap-2">
                        <span>{detail.buyer || '—'}</span>
                        <span className="rounded-md border border-brand-200 bg-brand-50 px-2 py-0.5 font-mono text-[11px] font-semibold text-brand-700">
                          {detail.document && !/^[0-9]{8}$/.test(detail.document) ? 'Documento' : 'DNI'}: {detail.document || 'No registrado'}
                        </span>
                      </div>
                    )
                  }] : []),
                  { label: 'Proyecto inmobiliario', value: detail.project || '—' },
                  { label: 'Lote', value: detail.lot || '—' },
                  { label: 'Asesor comercial', value: (
                    detail.advisor?.trim() ? (
                      <span className="inline-flex items-center gap-1.5 text-emerald-800">
                        <UserCheckIcon className="h-3.5 w-3.5" />{detail.advisor}
                      </span>
                    ) : (
                      <span className="text-brand-500">Sin asesor vinculado</span>
                    )
                  ) },
                  { label: 'Fecha de registro', value: detail.date || '—' },
                  ...(detail.type === 'Separación' ? [
                    { label: 'Método de pago', value: detail.paymentMethod || 'No registrado' },
                    {
                      label: 'Vencimiento de la reserva',
                      value: (
                        <div className="flex flex-wrap items-center gap-2">
                          <span>{detail.expiresAt || '—'}</span>
                          {textoVencimientoDetalle && (
                            <span className="inline-flex items-center rounded-md border border-red-200 bg-red-50 px-2 py-0.5 text-[11px] font-bold text-red-700"
                              role="status" aria-live="polite">
                              {textoVencimientoDetalle}
                            </span>
                          )}
                        </div>
                      )
                    }
                  ] : [
                    { label: 'Modalidad de venta', value: detail.modality || '—' },
                    { label: 'Contrato', value: detail.contract || '—' }
                  ])
                ].map((row) => (
                  <div key={row.label} className="flex flex-col gap-1 border-b border-brand-100 py-3">
                    <dt className="text-[11px] font-medium text-brand-500">{row.label}</dt>
                    <dd className="break-words text-[13px] font-semibold text-brand-900">{row.value}</dd>
                  </div>
                ))}
              </dl>
            </section>

            {detail.type === 'Separación' && (
              <ComprobanteSeparacionPreview
                idReserva={Number(detail.id.slice('SEPARACION-'.length))}
              />
            )}

            {detail.type === 'Venta' && (
              <DetalleVentaAmpliadoPanel
                key={detail.id}
                idVenta={Number(detail.id.slice('VENTA-'.length))}
              />
            )}

            {detail.type === 'Venta' && documentosPorVenta[detail.id] && (
              <section className="border-t border-brand-100 pt-4">
                <AnexosContratoPanel
                  idContrato={documentosPorVenta[detail.id].idContrato}
                  codigoContrato={documentosPorVenta[detail.id].codigoContrato}
                  soloConsulta
                />
              </section>
            )}
          </div>
        ) : null}
      </Modal>

      {/* Modal Operación Inmobiliaria: Separación o Venta */}
      <Modal
        open={isModalOpen}
        onClose={cerrarModalOperacion}
        width={opType==='Separacion'?'max-w-3xl':'max-w-lg'}
        title={opType === 'Separacion' ? 'Registrar separación' : 'Formalización de Venta'}
        description={opType === 'Separacion'
          ? 'Selecciona los lotes y revisa sus importes antes de registrar el pago.'
          : 'Selecciona comprador, lote y condiciones de venta para formalizar la operación.'}
        footer={
          <div className="flex w-full flex-wrap items-center justify-end gap-2">
            {opType==='Separacion' && separacionCondicionesVerificadas && condicionesVenta && (
              <div className="mr-auto min-w-0 py-1">
                <p className="text-xs text-brand-500">{1+lotesAdicionales.length} lote(s) · Total separación</p>
                <p className="text-lg font-semibold tabular-nums text-brand-900">{formatSoles(totalSeparacionSeleccion)}</p>
              </div>
            )}
            <Button
              variant="secondary"
              disabled={submitting || registrandoInteres || guardandoAsesorOperacion || guardandoLote || cargandoAdicional}
              onClick={cerrarModalOperacion}
            >
              Cancelar
            </Button>
            <Button
              variant="primary"

              disabled={
                submitting || registrandoInteres || guardandoAsesorOperacion || editorAsesor || editorInteres || editorLote || guardandoLote || cargandoAdicional || editorAdicional ||
                consultandoPolitica ||
                (Boolean(selectedProspectId) && Boolean(formLotId) && !condicionesVenta) ||
                ventaFinanciadaInvalida ||
                (opType === 'Separacion' && (!separacionCondicionesVerificadas || SEPARACION_ENVIO_DESHABILITADO || !validacionPagosSeparacion.valido))
              }
              onClick={handleProcessOperation}
            >
              {submitting
                ? 'Procesando…'
                : opType === 'Separacion'
                  ? 'Registrar separación'
                  : 'Validar Venta'}
            </Button>


          </div>
        }
      >
        {loadingFormData ? (
          <div className="py-8 text-center text-xs text-brand-500">
            Cargando prospectos y lotes disponibles…
          </div>
        ) : (
          <form onSubmit={handleProcessOperation}><fieldset disabled={submitting} className="space-y-4 min-w-0">
            {opType==='Separacion' && <header className="flex items-start gap-3 pb-1">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-800 text-xs font-bold text-white">1</span>
              <div><h3 className="text-sm font-semibold text-brand-900">Cliente y proyecto</h3>
                <p className="text-xs text-brand-500">Verifica los datos registrados en CRM.</p></div>
            </header>}
            <div>
              <label className="mb-1 block text-[12px] font-medium text-brand-700">
                Cliente (CRM) *
              </label>
              <Select
                value={selectedProspectId === '' ? '' : String(selectedProspectId)}
                disabled={registrandoInteres || guardandoAsesorOperacion || guardandoLote || cargandoAdicional || submitting}
                onChange={(e) =>
                  void handleSelectProspect(
                    e.target.value ? Number(e.target.value) : ''
                  )
                }
              >
                <option value="">Seleccione un cliente del CRM...</option>
                {prospectsList.map((prospect) => (
                  <option key={prospect.id_prospecto} value={prospect.id_prospecto}>
                    {prospect.nombre_completo} ({prospect.codigo}) - {prospect.categoria === 'COMPRADOR' ? 'Comprador' : prospect.estado_nombre}
                  </option>
                ))}
              </Select>
              <ProspectAdvisorInfo prospect={clienteOperacion}
                disabled={editorAsesor || registrandoInteres || guardandoAsesorOperacion || loadingProjects}
                onAssign={puedeAsignarAsesorOperacion && !compradorOperacion ? () => void abrirEditorAsesorOperacion() : undefined}/>
              {editorAsesor && (
                <div className="mt-2 space-y-2 rounded-lg border border-brand-200 bg-white p-3">
                  <label className="block text-xs font-medium text-brand-700">
                    Asesor comercial *
                    <Select className="mt-1 w-full" value={asesorOperacion}
                      disabled={cargandoAsesoresOperacion || guardandoAsesorOperacion}
                      onChange={e=>setAsesorOperacion(e.target.value)}>
                      <option value="">{cargandoAsesoresOperacion ? 'Cargando asesores…' : 'Seleccione un asesor activo'}</option>
                      {asesoresOperacion.map(a=><option key={a.id_asesor} value={a.id_asesor}>{a.nombre_completo}</option>)}
                    </Select>
                  </label>
                  <p className="text-xs text-brand-500">La asignación se guardará en CRM antes de continuar. No es necesario salir del formulario.</p>
                  {errorAsesorOperacion && <div role="alert"><Alert tone="danger" title="No se pudo asignar el asesor">{errorAsesorOperacion}</Alert></div>}
                  {!cargandoAsesoresOperacion && !asesoresOperacion.length && !errorAsesorOperacion &&
                    <p className="text-xs text-amber-700">No hay asesores activos disponibles.</p>}
                  <div className="flex flex-wrap justify-end gap-2">
                    <Button variant="secondary" disabled={guardandoAsesorOperacion} onClick={()=>setEditorAsesor(false)}>Cancelar</Button>
                    <Button variant="primary" disabled={!asesorOperacion || cargandoAsesoresOperacion || guardandoAsesorOperacion}
                      onClick={()=>void guardarAsesorOperacion()}>{guardandoAsesorOperacion ? 'Guardando…' : 'Confirmar asignación'}</Button>
                  </div>
                </div>
              )}
              {opType === 'Venta' && reservasVigentes.length > 0 && (
                <p className="mt-2 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-800">
                  Reserva vigente detectada. Se preseleccionó el proyecto, etapa y lote reservado.
                  Puedes cambiar cualquiera de ellos; el abono se aplicará solo al lote con reserva confirmada.
                </p>
              )}
            </div>

            <div>
              <label className="mb-1 block text-[12px] font-medium text-brand-700">
                Proyecto inmobiliario *
              </label>

              {proyectosConInteres.length > 1 ? (
                <Select
                  aria-label="Proyecto de interés registrado"
                  value={formProjectId}
                  disabled={!selectedProspectId || loadingProjects || registrandoInteres || guardandoAsesorOperacion || editorInteres || guardandoLote || cargandoAdicional || submitting}
                  onChange={e=>{
                    setAutoseleccionPendiente(null);
                    setFormStageId('');
                    setAvailableStages([]);
                    setFormLotId('');
                    setAvailableLots([]);
    setLotesDisponiblesProyecto([]);
                    setFormProjectId(e.target.value);
                  }}>
                  <option value="">Seleccione un interés registrado</option>
                  {proyectosConInteres.map(p=><option key={p.idProyecto} value={p.idProyecto}>{p.nombre}</option>)}
                </Select>
              ) : (
                <div className="flex items-start gap-2 py-1 text-sm font-semibold text-brand-900"
                  aria-label="Proyecto de interés registrado">
                  {loadingProjects ? 'Cargando proyecto…' : !selectedProspectId ? 'Seleccione un cliente primero'
                    : proyectosConInteres.find(p=>p.idProyecto===Number(formProjectId))?.nombre ?? 'Sin proyecto de interés activo disponible'}
                </div>
              )}

              {selectedProspectId && !loadingProjects && (compradorOperacion || puedeEditarInteres) &&
                proyectosSinInteres.length > 0 && !editorInteres && (
                <Button type="button" variant="secondary" className="mt-2 w-full sm:w-auto"
                  disabled={registrandoInteres || guardandoAsesorOperacion || submitting || guardandoLote || cargandoAdicional}
                  onClick={abrirEditorInteres}>
                  {compradorOperacion ? 'Registrar interés para nueva compra'
                    : esCambioInteres ? 'Cambiar proyecto de interés' : 'Registrar proyecto de interés'}
                </Button>
              )}
              {editorInteres && selectedProspectId && !loadingProjects && (
                <div className="mt-3 space-y-3 rounded-lg border border-brand-200 bg-brand-50/40 p-3 text-xs text-brand-800">
                  <p className="font-semibold">{esCambioInteres ? 'Cambiar proyecto de interés' : 'Registrar interés comercial'}</p>
                  {esCambioInteres && <>
                    {interesesOperacion.length > 1 ? <label className="block font-medium">
                      Proyecto de interés que se reemplazará *
                      <Select className="mt-1 w-full" value={proyectoInteresAnterior} disabled={registrandoInteres}
                        onChange={e=>setProyectoInteresAnterior(e.target.value)}>
                        <option value="">Seleccione el interés anterior</option>
                        {interesesOperacion.map(id=><option key={id} value={id}>
                          {availableProjects.find(p=>p.idProyecto===id)?.nombre ?? `Proyecto #${id}`}
                        </option>)}
                      </Select>
                    </label> : <p>Interés actual: <strong>{availableProjects.find(p=>p.idProyecto===origenCambioInteres)?.nombre ?? `Proyecto #${origenCambioInteres}`}</strong></p>}
                  </>}
                  <label className="block font-medium">Nuevo proyecto *
                    <Select className="mt-1 w-full" value={proyectoInteresNuevo} disabled={registrandoInteres}
                      onChange={e=>{setProyectoInteresNuevo(e.target.value);setErrorCambioInteres('');}}>
                      <option value="">Seleccione un proyecto</option>
                      {proyectosSinInteres.map(p=><option key={p.idProyecto} value={p.idProyecto}>{p.nombre}</option>)}
                    </Select>
                  </label>
                  {esCambioInteres ? <>
                    <label className="block font-medium">Motivo del cambio *
                      <textarea className="mt-1 w-full rounded-md border border-brand-200 bg-white p-2 text-brand-800"
                        rows={2} maxLength={500} value={motivoCambioInteres} disabled={registrandoInteres}
                        onChange={e=>setMotivoCambioInteres(e.target.value)}
                        placeholder="Ej.: El cliente prefirió otro proyecto por su ubicación." />
                      <span className="block font-normal">De 5 a 500 caracteres.</span>
                    </label>
                    <p>El interés anterior quedará como histórico y el cambio se registrará en el expediente CRM.</p>
                  </> : <p>{compradorOperacion ? 'Se conservarán los intereses y compras anteriores.' : 'Se registrará el primer interés comercial.'}</p>}
                  {errorCambioInteres && <div role="alert"><Alert tone="danger" title="No se pudo actualizar el interés">{errorCambioInteres}</Alert></div>}
                  <div className="flex flex-wrap justify-end gap-2">
                    <Button type="button" variant="secondary" disabled={registrandoInteres} onClick={cerrarEditorInteres}>Cancelar</Button>
                    <Button type="button" variant="primary" disabled={!proyectoInteresNuevo || registrandoInteres || guardandoAsesorOperacion ||
                      (esCambioInteres && (!interesesOperacion.includes(origenCambioInteres) || motivoCambioInteres.trim().length < 5))}
                      onClick={() => void registrarInteresOperacion()}>
                      {registrandoInteres ? 'Guardando…' : esCambioInteres ? 'Confirmar cambio de interés' : 'Registrar interés en este proyecto'}
                    </Button>
                  </div>
                </div>
              )}
              {selectedProspectId &&
                !loadingProjects &&
                availableProjects.length === 0 && (
                  <p className="mt-1 text-xs text-amber-700">
                    No hay proyectos habilitados para este comprador.
                  </p>
                )}
            </div>

            {opType==='Separacion' && <header className="flex items-start gap-3 border-t border-brand-100 pt-5">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-800 text-xs font-bold text-white">2</span>
              <div><h3 className="text-sm font-semibold text-brand-900">Lotes seleccionados</h3>
                <p className="text-xs text-brand-500">Revisa el lote de interés y añade otros si el cliente lo solicita.</p></div>
            </header>}
            {opType==='Venta' && <div>
              <label className="mb-1 block text-[12px] font-medium text-brand-700">
                Etapa comercial *
              </label>

              <Select
                value={formStageId}
                disabled={!formProjectId || !proyectoConInteres || loadingStages || editorInteres || guardandoLote || cargandoAdicional || submitting || (opType==='Separacion'&&Boolean(formLotId))}
                onChange={(e) => {
                  setAutoseleccionPendiente(null);
                  setFormStageId(e.target.value);
                  setFormLotId('');
                  setAvailableLots([]);
    setLotesDisponiblesProyecto([]);
                }}
              >
                <option value="">
                  {loadingStages
                    ? 'Cargando etapas...'
                    : 'Seleccione una etapa...'}
                </option>

                {availableStages.map((etapa) => (
                  <option key={etapa.codigo} value={etapa.codigo}>
                    {etapa.nombre}
                  </option>
                ))}
              </Select>

              {formProjectId && proyectoConInteres &&
                !loadingStages &&
                availableStages.length === 0 && (
                  <p className="mt-1 text-xs text-amber-700">
                    No hay etapas comerciales con lotes disponibles o reservas autorizadas.
                  </p>
                )}
            </div>}

            <div>
              {opType==='Venta' && <label className="mb-1 block text-[12px] font-medium text-brand-700">
                Lote disponible o reservado para el comprador *
              </label>}

              {opType==='Separacion' ? <div className="space-y-2">
                {(loadingProjects||loadingStages||loadingLots) ? <p role="status" className="py-3 text-sm text-brand-500">Consultando interés e inventario del proyecto…</p>
                : lotePrincipal ? <div className="rounded-xl border border-brand-200 bg-white p-3">
                  <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-brand-600">{preferenciaLote?.id===lotePrincipal.idLote?'Lote de interés · Principal':'Lote principal de la operación'}</p>
                      <p className="mt-1 text-base font-bold text-brand-900">{lotePrincipal.codigo}</p>
                      <p className="text-xs text-brand-500">{lotePrincipal.nombreManzana??''} · {lotePrincipal.areaM2??0} m²</p>
                      <p className="text-xs text-brand-500">{nombreEtapaLote(lotePrincipal.idLote)??'Etapa comercial no identificada'}</p>
                    </div>
                    <div className="ml-auto text-right">
                      <p className="text-xs text-brand-500">Precio oficial</p>
                      {estadoPrecio==='disponible'&&precioLote?.idLote===lotePrincipal.idLote
                        ? <p className="text-base font-bold tabular-nums text-brand-900">{formatSoles(Number(precioLote.precio))}</p>
                        : <p className="text-xs text-brand-600">{estadoPrecio==='error'||estadoPrecio==='sin_precio'?'Precio no verificado':'Consultando precio…'}</p>}
                      {separacionCondicionesVerificadas&&condicionesVenta&&<p className="mt-1 text-xs text-brand-700">Separación: <strong>{formatSoles(condicionesVenta.montoSeparacion)}</strong></p>}
                    </div>
                  </div>
                </div> : <div role="status" className="py-2 text-sm text-brand-700">
                  {preferenciaLote?.id ? <>
                    <p className="font-semibold">Lote de interés en CRM: {preferenciaLote.codigo??'Lote registrado'}</p>
                    <p className="mt-1 text-xs text-amber-700">No está disponible para una nueva separación. Puedes elegir otro lote.</p>
                  </> : <p>{selectedProspectId&&formProjectId?'El cliente aún no tiene un lote de interés identificado en CRM. Selecciona el lote principal.':'Selecciona un cliente y su proyecto para consultar el lote de interés.'}</p>}
                </div>}
                {!editorLote&&<Button type="button" variant="secondary" className="w-full sm:w-auto"
                  disabled={!formProjectId||loadingProjects||loadingStages||loadingLots||!lotesDisponiblesProyecto.length||submitting||guardandoLote||cargandoAdicional||editorAdicional||editorInteres}
                  onClick={abrirEditorLote}>{formLotId||preferenciaLote?.id?(puedeEditarInteres?'Cambiar lote de interés':'Elegir otro lote para esta operación'):'Seleccionar lote'}</Button>}
                {editorLote&&<div className="space-y-2 rounded-xl border border-brand-200 p-3">
                  <label className="block text-xs font-medium text-brand-700">Lote disponible *</label>
                  <Select value={loteCandidato} disabled={guardandoLote} onChange={e=>setLoteCandidato(e.target.value)}>
                    <option value="">Seleccione un lote</option>
                    {lotesDisponiblesProyecto.map(l=><option key={l.idLote} value={l.idLote}>{l.codigo} · {l.nombreManzana??''} · {l.areaM2??0} m² · {nombreEtapaLote(l.idLote)??''}</option>)}
                  </Select>
                  {puedeEditarInteres&&Number(loteCandidato)!==preferenciaLote?.id&&<label className="block text-xs font-medium text-brand-700">Motivo del registro o cambio *
                    <textarea rows={2} maxLength={500} className="mt-1 w-full rounded-lg border border-brand-200 p-2" value={motivoLote} disabled={guardandoLote}
                      onChange={e=>setMotivoLote(e.target.value)} placeholder="Preferencia expresada por el cliente"/>
                    <span className="block font-normal text-brand-500">Se guardará en CRM y en el expediente.</span>
                  </label>}
                  {lotesAdicionales.length>0&&<p className="text-xs text-amber-700">Al cambiar el lote principal se reiniciará la selección de lotes adicionales y los datos del pago.</p>}
                  {errorLote&&<Alert tone="danger" title="No se pudo actualizar el lote">{errorLote}</Alert>}
                  <div className="flex flex-wrap justify-end gap-2">
                    <Button type="button" variant="secondary" disabled={guardandoLote} onClick={()=>setEditorLote(false)}>Cancelar</Button>
                    <Button type="button" disabled={!loteCandidato||guardandoLote||(puedeEditarInteres&&Number(loteCandidato)!==preferenciaLote?.id&&motivoLote.trim().length<5)}
                      onClick={()=>void confirmarLoteInteres()}>{guardandoLote?'Guardando…':'Confirmar lote'}</Button>
                  </div>
                </div>}
                {lotesAdicionales.map(l=><div key={l.idLote} className="rounded-xl border border-brand-200 bg-white p-3">
                  <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
                    <div className="min-w-0">
                      <p className="text-xs text-brand-600">Lote adicional</p>
                      <p className="mt-1 text-base font-bold text-brand-900">{l.codigo}</p>
                      <p className="text-xs text-brand-500">{nombreEtapaLote(l.idLote)??'Etapa comercial no identificada'}</p>
                    </div>
                    <div className="ml-auto text-right">
                      <p className="text-xs text-brand-500">Precio oficial</p>
                      <p className="text-base font-bold tabular-nums text-brand-900">{formatSoles(l.precio)}</p>
                      <p className="mt-1 text-xs text-brand-700">Separación: <strong>{formatSoles(l.monto)}</strong></p>
                    </div>
                  </div>
                  <div className="mt-2 flex justify-end"><Button type="button" size="sm" variant="secondary" disabled={submitting||guardandoLote||cargandoAdicional||editorLote} onClick={()=>setLotesAdicionales(prev=>prev.filter(x=>x.idLote!==l.idLote))}>Quitar lote</Button></div>
                </div>)}
                {separacionCondicionesVerificadas&&condicionesVenta&&!editorLote&&<>
                  {!editorAdicional&&<Button type="button" variant="secondary" icon={PlusIcon} className="w-full sm:w-auto" disabled={submitting||lotesAdicionales.length>=19||!lotesDisponiblesProyecto.some(l=>l.idLote!==Number(formLotId)&&!lotesAdicionales.some(x=>x.idLote===l.idLote))}
                    onClick={()=>{setErrorAdicional('');setEditorAdicional(true)}}>Agregar otro lote</Button>}
                  {editorAdicional&&<div className="space-y-2 rounded-xl border border-brand-200 p-3">
                    <label className="block text-xs font-medium">Lote adicional
                      <Select className="mt-1" value={candidatoAdicional} disabled={cargandoAdicional} onChange={e=>setCandidatoAdicional(e.target.value)}>
                        <option value="">Seleccione otro lote disponible</option>
                        {lotesDisponiblesProyecto.filter(l=>l.idLote!==Number(formLotId)&&!lotesAdicionales.some(x=>x.idLote===l.idLote)).map(l=><option key={l.idLote} value={l.idLote}>{l.codigo} · {l.areaM2??0} m² · {nombreEtapaLote(l.idLote)??''}</option>)}
                      </Select>
                    </label>
                    {errorAdicional&&<Alert tone="danger" title="No se pudo añadir el lote">{errorAdicional}</Alert>}
                    <div className="flex flex-wrap justify-end gap-2">
                      <Button type="button" variant="secondary" disabled={cargandoAdicional} onClick={()=>{setEditorAdicional(false);setCandidatoAdicional('');setErrorAdicional('')}}>Cancelar</Button>
                      <Button type="button" disabled={!candidatoAdicional||cargandoAdicional} onClick={()=>void agregarLoteAdicional()}>{cargandoAdicional?'Verificando…':'Añadir lote'}</Button>
                    </div>
                  </div>}
                  <div className="flex flex-wrap justify-between gap-2 border-t border-brand-100 pt-3 text-sm">
                    <span>{1+lotesAdicionales.length} lote(s) · Precio total referencial</span>
                    <strong className="tabular-nums">{formatSoles(totalPrecioSeleccion)}</strong>
                  </div>
                </>}
              </div> : <Select
                value={formLotId}
                disabled={!formProjectId || !formStageId || loadingLots}
                onChange={(e) => handleSelectLot(e.target.value)}
              >
                <option value="">
                  {loadingLots
                    ? 'Cargando lotes disponibles...'
                    : 'Seleccione un lote disponible...'}
                </option>


                {availableLots.map((lote) => {
                  const esReservado =
                    lote.codigoEstadoLote?.toUpperCase() === 'RESERVADO';

                  return (
                    <option key={lote.idLote} value={lote.idLote}>
                      {lote.codigo} - {lote.nombreManzana ?? 'Manzana'} -
                      {' '}{lote.areaM2 ?? 0} m²
                      {' '}
                      [{esReservado
                        ? 'Reservado para este comprador'
                        : 'Disponible'}]
                    </option>
                  );
                })}

              </Select>}

              {opType==='Venta' && formLotId && (
                <div className="mt-3 rounded-lg border border-brand-200 bg-brand-50 p-3">
                  <p className="text-xs font-medium text-brand-600">
                    Precio oficial del lote
                  </p>

                  {(estadoPrecio === 'cargando' ||
                    estadoPrecio === 'inicial') && (
                      <p className="mt-1 text-sm text-brand-600">
                        Consultando precio vigente...
                      </p>
                    )}

                  {estadoPrecio === 'disponible' && precioLote && (
                    <>
                      <p className="mt-1 text-lg font-bold text-brand-900">
                        {new Intl.NumberFormat('es-PE', {
                          style: 'currency',
                          currency: 'PEN'
                        }).format(Number(precioLote.precio))}
                      </p>

                      <p className="mt-1 text-xs text-brand-600">
                        Moneda: {precioLote.codigoMoneda}
                      </p>
                      {opType === 'Venta' && reservaAplicable > 0 && (
                        <div className="mt-3 flex items-center justify-between border-t border-brand-200 pt-3 text-sm">
                          <span className="font-medium text-emerald-800">Pago de reserva acreditado</span>
                          <span className="font-bold tabular-nums text-emerald-800">− {formatSoles(reservaAplicable)}</span>
                        </div>
                      )}
                    </>
                  )}

                  {estadoPrecio === 'sin_precio' && (
                    <p className="mt-1 text-sm font-medium text-amber-700">
                      Precio no configurado para este lote en PEN.
                    </p>
                  )}

                  {estadoPrecio === 'error' && (
                    <p className="mt-1 text-sm font-medium text-rose-600">
                      No se pudo verificar el precio. Intente nuevamente.
                    </p>
                  )}
                </div>
              )}

              {(opType==='Venta'?Boolean(formStageId):Boolean(formProjectId&&proyectoConInteres&&!loadingStages&&!loadingProjects)) &&
                !loadingLots &&
                availableLots.length === 0 && (
                  <p className="mt-1 text-xs text-amber-700">

                    {opType === 'Venta'
                      ? 'No hay lotes disponibles ni reservas autorizadas en esta etapa.'
                      : 'No hay lotes comercializables disponibles en este proyecto.'}
                  </p>
                )}

              {!formLotId && formTouched && (
                <p className="mt-1 text-xs font-medium text-rose-600">
                  Debe seleccionar un lote disponible.
                </p>
              )}
            </div>

            {formLotId && (
              <div className="mb-3" role="status">
                {consultandoPolitica ? (
                  <p className="rounded-lg border border-brand-100 bg-brand-50 px-3 py-2 text-xs text-brand-700">
                    Consultando condiciones comerciales autorizadas…
                  </p>
                ) : errorPolitica ? (
                  <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
                    No se pudieron verificar las condiciones financieras: {errorPolitica}
                  </p>
                ) : condicionesVenta ? (
                  <p className="rounded-lg border border-emerald-100 bg-emerald-50 px-3 py-2 text-xs text-emerald-900">
                    Condiciones contractuales verificadas · Versión {condicionesVenta.version}
                  </p>
                ) : null}
                {errorPolitica && !consultandoPolitica && (
                  <Button type="button" variant="secondary" size="sm" className="mt-2"
                    onClick={()=>setRevisionPolitica(revision=>revision+1)}>
                    Reintentar consulta de condiciones
                  </Button>
                )}
              </div>
            )}
            {opType === 'Separacion' ? (
              separacionCondicionesVerificadas && condicionesVenta ? <>
                <header className="flex items-start gap-3 border-t border-brand-100 pt-5">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-800 text-xs font-bold text-white">3</span>
                  <div><h3 className="text-sm font-semibold text-brand-900">Pago de la separación</h3><p className="text-xs text-brand-500">Revisa el importe total y registra los comprobantes.</p></div>
                </header>
                <div className="rounded-xl border border-brand-200 bg-white p-3 space-y-2">
                  <div className="flex justify-between gap-3 text-sm"><span>Cantidad de lotes</span><strong>{1+lotesAdicionales.length}</strong></div>
                  <div className="flex flex-wrap justify-between gap-2 text-sm"><span>Importes de separación</span><strong>{[condicionesVenta.montoSeparacion,...lotesAdicionales.map(l=>l.monto)].every(m=>m===condicionesVenta.montoSeparacion)
                    ? `${formatSoles(condicionesVenta.montoSeparacion)} × ${1+lotesAdicionales.length}`
                    : 'Según el detalle de lotes'}</strong></div>
                  <div className="flex justify-between gap-3 border-t border-brand-100 pt-3"><strong>Total a pagar</strong><strong className="text-lg tabular-nums text-brand-900">{formatSoles(totalSeparacionSeleccion)}</strong></div>
                </div>
                <PagoSeparacionPanel pagos={pagosSeparacion} total={totalSeparacionSeleccion}
                  validacion={validacionPagosSeparacion} disabled={submitting||editorInteres||editorLote||editorAdicional||guardandoLote||cargandoAdicional}
                  onChange={setPagosSeparacion} nuevoId={()=>++secuenciaPagoSeparacion.current}/>
                <div className="rounded-lg border border-brand-100 bg-brand-50/40 p-3 text-xs text-brand-700 space-y-1">
                  <p className="font-semibold">Condiciones de separación</p>
                  <p>Vigencia del lote principal: <strong>{condicionesVenta.diasVencimientoSeparacion} días calendario</strong>.</p>
                  {lotesAdicionales.some(l=>l.dias!==condicionesVenta.diasVencimientoSeparacion)&&
                    <p>Los lotes adicionales tienen plazos propios según sus políticas.</p>}
                  <p>El vencimiento requiere revisión; no libera el lote ni anula pagos automáticamente.</p>
                  <p>Finanzas revisará los comprobantes antes de acreditar los pagos. Los lotes registrados quedarán reservados.</p>
                </div>
                {SEPARACION_ENVIO_DESHABILITADO&&<Alert tone="warning" title="Registro temporalmente no disponible">
                  La interfaz de pagos acumulados está preparada. La conexión con Finanzas se habilitará al terminar la integración.
                </Alert>}
              </> : (
                <div className="rounded-lg border border-brand-200 bg-brand-50/40 p-3 text-xs text-brand-700" role="status">
                  <p className="font-semibold">Condiciones de separación y pago</p>
                  <p className="mt-1">{!formLotId
                    ? 'Seleccione el cliente, su proyecto y el lote principal para consultar el importe y la vigencia.'
                    : consultandoPolitica ? 'Consultando el importe y la vigencia de la separación…'
                    : errorPolitica ? 'No se puede registrar el pago hasta verificar las condiciones financieras. Reintente la consulta.'
                    : estadoPrecio !== 'disponible' ? 'Se requiere verificar el precio oficial del lote antes de continuar.'
                    : 'Esperando condiciones financieras verificadas.'}</p>
                </div>
              )

            ) : (
              <div className="space-y-4 rounded-2xl border border-brand-200 bg-gradient-to-b from-brand-50/90 to-white p-3 shadow-sm sm:p-5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold text-brand-900">Condiciones de venta</p>
                    <p className="mt-1 text-xs text-brand-500">
                      Consulta el importe final antes de validar la operación.
                    </p>
                  </div>
                  <span className="rounded-full border border-brand-200 bg-white px-3 py-1 text-[11px] font-semibold text-brand-700">
                    {formSaleModality === 'FINANCIADA' ? 'Financiamiento francés' : 'Pago al contado'}
                  </span>
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-brand-700" htmlFor="venta-modalidad">
                    Modalidad de venta *
                  </label>
                  <Select
                    id="venta-modalidad"
                    value={formSaleModality}
                    onChange={(e) => {
                      const modalidad = e.target.value as 'CONTADO' | 'FINANCIADA';
                      setFormSaleModality(modalidad);
                      setComprobantesVenta([]);
                      if (modalidad === 'CONTADO') {
                        setFormSaleDownPayment('');
                        setFormSaleInstallments('12');
                      }
                    }}
                    className="bg-white"
                  >
                    <option value="CONTADO">Venta al contado</option>
                    <option value="FINANCIADA">Venta financiada</option>
                  </Select>
                </div>

                {formSaleModality === 'FINANCIADA' && condicionesVenta && (
                  <div className="space-y-3 rounded-xl border border-brand-100 bg-white p-3 sm:p-4">
                    <div className="grid grid-cols-1 items-start gap-3 sm:grid-cols-2">
                      <div className="min-w-0">
                        <label htmlFor="venta-inicial" className="mb-1.5 block text-xs font-semibold text-brand-700">
                          Inicial total acordada (S/) *
                        </label>
                        <Input
                          id="venta-inicial"
                          type="number"
                          min={condicionesVenta ? inicialMinimaVigente : undefined}
                          max={precioLote && condicionesVenta ? Math.min(
                            Number(precioLote.precio) - 0.01,
                            condicionesVenta.modoInicial === 'RANGO' && condicionesVenta.inicialMaxima != null
                              ? condicionesVenta.inicialMaxima : Number(precioLote.precio) - 0.01,
                            condicionesVenta.modoInicial === 'FIJA' && condicionesVenta.inicialFija != null
                              ? condicionesVenta.inicialFija : Number(precioLote.precio) - 0.01
                          ) : undefined}
                          step="0.01"
                          placeholder={condicionesVenta?.modoInicial === 'FIJA'
                            ? `Inicial fija S/ ${condicionesVenta.inicialFija?.toFixed(2)}`
                            : `Desde S/ ${inicialMinimaVigente.toFixed(2)}`}
                          value={formSaleDownPayment}
                          aria-invalid={Boolean(errorMontoInicial)}
                          aria-describedby={errorMontoInicial ? 'venta-inicial-error' : 'venta-inicial-ayuda'}
                          className={errorMontoInicial
                            ? 'border-red-500 bg-red-50/40 focus:border-red-600 focus:ring-1 focus:ring-red-200'
                            : 'bg-white'}
                          onChange={(e) => setFormSaleDownPayment(e.target.value)}
                        />
                        {errorMontoInicial ? (
                          <p id="venta-inicial-error" role="alert" className="mt-1.5 text-xs font-semibold text-red-600">
                            {errorMontoInicial}
                          </p>
                        ) : (
                          <p id="venta-inicial-ayuda" className="mt-1.5 text-[11px] text-brand-500">
                            {condicionesVenta?.modoInicial === 'FIJA'
                              ? `Inicial total fija S/ ${condicionesVenta.inicialFija?.toFixed(2)}.`
                              : condicionesVenta?.modoInicial === 'RANGO'
                                ? `Inicial entre S/ ${condicionesVenta.inicialMinima?.toFixed(2)} y S/ ${condicionesVenta.inicialMaxima?.toFixed(2)}.`
                                : `Inicial mínima S/ ${inicialMinimaVigente.toFixed(2)}.`}
                            {' '}La separación confirmada se descuenta de la inicial pactada.
                          </p>
                        )}
                      </div>
                      <div className="min-w-0">
                        <label htmlFor="venta-plazo" className="mb-1.5 block text-xs font-semibold text-brand-700">
                          Número de cuotas ({cuotasMinimas} a {cuotasMaximas}) *
                        </label>
                        <Input
                          id="venta-plazo"
                          type="text"
                          inputMode="numeric"
                          pattern="[0-9]{1,2}"
                          maxLength={2}
                          placeholder={`${cuotasMinimas} a ${cuotasMaximas} meses`}
                          value={formSaleInstallments}
                          onChange={(e) => {
                            const limpio = e.target.value.replace(/[^0-9]/g, '');
                            if (!limpio || (Number(limpio) >= 1 && Number(limpio) <= cuotasMaximas)) {
                              setFormSaleInstallments(limpio);
                            }
                          }}
                          className="bg-white"
                        />
                        <p className="mt-1.5 text-[11px] text-brand-500">
                          Ingresa un plazo entero entre {cuotasMinimas} y {cuotasMaximas} meses.
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-sky-200 bg-sky-50 p-3">
                      <div>
                        <p className="text-xs font-semibold text-sky-900">Interés nominal anual fijo</p>
                        <p className="mt-0.5 text-[11px] text-sky-700">
                          Equivalente nominal mensual: {(condicionesVenta.tasaNominalAnualPct / 12).toFixed(4)} %. No modificable por el asesor.
                        </p>
                      </div>
                      <strong className="text-xl font-bold tabular-nums text-sky-900">
                        {condicionesVenta?.tasaNominalAnualPct ?? '—'} % anual
                      </strong>
                    </div>
                  </div>
                )}

                {resumenVenta ? (
                  <section className="space-y-3 rounded-xl border border-brand-200 bg-white p-3 sm:p-4">
                    <h3 className="text-xs font-bold uppercase tracking-wide text-brand-600">
                      Resumen de la operación
                    </h3>
                    <dl className="space-y-2 text-[13px]">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <dt className="text-brand-600">Precio oficial</dt>
                        <dd className="font-semibold tabular-nums text-brand-900">
                          {formatSoles(resumenVenta.precioOficial)}
                        </dd>
                      </div>
                      {resumenVenta.abonoReserva > 0 && (
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <dt className="text-emerald-700">Pago de reserva acreditado</dt>
                          <dd className="font-semibold tabular-nums text-emerald-800">
                            − {formatSoles(resumenVenta.abonoReserva)}
                          </dd>
                        </div>
                      )}
                      {formSaleModality === 'CONTADO' ? (
                        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-brand-100 pt-3">
                          <dt className="font-semibold text-brand-900">Saldo por pagar al contado</dt>
                          <dd className="text-lg font-bold tabular-nums text-brand-900">
                            {formatSoles(resumenVenta.saldoContado)}
                          </dd>
                        </div>
                      ) : (
                        <>
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <dt className="text-brand-600">Inicial total pactada</dt>
                            <dd className="font-semibold tabular-nums text-brand-800">
                              {formatSoles(resumenVenta.inicialTotal)}
                            </dd>
                          </div>
                          {resumenVenta.abonoReserva > 0 && (
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <dt className="text-brand-600">Inicial adicional por completar después de la separación</dt>
                              <dd className="font-semibold tabular-nums text-brand-800">
                                − {formatSoles(resumenVenta.inicialAdicional)}
                              </dd>
                            </div>
                          )}
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <dt className="text-brand-600">Capital financiado</dt>
                            <dd className="font-semibold tabular-nums text-brand-900">
                              {formatSoles(resumenVenta.capitalFinanciado)}
                            </dd>
                          </div>
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <dt className="text-brand-600">Intereses totales ({condicionesVenta?.tasaNominalAnualPct ?? '—'} % anual)</dt>
                            <dd className="font-semibold tabular-nums text-brand-900">
                              {formatSoles(resumenVenta.interesTotal)}
                            </dd>
                          </div>
                          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-brand-100 pt-3">
                            <dt className="font-semibold text-brand-800">Total de cuotas</dt>
                            <dd className="font-bold tabular-nums text-brand-900">
                              {formatSoles(resumenVenta.totalCuotas)}
                            </dd>
                          </div>
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <dt className="font-semibold text-brand-900">
                              Precio final incluyendo intereses
                            </dt>
                            <dd className="text-lg font-bold tabular-nums text-brand-900">
                              {formatSoles(resumenVenta.totalOperacionConIntereses)}
                            </dd>
                          </div>
                        </>
                      )}
                    </dl>
                    {formSaleModality === 'FINANCIADA' && (
                      <div className="rounded-xl border border-sky-200 bg-gradient-to-r from-sky-50 to-white p-3 sm:p-4">
                        <p className="text-xs font-semibold text-sky-900">Cuota mensual fija</p>
                        <p className="mt-1 text-2xl font-extrabold tabular-nums text-brand-900 sm:text-3xl">
                          {formatSoles(resumenVenta.cuotaMensual)}
                        </p>
                        <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs text-brand-600">
                          <span>Ajuste última cuota: <strong>{formatSoles(
                            resumenVenta.cuotas[resumenVenta.cuotas.length - 1]?.cuota ?? 0
                          )}</strong></span>
                          <span>{resumenVenta.cuotas.length} cuotas mensuales</span>
                        </div>
                        <p className="mt-2 border-t border-sky-100 pt-2 text-[11px] leading-relaxed text-brand-600">
                          Sistema francés: cuotas mensuales iguales, con amortización de capital creciente
                          e intereses decrecientes. La última puede variar unos céntimos por redondeo.
                        </p>
                      </div>
                    )}
                  </section>
                ) : (
                  <p className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs leading-relaxed text-amber-900">
                    {!formLotId ? 'Seleccione un lote para consultar las condiciones.'
                      : consultandoPolitica ? 'Consultando política financiera…'
                      : !condicionesVenta ? 'No se puede calcular la operación sin condiciones financieras verificadas.'
                      : estadoPrecio !== 'disponible' ? 'No se pudo verificar el precio oficial vigente del lote.'
                      : formSaleModality === 'FINANCIADA' ? 'Complete una inicial válida y un plazo dentro de la política autorizada para calcular las cuotas.'
                      : 'No se pudo calcular el saldo con las condiciones disponibles.'}
                  </p>
                )}
                <p className="text-xs leading-relaxed text-brand-600">
                  La operación se registra inicialmente como PENDIENTE.
                  El contrato debe firmarse y aprobarse antes de confirmar la venta
                  y cambiar el lote a VENDIDO.
                </p>
              </div>
            )}

            {opType === 'Venta' && (
              <section className="space-y-3 rounded-2xl border border-brand-200 bg-white p-3 shadow-sm sm:p-5">
                <div>
                  <h3 className="text-sm font-semibold text-brand-900">Pago y comprobantes</h3>
                  <p className="mt-1 text-xs text-brand-600">
                    {formSaleModality === 'FINANCIADA'
                      ? 'Adjunta los comprobantes de la inicial adicional. La separación confirmada se descuenta de la inicial pactada.'
                      : 'Adjunta los comprobantes del saldo al contado.'}
                    {' '}Serán revisados por Finanzas.
                  </p>
                </div>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div className="min-w-0">
                    <label className="mb-1.5 block text-xs font-semibold text-brand-700" htmlFor="metodo-pago-venta">
                      Método de pago *
                    </label>
                    <Select id="metodo-pago-venta" value={formPaymentMethod} onChange={e => {
                      setFormPaymentMethod(e.target.value as typeof formPaymentMethod);
                      setFormOperationNumber('');
                      setComprobantesVenta([]);
                    }}>
                      <option value="TRANSFERENCIA">Transferencia bancaria</option>
                      <option value="DEPOSITO">Depósito bancario</option>
                      <option value="YAPE_PLIN">Yape / Plin</option>
                      <option value="EFECTIVO">Efectivo</option>
                      <option value="OTRO">Otro medio</option>
                    </Select>
                  </div>
                  <div className="min-w-0">
                    <label className="mb-1.5 block text-xs font-semibold text-brand-700" htmlFor="operacion-venta">
                      N.º de operación {requiereNumeroOperacionVenta ? '*' : '(opcional)'}
                    </label>
                    <Input id="operacion-venta" maxLength={80} value={formOperationNumber}
                      disabled={formPaymentMethod === 'EFECTIVO'}
                      placeholder={formPaymentMethod === 'EFECTIVO' ? 'No aplica' : 'Número de transacción'}
                      onChange={e => setFormOperationNumber(e.target.value)} />
                    {formTouched && requiereNumeroOperacionVenta && !formOperationNumber.trim() && (
                      <p className="mt-1 text-xs text-red-600">Número de operación obligatorio.</p>
                    )}
                  </div>
                </div>
                <div className="space-y-2 rounded-xl border border-dashed border-brand-200 bg-brand-50/40 p-3">
                  <label htmlFor="comprobantes-venta" className="block text-xs font-semibold text-brand-800">
                    Comprobantes de {formSaleModality === 'FINANCIADA' ? 'inicial' : 'pago'}
                    {archivosVentaObligatorios ? ' *' : ' (opcional en efectivo)'}
                  </label>
                  <input id="comprobantes-venta" type="file" multiple
                    accept=".pdf,.jpg,.jpeg,.png,.webp,application/pdf,image/jpeg,image/png,image/webp"
                    onChange={agregarComprobantesVenta}
                    className="block w-full min-w-0 text-xs text-brand-700 file:mr-3 file:rounded-md file:border file:border-brand-200 file:bg-white file:px-3 file:py-2 file:text-xs file:font-semibold file:text-brand-800 hover:file:bg-brand-50" />
                  <p className="text-[11px] text-brand-500">
                    Hasta 8 archivos. PDF, JPG, PNG o WebP; 5 MB por archivo. Al confirmar se cargarán al almacenamiento privado.
                  </p>
                  {comprobantesVenta.length > 0 && (
                    <ul className="space-y-1.5">
                      {comprobantesVenta.map((archivo, indice) => (
                        <li key={indice} className="flex min-w-0 items-center justify-between gap-2 rounded-md bg-white px-2 py-2 text-xs">
                          <span className="min-w-0 truncate" title={archivo.name}>
                            <FileTextIcon className="mr-1 inline h-3.5 w-3.5 text-brand-500"/>
                            {archivo.name} ({(archivo.size/1024).toFixed(0)} KB)
                          </span>
                          <button type="button" className="shrink-0 font-semibold text-red-600 hover:underline"
                            onClick={() => setComprobantesVenta(p => p.filter((_,i)=>i!==indice))}
                          >Quitar</button>
                        </li>
                      ))}
                    </ul>
                  )}
                  {formTouched && archivosVentaObligatorios && !comprobantesVenta.length &&
                    <p role="alert" className="text-xs font-medium text-red-600">
                      Adjunte al menos un comprobante de pago.
                    </p>}
                </div>
              </section>
            )}

            <div>
              <label className="mb-1 block text-[12px] font-medium text-brand-700">
                Observaciones (Opcional)
              </label>
              <Input
                type="text"
                placeholder="Detalle o nota interna..."
                value={formObservations}
                onChange={(e) => setFormObservations(e.target.value)}
              />
            </div>
          </fieldset></form>
        )}
      </Modal>


      <EditarDatosCompradorModal
        open={editandoComprador && datosVentaValidados !== null}
        idProspecto={datosVentaValidados?.datos.idProspecto ?? 0}
        lote={datosVentaValidados?.codigoLote ?? ''}
        proyecto={availableProjects.find((p) => p.idProyecto === Number(formProjectId))?.nombre ?? ''}
        idProyectoVenta={Number(formProjectId)}
        compradorExistente={(prospectsList.find(p => p.id_prospecto === selectedProspectId)
          ?.estado_codigo ?? '').toUpperCase() === 'CONVERTIDO'}
        modalidad={datosVentaValidados?.datos.modalidad ?? 'CONTADO'}
        puedeReasignar={puedeReasignarComprador}
        asesorNombre={prospectsList.find((p) => p.id_prospecto === selectedProspectId)?.asesor_nombre ?? ''}
        onClose={() => {
          if (!submitting) {
            setEditandoComprador(false);
            setDatosVentaValidados(null);
          }
        }}
        onGuardar={(datosComprador: CrmDatosCompradorVenta) => {
          if (!datosVentaValidados) return;
          setConfirmacionVenta({
            ...datosVentaValidados,
            datos: { ...datosVentaValidados.datos, datosComprador },
            idAsesor: datosComprador.idAsesor ?? datosVentaValidados.idAsesor
          });
          setEditandoComprador(false);
          setDatosVentaValidados(null);
          toast.info('Ficha revisada. Los cambios se guardarán al confirmar el registro de la venta.');
        }}
      />

      <Modal
        open={confirmacionVenta !== null}
        onClose={() => {
          if (!submitting && !registroVentaEnCursoRef.current) {
            setConfirmacionVenta(null);
          }
        }}
        title="Confirmar registro de venta"
        description="Confirma el registro pendiente y la actualización conjunta de los datos contractuales."
        footer={
          <>
            <Button
              variant="secondary"
              disabled={submitting}
              onClick={() => setConfirmacionVenta(null)}
            >
              Cancelar registro
            </Button>

            <Button
              variant="primary"
              disabled={submitting}
              onClick={() => void confirmarRegistroVentaPendiente()}
            >
              {submitting ? 'Registrando…' : 'Confirmar registro'}
            </Button>
          </>
        }
      >
        {confirmacionVenta && (
          <div className="space-y-4 text-sm">
            <dl className="grid grid-cols-2 gap-3">
              <div>
                <dt className="text-brand-500">Cliente comprador revisado</dt>
                <dd className="font-semibold text-brand-900">
                  {[confirmacionVenta.datos.datosComprador?.nombres,
                    confirmacionVenta.datos.datosComprador?.apellidoPaterno,
                    confirmacionVenta.datos.datosComprador?.apellidoMaterno]
                    .filter(Boolean).join(' ')}
                  <span className="mt-1 block font-mono text-[11px] font-normal text-brand-500">
                    {confirmacionVenta.datos.datosComprador?.tipoDocumento}: {confirmacionVenta.datos.datosComprador?.numeroDocumento}
                  </span>
                </dd>
              </div>

              <div>
                <dt className="text-brand-500">Lote</dt>
                <dd className="font-semibold text-brand-900">
                  {confirmacionVenta.codigoLote}
                </dd>
              </div>

              <div>
                <dt className="text-brand-500">Asesor comercial</dt>
                <dd className="font-semibold text-brand-900">
                  {confirmacionVenta.idAsesor && confirmacionVenta.idAsesor > 0 ? (
                    <span className="inline-flex items-center gap-1 text-emerald-800">
                      <UserCheckIcon className="h-3.5 w-3.5 text-emerald-600" />
                      Asesor #{confirmacionVenta.idAsesor}
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-amber-800 text-xs font-semibold">
                      <AlertTriangleIcon className="h-3.5 w-3.5 text-amber-600" />
                      Sin asesor vinculado
                    </span>
                  )}
                </dd>
              </div>

              <div>
                <dt className="text-brand-500">Modalidad</dt>
                <dd className="font-semibold text-brand-900">
                  {confirmacionVenta.datos.modalidad === 'FINANCIADA'
                    ? 'Financiada'
                    : 'Contado'}
                </dd>
              </div>

              <div>
                <dt className="text-brand-500">Precio de venta</dt>
                <dd className="font-semibold text-brand-900">
                  {formatSoles(confirmacionVenta.datos.montoTotal)}
                </dd>
              </div>
              {confirmacionVenta.resumen.abonoReserva > 0 && (
                <div>
                  <dt className="text-emerald-700">Pago de reserva acreditado</dt>
                  <dd className="font-semibold text-emerald-800">
                    − {formatSoles(confirmacionVenta.resumen.abonoReserva)}
                  </dd>
                </div>
              )}
              {confirmacionVenta.datos.modalidad === 'CONTADO' && (
                <div>
                  <dt className="text-brand-500">Saldo al contado</dt>
                  <dd className="font-semibold text-brand-900">
                    {formatSoles(confirmacionVenta.resumen.saldoContado)}
                  </dd>
                </div>
              )}

              {confirmacionVenta.datos.modalidad === 'FINANCIADA' && (
                <>
                  <div>
                    <dt className="text-brand-500">Inicial total pactada</dt>
                    <dd className="font-semibold text-brand-900">
                      {formatSoles(confirmacionVenta.datos.montoInicial ?? 0)}
                    </dd>
                  </div>

                  <div>
                    <dt className="text-brand-500">Número de cuotas</dt>
                    <dd className="font-semibold text-brand-900">
                      {confirmacionVenta.datos.numeroCuotas}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-brand-500">Tasa nominal anual fija</dt>
                    <dd className="font-semibold text-brand-900">
                      {confirmacionVenta.tasaAnualPct} % anual
                    </dd>
                  </div>
                  <div>
                    <dt className="text-brand-500">Capital financiado</dt>
                    <dd className="font-semibold text-brand-900">
                      {formatSoles(confirmacionVenta.resumen.capitalFinanciado)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-brand-500">Cuota mensual fija (sistema francés)</dt>
                    <dd className="font-semibold text-brand-900">
                      {formatSoles(confirmacionVenta.resumen.cuotaMensual)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-brand-500">Intereses totales</dt>
                    <dd className="font-semibold text-brand-900">
                      {formatSoles(confirmacionVenta.resumen.interesTotal)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-brand-500">Total incluyendo intereses</dt>
                    <dd className="font-semibold text-brand-900">
                      {formatSoles(confirmacionVenta.resumen.totalOperacionConIntereses)}
                    </dd>
                  </div>
                </>
              )}
            </dl>

            <div className="rounded-lg border border-brand-200 bg-brand-50 p-3 text-xs text-brand-800">
              <strong>Método de pago:</strong> {formPaymentMethod.replace('_',' / ')}.
              {' '}{comprobantesVenta.length} archivo(s) pendiente(s) de carga.
              {formPaymentMethod === 'EFECTIVO'
                ? ' La evidencia de efectivo es opcional.'
                : ' Los comprobantes se verificarán antes de reconocer el pago.'}
            </div>

            <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
              Al confirmar, se registrará una venta en estado
              <strong> PENDIENTE</strong> y se generará un contrato
              pendiente de firma. El lote permanecerá
              <strong> RESERVADO</strong> hasta la aprobación contractual.
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
