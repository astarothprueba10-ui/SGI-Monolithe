import { coreApi } from '../lib/apiClient';
import { supabase } from '../lib/supabase';

export type CrmCategory = 'TODOS' | 'LEAD' | 'POTENCIAL' | 'COMPRADOR' | 'CERRADO';

export interface CrmProspect {
  id_prospecto: number;
  id_persona: number;
  codigo: string;
  nombre_completo: string;
  telefono: string;
  email: string;
  interes: string;
  origen_codigo: string;
  origen_nombre: string;
  estado_codigo: string;
  estado_nombre: string;
  categoria: Exclude<CrmCategory, 'TODOS'>;
  puntuacion: string;
  id_asesor: number | null;
  asesor_nombre: string;
  fecha_registro: string;
  ultimo_contacto: string;
  observaciones: string | null;
  numero_documento?: string;
  dni?: string;
}
export interface CrmPage<T> {
  items: T[];
  total: number;
  pagina: number;
  tamano: number;
  paginas?: number;
}
export interface CrmCatalogItem { id: number; codigo: string; nombre: string; final?: boolean }
export interface CrmProject extends CrmCatalogItem { distrito?: string | null; provincia?: string | null }
export interface CrmCatalogs {
  estados: CrmCatalogItem[];
  origenes: CrmCatalogItem[];
  tiposSeguimiento: CrmCatalogItem[];
  proyectos: CrmProject[];
  turnosVisita: string[];
  zonaHorariaVisitas: string;
}
export interface CrmAdvisor {
  id_asesor: number;
  codigo: string;
  nombre_completo: string;
  email: string;
  telefono: string;
  activo: boolean;
  leads_activos: number | string;
}

export type CrmAsesorPeriodo = CrmAdvisor & {
  asignaciones_periodo: number;
};

export interface CrmAsesoresPeriodo {
  total: number;
  items: CrmAsesorPeriodo[];
}

export interface CrmBuyer {
  id_cliente: number;
  id_venta?: number;
  id_contrato?: number;
  id_prospecto?: number;
  codigo_cliente: string;
  nombre_completo: string;
  codigo_venta: string;
  codigo_contrato: string;
  estado_contrato: string;
  codigo_lote: string;
  precio_venta: number;
  fecha_venta: string;
}
export interface CrmSummary {
  total: number;
  leads: number;
  potenciales: number;
  compradores: number;
  cerrados: number;
  sinAsesor: number;
}

export interface CrmEvolucionMes {
  mes: string;
  leads: number;
  potenciales: number;
  compradores: number;
}

export interface CrmEvolucionMensual {
  items: CrmEvolucionMes[];
}

export interface CrmDetail {
  prospecto: CrmProspect;
  documentoPrincipal: { tipoCodigo: string; numero: string; verificado: boolean } | null;
  contactos: { tipoCodigo: string; valor: string; principal: boolean; verificado: boolean }[];
  intereses: { idInteres: number; idProyecto: number; proyecto: string }[];
  totalSeguimientos: number;
  totalVisitas: number;
  esComprador: boolean;
}
export interface CrmDatosPersonales {
  idProspecto:number;
  nombres:string;
  apellidoPaterno:string;
  apellidoMaterno:string;
  telefono:string;
  correo:string;
  tipoDocumento:'DNI'|'CE'|'PASAPORTE'|'RUC';
  numeroDocumento:string;
  documentoVerificado:boolean;
  direccion:string;
  historial: CrmCambioDatoPersonal[];
}
export interface CrmCambioDatoPersonal {
  id:number;
  fecha:string;
  motivo:string;
  actor:string;
  antes:Omit<CrmDatosPersonales,'historial'>;
  despues:Omit<CrmDatosPersonales,'historial'>;
}
export type CrmDatosPersonalesEdicion = Pick<
  CrmDatosPersonales,
  'nombres'|'apellidoPaterno'|'apellidoMaterno'|'telefono'|'correo'|
  'tipoDocumento'|'numeroDocumento'|'direccion'
>;

export interface CrmAssignment {
  id_asignacion: number;
  id_asesor: number;
  asesor_nombre: string;
  fecha_asignacion: string;
  fecha_fin: string | null;
  motivo_asignacion: string | null;
  motivo_cierre: string | null;
  vigente: boolean;
}
export interface CrmVisit {
  id_visita: number;
  fecha_visita: string;
  turno: string;
  estado: string;
  punto_encuentro: string;
  observaciones: string | null;
  id_prospecto: number;
  id_asesor: number;
  id_proyecto: number;
}

export interface CrmVisitaPeriodo extends CrmVisit {
  prospecto_codigo: string;
  prospecto_nombre: string;
  proyecto_nombre: string;
  asesor_nombre: string;
}


export interface CrmScheduleVisit {
  idProyecto: number;
  fechaVisita: string;
  turno: '11:00' | '15:00';
  puntoEncuentro?: string;
  observaciones?: string;
}

export interface CrmUpdateVisitStatus {
  estadoCodigo: 'CONFIRMADA' | 'REALIZADA' | 'CANCELADA';
  observaciones?: string;
}

export interface CrmFollowUpCreate {
  tipoCodigo: string;
  asunto: string;
  detalle: string;
  resultado?: string;
  requiereSeguimiento: boolean;
  fechaProximoSeguimiento?: string | null;
}

export interface CrmFollowUpItem {
  id_seguimiento: number;
  id_prospecto?: number;
  tipo_codigo?: string;
  tipo_nombre?: string;
  asunto: string;
  detalle?: string | null;
  resultado?: string | null;
  requiere_seguimiento?: boolean;
  fecha_proximo_seguimiento?: string | null;
  fecha_seguimiento?: string;
  usuario_nombre?: string;
  asesor_nombre?: string;
}

export interface CrmLeadCreate {
  idSolicitud: string;
  nombres: string;
  apellidoPaterno: string;
  apellidoMaterno?: string;
  correo: string;
  telefono: string;
  idProyecto: number;
  origenCodigo: string;
  motivoContacto: string;
  mensaje?: string;
  idAsesor?: number;
  idPersona?: number;
  tipoDocumento?: string;
  numeroDocumento?: string;
  direccion?: string;
  [key: string]: unknown;
}

export interface CrmSearch {
  consulta?: string;
  etapa?: string;
  origen?: string;
  idAsesor?: number;
  sinAsignar?: boolean;
  categoria?: CrmCategory;
  pagina?: number;
  tamano?: number;
}

export interface CrmSearchPeriodo extends CrmSearch {
  idProyecto?: number;
  desde: string;
  hastaExclusivo: string;
}


export interface CrmSeparacionInput {
  idProspecto: number;
  idLote: number;
  metodoPago: 'EFECTIVO' | 'DEPOSITO' | 'TRANSFERENCIA' | 'YAPE_PLIN' | 'OTRO';
  numeroOperacion?: string | null;
  monto: number;
  observaciones?: string | null;
  claveArchivo: string;
  nombreArchivo: string;
  tipoMime: string;
  tamanioBytes: number;
  hashSha256?: string | null;
}

export interface CrmSeparacionResult {
  success: boolean;
  id_reserva: number;
  codigo_reserva: string;
  id_pago: number;
  codigo_pago: string;
  id_voucher: number;
  codigo_voucher: string;
  id_lote: number;
  monto_reserva: number;
  fecha_reserva: string;
  fecha_vencimiento: string;
  estado_lote: 'RESERVADO';
  estado_pago: 'REGISTRADO';
  estado_voucher: 'PENDIENTE';
  message: string;
}

export interface CrmSeparacionUpload {
  bucket: string;
  claveArchivo: string;
  urlCarga: string;
  tipoMime: string;
  maxBytes: number;
  expiresInSeconds: number;
}

export interface CrmSeparacionVoucherItem {
  id_voucher: number;
  codigo_voucher: string;
  estado_voucher: 'PENDIENTE' | 'APROBADO' | 'RECHAZADO';
  nombre_estado_voucher: string;
  nombre_archivo: string;
  clave_archivo: string;
  tipo_mime: string;
  tamanio_bytes: number;
  fecha_carga: string;
  id_pago: number;
  codigo_pago: string;
  estado_pago: 'REGISTRADO' | 'CONFIRMADO' | 'ANULADO';
  monto: number;
  metodo_pago: string;
  nombre_metodo_pago: string;
  numero_operacion?: string | null;
  id_reserva: number;
  codigo_reserva: string;
  fecha_reserva: string;
  fecha_vencimiento: string;
  id_lote: number;
  codigo_lote: string;
  id_persona: number;
  nombre_cliente: string;
  documento_cliente: string;
  fecha_validacion?: string | null;
  motivo_rechazo?: string | null;
  observaciones_validacion?: string | null;
}

export interface CrmPlanInicialDisponible {
  id_venta:number;
  codigo_venta:string;
  id_plan_pago:number;
  inicial_adicional_pactada:number;
  reserva_ya_acreditada:number;
  inicial_abonada:number;
  saldo_pendiente:number;
}
export interface CrmOpcionesRegistroInicial {
  items:CrmPlanInicialDisponible[];
  metodos:CrmMetodoPagoDisponible[];
}
export interface CrmPrepararCargaInicialInput {
  idVenta:number;
  idPlanPago:number;
  monto:number;
  idMetodoPago:number;
  fechaOperacion:string;
  numeroOperacion:string|null;
  nombreArchivo:string;
  tipoMime:string;
  tamanioBytes:number;
}

export interface CrmCuotaDisponibleParaPago {
  id_venta:number;
  codigo_venta:string;
  id_plan_pago:number;
  id_cuota:number;
  numero_cuota:number;
  fecha_vencimiento:string;
  monto_cuota:number;
  saldo_pendiente:number;
}
export interface CrmMetodoPagoDisponible {
  idMetodoPago:number;
  codigo:string;
  nombre:string;
}
export interface CrmOpcionesRegistroCuota {
  items:CrmCuotaDisponibleParaPago[];
  metodos:CrmMetodoPagoDisponible[];
}
export interface CrmPrepararCargaCuotaInput {
  idVenta:number;
  idCuota:number;
  monto:number;
  idMetodoPago:number;
  fechaOperacion:string;
  numeroOperacion:string|null;
  nombreArchivo:string;
  tipoMime:string;
  tamanioBytes:number;
}
export interface CrmCargaVoucherCuota {
  idCarga:string;
  bucket:'vouchers-ventas-private';
  claveArchivo:string;
  urlCarga:string;
  tipoMime:string;
  maxBytes:number;
  expiresInSeconds:number;
}
export interface CrmRegistroVoucherCuota {
  idPago:number;
  idVoucher:number;
  idCuota:number;
  estadoPago:'REGISTRADO';
  estadoVoucher:'PENDIENTE';
  reutilizado:boolean;
  saldoAplicado:0;
}
export type CrmEstadoConciliacion='TODOS'|'CON_ALERTA'|'SIN_ALERTA';
export type CrmIncidenciaFinanciera=
  'SOBREAPLICACION'|'APLICACION_NO_CONFIRMADA'
  |'CONFIRMADO_SIN_VOUCHER_APROBADO'|'PENDIENTE_DE_REVISION'
  |'PAGO_SIN_VOUCHER'|'EVIDENCIA_HISTORICA_NO_VERIFICABLE'
  |'PAGO_CONFIRMADO_SIN_IMPUTAR'|'SIN_ALERTA';
