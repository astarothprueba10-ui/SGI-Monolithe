import React, { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { DownloadIcon, FileTextIcon, PlusIcon, Clock } from 'lucide-react';
import { PageHeader } from '../components/ui/PageHeader';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { SearchInput, Select, Input } from '../components/ui/Field';
import { Table, TD, TH, TR } from '../components/ui/Table';
import { StatusBadge, Badge } from '../components/ui/Badge';
import { Tabs } from '../components/ui/Tabs';
import { EmptyState } from '../components/ui/Feedback';
import { Modal } from '../components/ui/Modal';
import { Gate } from '../components/auth/PermissionRoute';
import { currency } from '../utils/format';
import { salesService } from '../services/salesService';
import { crmBackend, type CrmProspect, type CrmSaleValidationInput } from '../services/crmBackend';
import { ContratosPendientesPanel } from '../components/sales/ContratosPendientesPanel';
import type { Sale } from '../types';
import { coreService, type LotePrecioVigente } from '../services/coreService';
import { ApiError } from '../lib/apiClient';
import type { ProyectoResponse, EtapaResponse, LoteResponse } from '../types/core';

const SEPARACION_ENVIO_DESHABILITADO = false;

export function Sales() {
  const [tab, setTab] = useState<'todas' | 'Separación' | 'Venta'>('todas');
  const [query, setQuery] = useState('');
  const [modality, setModality] = useState<'all' | Sale['modality']>('all');
  const [detail, setDetail] = useState<Sale | null>(null);
  const [salesList, setSalesList] = useState<Sale[]>([]);
  const [, setLoading] = useState(false);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [opType, setOpType] = useState<'Separacion' | 'Venta'>('Separacion');
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
  const [voucherFile, setVoucherFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const registroSeparacionEnCursoRef = React.useRef(false);
  const registroVentaEnCursoRef = React.useRef(false);
  const [confirmacionVenta, setConfirmacionVenta] = useState<{
    datos: CrmSaleValidationInput;
    codigoProspecto: string;
    codigoLote: string;
  } | null>(null);
  const [loadingFormData, setLoadingFormData] = useState(false);
  const [formTouched, setFormTouched] = useState(false);

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
        ['INTERESADO', 'NEGOCIACION'].includes(
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
    setSelectedProspectId(id);
    setFormProjectId('');
    setAvailableProjects([]);
    setAvailableLots([]);
    setFormLotId('');

    if (id === '') return;

    setLoadingProjects(true);

    try {
      const [detail, projects] = await Promise.all([
        crmBackend.detalle(id),
        coreService.getActiveProjects()
      ]);

      const intereses = new Set(
        (detail.intereses ?? []).map((i) => i.idProyecto)
      );

      setAvailableProjects(
        projects.filter(
          (p) => p.activo && intereses.has(p.idProyecto)
        )
      );
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : 'Error al consultar proyectos.';

      toast.error('No se pudieron cargar los proyectos de interés', {
        description: msg
      });
    } finally {
      setLoadingProjects(false);
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

  const handleExpireOverdue = async () => {
    try {
      const res = await salesService.expireOverdueReservations();
      toast.success(res?.mensaje || 'Control de caducidad ejecutado correctamente');
      await fetchSalesData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al ejecutar control de caducidad.';
      toast.error(msg);
    }
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
        codigoLote: validacion.codigoLote
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
    const q = query.trim().toLowerCase();
    return salesList.filter((sale) => {
      const byTab = tab === 'todas' || sale.type === tab;
      const byModality = modality === 'all' || sale.modality === modality;
      const byQuery =
        q.length === 0 ||
        sale.buyer.toLowerCase().includes(q) ||
        sale.code.toLowerCase().includes(q) ||
        sale.lot.toLowerCase().includes(q);
      return byTab && byModality && byQuery;
    });
  }, [salesList, tab, query, modality]);

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

        setAvailableStages(
          (etapas ?? []).filter(
            (etapa) =>
              etapa.activo &&
              etapa.idProyecto === Number(formProjectId)
          )
        );
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
  }, [formProjectId]);



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
    opType
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
        description="Operaciones comerciales con su comprador, lote, modalidad de venta y contrato asociado."
        actions={
          <div className="flex items-center gap-2">
            <Button icon={Clock} variant="secondary" disabled onClick={handleExpireOverdue}>
              Control de caducidad (7 d)
            </Button>
            <Gate permission="sales.export">
              <Button icon={DownloadIcon}>Exportar</Button>
            </Gate>
            <Gate permission="sales.create">
              <Button icon={PlusIcon} variant="primary" onClick={handleOpenModal}>
                Nueva operación
              </Button>
            </Gate>
          </div>
        }
      />

      <Tabs
        className="mb-5"
        active={tab}
        onChange={(id) => setTab(id as typeof tab)}
        items={[
          { id: 'todas', label: 'Todas', count: salesList.length },
          { id: 'Separación', label: 'Separaciones', count: separationsCount },
          { id: 'Venta', label: 'Ventas', count: salesCount }
        ]}
      />

      <Gate permission="sales.view">
        <ContratosPendientesPanel />
      </Gate>

      <Card>
        <div className="flex flex-wrap items-center gap-3 border-b border-brand-100 px-5 py-3.5">
          <SearchInput
            value={query}
            onValueChange={setQuery}
            placeholder="Buscar por comprador, código o lote…"
            className="w-full sm:w-72"
          />
          <div className="flex items-center gap-2">
            <span className="text-[12px] font-medium text-brand-600">Modalidad:</span>
            <Select
              value={modality}
              onChange={(e) => setModality(e.target.value as typeof modality)}
              className="w-36"
            >
              <option value="all">Todas</option>
              <option value="Contado">Contado</option>
              <option value="Financiado">Financiado</option>
              <option value="Reserva">Reserva</option>
            </Select>
          </div>
        </div>

        {rows.length === 0 ? (
          <EmptyState
            title="No hay operaciones registradas"
            description="Las separaciones y ventas se registrarán aquí con su documentación asociada."
          />
        ) : (

          <Table
            head={
              <>
                <TH>Código</TH>
                <TH>Tipo</TH>
                <TH>Comprador</TH>
                <TH>Lote / Proyecto</TH>
                <TH>Modalidad</TH>
                <TH align="right">Monto</TH>
                <TH>Asesor</TH>
                <TH>Contrato</TH>
                <TH>Estado</TH>
                <TH align="right">Acciones</TH>
              </>
            }
          >
            <tbody>
              {rows.map((sale) => (
                <TR key={sale.id}>
                  <TD className="font-mono text-[12px] font-semibold text-brand-900">{sale.code}</TD>
                  <TD>
                    <Badge tone={sale.type === 'Venta' ? 'brand' : 'neutral'}>                      {sale.type}
                    </Badge>
                  </TD>
                  <TD className="font-medium text-brand-900">{sale.buyer}</TD>
                  <TD className="font-mono text-[12px] text-brand-700">{sale.lot}</TD>
                  <TD className="text-brand-600">{sale.project}</TD>
                  <TD className="text-brand-600">{sale.modality}</TD>
                  <TD className="text-right font-mono font-semibold text-brand-900">
                    {currency(sale.amount)}
                  </TD>
                  <TD className="text-[12px] text-brand-500">{sale.date}</TD>
                  <TD>
                    <StatusBadge status={sale.status} />
                  </TD>
                  <TD className="text-right">
                    <Button
                      size="sm"
                      variant="ghost"
                      icon={FileTextIcon}
                      onClick={() => setDetail(sale)}
                    >
                      Ver
                    </Button>
                  </TD>
                </TR>
              ))}
            </tbody>
          </Table>
        )}
      </Card>

      {/* Modal Detalle de Operación */}
      <Modal
        open={detail !== null}
        onClose={() => setDetail(null)}
        title={detail ? `Operación ${detail.code}` : ''}
        description={detail ? `${detail.type} · ${detail.buyer}` : ''}
      >
        {detail ? (
          <dl className="divide-y divide-brand-100 text-sm">
            {[
              { label: 'Código', value: detail.code },
              { label: 'Tipo de operación', value: detail.type },
              { label: 'Comprador', value: detail.buyer },
              { label: 'Lote', value: detail.lot },
              { label: 'Proyecto', value: detail.project },
              { label: 'Modalidad de venta', value: detail.modality },
              { label: 'Monto de la operación', value: currency(detail.amount) },
              { label: 'Asesor', value: detail.advisor },
              { label: 'Contrato', value: detail.contract },
              { label: 'Estado', value: detail.status }
            ].map((row) => (
              <div key={row.label} className="flex items-baseline justify-between gap-4 py-2.5">
                <dt className="text-[12px] text-brand-400">{row.label}</dt>
                <dd className="text-right text-[13px] font-medium text-brand-800">{row.value}</dd>
              </div>
            ))}
          </dl>
        ) : null}
      </Modal>

      {/* Modal Operación Inmobiliaria: Separación o Venta */}
      <Modal
        open={isModalOpen}
        onClose={cerrarModalOperacion}
        title={opType === 'Separacion' ? 'Registrar Separación de Lote' : 'Formalización de Venta'}
        description="Selecciona prospecto, lote y condiciones comerciales para registrar en Supabase."
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
                Tipo de Operación
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setOpType('Separacion')}
                  className={`py-2 px-3 text-xs font-semibold rounded-lg border transition-all ${opType === 'Separacion'
                    ? 'bg-brand-900 text-white border-brand-900 shadow-sm'
                    : 'bg-white text-brand-700 border-brand-200 hover:bg-brand-50'
                    }`}
                >
                  Separación (S/ 500)
                </button>
                <button
                  type="button"
                  onClick={() => setOpType('Venta')}
                  className={`py-2 px-3 text-xs font-semibold rounded-lg border transition-all ${opType === 'Venta'
                    ? 'bg-brand-900 text-white border-brand-900 shadow-sm'
                    : 'bg-white text-brand-700 border-brand-200 hover:bg-brand-50'
                    }`}
                >
                  Venta (Inactiva)
                </button>
              </div>
            </div>

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
            </div>

            <div>
              <label className="mb-1 block text-[12px] font-medium text-brand-700">
                Proyecto inmobiliario *
              </label>

              <Select
                value={formProjectId}
                disabled={!selectedProspectId || loadingProjects}
                onChange={(e) => {
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
                    Comprobante de Pago * (PDF, JPG, PNG - Máx. 5 MB)
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
