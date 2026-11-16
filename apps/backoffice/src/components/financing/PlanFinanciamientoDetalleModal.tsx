import { useEffect, useMemo, useState } from 'react';
import { CalendarDaysIcon, FileTextIcon, RefreshCwIcon, WalletIcon } from 'lucide-react';
import { Modal } from '../ui/Modal';
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

function Dato({ etiqueta, valor, destacado = false }: {
  etiqueta: string; valor: string | number; destacado?: boolean;
}) {
  return <div className="min-w-0 rounded-xl border border-brand-100 bg-white p-3 sm:p-4">
    <p className="text-[11px] font-medium text-brand-500">{etiqueta}</p>
    <p className={`mt-1 break-words text-sm font-semibold tabular-nums ${destacado ? 'text-emerald-700' : 'text-brand-900'}`}>{valor}</p>
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
  const totalPendiente = cuotas.filter(c => c.estadoCalculado !== 'PAGADA' &&
    c.estadoCalculado !== 'ANULADA' && (c.saldoCuota ?? c.cuota) > 0).length;
  const cuotasVisibles = soloConSaldo ? cuotas.filter(c =>
    c.estadoCalculado !== 'PAGADA' && c.estadoCalculado !== 'ANULADA' &&
    (c.saldoCuota ?? c.cuota) > 0
  ) : cuotas;

  return <Modal open title={`Plan financiero · ${plan.codigoVenta}`}
    description={`${plan.comprador} · ${plan.lote}`} onClose={onClose} width="max-w-6xl">
    <div className="min-w-0 space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3 rounded-xl bg-brand-900 p-4 text-white">
        <div className="min-w-0">
          <span className="text-[10px] font-semibold uppercase tracking-[0.15em] text-accent-300">
            Expediente financiero
          </span>
          <h3 className="mt-1 break-words text-lg font-bold">{plan.comprador}</h3>
          <p className="mt-1 text-xs text-brand-200">{plan.codigoVenta} · {plan.codigoPlan}</p>
          <p className="mt-1 text-xs text-brand-200">{plan.proyecto} · {plan.lote}</p>
        </div>
        <div className="rounded-lg bg-white/10 px-3 py-2">
          <span className="block text-[11px] text-brand-200">Estado del plan</span>
          <span className="mt-1 block text-sm font-semibold text-accent-300">
            {exigible ? 'Contrato vigente · cuotas exigibles' : 'Pendiente de formalización'}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
        <Dato etiqueta="Código del lote" valor={plan.lote} />
        <Dato etiqueta="Precio base de venta" valor={soles(plan.precioVenta)} />
        <Dato etiqueta="Inicial total pactada" valor={soles(totalInicial)} />
        <Dato etiqueta="Capital financiado" valor={soles(plan.capitalFinanciado)} />
        <Dato etiqueta="Interés total" valor={soles(plan.interesTotal)} />
        <Dato etiqueta="Número de cuotas" valor={plan.numeroCuotas} />
        <Dato etiqueta="Total contractual en cuotas" valor={soles(saldo?.totalPlanCuotas ?? plan.totalCuotas)} />
        <Dato etiqueta="Saldo actual de cuotas" valor={exigible ? soles(saldo?.saldoFinanciamiento) : 'No exigible'} destacado={exigible} />
        <Dato etiqueta="Separación acreditada" valor={soles(plan.reservaAplicada)} />
        <Dato etiqueta="Inicial adicional pactada" valor={soles(plan.inicialAdicional)} />
        <Dato etiqueta="Inicial por conciliar" valor={exigible ? soles(saldo?.inicialSinAplicacionConfirmada) : '—'} />
        <Dato etiqueta="Primera cuota" valor={fecha(cronograma?.fechaPrimeraCuota ?? plan.fechaPrimeraCuota)} />
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
      <div className="flex justify-end">
        <Button variant="secondary" onClick={onClose}>Cerrar expediente</Button>
      </div>
    </div>
  </Modal>;
}