export interface CrmPagoConciliado {
  id_pago:number;
  codigo_pago:string;
  id_venta:number|null;
  id_plan_pago:number|null;
  id_reserva:number|null;
  monto:number;
  aplicado:number;
  saldo_no_aplicado:number;
  concepto:'SEPARACION'|'CUOTA'|'INICIAL'|'SIN_DESTINO';
  estado_pago:string;
  estado_voucher:string|null;
  codigo_voucher:string|null;
  archivo_disponible:boolean;
  tiene_alerta:boolean;
  codigo_incidencia:CrmIncidenciaFinanciera;
  estado_revision:'EN_REVISION'|'REVISADA'|null;
  comentario_revision:string|null;
  revisor:number|null;
}
export interface CrmAlertaPlanHistorico {
  idPlanPago:number;
  idVenta:number;
  estadoPlan:string;
  numeroCuotas:number;
  numeroCuotasPactadas:number;
  importeCuotas:number;
  totalFinanciado:number;
  diferencia:number;
}
export interface CrmConciliacionIntegral {
  items:CrmPagoConciliado[];
  total:number;
  pagina:number;
  tamano:number;
  paginas:number;
  alertasPagina:number;
  alertasFiltradas:number;
  montoConfirmado:number;
  confirmadoSinAplicar:number;
  cargasHuerfanasSinArchivoCandidatas:number;
  planesConDiferenciasHistoricas:CrmAlertaPlanHistorico[];
  advertencia:string;
}
/** Cartera real: importes proceden del mismo cálculo que el Portal Cliente. */
export interface CrmPlanCarteraReal {
  idVenta:number; codigoVenta:string; idPlanPago:number; codigoPlan:string;
  comprador:string; lote:string; proyecto:string; estadoVenta:string; estadoPlan:string;
  numeroCuotas:number; precioVenta:number; capitalFinanciado:number; interesTotal:number;
  inicialAdicional:number; reservaAplicada:number; tasaInteresPct:number;
  cuotasExigibles:boolean; saldoFinanciamiento:number; inicialPorConciliar:number;
  totalCuotas:number; fechaPrimeraCuota:string|null;
}
export interface CrmCuotaCarteraReal {
  idVenta:number;codigoVenta:string;idPlanPago:number;comprador:string;
  lote:string;proyecto:string;numero:number;fechaVencimiento:string;
  montoCuota:number;capital:number;interes:number;abonadoConfirmado:number;
  saldoCuota:number;estado:string;cuotaAtrasada:boolean;proxima7Dias:boolean;
}
export interface CrmCarteraReal {
  fechaCorte:string; vista:'PLANES'|'CUOTAS';pagina:number;tamano:number;
  total:number;paginas:number;items:(CrmPlanCarteraReal|CrmCuotaCarteraReal)[];
  resumen:{planes:number;cuotasExigibles:number;capitalFinanciadoActivo:number;
    saldoCuotas:number;inicialPorConciliar:number;montoVencido:number;montoProximo:number};
}
export interface CrmMovimientoFinanzasReal {
  idPago:number;codigo:string;fechaOperacion:string;fechaConfirmacion:string|null;
  monto:number;estado:string;tipo:'SEPARACION'|'FINANCIAMIENTO'|'VENTA'|'OTRO';
  venta:string|null;referencia:string|null;comprobante:string|null;
  estadoVoucher:string|null;montoAplicado:number;
}
export interface CrmMovimientosFinanzasReal {
  pagina:number;tamano:number;total:number;paginas:number;
  items:CrmMovimientoFinanzasReal[];
  resumen:{confirmado:number;registrado:number;anulado:number;aplicado:number;
    confirmadoSinImputarFinanciamiento:number};
  meses:{mes:string;confirmado:number}[];
}

export interface CrmImputacionPendiente {
  id_pago:number;
  codigo_pago:string;
  id_venta:number;
  id_plan_pago:number;
  codigo_venta:string;
  monto_pago:number;
  fecha_confirmacion:string;
  cuota_preautorizada:number|null;
  numero_cuota:number|null;
  tipo_destino:'CUOTA'|'INICIAL';
  saldo_pago:number;
  saldo_destino:number;
}
export interface CrmImputacionHistorica {
  id_aplicacion_pago:number;
  id_pago:number;
  codigo_pago:string;
  id_plan_pago:number;
  id_cuota:number|null;
  tipo:'CUOTA'|'INICIAL';
  monto:number;
  id_actor:number;
  fecha_registro:string;
  observaciones:string|null;
  activo:boolean;
  fecha_anulacion:string|null;
  id_usuario_anulacion:number|null;
  motivo_anulacion:string|null;
}
export interface CrmImputacionesRespuesta {
  items:CrmImputacionPendiente[];
  historial:CrmImputacionHistorica[];
  total:number;
  pagina:number;
  tamano:number;
  paginas:number;
}
export interface CrmImputacionResultado {
  idAplicacion:number;
  idPago:number;
  tipo:'CUOTA'|'INICIAL';
  idCuota?:number|null;
  montoAplicado:number;
  saldoPagoRestante?:number;
  saldoDestinoRestante?:number;
  reutilizado:boolean;
  activo:boolean;
}
export interface CrmReversionAplicacionResultado {
  idAplicacion:number;
  idPago:number;
  tipo:'CUOTA'|'INICIAL';
  montoRevertido:number;
  reutilizado:boolean;
  activo:false;
}

export interface CrmRevisionVoucherCuotaInput {
  aprobar:boolean;
  motivo?:string|null;
  observaciones?:string|null;
}
export interface CrmRevisionVoucherCuotaResultado {
  idRevision:number;
  idVoucher:number;
  idPago:number;
  idCuota:number;
  estadoVoucher:'APROBADO'|'RECHAZADO';
  estadoPago:'CONFIRMADO'|'ANULADO';
  accion:'APROBAR'|'RECHAZAR';
  reutilizado:boolean;
  saldoAplicado:0;
  resolucionAutomatica:false;
}

export interface CrmVoucherCuotaItem {
  tipo_destino?:'CUOTA'|'INICIAL'|'HISTORICO';
  id_voucher: number;
  codigo_voucher: string;
  estado_voucher: 'PENDIENTE'|'APROBADO'|'RECHAZADO';
  nombre_estado_voucher: string;
  id_pago: number;
  codigo_pago: string;
  id_venta: number;
  id_plan_pago: number;
  codigo_venta: string;
  monto_pago: number;
  estado_pago: 'REGISTRADO'|'CONFIRMADO'|'ANULADO';
  metodo_pago: string;
  numero_operacion?:string|null;
  numero_version:number;
  nombre_archivo:string;
  tipo_mime?:string|null;
  tamanio_bytes?:number|null;
  fecha_carga:string;
  fecha_validacion?:string|null;
  motivo_rechazo?:string|null;
  observaciones_validacion?:string|null;
  nombre_cliente:string;
  archivo_disponible:boolean;
}

export interface CrmVouchersCuotasResponse {
  items:CrmVoucherCuotaItem[];
  total:number;
  pagina:number;
  tamano:number;
  paginas:number;
}

export interface CrmSeparacionVouchersResponse {
  items: CrmSeparacionVoucherItem[];
  total: number;
  pagina: number;
  tamano: number;
  paginas: number;
}

export interface CrmVoucherReadUrl {
  bucket: string;
  claveArchivo: string;
  urlDescarga: string;
  nombreArchivo: string;
  tipoMime: string;
  expiresInSeconds: number;
}

export interface CrmRevisarVoucherInput {
  aprobar: boolean;
  motivo?: string | null;
  observaciones?: string | null;
}


export interface CrmOperacionItem {
  id: number;
  tipo: 'VENTA' | 'SEPARACION';
  codigo: string;
  id_lote: number;
  lote: string;
  proyecto: string;
  comprador: string;
  documento: string | null;
  modalidad: 'CONTADO' | 'FINANCIADA' | null;
  metodo_pago: string | null;
  monto: number;
  estado: string;
  fecha: string;
  fecha_vencimiento: string | null;
  contrato: string | null;
  estado_contrato: string | null;
  asesor: string | null;
}

export interface CrmComprobanteVentaLectura {
  idComprobante: number;
  nombreArchivo: string;
  tipoMime: string;
  tamanioBytes: number;
  estadoRevision: string;
}

export interface CrmCuotaCronograma {
  numero:number;
  fechaVencimiento:string;
  capital:number;
  interes:number;
  cuota:number;
  estado:string;
  estadoCalculado?:'PENDIENTE'|'PARCIAL'|'VENCIDA'|'PAGADA'|'ANULADA';
  estadoRegistrado?:string;
  estadoDifiereRegistro?:boolean;
  abonadoConfirmado?:number;
  saldoCuota?:number;
  cuotaAtrasada?:boolean;
  diasMora?:number;
  proxima7Dias?:boolean;
  fechaPagoCompleto?:string|null;
}
export interface CrmCronogramaVenta {
  idVenta:number;
  codigoVenta:string;
  codigoPlan?:string|null;
  tipoCronograma:'REGISTRADO'|'PROYECTADO'|'SIN_PLAN'|'SIN_CUOTAS';
  numeroCuotas?:number;
  capitalFinanciado?:number;
  interesTotal?:number;
  totalCuotas?:number;
  fechaPrimeraCuota?:string|null;
  tasaAnualNominal?:number;
  advertencia?:string;
  fechaCorte?:string;
  fuenteEstados?:'APLICACIONES_CONFIRMADAS'|'SIN_CUOTAS_EXIGIBLES'|'HISTORICO_NO_EXIGIBLE';
  cuotasPendientes?:number;
  cuotasParciales?:number;
  cuotasVencidas?:number;
  cuotasPagadas?:number;
  cuotasAnuladas?:number;
  cuotasProximas?:number;
  cuotasAtrasadas?:number;
  montoVencido?:number;
  montoProximo?:number;
  estadosDiferentesRegistro?:number;
  advertenciaEstados?:string|null;
  items:CrmCuotaCronograma[];
}
/** Señal administrativa de posibles tres cuotas consecutivas con deuda,
 * no una declaración de resolución contractual. */
