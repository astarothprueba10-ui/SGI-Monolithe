import { useEffect, useState } from 'react';
import { AlertTriangle, RefreshCw, Wallet } from 'lucide-react';
import { crmBackend, type CrmSaldoCliente, type CrmSaldoVenta } from '../../services/crmBackend';
import { currency } from '../../utils/format';

const mensajes: Record<string,string> = {
  'DIFERENCIA_CRONOGRAMA_HISTORICO':
    'Existe una diferencia entre el total contractual y la suma de cuotas históricas. No se corrige automáticamente.',
  'INICIAL_SIN_APLICACIONES_CONFIRMADAS_COMPLETAS':
    'La inicial no tiene todas sus aplicaciones confirmadas registradas. Debe conciliarse; no se considera automáticamente deuda exigible.',
  'PAGO_CONFIRMADO_SIN_IMPUTAR':
    'Existen pagos confirmados aún sin imputación. No se han descontado del saldo.',
  'CUOTAS_INCOMPLETAS': 'El número de cuotas registradas no coincide con el plazo pactado.',
  'CUOTAS_ANTES_DE_FIRMA': 'Hay cuotas registradas en un plan pendiente de firma.'
};

export function SaldoFinancieroVentaPanel({ idVenta }: { idVenta: number }) {
  const [saldo,setSaldo]=useState<CrmSaldoVenta|null>(null);
  const [cliente,setCliente]=useState<CrmSaldoCliente|null>(null);
  const [cargando,setCargando]=useState(true);
  const [error,setError]=useState<string|null>(null);
  const [revision,setRevision]=useState(0);

  useEffect(()=>{
    let activo=true;
    setSaldo(null);setCliente(null);setError(null);setCargando(true);
    void crmBackend.obtenerSaldoVenta(idVenta)
      .then(async data=>{
        if(!activo)return;
        setSaldo(data);
        if(data.idCliente && data.tipoSaldo==='FINANCIADA') {
          // La venta puede ser visible aunque otras ventas del mismo cliente
          // no pertenezcan a la cartera del asesor; el servidor las filtra.
          try {
            const consolidado=await crmBackend.obtenerSaldoCliente(data.idCliente);
            if(activo)setCliente(consolidado);
          } catch {
            // Conservar el saldo autorizado de la venta aunque el agregado
            // del cliente no pueda consultarse.
          }
        }
      })
      .catch((e:unknown)=>{
        if(activo)setError(e instanceof Error?e.message:'No fue posible consultar los saldos.');
      })
      .finally(()=>{if(activo)setCargando(false)});
    return ()=>{activo=false};
  },[idVenta,revision]);

  if(cargando)return (
    <p className="mt-4 flex items-center gap-2 text-xs text-brand-500">
      <RefreshCw className="h-4 w-4 animate-spin"/>Conciliando pagos confirmados…
    </p>
  );
  if(error)return (
    <div role="alert" className="mt-4 rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800">
      {error}
      <button type="button" className="ml-2 underline" onClick={()=>setRevision(n=>n+1)}>Reintentar</button>
    </div>
  );
  if(!saldo||saldo.tipoSaldo!=='FINANCIADA')return null;

  const alertas=saldo.alertasConciliacion??[];
  const cuotas=saldo.cuotas??[];
  const saldoFinanciamiento=saldo.saldoFinanciamiento??0;
  const proyeccion=saldo.estadoPlan==='PENDIENTE';

  return <section className="mt-4 rounded-xl border border-brand-200 bg-white p-4" aria-label="Saldos financieros verificados">
    <div className="flex flex-wrap items-center justify-between gap-2">
      <h4 className="flex items-center gap-2 text-sm font-bold text-brand-900">
        <Wallet className="h-4 w-4"/>Saldo del financiamiento
      </h4>
      <button type="button" onClick={()=>setRevision(n=>n+1)}
        className="inline-flex items-center gap-1 text-xs font-semibold text-brand-600 hover:underline">
        <RefreshCw className="h-3.5 w-3.5"/>Actualizar
      </button>
    </div>
    <p className="mt-2 text-xs text-brand-600">
      {proyeccion
        ? 'Plan pendiente de firma: importe futuro proyectado, no cuotas exigibles.'
        : 'Saldo contractual calculado a partir de aplicaciones de pagos confirmados.'}
    </p>
    <dl className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      <div className="rounded-lg bg-brand-50 p-3">
        <dt className="text-[11px] text-brand-600">Total contractual en cuotas</dt>
        <dd className="mt-1 text-lg font-bold tabular-nums">{currency(saldo.totalPlanCuotas??0)}</dd>
      </div>
      <div className="rounded-lg bg-brand-50 p-3">
        <dt className="text-[11px] text-brand-600">Abonos confirmados a cuotas</dt>
        <dd className="mt-1 text-lg font-bold tabular-nums">{currency(saldo.abonadoCuotasConfirmado??0)}</dd>
      </div>
      <div className="rounded-lg bg-sky-50 p-3">
        <dt className="text-[11px] text-sky-800">
          {proyeccion?'Financiamiento proyectado':'Saldo de financiamiento'}
        </dt>
        <dd className="mt-1 text-xl font-extrabold tabular-nums text-sky-950">
          {currency(saldoFinanciamiento)}
        </dd>
      </div>
      <div className="rounded-lg bg-slate-50 p-3">
        <dt className="text-[11px] text-brand-600">Inicial adicional pactada</dt>
        <dd className="mt-1 font-semibold tabular-nums">{currency(saldo.inicialAdicionalPactada??0)}</dd>
      </div>
      <div className="rounded-lg bg-slate-50 p-3">
        <dt className="text-[11px] text-brand-600">Inicial adicional confirmada</dt>
        <dd className="mt-1 font-semibold tabular-nums">{currency(saldo.inicialAbonadaConfirmada??0)}</dd>
      </div>
      <div className="rounded-lg bg-slate-50 p-3">
        <dt className="text-[11px] text-brand-600">Inicial sin aplicación conciliada</dt>
        <dd className="mt-1 font-semibold tabular-nums">{currency(saldo.inicialSinAplicacionConfirmada??0)}</dd>
      </div>
    </dl>
    <p className="mt-2 text-[11px] leading-relaxed text-brand-600">
      Reserva acreditada al plan: {currency(saldo.reservaAplicada??0)}.
      La inicial pendiente de conciliación no se agrega automáticamente
      a la deuda exigible. Un voucher subido o pago registrado sin confirmación no reduce el saldo.
    </p>
    {(saldo.pagosConfirmadosSinAplicar??0)>0&&
      <p className="mt-2 text-xs font-medium text-amber-800">
        Pagos confirmados sin imputar: {currency(saldo.pagosConfirmadosSinAplicar??0)}.
      </p>}
    {alertas.length>0&&<div className="mt-3 space-y-1 rounded-lg border border-amber-200 bg-amber-50 p-3">
      <p className="flex items-center gap-1 text-xs font-bold text-amber-900">
        <AlertTriangle className="h-4 w-4"/>Revisión contable requerida
      </p>
      {alertas.map(code=>
        <p key={code} className="text-xs text-amber-800">{mensajes[code]??code}</p>)}
    </div>}
    {cliente&&<div className="mt-4 rounded-lg border border-brand-100 p-3">
      <p className="text-xs font-bold text-brand-900">Consolidado del cliente titular (cartera autorizada)</p>
      <p className="mt-1 text-[11px] text-brand-600">
        {cliente.numeroVentas} {cliente.numeroVentas===1?'venta financiada':'ventas financiadas'} visibles para tu perfil
      </p>
      <div className="mt-2 flex flex-wrap gap-x-6 gap-y-2 text-xs">
        <span>Saldo de planes activos: <strong>{currency(cliente.saldoFinanciamientoActivo)}</strong></span>
        <span>Pendiente de firma: <strong>{currency(cliente.saldoFinanciamientoPendienteFirma)}</strong></span>
      </div>
    </div>}
    {cuotas.length>0&&<div className="mt-4 max-h-72 overflow-auto rounded-lg border border-brand-100">
      <table className="w-full min-w-[570px] text-left text-xs">
        <thead className="sticky top-0 bg-slate-100 text-brand-700">
          <tr>{['Cuota','Vencimiento','Importe','Abonado confirmado','Saldo'].map(v=>
            <th key={v} className="whitespace-nowrap px-3 py-2">{v}</th>)}</tr>
        </thead>
        <tbody className="divide-y divide-brand-100">
          {cuotas.map(c=><tr key={c.idCuota}>
            <td className="px-3 py-2 font-semibold">{c.numero}</td>
            <td className="px-3 py-2">{c.fechaVencimiento}</td>
            <td className="px-3 py-2 tabular-nums">{currency(c.montoCuota)}</td>
            <td className="px-3 py-2 tabular-nums">{currency(c.abonadoConfirmado)}</td>
            <td className="px-3 py-2 font-semibold tabular-nums">{currency(c.saldoCuota)}</td>
          </tr>)}
        </tbody>
      </table>
    </div>}
  </section>;
}
