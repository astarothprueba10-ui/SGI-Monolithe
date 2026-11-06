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
import { EmptyState } from '../components/ui/Feedback';
import { Modal } from '../components/ui/Modal';
import { Gate } from '../components/auth/PermissionRoute';
import { useAuth } from '../contexts/AuthContext';
import { currency } from '../utils/format';
import { salesService } from '../services/salesService';
import {
  crmBackend,
  type CrmProspect,
  type CrmSaleValidationInput,
  type CrmReservaVigenteVenta,
  type CrmContratoDocumentacion
} from '../services/crmBackend';
import { ContratosPendientesPanel } from '../components/sales/ContratosPendientesPanel';
import { DocumentacionContratosPanel } from '../components/sales/DocumentacionContratosPanel';
import type { Sale } from '../types';
import { coreService, type LotePrecioVigente } from '../services/coreService';
import { ApiError } from '../lib/apiClient';
import type { ProyectoResponse, EtapaResponse, LoteResponse } from '../types/core';
import { AnexosContratoPanel } from '../components/sales/AnexosContratoPanel';
import { ComprobanteSeparacionPreview } from '../components/sales/ComprobanteSeparacionPreview';
import {
  FILTROS_SEPARACIONES_INICIALES,
  filtrarSeparaciones, leyendaVencimiento, opcionesUnicasSeparaciones,
  type FiltrosSeparaciones
} from '../utils/separacionesFiltros';
import { exportarSeparacionesExcel } from '../utils/separacionesExportExcel';
import { calcularVenta } from '../utils/financiamientoAleman';

const SEPARACION_ENVIO_DESHABILITADO = false;


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

