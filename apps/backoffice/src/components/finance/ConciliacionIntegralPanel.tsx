import {useEffect,useMemo,useState,type FormEvent} from 'react';
import {AlertTriangle,ClipboardCheck,FileWarning,RefreshCw,Search,ShieldCheck} from 'lucide-react';
import {toast} from 'sonner';
import {useAuth} from '../../contexts/AuthContext';
import {currency} from '../../utils/format';
import {
 crmBackend,type CrmConciliacionIntegral,
 type CrmEstadoConciliacion,type CrmPagoConciliado
} from '../../services/crmBackend';

const etiquetas:Record<string,string>={
 SOBREAPLICACION:'Importe aplicado superior al pago',
 APLICACION_NO_CONFIRMADA:'Aplicación sobre pago no confirmado',
 CONFIRMADO_SIN_VOUCHER_APROBADO:'Pago confirmado sin aprobación documental',
 PENDIENTE_DE_REVISION:'Comprobante pendiente de revisión',
 PAGO_SIN_VOUCHER:'Pago sin voucher activo',
 EVIDENCIA_HISTORICA_NO_VERIFICABLE:'Evidencia histórica sin archivo verificable',
 PAGO_CONFIRMADO_SIN_IMPUTAR:'Pago confirmado pendiente de imputar',
 SIN_ALERTA:'Sin incidencia'
};
const filtros:{value:CrmEstadoConciliacion;label:string}[]=[
 {value:'TODOS',label:'Todos los movimientos'},
 {value:'CON_ALERTA',label:'Con incidencia'},
 {value:'SIN_ALERTA',label:'Sin incidencia'}
];