export interface CrmCuotaRevisionLegal {
  idCuota:number;
  numeroCuota:number;
  fechaVencimiento:string;
  importeCuota:number;
  abonadoConfirmado:number;
  saldoPendiente:number;
  estadoCuota:string;
  diasMora:number;
}

export interface CrmRevisionResolutoria {
  idVenta:number;
  idPlanPago:number;
  codigoVenta:string;
  idCliente:number|null;
  comprador:string|null;
  desdeCuota:number;
  hastaCuota:number;
  cuotasConsecutivas:number;
  saldoRacha:number;
  fechaPrimerVencimiento:string;
  fechaUltimoVencimiento:string;
  cuotas:CrmCuotaRevisionLegal[];
  requiereRevision:true;
  resolucionAutomatica:false;
  criterio:'TRES_CUOTAS_CONSECUTIVAS_VENCIDAS_CON_SALDO';
}

export interface CrmRevisionesResolutorias {
  fechaCorte:string;
  pagina:number;
  tamano:number;
  total:number;
  paginas:number;
  montoEnRevision:number;
  items:CrmRevisionResolutoria[];
  resolucionAutomatica:false;
  advertencia:string;
}

export type CrmTipoAlertaCuota = 'TODAS'|'CUOTA_PROXIMA'|'CUOTA_VENCIDA';

export interface CrmAlertaCuota {
  idCuota:number;
  idPlanPago:number;
  idVenta:number;
  codigoVenta:string;
  idCliente:number|null;
  comprador:string|null;
  numeroCuota:number;
  fechaVencimiento:string;
  montoCuota:number;
  abonadoConfirmado:number;
  saldoCuota:number;
  estadoCuota:'PENDIENTE'|'PARCIAL'|'VENCIDA';
  tipoAlerta:Exclude<CrmTipoAlertaCuota,'TODAS'>;
  diasMora:number;
  diasParaVencer:number;
}

export interface CrmAlertasCuotas {
  fechaCorte:string;
  tipo:CrmTipoAlertaCuota;
  pagina:number;
  tamano:number;
  total:number;
  paginas:number;
  proximas:number;
  vencidas:number;
  montoProximo:number;
  montoVencido:number;
  items:CrmAlertaCuota[];
}

export interface CrmAvisosPortalPreparados {
  fechaCorte:string;
  procesados:number;
  creados:number;
  deduplicados:number;
  desactivados:number;
  canal:'PORTAL';
  enviosExternos:false;
}

export interface CrmSaldoCuota {
  idCuota: number;
  numero: number;
  fechaVencimiento: string;
  capital: number;
  interes: number;
  montoCuota: number;
  abonadoConfirmado: number;
  saldoCuota: number;
  estadoRegistrado: string;
}

/** Cifras contables de venta, construidas solo desde aplicaciones confirmadas. */
export interface CrmSaldoVenta {
  idVenta: number;
  codigoVenta: string;
  idCliente: number | null;
  modalidad: 'FINANCIADA' | 'CONTADO';
  tipoSaldo: 'FINANCIADA' | 'NO_FINANCIADA' | 'SIN_PLAN';
  estadoPlan?: 'ACTIVO' | 'PENDIENTE' | 'ANULADO' | 'COMPLETADO' | string;
  numeroVersion?: number;
  idPlanPago?: number;
  cuotasExigibles?: boolean;
  inicialAdicionalPactada?: number;
  reservaAplicada?: number;
  inicialTotalPactada?: number;
  inicialAbonadaConfirmada?: number;
  inicialSinAplicacionConfirmada?: number;
  capitalFinanciado?: number;
  interesTotal?: number;
  totalPlanCuotas?: number;
  abonadoCuotasConfirmado?: number;
  saldoFinanciamiento?: number;
  montoCuotasRegistradas?: number;
  saldoCuotasRegistradas?: number;
  diferenciaCronograma?: number;
  pagosConfirmadosSinAplicar?: number;
  numeroCuotasRegistradas?: number;
  numeroCuotasPactadas?: number;
  alertasConciliacion?: string[];
  cuotas: CrmSaldoCuota[];
}

export interface CrmSaldoCliente {
  idCliente: number;
  numeroVentas: number;
  saldoFinanciamientoActivo: number;
  saldoFinanciamientoPendienteFirma: number;
  inicialSinAplicacionConfirmada: number;
  abonadoCuotasConfirmado: number;
  advertencia: string;
  ventas: CrmSaldoVenta[];
}

export interface CrmDetalleVenta {
  idVenta: number;
  codigoVenta: string;
  modalidad: 'CONTADO' | 'FINANCIADA';
  precioVenta: number;
  tieneExpediente: boolean;
  comprador: {
    nombreCompleto: string | null;
    tipoDocumento: string | null;
    numeroDocumento: string | null;
    telefono: string | null;
    correo: string | null;
    estadoCivil: string | null;
  };
  conyuge: {
    nombres: string;
    apellidoPaterno: string;
    apellidoMaterno?: string | null;
    telefono?: string | null;
    correo?: string | null;
    tipoDocumento: string;
    numeroDocumento: string;
  } | null;
  domicilio: {
    direccion: string | null;
    referencia: string | null;
    pais: string | null;
    departamento: string | null;
    provincia: string | null;
    distrito: string | null;
  };
  pago: {
    metodo: string | null;
    numeroOperacion: string | null;
    tipoAbono: 'CONTADO' | 'INICIAL' | null;
    montoPorRevisar: number | null;
    estadoRevision: string | null;
    comprobantes: CrmComprobanteVentaLectura[];
  };
  financiamiento: {
    sistema: string;
    montoInicial: number;
    abonoReserva: number;
    capitalFinanciado: number;
    numeroCuotas: number;
    interesesTotales: number;
    totalPendienteEnCuotas: number;
    saldoCuotasPendiente: number;
    tasaAnualNominal: number | null;
    cuotaMensual: number | null;
    cuotaFija: boolean;
    descripcionCondiciones: string | null;
  } | null;
}

export interface CrmOperacionesResponse extends CrmPage<CrmOperacionItem> {
  paginas: number;
}


export interface CrmReservaVigenteVenta {
  idReserva: number;
  codigoReserva: string;
  idLote: number;
  idProyecto: number;
  idEtapa: number;
  montoReserva: number;
  /** Crédito financiero confirmado y aprobado; puede ser cero si la reserva está pendiente. */
  montoReservaAplicable?: number;
  fechaVencimiento: string;
}

export interface CrmReservasVigentesVenta {
  idLotes: number[];
  reservas: CrmReservaVigenteVenta[];
}

export type EstadoCivilReniec = 'SOLTERO' | 'CASADO' | 'DIVORCIADO' | 'VIUDO';
export interface CrmDatosConyugeVenta {
  nombres: string;
  apellidoPaterno: string;
  apellidoMaterno: string;
  telefono: string;
  correo: string;
  tipoDocumento: 'DNI' | 'CE' | 'RUC' | 'PASAPORTE';
  numeroDocumento: string;
}
export interface CrmVoucherVenta {
  claveArchivo: string;
  nombreArchivo: string;
  tipoMime: string;
  tamanioBytes: number;
}
export interface CrmDatosPagoVenta {
  metodoPago: 'TRANSFERENCIA' | 'DEPOSITO' | 'YAPE_PLIN' | 'EFECTIVO' | 'OTRO';
  numeroOperacion: string | null;
  comprobantes: CrmVoucherVenta[];
}

export interface CrmDatosCompradorVenta {
  idProspecto: number;
  /** Confirmacion expresa de cotejo documental por el asesor durante la venta. */
  identidadVerificada: boolean;
  nombres: string;
  apellidoPaterno: string;
  apellidoMaterno: string;
  telefono: string;
  correo: string;
  idProyectoInteres: number;
  origenCodigo: string;
  motivoContacto: string;
  mensaje: string;
  tipoDocumento: string;
  numeroDocumento: string;
  direccion: string;
  referencia: string;
  idPais: number | null;
  idDepartamento: number | null;
  idProvincia: number | null;
  idDistrito: number | null;
  idAsesor: number | null;
  estadoCivil: EstadoCivilReniec | null;
  conyuge: CrmDatosConyugeVenta | null;
}

export interface CrmSaleValidationInput {
  idProspecto: number;
  idLote: number;
  modalidad: 'CONTADO' | 'FINANCIADA';
  montoTotal: number;
  montoInicial?: number | null;
  numeroCuotas?: number | null;
  tasaInteresMensualPct?: number | null;
  observaciones?: string | null;
  datosComprador?: CrmDatosCompradorVenta;
  datosPago?: CrmDatosPagoVenta;
}

export interface CrmSaleValidationResult {
  elegible: boolean;
  idProspecto: number;
  codigoProspecto: string;
  idPersona: number;
  idAsesor: number;
  idLote: number;
  codigoLote: string;
  idProyecto: number;
  modalidad: 'CONTADO' | 'FINANCIADA';
  precioVigente: number;
  montoReservaAplicable: number;
  montoReservaNominal?: number;
  montoInicialTotal?: number | null;
  montoInicialAdicional?: number | null;
  saldoContado: number;
  planFrances: { capitalFinanciado: number; interesTotal: number; totalCuotas: number; totalOperacion: number; cuotaMensual: number } | null;
  idMoneda: number;
  mensaje: string;
}

export interface CrmBuyerVerification {
  idProspecto: number;
  codigoProspecto: string;
  esComprador: boolean;
  mensaje: string;
  compra: {
    idCliente: number;
    codigoCliente: string;
    idVenta: number;
    codigoVenta: string;
    estadoVenta: string;
    idContrato: number;
    codigoContrato: string;
    estadoContrato: string;
    idLote: number;
    codigoLote: string;
    precioVenta: number;
    fechaVenta: string;
  } | null;
}

