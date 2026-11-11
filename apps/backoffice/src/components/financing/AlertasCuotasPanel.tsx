import {useEffect,useState} from 'react';
import {AlertCircle,CalendarClock,CheckCircle2,RefreshCw,ShieldCheck} from 'lucide-react';
import {toast} from 'sonner';
import {useAuth} from '../../contexts/AuthContext';
import {
  crmBackend,
  type CrmAlertasCuotas,
  type CrmTipoAlertaCuota
} from '../../services/crmBackend';
import {currency} from '../../utils/format';

const fecha=(v:string)=>{
  const date=new Date(v.slice(0,10)+'T12:00:00Z');
  if(Number.isNaN(date.getTime()))return v;
  return new Intl.DateTimeFormat('es-PE',{
    timeZone:'UTC',day:'2-digit',month:'2-digit',year:'numeric'
  }).format(date);
};

/** Alertas autorizadas y financieras reales. No usa fixtures de Financing.tsx. */
export function AlertasCuotasPanel({revision=0}:{revision?:number}) {
  const {can}=useAuth();
  const tieneAcceso=can('sales.view');
  const puedePreparar=can('financing.approve');
  const [tipo,setTipo]=useState<CrmTipoAlertaCuota>('TODAS');
  const [pagina,setPagina]=useState(1);
  const [localRevision,setLocalRevision]=useState(0);
  const [datos,setDatos]=useState<CrmAlertasCuotas|null>(null);
  const [cargando,setCargando]=useState(true);
  const [preparando,setPreparando]=useState(false);
  const [error,setError]=useState<string|null>(null);

  useEffect(()=>{
    if(!tieneAcceso){setCargando(false);return;}
    let activo=true;
    setCargando(true);setError(null);
    void crmBackend.listarAlertasCuotas({tipo,pagina,tamano:20})
      .then(v=>{if(activo)setDatos(v);})
      .catch((e:unknown)=>{
        if(activo){setDatos(null);setError(
          e instanceof Error?e.message:'No se pudo consultar la cartera financiera.'
        );}
      })
      .finally(()=>{if(activo)setCargando(false);});
    return ()=>{activo=false};
  },[tieneAcceso,tipo,pagina,revision,localRevision]);

  const cambiarTipo=(nuevo:CrmTipoAlertaCuota)=>{
    setTipo(nuevo);setPagina(1);
  };
  const prepararAvisos=async()=>{
    if(preparando||!puedePreparar)return;
    setPreparando(true);
    try{
      const r=await crmBackend.prepararAvisosPortal(100);
      toast.success('Avisos internos preparados',{
        description:`${r.creados} nuevos · ${r.deduplicados} ya existentes · ${r.desactivados} desactivados. Sin correos enviados.`
      });
      setLocalRevision(x=>x+1);
    }catch(e:unknown){
      toast.error('No se pudieron preparar los avisos',{
        description:e instanceof Error?e.message:'Operación no autorizada.'
      });
    }finally{setPreparando(false);}
  };

  if(!tieneAcceso)return <section className="mb-5 rounded-xl border border-brand-100 bg-white p-4">
    <p className="text-xs text-brand-600">Las alertas financieras requieren el permiso de consulta de ventas.</p>
  </section>;

  return <section className="mb-5 rounded-xl border border-brand-100 bg-white p-4 shadow-sm sm:p-5"
    aria-label="Alertas reales de cuotas">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div>
        <h2 className="flex items-center gap-2 text-base font-bold text-brand-900">
          <CalendarClock className="h-5 w-5 text-blue-700"/>Alertas reales de cuotas
        </h2>
        <p className="mt-1 text-xs text-brand-600">
          Saldos de pagos confirmados · Vencimientos en horario de Perú ·
          Solo ventas autorizadas de tu cartera
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" onClick={()=>setLocalRevision(x=>x+1)}
          disabled={cargando}
          className="inline-flex items-center gap-1.5 rounded-lg border border-brand-200 px-3 py-2 text-xs font-semibold text-brand-700 hover:bg-brand-50 disabled:opacity-50">
          <RefreshCw className="h-3.5 w-3.5"/>Actualizar alertas
        </button>
        {puedePreparar&&<button type="button" onClick={()=>void prepararAvisos()}
          disabled={preparando}
          title="Prepara notificaciones internas del portal; no envía correos ni mensajes"
          className="inline-flex items-center gap-1.5 rounded-lg bg-brand-900 px-3 py-2 text-xs font-semibold text-white hover:bg-brand-800 disabled:opacity-50">
          <ShieldCheck className="h-3.5 w-3.5"/>
          {preparando?'Preparando…':'Preparar avisos PORTAL'}
        </button>}
      </div>
    </div>

    {cargando&&!datos?<p className="mt-4 text-xs text-brand-500">
      Consultando cuotas y pagos confirmados…
    </p>:null}
    {error?<div role="alert" className="mt-4 rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800">
      {error}
    </div>:null}
    {datos&&!error&&<>
      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <div className="rounded-lg bg-amber-50 p-3">
          <span className="block text-xs text-amber-800">Próximas a vencer (7 días)</span>
          <strong className="mt-1 block text-lg tabular-nums text-amber-950">{datos.proximas}</strong>
          <span className="text-xs tabular-nums text-amber-800">{currency(datos.montoProximo)}</span>
        </div>
        <div className="rounded-lg bg-rose-50 p-3">
          <span className="block text-xs text-rose-800">Vencidas y parcialmente atrasadas</span>
          <strong className="mt-1 block text-lg tabular-nums text-rose-950">{datos.vencidas}</strong>
          <span className="text-xs tabular-nums text-rose-800">{currency(datos.montoVencido)}</span>
        </div>
        <div className="rounded-lg bg-slate-50 p-3">
          <span className="block text-xs text-brand-600">Fecha de corte · Lima</span>
          <strong className="mt-1 block text-base text-brand-900">{fecha(datos.fechaCorte)}</strong>
          <span className="text-xs text-brand-500">Actualización bajo demanda, sin alertas ficticias</span>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2" aria-label="Filtrar alertas">
        {([
          ['TODAS','Todas'],
          ['CUOTA_VENCIDA','Vencidas'],
          ['CUOTA_PROXIMA','Próximas']
        ] as const).map(([valor,label])=><button key={valor} type="button"
          onClick={()=>cambiarTipo(valor)}
          className={`rounded-lg border px-3 py-1.5 text-xs font-semibold ${
            valor===tipo?'border-brand-900 bg-brand-900 text-white':
            'border-brand-200 text-brand-700 hover:bg-brand-50'
          }`}>{label}</button>)}
      </div>

      {datos.items.length===0?<div className="mt-3 flex items-center gap-2 rounded-lg bg-green-50 p-4 text-xs text-green-800">
        <CheckCircle2 className="h-4 w-4 shrink-0"/>
        No hay cuotas con alerta activa para este filtro y cartera.
      </div>:<div className="mt-3 max-w-full overflow-auto rounded-lg border border-brand-100">
        <table className="w-full min-w-[760px] text-left text-xs">
          <thead className="bg-slate-100 text-brand-700">
            <tr>{['Contrato / comprador','Cuota','Vencimiento','Situación','Abonado','Saldo pendiente'].map(h=>
              <th key={h} className="whitespace-nowrap px-3 py-2.5 font-bold">{h}</th>)}</tr>
          </thead>
          <tbody className="divide-y divide-brand-100">
            {datos.items.map(a=><tr key={a.idCuota}>
              <td className="px-3 py-2.5">
                <span className="block font-semibold text-brand-900">{a.codigoVenta}</span>
                <span className="text-brand-500">{a.comprador||'Titular no identificado'}</span>
              </td>
              <td className="px-3 py-2.5">N.º {a.numeroCuota}</td>
              <td className="whitespace-nowrap px-3 py-2.5">{fecha(a.fechaVencimiento)}</td>
              <td className="px-3 py-2.5">
                {a.tipoAlerta==='CUOTA_VENCIDA'
                  ?<span className="inline-flex items-center gap-1 font-semibold text-rose-700">
                    <AlertCircle className="h-3.5 w-3.5"/>
                    {a.estadoCuota==='PARCIAL'?'Parcial atrasada':'Vencida'} · {a.diasMora} días
                  </span>
                  :<span className="font-semibold text-amber-800">
                    {a.estadoCuota==='PARCIAL'?'Parcial · ':''}
                    Vence {a.diasParaVencer===0?'hoy':`en ${a.diasParaVencer} días`}
                  </span>}
              </td>
              <td className="whitespace-nowrap px-3 py-2.5 tabular-nums">{currency(a.abonadoConfirmado)}</td>
              <td className="whitespace-nowrap px-3 py-2.5 font-semibold tabular-nums text-brand-900">
                {currency(a.saldoCuota)}
              </td>
            </tr>)}
          </tbody>
        </table>
      </div>}

      {datos.paginas>1&&<div className="mt-3 flex items-center justify-end gap-3 text-xs text-brand-700">
        <button type="button" disabled={pagina<=1||cargando}
          onClick={()=>setPagina(x=>Math.max(1,x-1))}
          className="rounded-lg border border-brand-200 px-3 py-1.5 disabled:opacity-40">
          Anterior
        </button>
        <span>Página {pagina} de {datos.paginas} · {datos.total} alertas</span>
        <button type="button" disabled={pagina>=datos.paginas||cargando}
          onClick={()=>setPagina(x=>x+1)}
          className="rounded-lg border border-brand-200 px-3 py-1.5 disabled:opacity-40">
          Siguiente
        </button>
      </div>}

      <p className="mt-3 text-[11px] text-brand-500">
        No se incluyen cuotas pagadas o anuladas, planes cerrados ni proyecciones
        sin firma. Los avisos PORTAL respetan las preferencias registradas y no
        generan correos ni SMS. La cláusula resolutoria se evalúa aparte.
      </p>
    </>}
  </section>;
}