function ProspectAdvisorInfo({ prospect }: { prospect?: CrmProspect }) {
  if (!prospect) return null;
  const tieneAsesor = Boolean(prospect.asesor_nombre?.trim());
  return (
    <div className="mt-2 rounded-md border border-brand-100 bg-brand-50/50 p-2.5 text-xs">
      <div className="flex items-center justify-between">
        <span className="text-brand-600 font-medium">Asesor asignado en CRM:</span>
        <span className={`inline-flex items-center gap-1 font-semibold ${tieneAsesor ? 'text-emerald-800' : 'text-amber-800'}`}>
          {tieneAsesor ? <UserCheckIcon className="h-3.5 w-3.5 text-emerald-600" /> : <AlertTriangleIcon className="h-3.5 w-3.5 text-amber-600" />}
          {tieneAsesor ? prospect.asesor_nombre : 'Sin asesor asignado'}
        </span>
      </div>
      <p className="mt-1 text-[11px] text-brand-500">
        {tieneAsesor ? 'Continuidad confirmada: el backend asignará este asesor a la venta.' : 'Atención: prospecto sin asesor activo; la operación no tendrá asesor vinculado.'}
      </p>
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
  const { can } = useAuth();
  const [tab, setTab] = useState<
    'Separación' | 'Venta' | 'Contratos' | 'Anexos'
  >('Separación');
  const [query, setQuery] = useState('');
  const [modality, setModality] = useState<'all' | Sale['modality']>('all');
  const [filtrosSeparacion, setFiltrosSeparacion] = useState<FiltrosSeparaciones>(FILTROS_SEPARACIONES_INICIALES);
  const [paginaSeparaciones, setPaginaSeparaciones] = useState(1);
  const tamanoPaginaSeparaciones = 15;
  const [exportandoSeparaciones, setExportandoSeparaciones] = useState(false);
  const [instanteActual, setInstanteActual] = useState(() => Date.now());
  const [advisorFilter, setAdvisorFilter] = useState<'all' | 'with_advisor' | 'without_advisor'>('all');
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
  // El formulario pertenece a la pestaña; no se cambia el tipo dentro del modal.
  const opType: 'Separacion' | 'Venta' = tab === 'Venta' ? 'Venta' : 'Separacion';
  const [availableLots, setAvailableLots] = useState<LoteResponse[]>([]);
  const [loadingLots, setLoadingLots] = useState(false); const [prospectsList, setProspectsList] = useState<CrmProspect[]>([]);
  const [selectedProspectId, setSelectedProspectId] = useState<number | ''>('');
  const [availableProjects, setAvailableProjects] = useState<ProyectoResponse[]>([]);
  const [formProjectId, setFormProjectId] = useState('');
  const [availableStages, setAvailableStages] = useState<EtapaResponse[]>([]);
  const [formStageId, setFormStageId] = useState('');
  const [loadingStages, setLoadingStages] = useState(false);
  const [loadingProjects, setLoadingProjects] = useState(false);
  const [formLotId, setFormLotId] = useState('');
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
  const [formSaleRate, setFormSaleRate] = useState('');
  const [reservasVigentes, setReservasVigentes] = useState<CrmReservaVigenteVenta[]>([]);
  const [autoseleccionPendiente, setAutoseleccionPendiente] = useState<{
    idProyecto: number; idEtapa: number; idLote: number;
  } | null>(null);
  const seleccionProspectoPeticionRef = React.useRef(0);
  const [voucherFile, setVoucherFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const registroSeparacionEnCursoRef = React.useRef(false);
  const registroVentaEnCursoRef = React.useRef(false);
  const [confirmacionVenta, setConfirmacionVenta] = useState<{
    datos: CrmSaleValidationInput;
    codigoProspecto: string;
    codigoLote: string;
    idAsesor?: number | null;
  } | null>(null);
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

  const ejecutarExportacionSeparaciones = async () => {
    if (tab !== 'Separación' || exportandoSeparaciones) return;
    if (!can('sales.view') || !can('sales.export')) {
      toast.error('No tienes permiso para exportar separaciones.');
      return;
    }
    if (filtrosSeparacion.desde && filtrosSeparacion.hasta &&
        filtrosSeparacion.desde > filtrosSeparacion.hasta) {
      toast.error('La fecha desde no puede ser posterior a la fecha hasta.');
      return;
    }
    setExportandoSeparaciones(true);
    try {
      const resultado = await exportarSeparacionesExcel(filtrosSeparacion);
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

    setSelectedProspectId('');
    setAvailableProjects([]);
    setFormProjectId('');
    setAvailableLots([]);
    setFormLotId('');

    try {
      const prospects = await crmBackend.prospectos();

      const elegibles = (prospects ?? []).filter((p) =>
        ['INTERESADO', 'NEGOCIACION', 'CON_RESERVA'].includes(
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
    setFormProjectId('');
    setFormStageId('');
    setAvailableStages([]);
    setAvailableProjects([]);
    setAvailableLots([]);
    setFormLotId('');
    setReservasVigentes([]);
    setAutoseleccionPendiente(null);
    if (id === '') return;

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
      const elegibles = proyectos.filter((p) => p.activo && intereses.has(p.idProyecto));
      setAvailableProjects(elegibles);
      setReservasVigentes(consultaReservas.reservas ?? []);

      const reserva = (consultaReservas.reservas ?? [])
        .find((r) => elegibles.some((p) => p.idProyecto === r.idProyecto));
      if (reserva) {
        setAutoseleccionPendiente({
          idProyecto: reserva.idProyecto,
          idEtapa: reserva.idEtapa,
          idLote: reserva.idLote
        });
        setFormProjectId(String(reserva.idProyecto));
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
    setFormSaleRate('');
    setFormOperationNumber('');
    setVoucherFile(null);
    setFormObservations('');
    setIsModalOpen(true);
  };

  const cerrarModalOperacion = () => {
    if (
      registroSeparacionEnCursoRef.current ||
      registroVentaEnCursoRef.current ||
      confirmacionVenta
    ) return;

    setIsModalOpen(false);
  };

  const handleSelectLot = (lotIdStr: string) => {
    setFormLotId(lotIdStr);
  };

  useEffect(() => {
    setVoucherFile(null);
  }, [
    selectedProspectId,
    formProjectId,
    formStageId,
    formLotId
  ]);

  const handleFileChange = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0] ?? null;

    // Permite volver a seleccionar el mismo archivo.
    e.target.value = '';

    // Evita conservar un comprobante anterior.
    setVoucherFile(null);

    if (!file) return;

    const allowed = [
      'application/pdf',
      'image/jpeg',
      'image/png',
      'image/webp'
    ];
    if (!allowed.includes(file.type)) {
      toast.error('Formato no permitido', {
        description: 'Utilice archivos PDF, JPG, PNG o WebP.'
      });
      return;
    }
    if (file.size <= 0) {
      toast.error('Archivo vacío', {
        description: 'El comprobante debe contener información.'
      });
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Archivo demasiado grande', {
        description: 'El comprobante no debe superar 5 MB.'
      });
      return;
    }
    if (!file.name.trim() || file.name.length > 255) {
      toast.error('Nombre de archivo inválido', {
        description: 'El nombre del comprobante no debe superar 255 caracteres.'
      });
      return;
    }
    setVoucherFile(file);
  };

  const validarFormularioSeparacion = (): boolean => {
    setFormTouched(true);
    if (!selectedProspectId) {
      toast.error('Debe seleccionar un prospecto del CRM.');
      return false;
    }
    if (!formLotId) {
      toast.error('Debe seleccionar un lote disponible.');
      return false;
    }
    if (estadoPrecio !== 'disponible' || !precioLote) {
      toast.error(
        'No se puede continuar sin un precio oficial vigente.'
      );
      return false;
    }

    const requiereNumeroOperacion = [
      'TRANSFERENCIA',
      'DEPOSITO',
      'YAPE_PLIN'
    ].includes(formPaymentMethod);

    if (requiereNumeroOperacion && !formOperationNumber.trim()) {
      toast.error(
        'El número de operación es obligatorio para el método de pago seleccionado.'
      );
      return false;
    }

    if (!voucherFile) {
      toast.error('Debe adjuntar el comprobante de pago de S/ 500.');
      return false;
    }
    return true;
  };



  const ejecutarRegistroSeparacion = async () => {
    if (registroSeparacionEnCursoRef.current) {
      return;
    }

    registroSeparacionEnCursoRef.current = true;
    setSubmitting(true);

    let comprobanteCargado = false;

    try {
      if (!voucherFile) {
        throw new Error('Comprobante requerido.');
      }

      const prospectId = Number(selectedProspectId);
      const lotIdNum = Number(formLotId);

      // 1. Subir comprobante al Storage privado.
      const carga = await crmBackend.subirComprobanteSeparacion(
        prospectId,
        lotIdNum,
        voucherFile
      );

      comprobanteCargado = true;

      // 2. Registrar la separación mediante Core Service.
      const res = await crmBackend.registrarSeparacion({
        idProspecto: prospectId,
        idLote: lotIdNum,
        metodoPago: formPaymentMethod,
        numeroOperacion: formOperationNumber.trim() || null,
        monto: 500.00,
        observaciones: formObservations.trim() || null,
        claveArchivo: carga.claveArchivo,
        nombreArchivo: carga.nombreArchivo,
        tipoMime: carga.tipoMime,
        tamanioBytes: carga.tamanioBytes
      });

      const vencimiento = res.fecha_vencimiento
        ? new Date(res.fecha_vencimiento).toLocaleDateString(
          'es-PE',
          { timeZone: 'America/Lima' }
        )
        : 'Fecha pendiente de confirmar';

      toast.success('Separación registrada exitosamente', {
        description:
          `Código: ${res.codigo_reserva || res.id_reserva}. ` +
          `Monto: S/ 500.00 PEN. ` +
          `Vence: ${vencimiento}. ` +
          'Comprobante pendiente de revisión por Finanzas.'
      });

      setIsModalOpen(false);
      await fetchSalesData();

    } catch (err: unknown) {
      const mensaje = err instanceof Error
        ? err.message
        : 'Error inesperado durante la operación.';

      if (comprobanteCargado) {
        toast.error('No se pudo confirmar la separación', {
          description:
            'El comprobante fue cargado, pero el registro ' +
            'comercial no pudo confirmarse. ' +
            'Verifica las operaciones existentes antes ' +
            'de intentar nuevamente. Detalle: ' + mensaje,
          duration: 10000
        });
      } else {
        toast.error('No se confirmó la carga del comprobante', {
          description: mensaje,
          duration: 8000
        });
      }

    } finally {
      registroSeparacionEnCursoRef.current = false;
      setSubmitting(false);
    }
  };


  const ejecutarRegistroVentaPendiente = async () => {
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
        montoInicial <= 0 ||
        montoInicial >= montoTotal ||
        !Number.isInteger(numeroCuotas) ||
        numeroCuotas < 1 ||
        numeroCuotas > 36
      )
    ) {
      toast.error('Revise el monto inicial y las cuotas de financiamiento.');
      return;
    }

    const datos = {
      idProspecto,
      idLote,
      modalidad: formSaleModality,
      montoTotal,
      montoInicial: esFinanciada ? montoInicial : null,
      numeroCuotas: esFinanciada ? numeroCuotas : null,
      observaciones: formObservations.trim() || null
    };

    registroVentaEnCursoRef.current = true;
    setSubmitting(true);

    try {
      // Revalidación obligatoria antes de registrar.
      const validacion = await crmBackend.validarVenta(datos);

      if (
        !validacion.elegible ||
        validacion.idProspecto !== idProspecto ||
        validacion.idLote !== idLote ||
        validacion.modalidad !== formSaleModality ||
        Number(validacion.precioVigente) !== montoTotal
      ) {
        throw new Error('La validación comercial no coincide con la operación.');
      }

      setConfirmacionVenta({
        datos,
        codigoProspecto: validacion.codigoProspecto,
        codigoLote: validacion.codigoLote,
        idAsesor: validacion.idAsesor
      });

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

    if (submitting || registroSeparacionEnCursoRef.current) return;

    if (opType === 'Venta') {
      setFormTouched(true);

      if (!selectedProspectId || !formLotId) {
        toast.error('Seleccione un prospecto y un lote.');
        return;
      }

      const idLote = Number(formLotId);
      const loteSeleccionado = availableLots.find(
        (lote) => lote.idLote === idLote
      );

      if (!loteSeleccionado) {
        toast.error('El lote seleccionado ya no está disponible.');
        return;
      }

      if (
        estadoPrecio !== 'disponible' ||
        !precioLote ||
        precioLote.idLote !== idLote
      ) {
        toast.error('Debe verificarse el precio oficial del lote.');
        return;
      }

      const montoTotal = Number(precioLote.precio);

      if (!Number.isFinite(montoTotal) || montoTotal <= 0) {
        toast.error('El precio oficial no es válido.');
        return;
      }

      const financiada = formSaleModality === 'FINANCIADA';
      const montoInicial = Number(formSaleDownPayment);
      const numeroCuotas = Number(formSaleInstallments);

      if (financiada) {
        if (
          !formSaleDownPayment.trim() ||
          !Number.isFinite(montoInicial) ||
          montoInicial <= 0 ||
          montoInicial >= montoTotal
        ) {
          toast.error('La inicial debe ser mayor que cero y menor que el precio.');
          return;
        }

        if (
          !Number.isInteger(numeroCuotas) ||
          numeroCuotas < 1 ||
          numeroCuotas > 36
        ) {
          toast.error('El número de cuotas debe estar entre 1 y 36.');
          return;
        }
      }

      setSubmitting(true);

      try {
        const resultado = await crmBackend.validarVenta({
          idProspecto: Number(selectedProspectId),
          idLote,
          modalidad: formSaleModality,
          montoTotal,
          montoInicial: financiada ? montoInicial : null,
          numeroCuotas: financiada ? numeroCuotas : null,
          observaciones: formObservations.trim() || null
        });

        if (!resultado.elegible) {
          toast.error(
            resultado.mensaje || 'La operación no es elegible.'
          );
          return;
        }

        toast.success('Validación comercial satisfactoria', {
          description:
            `Lote: ${resultado.codigoLote}. ` +
            `Modalidad: ${resultado.modalidad}. ` +
            `Precio oficial: ${currency(resultado.precioVigente)}. ` +
            'La venta todavía no ha sido registrada.',
          duration: 8000
        });
      } catch (err: unknown) {
        toast.error('No se pudo validar la venta', {
          description:
            err instanceof Error
              ? err.message
              : 'Error al consultar Core Service.'
        });
      } finally {
        setSubmitting(false);
      }

      return;
    }

    // Flujo existente de separaciones de S/ 500.
    if (!validarFormularioSeparacion()) return;

    if (SEPARACION_ENVIO_DESHABILITADO) {
      toast.info('El registro de separaciones está deshabilitado.');
      return;
    }

    await ejecutarRegistroSeparacion();
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
      const resultado = await crmBackend.registrarVentaPendiente(
        solicitud.datos
      );

      if (
        !resultado.success ||
        resultado.estadoVenta !== 'PENDIENTE' ||
        resultado.estadoContrato !== 'PENDIENTE_FIRMA'
      ) {
        throw new Error('La respuesta requiere revisión.');
      }

      setConfirmacionVenta(null);
      setIsModalOpen(false);

      toast.success('Venta pendiente registrada', {
        description:
          `Venta: ${resultado.codigoVenta}. ` +
          `Contrato: ${resultado.codigoContrato}. ` +
          'Pendiente de firma y aprobación.',
        duration: 10000
      });

      await fetchSalesData();
    } catch (err: unknown) {
      setConfirmacionVenta(null);

      toast.error('No se pudo confirmar el registro', {
        description:
          (err instanceof Error
            ? err.message
            : 'Error inesperado.') +
          ' Revise las operaciones antes de reintentar.',
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
    const q = query.trim().toLowerCase();
    return salesList.filter((sale) => {
      const byTab = sale.type === tab;
      const byModality = modality === 'all' || sale.modality === modality;
      const byAdvisor = advisorFilter === 'all' ||
        (advisorFilter === 'with_advisor' && Boolean(sale.advisor?.trim())) ||
        (advisorFilter === 'without_advisor' && !sale.advisor?.trim());
      const byQuery = q.length === 0 ||
        sale.buyer.toLowerCase().includes(q) ||
        sale.code.toLowerCase().includes(q) ||
        sale.lot.toLowerCase().includes(q) ||
        sale.advisor.toLowerCase().includes(q);
      return byTab && byModality && byAdvisor && byQuery;
    });
  }, [salesList, tab, query, modality, advisorFilter, filtrosSeparacion]);

  const textoVencimientoDetalle = detail?.type === 'Separación'
    ? leyendaVencimiento(detail.expiresAtIso, detail.status, instanteActual)
    : null;

  const totalPaginasSeparaciones = Math.max(1, Math.ceil(rows.length / tamanoPaginaSeparaciones));
  const paginaSeparacionesActual = Math.min(paginaSeparaciones, totalPaginasSeparaciones);
  const filasSeparacionesPagina = rows.slice(
    (paginaSeparacionesActual - 1) * tamanoPaginaSeparaciones,
    paginaSeparacionesActual * tamanoPaginaSeparaciones
  );
  const reservaAplicable = opType === 'Venta' && formLotId
    ? reservasVigentes.find((r) => r.idLote === Number(formLotId))?.montoReserva ?? 0
    : 0;

  const resumenVenta = useMemo(() => {
    if (opType !== 'Venta' || !precioLote || estadoPrecio !== 'disponible'
        || precioLote.idLote !== Number(formLotId)) return null;
    try {
      if (formSaleModality === 'CONTADO')
        return calcularVenta(Number(precioLote.precio), reservaAplicable);
      if (!formSaleDownPayment.trim() || !formSaleRate.trim()
          || !formSaleInstallments.trim()) return null;
      return calcularVenta(
        Number(precioLote.precio), reservaAplicable,
        Number(formSaleDownPayment), Number(formSaleInstallments),
        Number(formSaleRate));
    } catch {
      return null;
    }
  }, [opType, precioLote, estadoPrecio, formLotId, formSaleModality,
      formSaleDownPayment, formSaleRate, formSaleInstallments, reservaAplicable]);

  const separationsCount = salesList.filter((s) => s.type === 'Separación').length;
  const salesCount = salesList.filter((s) => s.type === 'Venta').length;

  useEffect(() => {
    let vigente = true;

    setAvailableStages([]);

    if (!formProjectId) {
      setLoadingStages(false);
      return;
    }

    setLoadingStages(true);

    void coreService
      .getActiveStagesByProject(Number(formProjectId))
      .then((etapas) => {
        if (!vigente) return;

        const activas = (etapas ?? []).filter(
          (etapa) => etapa.activo && etapa.idProyecto === Number(formProjectId)
        );
        setAvailableStages(activas);
        if (autoseleccionPendiente?.idProyecto === Number(formProjectId) &&
            activas.some((etapa) => etapa.idEtapa === autoseleccionPendiente.idEtapa)) {
          setFormStageId(String(autoseleccionPendiente.idEtapa));
        }
      })
      .catch((err: unknown) => {
        if (!vigente) return;

        toast.error('No se pudieron cargar las etapas', {
          description:
            err instanceof Error ? err.message : 'Error de consulta.'
        });
      })
      .finally(() => {
        if (vigente) setLoadingStages(false);
      });

    return () => {
      vigente = false;
    };
  }, [formProjectId, autoseleccionPendiente]);



  useEffect(() => {
    let vigente = true;

    setAvailableLots([]);
    setFormLotId('');

    if (!formProjectId || !formStageId || !selectedProspectId) {
      setLoadingLots(false);
      return;
    }

    const idProyecto = Number(formProjectId);
    const idEtapa = Number(formStageId);

    setLoadingLots(true);

    const cargarLotes = async () => {
      try {
        const [lotes, reservas] = await Promise.all([
          coreService.searchLots({
            idProyecto,
            idEtapa,
            activo: true
          }),

          opType === 'Venta'
            ? crmBackend.listarLotesReservadosDelProspecto(
              Number(selectedProspectId)
            )
            : Promise.resolve({ idLotes: [] as number[] })
        ]);

        if (!vigente) return;

        const idsReservados = new Set(
          (reservas.idLotes ?? []).filter(
            (id) => Number.isSafeInteger(id) && id > 0
          )
        );

        const lotesPermitidos = (lotes ?? []).filter((lote) => {
          if (
            lote.activo !== true ||
            lote.idProyecto !== idProyecto ||
            lote.idEtapa !== idEtapa
          ) {
            return false;
          }

          const estado = lote.codigoEstadoLote?.toUpperCase();

          if (estado === 'DISPONIBLE') {
            return true;
          }

          return (
            opType === 'Venta' &&
            estado === 'RESERVADO' &&
            idsReservados.has(lote.idLote)
          );
        });

        setAvailableLots(lotesPermitidos);
        if (opType === 'Venta' && autoseleccionPendiente &&
            autoseleccionPendiente.idProyecto === idProyecto &&
            autoseleccionPendiente.idEtapa === idEtapa &&
            lotesPermitidos.some((lote) => lote.idLote === autoseleccionPendiente.idLote)) {
          setFormLotId(String(autoseleccionPendiente.idLote));
          setAutoseleccionPendiente(null);
        }
      } catch (err: unknown) {
        if (!vigente) return;

        setAvailableLots([]);

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
    formStageId,
    selectedProspectId,
    opType,
    autoseleccionPendiente
  ]);



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
          ? 'Gestiona separaciones de S/ 500, métodos de pago, comprobantes y reservas de lotes.'
          : tab === 'Venta'
            ? 'Gestiona las ventas, modalidades de financiamiento y contratos asociados.'
            : 'Gestiona los contratos y documentos comerciales de las operaciones.'}
        actions={
          <div className="flex items-center gap-2">
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

      <Tabs
        className="mb-5"
        active={tab}
        onChange={(id) => {
          setTab(id as typeof tab);
          setQuery('');
          setModality('all');
          limpiarFiltrosSeparacion();
          setAdvisorFilter('all');
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
            id: 'Contratos',
            label: 'Contratos pendientes de firma'
          },
          {
            id: 'Anexos',
            label: 'Gestionar anexos de ventas'
          }
        ]}
      />

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
            <div className="flex flex-wrap items-end gap-3 border-b border-brand-100 px-5 py-3.5">
              <label className="flex min-w-0 flex-col gap-1.5">
                <span className="text-xs font-semibold text-brand-700">Buscar comprador</span>
                <SearchInput value={query} onValueChange={setQuery}
                  placeholder="Comprador, código o lote…" className="w-full sm:w-72" />
              </label>
              <label className="flex min-w-0 flex-col gap-1.5">
                <span className="text-xs font-semibold text-brand-700">Modalidad de venta</span>
                <Select value={modality} onChange={(e) => setModality(e.target.value as typeof modality)}
                  className="w-full sm:w-40">
                  <option value="all">Todas</option>
                  <option value="Contado">Contado</option>
                  <option value="Financiado">Financiado</option>
                </Select>
              </label>
              <label className="flex min-w-0 flex-col gap-1.5">
                <span className="text-xs font-semibold text-brand-700">Asesor</span>
                <Select value={advisorFilter}
                  onChange={(e) => setAdvisorFilter(e.target.value as typeof advisorFilter)}
                  className="w-full sm:w-44">
                  <option value="all">Todos los asesores</option>
                  <option value="with_advisor">Con asesor</option>
                  <option value="without_advisor">Sin asesor</option>
                </Select>
              </label>
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
                : '[&_table]:min-w-[1560px]'
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
              {(tab === 'Separación' ? filasSeparacionesPagina : rows).map((sale) => (
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
                      {currency(sale.amount)}
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
                      <EstadoSeparacionBadge estado={sale.status} />
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
                  <TR key={sale.id}>
                    <TD className="whitespace-nowrap text-xs text-brand-700">
                      {sale.date || '—'}
                    </TD>

                    <TD className="whitespace-nowrap font-mono text-xs font-semibold text-brand-900">
                      {sale.code}
                    </TD>

                    <TD className="min-w-[150px] font-medium text-brand-900">
                      {sale.buyer || '—'}
                    </TD>

                    <TD className="min-w-[170px] text-brand-700">
                      {sale.project || '—'}
                    </TD>

                    <TD className="whitespace-nowrap font-mono text-xs font-semibold text-brand-800">
                      {sale.lot || '—'}
                    </TD>

                    <TD align="right" className="whitespace-nowrap font-semibold text-brand-900">
                      {currency(sale.amount)}
                    </TD>

                    <TD className="whitespace-nowrap text-brand-700">
                      {sale.modality ?? 'Por definir'}
                    </TD>

                    <TD className="min-w-[140px]">
                      <AdvisorBadge advisor={sale.advisor} type={sale.type} />
                    </TD>

                    <TD>
                      <StatusBadge status={sale.status} />
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
                      <button
                        type="button"
                        onClick={() => setDetail(sale)}
                        title="Ver ficha de venta"
                        aria-label={`Ver ficha de ${sale.buyer}`}
                        className="inline-flex items-center justify-center rounded-lg p-2 text-brand-700 hover:bg-brand-50 hover:text-brand-900"
                      >
                        <EyeIcon className="h-5 w-5" />
                      </button>
                    </TD>
                  </TR>
                )
              ))}
            </Table>

          )}
          {tab === 'Separación' && (
            <Pagination
              page={paginaSeparacionesActual}
              pageSize={tamanoPaginaSeparaciones}
              total={rows.length}
              onPageChange={setPaginaSeparaciones}
            />
          )}
        </Card>
      )}

      {/* Modal Detalle de Operación */}
      <Modal
        open={detail !== null}
        onClose={() => setDetail(null)}
        title={detail ? `Operación ${detail.code}` : ''}
        description={detail ? `${detail.type} · ${detail.buyer}` : ''}
        width="max-w-3xl"
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
                <p className="text-2xl font-bold tabular-nums text-brand-900">{currency(detail.amount)}</p>
                {detail.type === 'Separación'
                  ? <EstadoSeparacionBadge estado={detail.status} />
                  : <StatusBadge status={detail.status} />}
              </div>
            </div>

            <section className="rounded-xl border border-brand-100 bg-white px-4 py-2 sm:px-5">
              <h3 className="border-b border-brand-100 py-3 text-sm font-semibold text-brand-900">
                {detail.type === 'Separación' ? 'Información de la separación' : 'Información de la venta'}
              </h3>
              <dl className="grid grid-cols-1 gap-x-7 sm:grid-cols-2">
                {[
                  {
                    label: detail.type === 'Separación' ? 'Prospecto' : 'Comprador',
                    value: (
                      <div className="flex flex-wrap items-center gap-2">
                        <span>{detail.buyer || '—'}</span>
                        {detail.type === 'Separación' && (
                          <span className="rounded-md border border-brand-200 bg-brand-50 px-2 py-0.5 font-mono text-[11px] font-semibold text-brand-700">
                            {detail.document && !/^[0-9]{8}$/.test(detail.document) ? 'Documento' : 'DNI'}: {detail.document || 'No registrado'}
                          </span>
                        )}
                      </div>
                    )
                  },
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

            {detail.type === 'Venta' && documentosPorVenta[detail.id] && (
              <section className="border-t border-brand-100 pt-4">
                <h3 className="mb-3 text-sm font-semibold text-brand-900">
                  Documentación asociada a la venta
                </h3>
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
        title={opType === 'Separacion' ? 'Registrar Separación de Lote' : 'Formalización de Venta'}
        description={opType === 'Separacion'
          ? 'Registra la separación de S/ 500 y adjunta su comprobante para revisión por Finanzas.'
          : 'Selecciona comprador, lote y condiciones de venta para formalizar la operación.'}
        footer={
          <div className="flex justify-end gap-2">
            <Button
              variant="secondary"
              disabled={submitting}
              onClick={cerrarModalOperacion}
            >
              Cancelar
            </Button>
            <Button
              variant="primary"

              disabled={
                submitting ||
                (opType === 'Separacion' && SEPARACION_ENVIO_DESHABILITADO)
              }
              onClick={handleProcessOperation}
            >
              {submitting
                ? 'Procesando…'
                : opType === 'Separacion'
                  ? 'Registrar Separación'
                  : 'Validar Venta'}
            </Button>

            {opType === 'Venta' && (
              <Button
                variant="primary"
                disabled={submitting || loadingLots}
                onClick={() => void ejecutarRegistroVentaPendiente()}
              >
                Registrar Venta Pendiente
              </Button>
            )}
          </div>
        }
      >
        {loadingFormData ? (
          <div className="py-8 text-center text-xs text-brand-500">
            Cargando prospectos y lotes disponibles…
          </div>
        ) : (
          <form onSubmit={handleProcessOperation} className="space-y-4">
            <div>
              <label className="mb-1 block text-[12px] font-medium text-brand-700">
                Prospecto (CRM) *
              </label>
              <Select
                value={selectedProspectId === '' ? '' : String(selectedProspectId)}
                onChange={(e) =>
                  void handleSelectProspect(
                    e.target.value ? Number(e.target.value) : ''
                  )
                }
              >
                <option value="">Seleccione un prospecto del CRM...</option>
                {prospectsList.map((prospect) => (
                  <option key={prospect.id_prospecto} value={prospect.id_prospecto}>
                    {prospect.nombre_completo} ({prospect.codigo}) - {prospect.estado_nombre}
                  </option>
                ))}
              </Select>
              <ProspectAdvisorInfo prospect={prospectsList.find((p) => p.id_prospecto === selectedProspectId)} />
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

              <Select
                value={formProjectId}
                disabled={!selectedProspectId || loadingProjects}
                onChange={(e) => {
                  setAutoseleccionPendiente(null);
                  setFormProjectId(e.target.value);
                  setFormStageId('');
                  setAvailableStages([]);
                  setFormLotId('');
                  setAvailableLots([]);
                }}
              >
                <option value="">
                  {loadingProjects
                    ? 'Cargando proyectos...'
                    : 'Seleccione un proyecto...'}
                </option>

                {availableProjects.map((project) => (
                  <option key={project.idProyecto} value={project.idProyecto}>
                    {project.nombre}
                  </option>
                ))}
              </Select>

              {selectedProspectId &&
                !loadingProjects &&
                availableProjects.length === 0 && (
                  <p className="mt-1 text-xs text-amber-700">
                    Este potencial no tiene proyectos de interés activos.
                  </p>
                )}
            </div>

            <div>
              <label className="mb-1 block text-[12px] font-medium text-brand-700">
                Etapa del proyecto *
              </label>

              <Select
                value={formStageId}
                disabled={!formProjectId || loadingStages}
                onChange={(e) => {
                  setAutoseleccionPendiente(null);
                  setFormStageId(e.target.value);
                  setFormLotId('');
                  setAvailableLots([]);
                }}
              >
                <option value="">
                  {loadingStages
                    ? 'Cargando etapas...'
                    : 'Seleccione una etapa...'}
                </option>

                {availableStages.map((etapa) => (
                  <option key={etapa.idEtapa} value={etapa.idEtapa}>
                    {etapa.nombre}
                  </option>
                ))}
              </Select>

              {formProjectId &&
                !loadingStages &&
                availableStages.length === 0 && (
                  <p className="mt-1 text-xs text-amber-700">
                    Este proyecto no tiene etapas activas disponibles.
                  </p>
                )}
            </div>

            <div>
              <label className="mb-1 block text-[12px] font-medium text-brand-700">

                {opType === 'Venta' ? 'Lote para venta *' : 'Lote disponible *'}

              </label>

              <Select
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

              </Select>


              {formLotId && (
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
                          <span className="font-bold tabular-nums text-emerald-800">− {currency(reservaAplicable)}</span>
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

              {formStageId &&
                !loadingLots &&
                availableLots.length === 0 && (
                  <p className="mt-1 text-xs text-amber-700">

                    {opType === 'Venta'
                      ? 'No hay lotes disponibles ni reservas autorizadas en esta etapa.'
                      : 'No hay lotes disponibles en esta etapa.'}
                  </p>
                )}

              {!formLotId && formTouched && (
                <p className="mt-1 text-xs font-medium text-rose-600">
                  Debe seleccionar un lote disponible.
                </p>
              )}
            </div>

            {opType === 'Separacion' ? (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="mb-1 block text-[12px] font-medium text-brand-700">
                      Método de pago (S/ 500.00) *
                    </label>
                    <Select
                      value={formPaymentMethod}
                      onChange={(e) => setFormPaymentMethod(e.target.value as any)}
                    >
                      <option value="TRANSFERENCIA">Transferencia Bancaria</option>
                      <option value="DEPOSITO">Depósito en Cuenta</option>
                      <option value="YAPE_PLIN">Billetera (Yape / Plin)</option>
                      <option value="EFECTIVO">Efectivo en Caja</option>
                      <option value="OTRO">Otro Medio</option>
                    </Select>
                  </div>

                  {formPaymentMethod !== 'EFECTIVO' ? (
                    <div>
                      <label className="mb-1 block text-[12px] font-medium text-brand-700">
                        N° de Operación {formPaymentMethod === 'OTRO' ? '(Opcional)' : '*'}
                      </label>
                      <Input
                        type="text"
                        placeholder="Ej: 00982341..."
                        value={formOperationNumber}
                        onChange={(e) => setFormOperationNumber(e.target.value)}
                      />
                      {formPaymentMethod !== 'OTRO' &&
                        !formOperationNumber.trim() &&
                        formTouched && (
                          <p className="mt-1 text-[11px] font-medium text-rose-600">
                            Número de operación obligatorio.
                          </p>
                        )}
                    </div>
                  ) : (
                    <div>
                      <label className="mb-1 block text-[12px] font-medium text-brand-700">
                        Caja / Modalidad
                      </label>
                      <div className="py-2 px-3 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-600">
                        Pago directo en efectivo (S/ 500)
                      </div>
                    </div>
                  )}
                </div>

                <div>
                  <label className="mb-1 block text-[12px] font-medium text-brand-700">
                    Comprobante de pago * (PDF, JPG, PNG o WebP - Máx. 5 MB)
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="file"
                      id="voucher-input"
                      accept=".pdf,image/jpeg,image/png,image/webp"
                      className="hidden"
                      onChange={handleFileChange}
                    />
                    <label
                      htmlFor="voucher-input"
                      className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border border-brand-300 rounded-md bg-white hover:bg-brand-50 text-brand-800"
                    >
                      <FileTextIcon className="w-3.5 h-3.5 text-brand-600" />
                      {voucherFile ? 'Cambiar comprobante' : 'Adjuntar comprobante'}
                    </label>
                    {voucherFile && (
                      <span className="text-xs text-brand-700 font-medium truncate max-w-[220px]">
                        {voucherFile.name} ({(voucherFile.size / 1024).toFixed(0)} KB)
                      </span>
                    )}
                  </div>
                  {!voucherFile && formTouched && (
                    <p className="mt-1 text-[11px] font-medium text-rose-600">
                      Debe adjuntar el comprobante o voucher de pago de S/ 500.00.
                    </p>
                  )}
                </div>

                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-900 space-y-1">
                  <p className="font-semibold text-emerald-950">Condiciones de Separación:</p>
                  <p>Monto reglamentario: <span className="font-bold">S/ 500.00 PEN</span></p>
                  <p>Plazo de vigencia: <span className="font-bold">7 días calendario</span> (vence automáticamente si no se formaliza venta).</p>
                  <p>El lote cambiará a estado <span className="font-bold text-emerald-800">RESERVADO</span> en el mapa interactivo.</p>
                  <p>El pago ingresará en estado <span className="font-bold text-emerald-800">REGISTRADO</span> y el comprobante quedará <span className="font-bold text-emerald-800">PENDIENTE</span> de auditoría por Finanzas.</p>
                </div>
              </>

            ) : (
              <div className="space-y-4 rounded-lg border border-brand-200 bg-brand-50 p-4">
                <div>
                  <label className="mb-1 block text-xs font-medium text-brand-700">
                    Modalidad de venta *
                  </label>

                  <Select
                    value={formSaleModality}
                    onChange={(e) => {
                      const modalidad = e.target.value as
                        'CONTADO' | 'FINANCIADA';

                      setFormSaleModality(modalidad);

                      if (modalidad === 'CONTADO') {
                        setFormSaleDownPayment('');
                        setFormSaleInstallments('12');
    setFormSaleRate('');
                      }
                    }}
                  >
                    <option value="CONTADO">Venta al contado</option>
                    <option value="FINANCIADA">Venta financiada</option>
                  </Select>
                </div>

                {formSaleModality === 'FINANCIADA' && (
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div>
                      <label className="mb-1 block text-xs font-medium text-brand-700">
                        Monto inicial (S/) *
                      </label>

                      <Input
                        type="number"
                        min="0.01"
                        step="0.01"
                        placeholder="Ej. 10000.00"
                        value={formSaleDownPayment}
                        onChange={(e) => setFormSaleDownPayment(e.target.value)}
                      />
                    </div>

                    <div>
                      <label className="mb-1 block text-xs font-medium text-brand-700">
                        Número de cuotas (1 a 36) *
                      </label>

                      <Input
                        type="number"
                        min="1"
                        max="36"
                        step="1"
                        value={formSaleInstallments}
                        onChange={(e) => setFormSaleInstallments(e.target.value)}
                      />
                    </div>
                  </div>
                )}

                <div className="rounded-md border border-brand-200 bg-white p-3">
                  <p className="text-xs text-brand-600">
                    Precio oficial de venta
                  </p>

                  <p className="mt-1 text-lg font-bold text-brand-900">
                    {precioLote
                      ? currency(Number(precioLote.precio))
                      : 'Seleccione un lote con precio vigente'}
                  </p>
                </div>

                <p className="text-xs text-brand-700">
                  La venta se registrará inicialmente como PENDIENTE.
                  El contrato deberá firmarse y aprobarse antes de
                  confirmar la venta y cambiar el lote a VENDIDO.
                </p>
              </div>
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
          </form>
        )}
      </Modal>


      <Modal
        open={confirmacionVenta !== null}
        onClose={() => {
          if (!submitting && !registroVentaEnCursoRef.current) {
            setConfirmacionVenta(null);
          }
        }}
        title="Confirmar registro de venta"
        description="Verifique los datos antes de registrar la operación."
        footer={
          <>
            <Button
              variant="secondary"
              disabled={submitting}
              onClick={() => setConfirmacionVenta(null)}
            >
              Volver
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
                <dt className="text-brand-500">Comprador</dt>
                <dd className="font-semibold text-brand-900">
                  {confirmacionVenta.codigoProspecto}
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
                  {currency(confirmacionVenta.datos.montoTotal)}
                </dd>
              </div>

              {confirmacionVenta.datos.modalidad === 'FINANCIADA' && (
                <>
                  <div>
                    <dt className="text-brand-500">Inicial pactada</dt>
                    <dd className="font-semibold text-brand-900">
                      {currency(confirmacionVenta.datos.montoInicial ?? 0)}
                    </dd>
                  </div>

                  <div>
                    <dt className="text-brand-500">Número de cuotas</dt>
                    <dd className="font-semibold text-brand-900">
                      {confirmacionVenta.datos.numeroCuotas}
                    </dd>
                  </div>
                </>
              )}
            </dl>

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