export interface CrmPendingSaleResult {
  success: boolean;
  idVenta: number;
  codigoVenta: string;
  idContrato: number;
  codigoContrato: string;
  idProspecto: number;
  idPersona: number;
  idAsesor: number;
  idLote: number;
  idProyecto: number;
  idPlanPago: number | null;
  codigoPlanPago: string | null;
  estadoVenta: 'PENDIENTE';
  estadoContrato: 'PENDIENTE_FIRMA';
  estadoLote: 'RESERVADO';
  esComprador: boolean;
  modalidad: 'CONTADO' | 'FINANCIADA';
  montoTotal: number;
  mensaje: string;
}

export interface CrmCancelPendingSaleResult {
  success: boolean;
  idVenta: number;
  codigoVenta: string;
  codigoContrato: string;
  estadoVenta: 'ANULADA';
  estadoContrato: 'ANULADO';
  estadoLote: 'DISPONIBLE' | 'RESERVADO';
  motivo: string;
  mensaje: string;
}

export interface CrmConciliacionSeparacion {
  id_pago: number;
  codigo_pago: string;
  monto: number;
  moneda: string;
  comprador: string;
  codigo_lote: string;
  codigo_reserva: string;
  codigo_venta: string | null;
  metodo_pago: string;
  numero_operacion: string | null;
  fecha_operacion: string;
  fecha_confirmacion: string | null;
  id_movimiento: number | null;
  codigo_movimiento: string | null;
  id_cuenta_financiera: number | null;
  id_categoria: number | null;
  codigo_cuenta: string;
  cuenta_demo: boolean | null;
  estado_conciliacion:
  | 'PENDIENTE'
  | 'CONCILIADO'
  | 'REQUIERE_REVISION';
}

export interface CrmConciliarPagoResponse {
  success: boolean;
  estado: 'CONCILIADO' | 'YA_CONCILIADO';
  idMovimiento: number;
  idPago: number;
  codigoPago: string;
  idCuentaFinanciera: number;
  idCategoria: number;
  monto: number;
}

export interface CrmConciliacionesResponse {
  items: CrmConciliacionSeparacion[];
  total: number;
  pagina: number;
  tamano: number;
  paginas: number;
  cuentas: {
    id_cuenta_financiera: number;
    codigo: string;
    nombre: string;
    moneda: string;
    tipo: string;
    es_demo: boolean;
  }[];
  categorias: {
    id_categoria: number;
    codigo: string;
    nombre: string;
  }[];
}


function qs(filters: Record<string, string | number | boolean | null | undefined>) {
  const p = new URLSearchParams();
  for (const [key, value] of Object.entries(filters)) {
    if (value !== null && value !== undefined && value !== '') p.set(key, String(value));
  }
  const query = p.toString();
  return query ? `?${query}` : '';
}


export interface CrmContractUpload {
  bucket: string;
  claveArchivo: string;
  urlCarga: string;
  tipoMime: string;
  maxBytes: number;
  expiresInSeconds: number;
}

export interface CrmContractEvidence {
  success: boolean;
  idContrato: number;
  idContratoArchivo: number;
  codigoArchivo: string;
  numeroVersion: number;
  claveArchivo: string;
  tamanoBytes: number;
  tipoMime: string;
  firmaValidada: boolean;
  contratoVigente: boolean;
  mensaje: string;
}


export interface CrmPendingContract {
  idContrato: number;
  codigoContrato: string;
  idVenta: number;
  codigoVenta: string;
  fechaVenta: string;
  montoVenta: number;
  idLote: number;
  codigoLote: string;
  idProyecto: number;
  nombreProyecto: string;
  comprador: string;
  estadoContrato: 'PENDIENTE_FIRMA';
  estadoVenta: 'PENDIENTE';
  tieneEvidencia: boolean;
  idArchivoVigente: number | null;
  nombreArchivoVigente: string | null;
}

export interface CrmPendingContractsPage {
  items: CrmPendingContract[];
  total: number;
  pagina: number;
  tamano: number;
}

export interface CrmContractReadUrl {
  idContrato: number;
  idContratoArchivo: number;
  nombreOriginal: string;
  urlLectura: string;
  expiresInSeconds: number;
}

export type CrmTipoAnexoContrato =
  | 'PLANO_LOTE'
  | 'MEMORIA_DESCRIPTIVA';

export interface CrmAnexoContrato {
  idAnexo: number;
  tipoAnexo: CrmTipoAnexoContrato;
  numeroVersion: number;
  nombreArchivoOriginal: string;
  tipoMime: string;
  tamanoBytes: number;
  vigente: boolean;
  visibleCliente: boolean;
  fechaCarga: string;
  fechaPublicacionCliente: string | null;
}

export interface CrmAnexosContratoResponse {
  idContrato: number;
  codigoContrato: string;
  idVenta: number;
  codigoVenta: string;
  idLote: number;
  codigoLote: string;
  estadoContrato: string;
  documentos: CrmAnexoContrato[];
  faltantes: CrmTipoAnexoContrato[];
}

export interface CrmAnexoRegistrado {
  success: boolean;
  estado: 'REGISTRADO' | 'YA_REGISTRADO';
  idAnexo: number;
  idContrato: number;
  tipoAnexo: CrmTipoAnexoContrato;
  numeroVersion: number;
  vigente: boolean;
  visibleCliente?: boolean;
  tamanoBytes?: number;
  mensaje?: string;
}

export interface CrmEnlaceLecturaAnexo {
  idContrato: number;
  idAnexo: number;
  tipoAnexo: CrmTipoAnexoContrato;
  nombreOriginal: string;
  urlLectura: string;
  expiresInSeconds: number;
}

export interface CrmContratoDocumentacion {
  idContrato: number;
  codigoContrato: string;
  idVenta: number;
  codigoVenta: string;
  idLote: number;
  codigoLote: string;
  nombreProyecto: string;
  comprador: string;
  estadoContrato: string;
  estadoVenta: string;
  tienePdfContrato: boolean;
  tienePdfAprobado: boolean;
  tienePlanoLote: boolean;
  tieneMemoriaDescriptiva: boolean;
}

export interface CrmContratosDocumentacionPage {
  items: CrmContratoDocumentacion[];
  total: number;
  pagina: number;
  tamano: number;
}


export interface CrmAprobarFirmaRequest {
  idContratoArchivo: number;
  fechaFirma: string;
  firmaRevisada: boolean;
  observaciones: string;
}

export interface CrmAprobarFirmaResponse {
  success: boolean;
  idContrato: number;
  codigoContrato: string;
  idVenta: number;
  codigoVenta: string;
  idContratoArchivo: number;
  idAprobacion: number;
  idProspecto: number;
  idLote: number;
  estadoContrato: string;
  estadoVenta: string;
  estadoLote: string;
  esComprador: boolean;
  idPlanPago: number | null;
  cuotasGeneradas: number;
  mensaje: string;
}

export interface CrmFuentePeriodo {
  codigo: string;
  nombre: string;
  total: number;
  activos: number;
  convertidos: number;
  participacion: number;
}

export interface CrmFuentesPeriodo {
  total: number;
  items: CrmFuentePeriodo[];
}



export interface CrmRetrocesoMotivo {
  codigo: string;
  nombre: string;
  descripcion?: string | null;
}

export interface CrmSolicitudRetroceso {
  id_solicitud: number;
  id_prospecto: number;
  codigo_prospecto: string;
  nombre_prospecto: string;
  id_asesor?: number;
  nombre_asesor: string;
  etapa_origen: string;
  nombre_etapa_origen: string;
  etapa_destino: string;
  nombre_etapa_destino: string;
  motivo_codigo: string;
  motivo_nombre: string;
  motivo_detallado: string;
  estado: 'PENDIENTE' | 'APROBADA' | 'RECHAZADA';
  tiene_evidencia?: boolean;
  fecha_solicitud: string;
  fecha_resolucion: string | null;
  observacion_resolucion: string | null;
  resuelto_por_nombre: string | null;
  prospecto_codigo?: string;
  prospecto_nombre?: string;
  asesor_nombre?: string;
  estado_origen_codigo?: string;
  estado_origen_nombre?: string;
  estado_destino_codigo?: string;
  estado_destino_nombre?: string;
}

export interface CrmIndicadoresRetroceso {
  total: number;
  pendientes: number;
  aprobadas: number;
  rechazadas: number;
  tasa_aprobacion: number;
}

