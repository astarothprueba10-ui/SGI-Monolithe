import {useEffect,useState} from 'react';
import {AlertTriangle,FileSearch,RefreshCw,ShieldCheck} from 'lucide-react';
import {useAuth} from '../../contexts/AuthContext';
import {
  crmBackend,type CrmRevisionesResolutorias
} from '../../services/crmBackend';
import {currency} from '../../utils/format';

const fecha=(valor:string)=>{
  const date=new Date(valor.slice(0,10)+'T12:00:00Z');
  if(Number.isNaN(date.getTime()))return valor;
  return new Intl.DateTimeFormat('es-PE',{
    timeZone:'UTC',day:'2-digit',month:'2-digit',year:'numeric'
  }).format(date);
};

/** Señales de revisión administrativa, nunca declaraciones de resolución. */
export function RevisionClausulaPanel({revision=0}:{revision?:number}){
  const {can}=useAuth();
  const autorizado=can('sales.view') && (
    can('sales.legal.review')||can('sales.annul')||can('financing.approve')
  );
  const [pagina,setPagina]=useState(1);
  const [refresco,setRefresco]=useState(0);
  const [datos,setDatos]=useState<CrmRevisionesResolutorias|null>(null);
  const [cargando,setCargando]=useState(true);
  const [error,setError]=useState<string|null>(null);

  useEffect(()=>{
    if(!autorizado){setCargando(false);return;}
    let vivo=true;
    setCargando(true);setError(null);
    void crmBackend.listarRevisionesResolutorias({pagina,tamano:20})
      .then(resultado=>{if(vivo)setDatos(resultado);})
      .catch((e:unknown)=>{
        if(vivo){
          setDatos(null);
          setError(e instanceof Error?e.message:'No se pudo consultar las revisiones.');
        }
      }).finally(()=>{if(vivo)setCargando(false);});
    return ()=>{vivo=false;};
  },[autorizado,pagina,revision,refresco]);

  // No se revela la existencia de expedientes legales a perfiles sin autorización.
  if(!autorizado)return null;
  return <section className="mb-5 rounded-xl border border-amber-200 bg-white p-4 sm:p-5"
    aria-label="Revisión contractual por cuotas consecutivas">
    <header className="flex flex-wrap items-start justify-between gap-3">
      <div>
        <h2 className="flex items-center gap-2 text-base font-bold text-brand-900">
          <FileSearch className="h-5 w-5 text-amber-800"/>
          Posibles causales de revisión contractual
        </h2>
        <p className="mt-1 text-xs text-brand-600">
          Tres o más cuotas consecutivas vencidas con saldo pendiente.
          Solo contratos firmados vigentes y cartera autorizada.
        </p>
      </div>
      <button type="button"
        className="inline-flex items-center gap-1.5 rounded-lg border border-brand-200 px-3 py-2 text-xs font-semibold text-brand-700 hover:bg-brand-50 disabled:opacity-50"
        onClick={()=>setRefresco(n=>n+1)} disabled={cargando}>
        <RefreshCw className="h-3.5 w-3.5"/>Actualizar revisión
      </button>
    </header>
    {cargando&&!datos?<p className="mt-4 text-xs text-brand-500">
      Comprobando secuencias y aplicaciones de pago confirmadas…
    </p>:null}
    {error?<p role="alert" className="mt-3 rounded-lg bg-rose-50 p-3 text-xs text-rose-800">
      {error}
    </p>:null}
    {datos&&!error&&<>
      <div className="mt-4 flex flex-wrap items-center gap-5 rounded-lg bg-slate-50 p-3">
        <div><span className="block text-[11px] text-brand-600">
          Expedientes para evaluar</span>
          <strong className="text-lg tabular-nums text-brand-900">{datos.total}</strong>
        </div>
        <div><span className="block text-[11px] text-brand-600">
          Saldo de las rachas detectadas</span>
          <strong className="text-lg tabular-nums text-brand-900">
            {currency(datos.montoEnRevision)}
          </strong>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-brand-600">
          <ShieldCheck className="h-4 w-4"/>Corte Lima: {fecha(datos.fechaCorte)}
        </div>
      </div>
      <p className="mt-3 flex items-start gap-1.5 text-xs text-amber-900">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0"/>
        Solo indicios para revisar cláusulas, pagos y requisitos legales.
        Ninguna alerta resuelve ni anula automáticamente un contrato.
      </p>
      {datos.items.length===0?
        <div className="mt-3 rounded-lg border border-brand-100 p-4 text-xs text-brand-600">
          No se identificaron rachas de tres cuotas vencidas consecutivas
          en los expedientes que puedes consultar. Esto no significa que
          no existan otros pagos pendientes.
        </div>
      :<div className="mt-3 space-y-3">
        {datos.items.map(a=><article key={a.idPlanPago}
          className="rounded-lg border border-amber-200 p-3">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="font-semibold text-brand-900">{a.codigoVenta}</p>
              <p className="mt-1 text-xs text-brand-600">
                {a.comprador||'Titular no identificado'} ·
                Cuotas {a.desdeCuota}–{a.hastaCuota}
              </p>
              <p className="mt-1 text-xs text-amber-900">
                {a.cuotasConsecutivas} cuotas consecutivas con saldo vencido ·
                Del {fecha(a.fechaPrimerVencimiento)} al {fecha(a.fechaUltimoVencimiento)}
              </p>
            </div>
            <div className="text-right">
              <span className="block text-[11px] text-brand-600">Saldo de la secuencia</span>
              <strong className="text-base tabular-nums text-rose-800">{currency(a.saldoRacha)}</strong>
            </div>
          </div>
          <details className="mt-3 rounded-lg bg-slate-50 p-2.5">
            <summary className="cursor-pointer text-xs font-semibold text-brand-700">
              Ver cuotas y evidencias contables ({a.cuotas.length})
            </summary>
            <div className="mt-2 overflow-auto">
              <table className="w-full min-w-[550px] text-left text-xs">
                <thead><tr className="text-brand-500">
                  {['Cuota','Vencimiento','Monto','Abono confirmado','Saldo'].map(t=>
                    <th key={t} className="px-2 py-2">{t}</th>)}
                </tr></thead>
                <tbody>{a.cuotas.map(c=><tr key={c.idCuota} className="border-t border-brand-100">
                  <td className="px-2 py-2">{c.numeroCuota}</td>
                  <td className="px-2 py-2">{fecha(c.fechaVencimiento)}</td>
                  <td className="px-2 py-2 tabular-nums">{currency(c.importeCuota)}</td>
                  <td className="px-2 py-2 tabular-nums">{currency(c.abonadoConfirmado)}</td>
                  <td className="px-2 py-2 font-semibold tabular-nums">{currency(c.saldoPendiente)}</td>
                </tr>)}</tbody>
              </table>
            </div>
          </details>
        </article>)}
      </div>}
      {datos.paginas>1&&
        <div className="mt-3 flex items-center justify-end gap-3 text-xs text-brand-700">
          <button type="button" disabled={pagina<=1||cargando}
            onClick={()=>setPagina(p=>Math.max(1,p-1))}
            className="rounded-lg border border-brand-200 px-3 py-1.5 disabled:opacity-50">
            Anterior</button>
          <span>{pagina} de {datos.paginas}</span>
          <button type="button" disabled={pagina>=datos.paginas||cargando}
            onClick={()=>setPagina(p=>p+1)}
            className="rounded-lg border border-brand-200 px-3 py-1.5 disabled:opacity-50">
            Siguiente</button>
        </div>}
    </>}
  </section>;
}