export function ConciliacionIntegralPanel(){
 const {can}=useAuth();
 const [datos,setDatos]=useState<CrmConciliacionIntegral|null>(null);
 const [estado,setEstado]=useState<CrmEstadoConciliacion>('TODOS');
 const [buscar,setBuscar]=useState('');
 const [consulta,setConsulta]=useState('');
 const [pagina,setPagina]=useState(1);
 const [revision,setRevision]=useState(0);
 const [cargando,setCargando]=useState(true);
 const [guardando,setGuardando]=useState(false);
 const [error,setError]=useState<string|null>(null);
 const [item,setItem]=useState<CrmPagoConciliado|null>(null);
 const [nuevoEstado,setNuevoEstado]=useState<'EN_REVISION'|'REVISADA'>('EN_REVISION');
 const [comentario,setComentario]=useState('');

 useEffect(()=>{
  let vivo=true;setCargando(true);setError(null);
  void crmBackend.conciliacionIntegral({estado,busqueda:consulta,pagina,tamano:20})
   .then(x=>{if(vivo)setDatos(x);})
   .catch((e:unknown)=>{if(vivo){setDatos(null);setError(e instanceof Error?
     e.message:'No se pudo conciliar la cartera financiera.');}})
   .finally(()=>{if(vivo)setCargando(false);});
  return()=>{vivo=false;};
 },[estado,consulta,pagina,revision]);
 const informes=useMemo(()=>datos?.planesConDiferenciasHistoricas??[],[datos]);
 const anotar=(p:CrmPagoConciliado)=>{
  setItem(p);setNuevoEstado(p.estado_revision??'EN_REVISION');
  setComentario(p.comentario_revision??'');setError(null);
 };
 const guardar=async(e:FormEvent<HTMLFormElement>)=>{
  e.preventDefault();
  if(!item||guardando||!can('finance.edit')
    ||comentario.trim().length<10||comentario.trim().length>500)return;
  setGuardando(true);setError(null);
  try{
   await crmBackend.marcarRevisionConciliacion(item.id_pago,{
    codigoIncidencia:item.codigo_incidencia,estado:nuevoEstado,comentario
   });
   toast.success('Seguimiento registrado',{
    description:'El evento quedó auditado. El pago y sus saldos no se modificaron.'
   });
   setItem(null);setComentario('');setRevision(x=>x+1);
  }catch(e:unknown){
   setError(e instanceof Error?e.message:'No se pudo guardar la revisión.');
  }finally{setGuardando(false);}
 };
 return <section className="space-y-4" aria-label="Conciliación integral de Finanzas">
  <div className="rounded-xl border border-brand-100 bg-white p-4 sm:p-5">
   <div className="flex flex-wrap items-start justify-between gap-3">
    <div>
     <h2 className="flex items-center gap-2 font-bold text-brand-900">
      <ClipboardCheck className="h-5 w-5"/>Conciliación de comprobantes, pagos y saldos
     </h2>
     <p className="mt-1 text-xs text-brand-600">
      Comparación real de vouchers, aplicaciones y pagos confirmados.
      Los hallazgos históricos no se corrigen automáticamente.
     </p>
    </div>
    <button type="button" disabled={cargando}
     onClick={()=>setRevision(n=>n+1)}
     className="inline-flex items-center gap-2 rounded-lg border border-brand-200 px-3 py-2 text-xs font-semibold text-brand-700 disabled:opacity-50">
     <RefreshCw className="h-4 w-4"/>Actualizar
    </button>
   </div>

   {datos&&<div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
    {[
      {name:'Pagos confirmados',value:currency(datos.montoConfirmado)},
      {name:'Confirmado no imputado',value:currency(datos.confirmadoSinAplicar)},
      {name:'Alertas en filtro',value:String(datos.alertasFiltradas)},
      {name:'Cargas vencidas sin archivo',value:String(datos.cargasHuerfanasSinArchivoCandidatas)}
    ].map(c=><div key={c.name} className="rounded-lg border border-brand-100 bg-slate-50 p-3">
      <p className="text-[11px] text-brand-600">{c.name}</p>
      <p className="mt-1 font-semibold text-brand-900">{c.value}</p>
    </div>)}
   </div>}
   <p className="mt-3 rounded-lg bg-amber-50 p-3 text-xs text-amber-900">
     <strong>Importante:</strong> un pago CONFIRMADO sin aplicación
     todavía no disminuye la deuda. Una revisión marcada REVISADA
     acredita seguimiento, no significa que la inconsistencia fue resuelta.
     No se eliminan archivos ni pagos automáticamente.
   </p>
   <div className="mt-4 flex flex-wrap items-end gap-3">
    <label className="text-xs text-brand-700">
     Mostrar
     <select value={estado} onChange={e=>{
       setEstado(e.target.value as CrmEstadoConciliacion);setPagina(1);
     }} className="mt-1 block rounded-lg border border-brand-200 bg-white px-3 py-2">
      {filtros.map(f=><option key={f.value} value={f.value}>{f.label}</option>)}
     </select>
    </label>
    <form className="flex flex-1 gap-2" onSubmit={e=>{
      e.preventDefault();setPagina(1);setConsulta(buscar.trim());
    }}>
     <label className="min-w-[175px] flex-1 text-xs text-brand-700">
      Código de pago, voucher o ID
      <input type="search" maxLength={120} value={buscar}
       onChange={e=>setBuscar(e.target.value)}
       className="mt-1 block w-full rounded-lg border border-brand-200 px-3 py-2"
       placeholder="PAG-…"/>
     </label>
     <button type="submit" title="Buscar" className="mt-5 rounded-lg bg-brand-900 px-3 text-white">
      <Search className="h-4 w-4"/>
     </button>
    </form>
   </div>
   {cargando&&<p className="mt-4 text-xs text-brand-600">Conciliando movimientos…</p>}
   {error&&<p role="alert" className="mt-4 rounded-lg bg-rose-50 p-3 text-xs text-rose-800">{error}</p>}
   {!cargando&&!error&&datos?.items.length===0&&
    <p className="mt-4 rounded-lg border border-brand-100 p-3 text-xs text-brand-600">
     No hay movimientos para esos filtros.
    </p>}
   {!cargando&&!error&&Boolean(datos?.items.length)&&
    <div className="mt-4 overflow-auto rounded-lg border border-brand-100">
     <table className="w-full min-w-[980px] text-left text-xs">
      <thead className="bg-slate-100 text-brand-700"><tr>
       {['Pago','Concepto','Voucher / evidencia','Importe','Aplicado','Pendiente','Incidencia / seguimiento','Acción']
       .map(t=><th key={t} className="px-3 py-2 font-semibold">{t}</th>)}
      </tr></thead>
      <tbody>{datos?.items.map(p=><tr key={p.id_pago} className="border-t border-brand-100">
       <td className="px-3 py-2 font-semibold">{p.codigo_pago}
        <span className="block font-normal text-brand-600">{p.estado_pago}</span>
       </td>
       <td className="px-3 py-2">{p.concepto}
        {p.id_venta&&<span className="block text-brand-600">Venta #{p.id_venta}</span>}
       </td>
       <td className="px-3 py-2">
        {p.codigo_voucher??'Sin voucher'}
        <span className="block text-brand-600">
         {p.estado_voucher??'No registrado'}
        </span>
        <span className={p.archivo_disponible?'text-emerald-700':'text-amber-800'}>
         {p.archivo_disponible?'Archivo verificable':'Evidencia no verificable'}
        </span>
       </td>
       <td className="px-3 py-2 tabular-nums">{currency(p.monto)}</td>
       <td className="px-3 py-2 tabular-nums">{currency(p.aplicado)}</td>
       <td className="px-3 py-2 tabular-nums">{currency(p.saldo_no_aplicado)}</td>
       <td className="px-3 py-2">
        <span className={p.tiene_alerta?'font-semibold text-amber-800':'text-emerald-700'}>
         {p.tiene_alerta?<FileWarning className="mr-1 inline h-3.5 w-3.5"/>:
          <ShieldCheck className="mr-1 inline h-3.5 w-3.5"/>}
         {etiquetas[p.codigo_incidencia]??p.codigo_incidencia}
        </span>
        {p.estado_revision&&<span className="mt-1 block text-brand-600">
         Seguimiento: {p.estado_revision.replace('_',' ').toLowerCase()}
        </span>}
       </td>
       <td className="px-3 py-2">{p.tiene_alerta&&can('finance.edit')&&
        <button type="button" disabled={guardando}
         onClick={()=>anotar(p)}
         className="rounded-lg border border-brand-200 px-3 py-1.5 font-semibold text-brand-700 disabled:opacity-40">
         Registrar seguimiento
        </button>}
       </td>
      </tr>)}</tbody>
     </table>
    </div>}
   {datos&&datos.paginas>1&&<div className="mt-3 flex justify-end gap-3 text-xs text-brand-700">
    <button type="button" disabled={pagina<=1||cargando} onClick={()=>setPagina(x=>Math.max(1,x-1))}
     className="rounded border border-brand-200 px-3 py-1 disabled:opacity-40">Anterior</button>
    Página {pagina} de {datos.paginas}
    <button type="button" disabled={pagina>=datos.paginas||cargando} onClick={()=>setPagina(x=>x+1)}
     className="rounded border border-brand-200 px-3 py-1 disabled:opacity-40">Siguiente</button>
   </div>}
   {item&&can('finance.edit')&&<form className="mt-4 space-y-3 rounded-lg border border-amber-200 bg-amber-50 p-4"
     onSubmit={e=>void guardar(e)}>
     <h3 className="font-semibold text-brand-900">Seguimiento: {item.codigo_pago}</h3>
     <p className="text-xs text-brand-700">
      {etiquetas[item.codigo_incidencia]}.
      Las notas quedan auditadas pero no alteran el estado del pago.
     </p>
     <label className="block text-xs text-brand-700">Estado de seguimiento
      <select value={nuevoEstado} onChange={e=>setNuevoEstado(e.target.value as 'EN_REVISION'|'REVISADA')}
       className="mt-1 block rounded-lg border border-brand-200 bg-white px-3 py-2">
       <option value="EN_REVISION">En revisión</option>
       <option value="REVISADA">Revisada (sin resolución automática)</option>
      </select>
     </label>
     <label className="block text-xs text-brand-700">
      Observaciones de Finanzas (10–500 caracteres)
      <textarea required minLength={10} maxLength={500} rows={3} value={comentario}
       onChange={e=>setComentario(e.target.value)}
       className="mt-1 block w-full rounded-lg border border-brand-200 p-2"/>
     </label>
     <div className="flex flex-wrap gap-2">
      <button type="submit" disabled={guardando||comentario.trim().length<10}
       className="rounded-lg bg-brand-900 px-4 py-2 text-xs font-semibold text-white disabled:opacity-40">
       {guardando?'Guardando…':'Registrar seguimiento'}
      </button>
      <button type="button" onClick={()=>setItem(null)} disabled={guardando}
       className="rounded-lg border border-brand-200 px-4 py-2 text-xs">Cancelar</button>
     </div>
    </form>}
  </div>

  <div className="rounded-xl border border-brand-100 bg-white p-4 sm:p-5">
   <h3 className="flex items-center gap-2 font-semibold text-brand-900">
    <AlertTriangle className="h-5 w-5"/>Diferencias históricas en cronogramas
   </h3>
   <p className="mt-1 text-xs text-brand-600">
    Solo lectura. No se recalculan intereses, cuotas firmadas ni condiciones de contrato.
   </p>
   {informes.length===0?
    <p className="mt-3 text-xs text-brand-600">Sin diferencias detectadas.</p>:
    <div className="mt-3 overflow-auto">
     <table className="w-full min-w-[600px] text-left text-xs">
      <thead><tr className="text-brand-600">
       {['Venta','Plan','Cuotas','Total contractual','Total de cuotas','Diferencia'].map(x=>
        <th key={x} className="px-3 py-2">{x}</th>)}
      </tr></thead>
      <tbody>{informes.map(x=><tr key={x.idPlanPago} className="border-t border-brand-100">
       <td className="px-3 py-2">#{x.idVenta}</td>
       <td className="px-3 py-2">#{x.idPlanPago}</td>
       <td className="px-3 py-2">{x.numeroCuotas}/{x.numeroCuotasPactadas}</td>
       <td className="px-3 py-2">{currency(x.totalFinanciado)}</td>
       <td className="px-3 py-2">{currency(x.importeCuotas)}</td>
       <td className="px-3 py-2 font-semibold text-amber-800">{currency(x.diferencia)}</td>
      </tr>)}</tbody>
     </table>
    </div>}
   <p className="mt-3 text-[11px] text-brand-500">
    La cifra de cargas sin archivo es solo una lista de posibles candidatos
    a limpieza; ningún archivo de Storage se elimina desde este módulo.
   </p>
  </div>
 </section>;
}
