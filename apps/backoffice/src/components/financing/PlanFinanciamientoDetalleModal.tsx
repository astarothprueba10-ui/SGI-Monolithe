import { useEffect, useMemo, useState } from 'react';
import { CalendarDaysIcon, FileDownIcon, FileTextIcon, MapPinIcon, RefreshCwIcon, WalletIcon } from 'lucide-react';
import { Modal } from '../ui/Modal';
import {toast} from 'sonner';
import { Button } from '../ui/Button';
import { Table, TH, TD, TR } from '../ui/Table';
import { crmBackend, type CrmCronogramaVenta, type CrmPlanCarteraReal, type CrmSaldoVenta, type CrmCuotaCronograma } from '../../services/crmBackend';
import { formatSoles } from '../../utils/financeMoney';

const soles = formatSoles;
const fecha = (v?: string | null) => v
  ? new Intl.DateTimeFormat('es-PE', { timeZone: 'UTC', day: '2-digit', month: '2-digit', year: 'numeric' })
      .format(new Date(`${v.slice(0, 10)}T12:00:00Z`))
  : '—';

function estadoCuota(c: CrmCuotaCronograma) {
  const calculado = c.estadoCalculado ?? c.estado;
  if (calculado === 'ANULADA') return { label: 'Anulada', clase: 'border-slate-200 bg-slate-50 text-slate-600' };
  if (calculado === 'PAGADA') return { label: 'Pagada', clase: 'border-emerald-200 bg-emerald-50 text-emerald-700' };
  if (c.cuotaAtrasada || calculado === 'VENCIDA') {
    return { label: calculado === 'PARCIAL' ? 'Parcial atrasada' : 'Vencida', clase: 'border-rose-200 bg-rose-50 text-rose-700' };
  }
  if (calculado === 'PARCIAL') return { label: 'Parcial', clase: 'border-amber-200 bg-amber-50 text-amber-800' };
  if (c.proxima7Dias) return { label: 'Próxima a vencer', clase: 'border-amber-200 bg-amber-50 text-amber-800' };
  return { label: 'Pendiente', clase: 'border-sky-200 bg-sky-50 text-sky-700' };
}

function Dato({ etiqueta, valor, destacado = false, dorado = false }: {
  etiqueta: string; valor: string | number; destacado?: boolean; dorado?: boolean;
}) {
  const color = destacado ? 'text-emerald-700' : dorado ? 'text-amber-800' : 'text-brand-900';
  return <div className="min-w-0 rounded-xl border border-brand-100 bg-white px-3.5 py-3.5 shadow-card transition-colors hover:border-brand-200 sm:p-4">
    <p className="text-[11px] font-medium leading-snug text-brand-500">{etiqueta}</p>
    <p className={['mt-1.5 break-words text-base font-bold leading-snug tabular-nums sm:text-[17px]', color].join(' ')}>{valor}</p>
  </div>;
}