export const crmBackend = {
  catalogos: () => coreApi.get<CrmCatalogs>('/crm/catalogos'),
  resumen: () => coreApi.get<CrmSummary>('/crm/resumen'),

  resumenPeriodo: (desde: string, hastaExclusivo: string) =>
    coreApi.get<CrmSummary>(
      `/crm/resumen/periodo${qs({
        desde,
        hastaExclusivo
      })}`
    ),

  evolucionMensual: (desde: string, hastaExclusivo: string) =>
    coreApi.get<CrmEvolucionMensual>(
      `/crm/evolucion-mensual${qs({
        desde,
        hastaExclusivo
      })}`
    ),

  asesores: () => coreApi.get<CrmAdvisor[]>('/crm/asesores'),
  prospectos: () => coreApi.get<CrmProspect[]>('/crm/prospectos'),
  buscar: (f: CrmSearch) => coreApi.get<CrmPage<CrmProspect>>(`/crm/prospectos/buscar${qs({
    consulta: f.consulta?.trim(), etapa: f.etapa, origen: f.origen,
    idAsesor: f.idAsesor, sinAsignar: f.sinAsignar,
    categoria: f.categoria ?? 'TODOS', pagina: f.pagina ?? 1, tamano: f.tamano ?? 20
  })}`),

  buscarSinPeriodo: (f: CrmSearch & {idProyecto?: number}) =>
    coreApi.get<CrmPage<CrmProspect>>(
      `/crm/prospectos/buscar-sin-periodo${qs({
        consulta:f.consulta?.trim(),etapa:f.etapa,origen:f.origen,
        idAsesor:f.idAsesor,sinAsignar:f.sinAsignar,
        categoria:f.categoria ?? 'TODOS',pagina:f.pagina ?? 1,
        tamano:f.tamano ?? 15,idProyecto:f.idProyecto
      })}`
    ),

  buscarPeriodo: (f: CrmSearchPeriodo) =>
    coreApi.get<CrmPage<CrmProspect>>(
      `/crm/prospectos/buscar-periodo${qs({
        consulta: f.consulta?.trim(),
        etapa: f.etapa,
        origen: f.origen,
        idAsesor: f.idAsesor,
        sinAsignar: f.sinAsignar,
        categoria: f.categoria ?? 'TODOS',
        pagina: f.pagina ?? 1,
        tamano: f.tamano ?? 20,
        idProyecto: f.idProyecto,
        desde: f.desde,
        hastaExclusivo: f.hastaExclusivo
      })}`
    ),

  detalle: (id: number) => coreApi.get<CrmDetail>(`/crm/prospectos/${id}`),
  datosPersonales: (id:number) =>
    coreApi.get<CrmDatosPersonales>(`/crm/prospectos/${id}/datos-personales`),
  corregirDatosPersonales: (id:number, datos:CrmDatosPersonalesEdicion, motivo:string) =>
    coreApi.patch<{actualizado:boolean;idProspecto:number}>(
      `/crm/prospectos/${id}/datos-personales`,{datos,motivo}
    ),

  crear: (data: CrmLeadCreate) => coreApi.post<Record<string, unknown>>('/crm/prospectos', data as Record<string, unknown>),
  actualizar: (id: number, body: { origenCodigo?: string; observaciones?: string; idProyectoInteres?: number }) =>
    coreApi.patch<Record<string, unknown>>(`/crm/prospectos/${id}/ficha`, body as Record<string, unknown>),
  etapa: (id: number, estadoCodigo: string, observacion?: string) =>
    coreApi.patch<Record<string, unknown>>(`/crm/prospectos/${id}/etapa`, { estadoCodigo, observacion: observacion ?? null }),
  asesor: (id: number, idAsesor: number, motivo?: string) =>
    coreApi.put<Record<string, unknown>>(`/crm/prospectos/${id}/asesor`, { idAsesor, motivo: motivo ?? null }),
  desactivar: (id: number, motivo: string) => coreApi.delete<Record<string, unknown>>(
    `/crm/prospectos/${id}${qs({ motivo })}`),
  compradores: (consulta: string, pagina: number, tamano: number) =>
    coreApi.get<CrmPage<CrmBuyer>>(`/crm/compradores${qs({ consulta, pagina, tamano })}`),

  compradoresPeriodo: (
    consulta: string | undefined,
    pagina: number,
    tamano: number,
    desde: string,
    hastaExclusivo: string
  ) =>
    coreApi.get<CrmPage<CrmBuyer>>(
      `/crm/compradores/periodo${qs({
        consulta: consulta?.trim(),
        pagina,
        tamano,
        desde,
        hastaExclusivo
      })}`
    ),

  fuentesPeriodo: (
    desde: string,
    hastaExclusivo: string
  ) =>
    coreApi.get<CrmFuentesPeriodo>(
      `/crm/fuentes/periodo${qs({
        desde,
        hastaExclusivo
      })}`
    ),

  asesoresPeriodo: (
    desde: string,
    hastaExclusivo: string
  ) =>
    coreApi.get<CrmAsesoresPeriodo>(
      `/crm/asesores/periodo${qs({
        desde,
        hastaExclusivo
      })}`
    ),

  subirComprobanteVenta: async (
    condiciones: Pick<CrmSaleValidationInput,
      'idProspecto' | 'idLote' | 'modalidad' | 'montoTotal' | 'montoInicial' | 'numeroCuotas'>,
    archivo: File
  ): Promise<CrmVoucherVenta> => {
    if (!archivo || archivo.size < 1 || archivo.size > 5 * 1024 * 1024
        || archivo.name.length > 255 || !archivo.name.trim()
        || !['application/pdf','image/jpeg','image/png','image/webp'].includes(archivo.type)) {
      throw new Error('El comprobante debe ser PDF o imagen de hasta 5 MB.');
    }
    const carga = await coreApi.post<CrmSeparacionUpload>(
      '/crm/ventas/preparar-comprobante',
      {
        ...condiciones,
        nombreArchivo: archivo.name,
        tipoMime: archivo.type
      }
    );
    const token = new URL(carga.urlCarga).searchParams.get('token');
    if (!token || carga.bucket !== 'vouchers-ventas-private') {
      throw new Error('Enlace de carga de venta inválido.');
    }
    const { error } = await supabase.storage.from(carga.bucket)
      .uploadToSignedUrl(carga.claveArchivo, token, archivo, {
        contentType: carga.tipoMime, upsert: false
      });
    if (error) throw new Error('No se pudo cargar el comprobante: ' + error.message);
    return {
      claveArchivo: carga.claveArchivo,
      nombreArchivo: archivo.name,
      tipoMime: archivo.type,
      tamanioBytes: archivo.size
    };
  },

  prepararComprobanteSeparacion: (body: {
    idProspecto: number;
    idLote: number;
    nombreArchivo: string;
    tipoMime: string;
  }) =>
    coreApi.post<CrmSeparacionUpload>(
      '/crm/separaciones/preparar-comprobante',
      body
    ),

  subirComprobanteSeparacion: async (
    idProspecto: number,
    idLote: number,
    archivo: File
  ): Promise<{ claveArchivo: string; nombreArchivo: string; tipoMime: string; tamanioBytes: number }> => {
    const maxBytes = 5 * 1024 * 1024;
    const mimesPermitidos = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];

    if (!Number.isSafeInteger(idProspecto) || idProspecto <= 0) {
      throw new Error('El prospecto seleccionado no es valido.');
    }
    if (!Number.isSafeInteger(idLote) || idLote <= 0) {
      throw new Error('El lote seleccionado no es valido.');
    }
    if (!archivo || archivo.size <= 0) {
      throw new Error('Debe adjuntar el archivo del comprobante.');
    }
    if (archivo.size > maxBytes) {
      throw new Error('El archivo excede el limite maximo de 5 MB.');
    }
    if (!mimesPermitidos.includes(archivo.type)) {
      throw new Error('Formato no permitido. Utilice PDF, JPG, PNG o WebP.');
    }

    const carga = await coreApi.post<CrmSeparacionUpload>(
      '/crm/separaciones/preparar-comprobante',
      {
        idProspecto,
        idLote,
        nombreArchivo: archivo.name,
        tipoMime: archivo.type
      }
    );

    const token = new URL(carga.urlCarga).searchParams.get('token');
    if (!token) {
      throw new Error('No se recibio token valido para la carga del comprobante.');
    }

    const { error } = await supabase.storage
      .from(carga.bucket)
      .uploadToSignedUrl(carga.claveArchivo, token, archivo, {
        contentType: carga.tipoMime,
        upsert: false
      });

    if (error) {
      throw new Error(`Error al subir comprobante a almacenamiento privado: ${error.message}`);
    }

    return {
      claveArchivo: carga.claveArchivo,
      nombreArchivo: archivo.name,
      tipoMime: carga.tipoMime,
      tamanioBytes: archivo.size
    };
  },

  registrarSeparacion: (body: CrmSeparacionInput) =>
    coreApi.post<CrmSeparacionResult>(
      '/crm/separaciones',
      {
        idProspecto: body.idProspecto,
        idLote: body.idLote,
        metodoPago: body.metodoPago,
        numeroOperacion: body.numeroOperacion?.trim() || null,
        monto: body.monto,
        observaciones: body.observaciones?.trim() || null,
        claveArchivo: body.claveArchivo,
        nombreArchivo: body.nombreArchivo,
        tipoMime: body.tipoMime,
        tamanioBytes: body.tamanioBytes,
        hashSha256: body.hashSha256 || null
      }
    ),

  listarOperaciones: (params?: {
    tipo?: 'VENTA' | 'SEPARACION';
    busqueda?: string;
    pagina?: number;
    tamano?: number;
  }) =>
    coreApi.get<CrmOperacionesResponse>(
      `/crm/operaciones${qs({
        tipo: params?.tipo,
        busqueda: params?.busqueda,
        pagina: params?.pagina,
        tamano: params?.tamano
      })}`
    ),

  /** Consulta de posibles causales, requiere permiso legal/financiero y cartera. */
  listarRevisionesResolutorias: (params:{pagina?:number;tamano?:number}={}) => {
    const pagina=params.pagina??1;
    const tamano=params.tamano??20;
    if(!Number.isSafeInteger(pagina)||pagina<1||pagina>10000
      ||!Number.isSafeInteger(tamano)||tamano<1||tamano>100)
      throw new Error('Paginación de revisión contractual inválida.');
    return coreApi.get<CrmRevisionesResolutorias>(
      `/crm/financiamiento/clausula-resolutoria/revision${qs({pagina,tamano})}`
    );
  },

  /** FINANCIAMIENTO: cartera por actor; no aceptar IDs arbitrarios del frontend. */
  listarCarteraFinancieraReal: (params: {
    vista:'PLANES'|'CUOTAS';busqueda?:string;pagina?:number;tamano?:number;
  }) => coreApi.get<CrmCarteraReal>(
    `/crm/financiamiento/cartera${qs({
      vista:params.vista,busqueda:params.busqueda?.trim(),
      pagina:params.pagina??1,tamano:params.tamano??20
    })}`
  ),

  /** FINANZAS: pagos realmente registrados, sin movimientos ficticios. */
  listarMovimientosFinanzasReal: (params: {
    busqueda?:string;pagina?:number;tamano?:number;
  }={}) => coreApi.get<CrmMovimientosFinanzasReal>(
    `/crm/finanzas/movimientos${qs({
      busqueda:params.busqueda?.trim(),pagina:params.pagina??1,
      tamano:params.tamano??20
    })}`
  ),

  /** Cartera autorizada: alertas reales, calculadas sin usar mocks ni RLS del navegador. */
  listarAlertasCuotas: (params: {
    tipo?:CrmTipoAlertaCuota;pagina?:number;tamano?:number;
  }={}) => {
    const tipo=params.tipo??'TODAS';
    const pagina=params.pagina??1;
    const tamano=params.tamano??20;
    if (!['TODAS','CUOTA_PROXIMA','CUOTA_VENCIDA'].includes(tipo)
      || !Number.isSafeInteger(pagina)||pagina<1||pagina>10000
      || !Number.isSafeInteger(tamano)||tamano<1||tamano>100) {
      throw new Error('Parámetros de alerta inválidos.');
    }
    return coreApi.get<CrmAlertasCuotas>(
      `/crm/financiamiento/alertas${qs({tipo,pagina,tamano})}`
    );
  },

  /** Requiere financing.approve en Core y SQL; no crea not_envios ni emails. */
  prepararAvisosPortal: (limite=100) => {
    if(!Number.isSafeInteger(limite)||limite<1||limite>500)
      throw new Error('Límite de avisos inválido.');
    return coreApi.post<CrmAvisosPortalPreparados>(
      `/crm/financiamiento/alertas/portal/preparar${qs({limite})}`,
      {}
    );
  },

  obtenerCronogramaVenta: (idVenta:number) => {
    if (!Number.isSafeInteger(idVenta) || idVenta<=0)
      throw new Error('Identificador de venta inválido.');
    return coreApi.get<CrmCronogramaVenta>(`/crm/ventas/${idVenta}/cronograma`);
  },

  obtenerSaldoVenta: (idVenta: number) => {
    if (!Number.isSafeInteger(idVenta) || idVenta <= 0)
      throw new Error('Identificador de venta inválido.');
    return coreApi.get<CrmSaldoVenta>(`/crm/ventas/${idVenta}/saldo`);
  },

  obtenerSaldoCliente: (idCliente: number) => {
    if (!Number.isSafeInteger(idCliente) || idCliente <= 0)
      throw new Error('Identificador de cliente inválido.');
    return coreApi.get<CrmSaldoCliente>(`/crm/clientes/${idCliente}/saldo`);
  },

  obtenerDetalleVenta: (idVenta: number) => {
    if (!Number.isSafeInteger(idVenta) || idVenta <= 0)
      throw new Error('Identificador de venta inválido.');
    return coreApi.get<CrmDetalleVenta>(`/crm/ventas/${idVenta}/detalle`);
  },

  obtenerComprobanteVenta: (idVenta: number, idComprobante: number) => {
    if (!Number.isSafeInteger(idVenta) || idVenta <= 0
      || !Number.isSafeInteger(idComprobante) || idComprobante <= 0)
      throw new Error('Identificador de comprobante inválido.');
    return coreApi.get<CrmVoucherReadUrl>(
      `/crm/ventas/${idVenta}/comprobantes/${idComprobante}/url-firmada`
    );
  },

  obtenerComprobanteSeparacion: (idReserva: number) => {
    if (!Number.isSafeInteger(idReserva) || idReserva <= 0) {
      throw new Error('Identificador de separacion invalido.');
    }
    return coreApi.get<CrmVoucherReadUrl>(
      '/crm/separaciones/' + idReserva + '/comprobante/url-firmada'
    );
  },

  /** Exportación de ventas validada por sales.export y cartera en backend/SQL. */
  listarVentasParaExportacion: (params: { pagina: number; tamano: number }) =>
    coreApi.get<CrmOperacionesResponse>(
      `/crm/ventas/exportacion${qs({
        pagina: params.pagina, tamano: params.tamano
      })}`
    ),

  /** Usa sales.export en backend, nunca eleva el alcance del asesor. */
  listarOperacionesParaExportacion: (params: {
    pagina: number;
    tamano: number;
  }) =>
    coreApi.get<CrmOperacionesResponse>(
      `/crm/separaciones/exportacion${qs({
        pagina: params.pagina,
        tamano: params.tamano
      })}`
    ),

  prepararLecturaVoucherSeparacion: (idVoucher: number) =>
    coreApi.get<CrmVoucherReadUrl>(
      `/crm/separaciones/vouchers/${idVoucher}/url-firmada`
    ),

  conciliarPagoSeparacion: (
    idPago: number,
    body: {
      idCuentaFinanciera: number;
      idCategoria: number;
    }
  ) =>
    coreApi.post<CrmConciliarPagoResponse>(
      `/crm/finanzas/conciliaciones/separaciones/${idPago}/conciliar`,
      {
        idCuentaFinanciera: body.idCuentaFinanciera,
        idCategoria: body.idCategoria
      }
    ),

  listarConciliacionesSeparacion: (params?: {
    estado?:
    | 'TODOS'
    | 'PENDIENTE'
    | 'CONCILIADO'
    | 'REQUIERE_REVISION';
    busqueda?: string;
    pagina?: number;
    tamano?: number;
  }) =>
    coreApi.get<CrmConciliacionesResponse>(
      `/crm/finanzas/conciliaciones/separaciones${qs({
        estado: params?.estado ?? 'TODOS',
        busqueda: params?.busqueda?.trim(),
        pagina: params?.pagina ?? 1,
        tamano: params?.tamano ?? 20
      })}`
    ),

  /** Inicial adicional de un plan ya firmado (reserva informativa separada). */
  opcionesRegistroVoucherInicial:(busqueda='',limite=60)=>{
    if(busqueda.trim().length>120||!Number.isSafeInteger(limite)
      ||limite<1||limite>100)throw new Error('Filtro de iniciales inválido.');
    return coreApi.get<CrmOpcionesRegistroInicial>(
      `/crm/finanzas/vouchers/inicial/opciones${qs({busqueda:busqueda.trim(),limite})}`);
  },

  prepararCargaVoucherInicial:(datos:CrmPrepararCargaInicialInput)=>
    coreApi.post<CrmCargaVoucherCuota>(
      '/crm/finanzas/vouchers/inicial/preparar-carga',datos),

  registrarVoucherInicialPendiente:(idCarga:string)=>{
    if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(idCarga))
      throw new Error('Referencia de carga de inicial inválida.');
    return coreApi.post<CrmRegistroVoucherCuota>(
      '/crm/finanzas/vouchers/inicial/registrar',{idCarga});
  },

  /** Retorna únicamente cuotas exigibles de contratos firmados y medios activos. */
  opcionesRegistroVoucherCuota: (busqueda='',limite=60) => {
    if(busqueda.trim().length>120
        ||!Number.isSafeInteger(limite)||limite<1||limite>100)
      throw new Error('Búsqueda de cuotas inválida.');
    return coreApi.get<CrmOpcionesRegistroCuota>(
      `/crm/finanzas/vouchers/cuotas/opciones${qs({busqueda:busqueda.trim(),limite})}`
    );
  },

  /** Preautorización vinculada por el servidor al actor y la cuota. */
  prepararCargaVoucherCuota: (datos:CrmPrepararCargaCuotaInput) =>
    coreApi.post<CrmCargaVoucherCuota>(
      '/crm/finanzas/vouchers/cuotas/preparar-carga',datos
    ),

  /** Carga un único archivo de la preparación anterior en Storage privado. */
  subirArchivoVoucherCuota: async(carga:CrmCargaVoucherCuota,archivo:File) => {
    if(!archivo||archivo.size<1||archivo.size>5242880
        ||archivo.name.trim().length<1||archivo.name.length>180
        ||!['application/pdf','image/jpeg','image/png','image/webp'].includes(archivo.type)
        ||carga.bucket!=='vouchers-ventas-private'
        ||carga.tipoMime!==archivo.type
        ||carga.maxBytes<archivo.size) {
      throw new Error('Archivo no válido: PDF, JPG, PNG o WebP hasta 5 MiB.');
    }
    const enlace=new URL(carga.urlCarga);
    if(enlace.protocol!=='https:') throw new Error('Enlace de carga no seguro.');
    const token=enlace.searchParams.get('token');
    if(!token)throw new Error('No se recibió token de carga válido.');
    const {error}=await supabase.storage.from(carga.bucket)
      .uploadToSignedUrl(carga.claveArchivo,token,archivo,{
        contentType:carga.tipoMime,upsert:false
      });
    if(error)throw new Error('No se pudo subir el comprobante: '+error.message);
  },

  /** Reintento seguro: el mismo idCarga devuelve el mismo pago pendiente. */
  registrarVoucherCuotaPendiente:(idCarga:string)=>{
    if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(idCarga))
      throw new Error('Identificador de carga incorrecto.');
    return coreApi.post<CrmRegistroVoucherCuota>(
      '/crm/finanzas/vouchers/cuotas/registrar',{idCarga}
    );
  },

  /** Conciliación sin efectos contables, filtrada y paginada en PostgreSQL. */
  conciliacionIntegral:(params?:{
    estado?:CrmEstadoConciliacion;busqueda?:string;pagina?:number;tamano?:number;
  })=>{
    const estado=params?.estado??'TODOS';
    const busqueda=(params?.busqueda??'').trim();
    const pagina=params?.pagina??1;
    const tamano=params?.tamano??20;
    if(!['TODOS','CON_ALERTA','SIN_ALERTA'].includes(estado)
       ||busqueda.length>120||!Number.isSafeInteger(pagina)||pagina<1
       ||pagina>10000||!Number.isSafeInteger(tamano)||tamano<1||tamano>100)
      throw new Error('Filtros de conciliación inválidos.');
    return coreApi.get<CrmConciliacionIntegral>(
      `/crm/finanzas/conciliacion-integral${qs({estado,busqueda,pagina,tamano})}`
    );
  },

  /** Seguimiento humano auditable; REVISADA nunca supone RESUELTA. */
  marcarRevisionConciliacion:(pago:number,req:{
    codigoIncidencia:CrmIncidenciaFinanciera;
    estado:'EN_REVISION'|'REVISADA';
    comentario:string;
  })=>{
    if(!Number.isSafeInteger(pago)||pago<=0
       ||req.codigoIncidencia==='SIN_ALERTA'
       ||!['EN_REVISION','REVISADA'].includes(req.estado)
       ||req.comentario.trim().length<10||req.comentario.trim().length>500)
      throw new Error('Comentario, incidencia o estado de revisión inválidos.');
    return coreApi.put<{
      idRevision:number;idPago:number;codigo:string;estado:string;
      requiereVerificacion:boolean;
    }>(
      `/crm/finanzas/conciliacion-integral/pagos/${pago}/revision`,
      {...req,comentario:req.comentario.trim()}
    );
  },

  /** Solo dinero confirmado y aprobaciones bancarias; sin saldos de prueba. */
  listarImputaciones:(pagina=1,tamano=20)=>{
    if(!Number.isSafeInteger(pagina)||pagina<1||pagina>10000
       ||!Number.isSafeInteger(tamano)||tamano<1||tamano>100)
      throw new Error('Paginación de imputaciones inválida.');
    return coreApi.get<CrmImputacionesRespuesta>(
      `/crm/finanzas/imputaciones${qs({pagina,tamano})}`
    );
  },

  aplicarPagoConfirmado:(req:{
    idSolicitud:string;idPago:number;tipo:'CUOTA'|'INICIAL';
    idCuota:number|null;monto:number;observaciones:string|null;
  })=>{
    if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(req.idSolicitud)
      ||!Number.isSafeInteger(req.idPago)||req.idPago<=0
      ||!['CUOTA','INICIAL'].includes(req.tipo)
      ||(req.tipo==='CUOTA'&&(!Number.isSafeInteger(req.idCuota)||Number(req.idCuota)<=0))
      ||(req.tipo==='INICIAL'&&req.idCuota!==null)
      ||!Number.isFinite(req.monto)||req.monto<=0
      ||Math.abs(req.monto*100-Math.round(req.monto*100))>1e-7
      ||(req.observaciones?.length??0)>255)
      throw new Error('Importe, cuota o solicitud de aplicación inválidos.');
    return coreApi.post<CrmImputacionResultado>(
      '/crm/finanzas/imputaciones',req);
  },

  revertirAplicacion:(idAplicacion:number,motivo:string)=>{
    if(!Number.isSafeInteger(idAplicacion)||idAplicacion<=0
      ||motivo.trim().length<5||motivo.trim().length>255)
      throw new Error('Debe justificar la reversión con al menos 5 caracteres.');
    return coreApi.put<CrmReversionAplicacionResultado>(
      `/crm/finanzas/imputaciones/${idAplicacion}/reversion`,
      {motivo:motivo.trim()}
    );
  },

  /** Revisión humana independiente: NO aplica abonos a las cuotas. */
  revisarVoucherCuota:(
    idVoucher:number,decision:CrmRevisionVoucherCuotaInput
  )=>{
    if(!Number.isSafeInteger(idVoucher)||idVoucher<=0||typeof decision.aprobar!=='boolean')
      throw new Error('Comprobante o decisión inválidos.');
    if(decision.aprobar&&decision.motivo?.trim())
      throw new Error('La aprobación no puede incluir motivo de rechazo.');
    if(!decision.aprobar&&(decision.motivo?.trim().length??0)<5)
      throw new Error('Indique un motivo de rechazo de al menos 5 caracteres.');
    if((decision.motivo?.length??0)>255||(decision.observaciones?.length??0)>500)
      throw new Error('La longitud del motivo u observaciones excede el límite.');
    return coreApi.put<CrmRevisionVoucherCuotaResultado>(
      `/crm/finanzas/vouchers/cuotas/${idVoucher}/decision`,{
        aprobar:decision.aprobar,
        motivo:decision.aprobar?null:decision.motivo?.trim()??null,
        observaciones:decision.observaciones?.trim()||null
      }
    );
  },

  /** Solo Finanzas: comprobantes de cuotas, nunca separaciones ni mocks. */
  listarVouchersCuotas: (params:{
    estado?:'TODOS'|'PENDIENTE'|'APROBADO'|'RECHAZADO';
    busqueda?:string; pagina?:number; tamano?:number;
  }={}) => {
    const estado=params.estado??'TODOS';
    const pagina=params.pagina??1;
    const tamano=params.tamano??20;
    const busqueda=params.busqueda?.trim()??'';
    if(!['TODOS','PENDIENTE','APROBADO','RECHAZADO'].includes(estado)
       ||!Number.isSafeInteger(pagina)||pagina<1||pagina>10000
       ||!Number.isSafeInteger(tamano)||tamano<1||tamano>100
       ||busqueda.length>120) throw new Error('Filtros de vouchers inválidos.');
    return coreApi.get<CrmVouchersCuotasResponse>(
      `/crm/finanzas/vouchers/cuotas${qs({estado,busqueda,pagina,tamano})}`
    );
  },

  /** URL firmada, únicamente si el archivo está presente en Storage privado. */
  prepararLecturaVoucherCuota:(idVoucher:number)=>{
    if(!Number.isSafeInteger(idVoucher)||idVoucher<=0)
      throw new Error('Identificador de voucher inválido.');
    return coreApi.get<CrmVoucherReadUrl>(
      `/crm/finanzas/vouchers/cuotas/${idVoucher}/url-firmada`
    );
  },

  listarVouchersSeparacion: (params?: {
    estado?: string;
    busqueda?: string;
    pagina?: number;
    tamano?: number;
  }) => {
    const query = qs({
      estado: params?.estado,
      busqueda: params?.busqueda,
      pagina: params?.pagina,
      tamano: params?.tamano
    });

    return coreApi.get<CrmSeparacionVouchersResponse>(
      `/crm/separaciones/vouchers${query}`
    );
  },

  revisarVoucherSeparacion: (idVoucher: number, body: CrmRevisarVoucherInput) =>
    coreApi.put<any>(
      `/crm/separaciones/vouchers/${idVoucher}/decision`,
      { ...body }
    ),


  validarVenta: (body: CrmSaleValidationInput) =>
    coreApi.post<CrmSaleValidationResult>(
      '/crm/ventas/validar',
      {
        idProspecto: body.idProspecto,
        idLote: body.idLote,
        modalidad: body.modalidad,
        montoTotal: body.montoTotal,
        montoInicial: body.montoInicial ?? null,
        numeroCuotas: body.numeroCuotas ?? null,
        tasaInteresMensualPct: body.tasaInteresMensualPct ?? null,
        observaciones: body.observaciones ?? null
      }
    ),

  registrarVentaPendiente: (body: CrmSaleValidationInput) =>
    coreApi.post<CrmPendingSaleResult>(
      '/crm/ventas/pendientes',
      {
        idProspecto: body.idProspecto,
        idLote: body.idLote,
        modalidad: body.modalidad,
        montoTotal: body.montoTotal,
        montoInicial: body.montoInicial ?? null,
        numeroCuotas: body.numeroCuotas ?? null,
        tasaInteresMensualPct: body.tasaInteresMensualPct ?? null,
        observaciones: body.observaciones ?? null,
        datosComprador: body.datosComprador ?? null,
        datosPago: body.datosPago ?? null
      }
    ),
  cancelarVentaPendiente: (
    idVenta: number,
    motivo: string
  ) =>
    coreApi.post<CrmCancelPendingSaleResult>(
      `/crm/ventas/${idVenta}/cancelar`,
      { motivo: motivo.trim() }
    ),
  verificarCompra: (idProspecto: number) =>
    coreApi.get<CrmBuyerVerification>(
      `/crm/prospectos/${idProspecto}/verificar-compra`
    ),
  datosCompradorParaVenta: (idProspecto: number) =>
    coreApi.get<CrmDatosCompradorVenta>(
      `/crm/prospectos/${idProspecto}/datos-comprador-venta`
    ),

  listarReservasVigentesParaVenta: (idProspecto: number) =>
    coreApi.get<CrmReservasVigentesVenta>(
      `/crm/prospectos/${idProspecto}/reservas-vigentes-venta`
    ),

  listarLotesReservadosDelProspecto: (idProspecto: number) =>
    coreApi.get<{ idLotes: number[] }>(
      `/crm/prospectos/${idProspecto}/lotes-reservados`
    ),

  listarContratosDocumentacion: (
    busqueda = '',
    pagina = 1,
    tamano = 20
  ): Promise<CrmContratosDocumentacionPage> =>
    coreApi.get<CrmContratosDocumentacionPage>(
      `/crm/contratos/documentacion${qs({
        busqueda: busqueda.trim(),
        pagina,
        tamano
      })}`
    ),

  listarAnexosContrato: (
    idContrato: number
  ): Promise<CrmAnexosContratoResponse> =>
    coreApi.get<CrmAnexosContratoResponse>(
      `/crm/contratos/${idContrato}/anexos`
    ),

  subirAnexoContrato: async (
    idContrato: number,
    tipoAnexo: CrmTipoAnexoContrato,
    archivo: File
  ): Promise<CrmAnexoRegistrado> => {

    const maxBytes = 10 * 1024 * 1024;

    if (!Number.isSafeInteger(idContrato) || idContrato <= 0) {
      throw new Error('El contrato seleccionado no es válido.');
    }

    if (
      tipoAnexo !== 'PLANO_LOTE' &&
      tipoAnexo !== 'MEMORIA_DESCRIPTIVA'
    ) {
      throw new Error('Tipo de anexo no permitido.');
    }

    if (
      archivo.type !== 'application/pdf' ||
      !/\.pdf$/i.test(archivo.name)
    ) {
      throw new Error('Solo se permiten archivos PDF.');
    }

    if (
      archivo.name.length < 5 ||
      archivo.name.length > 255 ||
      /[/\\\x00-\x1f\x7f]/.test(archivo.name)
    ) {
      throw new Error('El nombre del archivo PDF no es válido.');
    }

    if (archivo.size <= 0 || archivo.size > maxBytes) {
      throw new Error('El PDF debe tener un tamaño máximo de 10 MB.');
    }

    const cabecera = await archivo.slice(0, 5).text();

    if (cabecera !== '%PDF-') {
      throw new Error('El archivo no tiene una cabecera PDF válida.');
    }

    const carga = await coreApi.post<CrmContractUpload>(
      `/crm/contratos/${idContrato}/anexos/preparar-carga`,
      { tipoAnexo }
    );

    const prefijo = `anexos/${idContrato}/${tipoAnexo}/`;
    const patronUuid =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.pdf$/;

    if (
      carga.bucket !== 'contratos-firmados-private' ||
      carga.tipoMime !== 'application/pdf' ||
      carga.maxBytes !== maxBytes ||
      !carga.claveArchivo.startsWith(prefijo) ||
      !patronUuid.test(carga.claveArchivo.slice(prefijo.length))
    ) {
      throw new Error('La configuración de carga del anexo no es válida.');
    }

    const url = new URL(carga.urlCarga);

    if (
      url.protocol !== 'https:' ||
      !url.hostname.endsWith('.supabase.co') ||
      url.pathname !==
      `/storage/v1/object/upload/sign/${carga.bucket}/${carga.claveArchivo}`
    ) {
      throw new Error('La URL firmada de carga no es válida.');
    }

    const token = url.searchParams.get('token');

    if (!token) {
      throw new Error('No se recibió un token válido de carga.');
    }

    const { error } = await supabase.storage
      .from(carga.bucket)
      .uploadToSignedUrl(
        carga.claveArchivo,
        token,
        archivo,
        {
          contentType: 'application/pdf',
          upsert: false
        }
      );

    if (error) {
      throw new Error(
        `No se pudo subir el anexo: ${error.message}`
      );
    }

    try {
      const registro = await coreApi.post<CrmAnexoRegistrado>(
        `/crm/contratos/${idContrato}/anexos`,
        {
          tipoAnexo,
          claveArchivo: carga.claveArchivo,
          nombreOriginal: archivo.name
        }
      );

      if (!registro.success) {
        throw new Error(
          registro.mensaje || 'No se confirmó el registro.'
        );
      }

      return registro;

    } catch (error) {
      const motivo =
        error instanceof Error
          ? error.message
          : 'Error desconocido.';

      throw new Error(
        'El PDF se subió a Storage, pero no se confirmó ' +
        `su registro en el contrato: ${motivo}`
      );
    }
  },

  prepararLecturaAnexoContrato: async (
    idContrato: number,
    idAnexo: number
  ): Promise<CrmEnlaceLecturaAnexo> => {

    if (
      !Number.isSafeInteger(idContrato) ||
      idContrato <= 0 ||
      !Number.isSafeInteger(idAnexo) ||
      idAnexo <= 0
    ) {
      throw new Error(
        'Los identificadores del contrato y anexo no son válidos.'
      );
    }

    const resultado =
      await coreApi.post<CrmEnlaceLecturaAnexo>(
        `/crm/contratos/${idContrato}/anexos/${idAnexo}/preparar-lectura`
      );

    if (
      resultado.idContrato !== idContrato ||
      resultado.idAnexo !== idAnexo ||
      !resultado.urlLectura
    ) {
      throw new Error(
        'La respuesta de lectura del anexo no es válida.'
      );
    }

    let url: URL;

    try {
      url = new URL(resultado.urlLectura);
    } catch {
      throw new Error('El enlace privado recibido no es válido.');
    }

    const prefijo =
      '/storage/v1/object/sign/contratos-firmados-private/anexos/';

    if (
      url.protocol !== 'https:' ||
      !url.hostname.endsWith('.supabase.co') ||
      url.username !== '' ||
      url.password !== '' ||
      url.port !== '' ||
      !url.pathname.startsWith(prefijo) ||
      !url.searchParams.has('token') ||
      url.hash !== ''
    ) {
      throw new Error(
        'El enlace de lectura no corresponde al Storage privado.'
      );
    }

    return resultado;
  },

  listarContratosPendientes: (
    busqueda = '',
    pagina = 1,
    tamano = 20
  ): Promise<CrmPendingContractsPage> =>
    coreApi.get<CrmPendingContractsPage>(
      `/crm/contratos/pendientes${qs({
        busqueda: busqueda.trim(),
        pagina,
        tamano
      })}`
    ),

  aprobarFirmaContrato: (
    idContrato: number,
    body: CrmAprobarFirmaRequest
  ) =>
    coreApi.post<CrmAprobarFirmaResponse>(
      `/crm/contratos/${idContrato}/aprobar-firma`,
      {
        idContratoArchivo: body.idContratoArchivo,
        fechaFirma: body.fechaFirma,
        firmaRevisada: body.firmaRevisada,
        observaciones: body.observaciones
      }
    ),

  visitas: (idProspecto: number) => coreApi.get<CrmVisit[]>(`/crm/prospectos/${idProspecto}/visitas`),

  visitasPeriodo: (desde: string, hastaExclusivo: string, idProspecto?: number, pagina = 1, tamano = 15) =>
    coreApi.get<CrmPage<CrmVisitaPeriodo>>(`/crm/visitas/periodo${qs({ desde, hastaExclusivo, idProspecto, pagina, tamano })}`),
  agendarVisita: (idProspecto: number, body: CrmScheduleVisit) =>
    coreApi.post<Record<string, unknown>>(`/crm/prospectos/${idProspecto}/visitas`, body as unknown as Record<string, unknown>),
  actualizarEstadoVisita: (idVisita: number, body: CrmUpdateVisitStatus) =>
    coreApi.patch<Record<string, unknown>>(`/crm/visitas/${idVisita}/estado`, body as unknown as Record<string, unknown>),
  registrarSeguimiento: (id: number, body: CrmFollowUpCreate) =>
    coreApi.post<Record<string, unknown>>(`/crm/prospectos/${id}/seguimientos`, body as unknown as Record<string, unknown>),
  listarSeguimientos: (id: number, limite = 100) =>
    coreApi.get<CrmFollowUpItem[]>(`/crm/prospectos/${id}/seguimientos?limite=${limite}`),
  exportarCsv: (consulta?: string, etapa?: string, categoria = 'TODOS', limite = 5000) =>
    coreApi.get<string>(`/crm/exportaciones/prospectos.csv${qs({ consulta, etapa, categoria, limite })}`),
  listarAsignaciones: (id: number) =>
    coreApi.get<CrmAssignment[]>(`/crm/prospectos/${id}/asignaciones`),
  prepararLecturaContrato: (
    idContrato: number,
    idContratoArchivo: number
  ) =>
    coreApi.post<CrmContractReadUrl>(
      `/crm/contratos/${idContrato}/evidencias/${idContratoArchivo}/preparar-lectura`
    ),
  prepararLecturaContratoAprobado: async (
    idContrato: number
  ): Promise<CrmContractReadUrl> => {
    if (!Number.isSafeInteger(idContrato) || idContrato <= 0) {
      throw new Error('El identificador del contrato no es válido.');
    }

    const resultado = await coreApi.post<CrmContractReadUrl>(
      `/crm/contratos/${idContrato}/pdf-aprobado/preparar-lectura`
    );

    if (
      resultado.idContrato !== idContrato ||
      !Number.isSafeInteger(resultado.idContratoArchivo) ||
      resultado.idContratoArchivo <= 0 ||
      !resultado.urlLectura
    ) {
      throw new Error('La respuesta del contrato aprobado no es válida.');
    }

    let url: URL;

    try {
      url = new URL(resultado.urlLectura);
    } catch {
      throw new Error('El enlace privado recibido no es válido.');
    }

    const patron = new RegExp(
      '^/storage/v1/object/sign/contratos-firmados-private/' +
      `contratos/${idContrato}/` +
      '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-' +
      '[0-9a-f]{4}-[0-9a-f]{12}\\.pdf$'
    );

    if (
      url.protocol !== 'https:' ||
      !url.hostname.endsWith('.supabase.co') ||
      url.username !== '' ||
      url.password !== '' ||
      url.port !== '' ||
      !patron.test(url.pathname) ||
      !url.searchParams.has('token') ||
      url.hash !== ''
    ) {
      throw new Error(
        'El enlace no corresponde a un contrato privado autorizado.'
      );
    }

    return resultado;
  },

  subirEvidenciaContrato: async (
    idContrato: number,
    archivo: File
  ): Promise<CrmContractEvidence> => {

    const maxBytes = 10 * 1024 * 1024;

    if (!Number.isSafeInteger(idContrato) || idContrato <= 0) {
      throw new Error('El contrato seleccionado no es válido.');
    }

    if (
      archivo.type !== 'application/pdf' ||
      !/\.pdf$/i.test(archivo.name)
    ) {
      throw new Error('Solo se permiten documentos PDF.');
    }

    if (archivo.size <= 0 || archivo.size > maxBytes) {
      throw new Error('El PDF debe tener un tamaño máximo de 10 MB.');
    }

    const cabecera = await archivo.slice(0, 5).text();

    if (cabecera !== '%PDF-') {
      throw new Error('El archivo no tiene una cabecera PDF válida.');
    }

    const carga = await coreApi.post<CrmContractUpload>(
      `/crm/contratos/${idContrato}/evidencias/preparar-carga`
    );

    if (
      carga.bucket !== 'contratos-firmados-private' ||
      carga.tipoMime !== 'application/pdf' ||
      carga.maxBytes !== maxBytes ||
      !carga.claveArchivo.startsWith(`contratos/${idContrato}/`)
    ) {
      throw new Error('La configuración de carga no es válida.');
    }

    const token = new URL(carga.urlCarga).searchParams.get('token');

    if (!token) {
      throw new Error('No se recibió un token válido de carga.');
    }

    const { error } = await supabase.storage
      .from(carga.bucket)
      .uploadToSignedUrl(
        carga.claveArchivo,
        token,
        archivo,
        {
          contentType: 'application/pdf',
          upsert: false
        }
      );

    if (error) {
      throw new Error(
        `No se pudo subir el documento: ${error.message}`
      );
    }

    return coreApi.post<CrmContractEvidence>(
      `/crm/contratos/${idContrato}/evidencias`,
      {
        claveArchivo: carga.claveArchivo,
        nombreOriginal: archivo.name
      }
    );
  },

  retrocesos: {
    solicitarRetroceso: (idProspecto: number, body: {
      estadoDestinoCodigo: string;
      motivoCodigo: string;
      motivoDetallado: string;
    }) => coreApi.post<{ id_solicitud: number; estado: string }>(
      `/crm/prospectos/${idProspecto}/retrocesos`,
      body as Record<string, unknown>
    ),
    adjuntarEvidencia: (idSolicitud: number, archivo: File) => {
      const formData = new FormData();
      formData.append('archivo', archivo);
      return coreApi.post<{ ok: boolean; path?: string }>(
        `/crm/retrocesos/${idSolicitud}/evidencia`,
        formData
      );
    },
    obtenerUrlEvidencia: (idSolicitud: number) =>
      coreApi.get<{ url: string; segundos: number }>(
        `/crm/retrocesos/${idSolicitud}/evidencia/url-firmada`
      ),
    miRetrocesoPendiente: (idProspecto: number) =>
      coreApi.get<CrmSolicitudRetroceso | null>(
        `/crm/prospectos/${idProspecto}/retrocesos/pendiente`
      ),
    listarSolicitudes: (params: {
      desde: string;
      hastaExclusivo: string;
      estado?: string;
      busqueda?: string;
      pagina?: number;
      tamano?: number;
      asesor?: number;
    }) => coreApi.get<CrmPage<CrmSolicitudRetroceso>>(
      `/crm/retrocesos${qs(params)}`
    ),
    indicadores: (desde: string, hastaExclusivo: string, asesor?: number) =>
      coreApi.get<CrmIndicadoresRetroceso>(
        `/crm/retrocesos/indicadores${qs({ desde, hastaExclusivo, asesor })}`
      ),
    motivos: () => coreApi.get<CrmRetrocesoMotivo[]>('/crm/retrocesos/motivos'),
    resolverDecision: (idSolicitud: number, body: { aprobar: boolean; observacion?: string }) =>
      coreApi.put<Record<string, unknown>>(
        `/crm/retrocesos/${idSolicitud}/decision`,
        body as Record<string, unknown>
      ),
  },
};