/** Expediente individual: un JWT, una operación, saldos y cuotas con las funciones oficiales. */
export function PlanFinanciamientoDetalleModal({ plan, onClose }: {
  plan: CrmPlanCarteraReal; onClose: () => void;
}) {
  const [cronograma, setCronograma] = useState<CrmCronogramaVenta | null>(null);
  const [saldo, setSaldo] = useState<CrmSaldoVenta | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [revision, setRevision] = useState(0);
  const [soloConSaldo, setSoloConSaldo] = useState(true);
  const [exportandoPdf,setExportandoPdf] = useState(false);

  useEffect(() => {
    let vigente = true;
    setCargando(true);
    setError(null);
    setCronograma(null);
    setSaldo(null);
    void Promise.all([
      crmBackend.obtenerCronogramaVenta(plan.idVenta),
      crmBackend.obtenerSaldoVenta(plan.idVenta)
    ]).then(([c, s]) => {
      if (vigente) { setCronograma(c); setSaldo(s); }
    }).catch(e => {
      if (vigente) setError(e instanceof Error ? e.message : 'No se pudo cargar el cronograma.');
    }).finally(() => { if (vigente) setCargando(false); });
    return () => { vigente = false; };
  }, [plan.idVenta, revision]);

  const exigible = Boolean(plan.cuotasExigibles && saldo?.cuotasExigibles &&
    cronograma?.tipoCronograma === 'REGISTRADO' &&
    cronograma?.fuenteEstados === 'APLICACIONES_CONFIRMADAS');
  const cuotas = useMemo(() => exigible ? cronograma?.items ?? [] : [], [cronograma, exigible]);
  const totalInicial = plan.inicialAdicional + plan.reservaAplicada;
  // La cuota mensual procede exclusivamente del cronograma registrado, nunca de una simulación.
  const montoCuotaMensual = exigible
    ? cronograma?.items.find(item => item.estadoCalculado !== 'ANULADA')?.cuota
    : undefined;
  const separacionAcreditada = plan.reservaAplicada > 0;
  const totalPendiente = cuotas.filter(c => c.estadoCalculado !== 'PAGADA' &&
    c.estadoCalculado !== 'ANULADA' && (c.saldoCuota ?? c.cuota) > 0).length;
  const exportarPdf = async () => {
    if(cargando || error || !cronograma || !saldo || exportandoPdf)return;
    setExportandoPdf(true);
    try{
      const {generarPdfExpediente}=await import('../../utils/financiamientoExportPdf');
      const blob=await generarPdfExpediente({plan,cronograma,saldo});
      const url=URL.createObjectURL(blob);
      const link=document.createElement('a');
      link.href=url;
      link.download=`MONOLITHE_Plan_Financiero_${plan.codigoVenta.replace(/[^a-zA-Z0-9_-]/g,'_')}.pdf`;
      document.body.appendChild(link);link.click();link.remove();
      window.setTimeout(()=>URL.revokeObjectURL(url),1000);
      toast.success('Expediente financiero PDF generado');
    }catch(e:unknown){
      toast.error('No se pudo generar el PDF',{
        description:e instanceof Error?e.message:'Inténtalo nuevamente.'
      });
    }finally{setExportandoPdf(false);}
  };
  const cuotasVisibles = soloConSaldo ? cuotas.filter(c =>
    c.estadoCalculado !== 'PAGADA' && c.estadoCalculado !== 'ANULADA' &&
    (c.saldoCuota ?? c.cuota) > 0
  ) : cuotas;

  return <Modal open title={`Plan financiero · ${plan.codigoVenta}`}
    onClose={onClose} width="max-w-6xl">
    <div className="min-w-0 space-y-5">
      <div className="relative isolate overflow-hidden rounded-2xl bg-gradient-to-r from-brand-950 via-brand-900 to-brand-800 p-4 text-white shadow-md sm:p-6">
        <div aria-hidden="true" className="absolute inset-y-0 left-0 w-1 bg-accent-400" />
        <div aria-hidden="true" className="pointer-events-none absolute -right-14 -top-24 h-60 w-60 rounded-full border border-white/10" />
        <div aria-hidden="true" className="pointer-events-none absolute -right-3 -top-12 h-44 w-44 rounded-full border border-accent-300/20" />
        <div className="relative flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0 flex-1">
            <span className="inline-flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.17em] text-accent-300">
              <span className="h-1.5 w-1.5 rounded-full bg-accent-400" aria-hidden="true" />
              Expediente financiero
            </span>
            <h3 className="mt-2 break-words text-xl font-bold leading-tight sm:text-2xl">
              {plan.comprador}
            </h3>
            <p className="mt-1 text-xs text-brand-200 sm:text-sm">{plan.proyecto}</p>
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <span className="inline-flex max-w-full items-center rounded-lg border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-medium text-white/95">
                Plan {plan.codigoPlan}
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-lg border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-medium text-white/95">
                <MapPinIcon className="h-3.5 w-3.5 shrink-0 text-accent-300" aria-hidden="true" />
                {plan.lote}
              </span>
            </div>
          </div>
          <div className="grid w-full grid-cols-1 gap-3 rounded-xl border border-white/15 bg-white/10 p-4 backdrop-blur-sm sm:grid-cols-2 lg:w-[300px] lg:grid-cols-1">
            <div>
              <p className="text-[11px] font-medium text-brand-200">Estado del financiamiento</p>
              <p className="mt-1.5 inline-flex items-center gap-2 text-sm font-semibold text-accent-300">
                <span className="h-2 w-2 shrink-0 rounded-full bg-accent-400" aria-hidden="true" />
                {exigible ? 'Contrato vigente · cuotas exigibles' : 'Pendiente de formalización'}
              </p>
            </div>
            <div className="border-t border-white/15 pt-3 sm:border-l sm:border-t-0 sm:pl-3 sm:pt-0 lg:border-l-0 lg:border-t lg:pl-0 lg:pt-3">
              <p className="text-[11px] font-medium text-brand-200">Fecha de la venta</p>
              <p className="mt-1 text-sm font-semibold text-white">{fecha(plan.fechaVenta)}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Dato etiqueta="Código de lote" valor={plan.lote} />
        <Dato etiqueta="Precio base de venta" valor={soles(plan.precioVenta)} />
        <Dato etiqueta="Inicial pactada" valor={soles(totalInicial)} />
        <Dato etiqueta="Capital financiado" valor={soles(plan.capitalFinanciado)} />
        <Dato etiqueta="Número de cuotas" valor={plan.numeroCuotas} />
        <Dato etiqueta="Interés total" valor={soles(plan.interesTotal)} dorado />
        <Dato etiqueta="Total contractual en cuotas" valor={soles(saldo?.totalPlanCuotas ?? plan.totalCuotas)} />
        <Dato etiqueta="Saldo actual" valor={exigible ? soles(saldo?.saldoFinanciamiento) : 'No exigible'} destacado={exigible} />
        <Dato etiqueta="Separación acreditada" valor={separacionAcreditada ? 'Sí' : 'No'} destacado={separacionAcreditada} />
        <Dato etiqueta="Monto de cuota mensual" valor={montoCuotaMensual != null ? soles(montoCuotaMensual) : '—'} dorado />
        <Dato etiqueta="Fecha de primera cuota" valor={fecha(cronograma?.fechaPrimeraCuota ?? plan.fechaPrimeraCuota)} />
      </div>

      <section className="min-w-0 overflow-hidden rounded-xl border border-brand-100">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-brand-100 bg-brand-50/50 px-4 py-3">
          <div>
            <h4 className="flex items-center gap-2 text-sm font-semibold text-brand-900">
              <CalendarDaysIcon className="h-4 w-4 text-amber-600" />
              Cronograma detallado de cuotas
            </h4>
            <p className="mt-1 text-xs text-brand-500">
              {exigible ? `${totalPendiente} con saldo pendiente de ${cuotas.length} cuotas` :
                'Las cuotas solo son exigibles tras la formalización del contrato.'}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {exigible&&<div className="inline-flex rounded-lg border border-brand-200 bg-white p-0.5 text-xs">
              <button type="button" onClick={()=>setSoloConSaldo(true)}
                aria-pressed={soloConSaldo}
                className={`rounded-md px-3 py-2 font-semibold ${soloConSaldo?'bg-brand-900 text-white':'text-brand-500 hover:bg-brand-50'}`}>
                Con saldo pendiente
              </button>
              <button type="button" onClick={()=>setSoloConSaldo(false)}
                aria-pressed={!soloConSaldo}
                className={`rounded-md px-3 py-2 font-semibold ${!soloConSaldo?'bg-brand-900 text-white':'text-brand-500 hover:bg-brand-50'}`}>
                Todas
              </button>
            </div>}
            <Button icon={RefreshCwIcon} variant="secondary" disabled={cargando}
              onClick={() => setRevision(x => x + 1)}>Actualizar</Button>
          </div>
        </div>

        {cargando && <p className="px-4 py-6 text-sm text-brand-500">Consultando el plan y sus pagos confirmados…</p>}
        {!cargando && error && <div className="m-4 rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700" role="alert">{error}</div>}
        {!cargando && !error && !exigible && <div className="flex items-start gap-3 p-5 text-sm text-amber-900">
          <FileTextIcon className="h-5 w-5 shrink-0 text-amber-600"/>
          Esta venta aún no tiene cronograma exigible. Se conserva el plan pactado,
          pero no se muestran proyecciones como deuda vencida ni cuotas pendientes de pago.
        </div>}
        {!cargando && !error && exigible && cuotas.length===0 && <p className="p-5 text-sm text-brand-500">
          No hay cuotas registradas para este plan.
        </p>}
        {!cargando && !error && exigible && cuotas.length>0 && <>
          <p className="px-4 pt-3 text-[11px] text-brand-400 sm:hidden">Desliza horizontalmente para consultar todas las columnas.</p>
          <Table className="pb-1" head={<>
            <TH>Cuota</TH><TH>Fecha de vencimiento</TH>
            <TH align="right">Capital</TH><TH align="right">Interés</TH>
            <TH align="right">Importe</TH><TH align="right">Abonado</TH>
            <TH align="right">Saldo</TH><TH>Estado</TH>
          </>}>
            {cuotasVisibles.map(c => {
              const estado = estadoCuota(c);
              return <TR key={c.numero} className="hover:bg-amber-50/40">
                <TD className="font-semibold text-brand-900">{String(c.numero).padStart(2, '0')}</TD>
                <TD>{fecha(c.fechaVencimiento)}</TD>
                <TD align="right">{soles(c.capital)}</TD>
                <TD align="right">{soles(c.interes)}</TD>
                <TD align="right" className="font-semibold text-brand-900">{soles(c.cuota)}</TD>
                <TD align="right">{soles(c.abonadoConfirmado)}</TD>
                <TD align="right" className="font-semibold text-brand-900">{soles(c.saldoCuota ?? c.cuota)}</TD>
                <TD><span className={`inline-flex whitespace-nowrap rounded-full border px-2.5 py-1 text-[11px] font-semibold ${estado.clase}`}>
                  {estado.label}
                </span></TD>
              </TR>;
            })}
          </Table>
          <div className="flex flex-wrap items-center gap-4 border-t border-brand-100 bg-brand-50/60 p-4 text-xs text-brand-600">
            <span className="inline-flex items-center gap-1.5"><WalletIcon className="h-4 w-4 text-emerald-600" />
              Abonado confirmado: <strong>{soles(saldo?.abonadoCuotasConfirmado)}</strong>
            </span>
            <span>Saldo vigente: <strong className="text-brand-900">{soles(saldo?.saldoFinanciamiento)}</strong></span>
            {Boolean(cronograma?.estadosDiferentesRegistro) && <span className="text-amber-700">
              Atención: estados históricos pendientes de conciliación
            </span>}
          </div>
        </>}
      </section>
      <div className="flex flex-wrap items-center justify-end gap-2">
        <Button icon={FileDownIcon} disabled={cargando||Boolean(error)||!cronograma||!saldo||exportandoPdf}
          onClick={()=>void exportarPdf()}>
          {exportandoPdf?'Generando PDF…':'Exportar expediente PDF'}
        </Button>
        <Button variant="secondary" onClick={onClose}>Cerrar expediente</Button>
      </div>
    </div>
  </Modal>;
}
