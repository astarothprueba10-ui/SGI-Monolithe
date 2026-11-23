import {useEffect,useState} from 'react';
import {Building2,FileSignature,Home,UserCheck,RefreshCw,AlertCircle} from 'lucide-react';
import {crmBackend,type CrmBuyer,type CrmDetalleVenta,type CrmOperacionItem} from '../../services/crmBackend';
import {DetalleVentaAmpliadoPanel} from '../sales/DetalleVentaAmpliadoPanel';
import {CronogramaVentaPanel} from '../sales/CronogramaVentaPanel';
import {AnexosContratoPanel} from '../sales/AnexosContratoPanel';
import {currency} from '../../utils/format';

function Campo({etiqueta,valor}:{etiqueta:string;valor:string}) {
 return <div className="min-w-0 border-b border-brand-100 py-2.5">
   <p className="text-[11px] font-medium text-brand-500">{etiqueta}</p>
   <p className="mt-1 break-words text-xs font-semibold text-brand-900">{valor||'No registrado'}</p>
 </div>;
}
export function ExpedienteCompradorPanel({buyer}:{buyer:CrmBuyer}) {
 const [operacion,setOperacion]=useState<CrmOperacionItem|null>(null);
 const [detalle,setDetalle]=useState<CrmDetalleVenta|null>(null);
 const [cargando,setCargando]=useState(true);
 const [error,setError]=useState(false);
 const [revision,setRevision]=useState(0);
 const idVenta=buyer.id_venta??0;
 useEffect(()=>{
   if(idVenta<=0) return;
   let activo=true;
   setCargando(true);setError(false);setOperacion(null);setDetalle(null);
   void Promise.all([
     crmBackend.listarOperaciones({tipo:'VENTA',busqueda:buyer.codigo_venta,pagina:1,tamano:20}),
     crmBackend.obtenerDetalleVenta(idVenta)
   ]).then(([res,datos])=>{
     if(!activo)return;
     setOperacion(res.items.find(x=>x.tipo==='VENTA' && x.id===idVenta)??null);
     setDetalle(datos);
   }).catch(()=>{if(activo){setOperacion(null);setDetalle(null);setError(true)}})
     .finally(()=>{if(activo)setCargando(false)});
   return ()=>{activo=false};
 },[buyer.codigo_venta,idVenta,revision]);
 if(idVenta<=0) return <p className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs text-amber-900">
   El registro no tiene un identificador de venta válido para abrir su expediente.
 </p>;
 return <div className="space-y-5">
   {cargando&&<p className="flex items-center gap-2 rounded-lg bg-brand-50 p-3 text-xs text-brand-600">
     <RefreshCw className="h-4 w-4 animate-spin"/>Consultando contrato y datos comerciales…
   </p>}
   {error&&<div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
     <span className="flex items-center gap-2"><AlertCircle className="h-4 w-4"/>
       No se pudieron cargar todos los datos de esta venta; intenta consultar nuevamente.</span>
     <button type="button" className="font-semibold underline" onClick={()=>setRevision(v=>v+1)}>Reintentar</button>
   </div>}
   <section className="rounded-xl border border-brand-100 bg-white p-4 sm:p-5">
     <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
       <div>
         <h3 className="flex items-center gap-2 text-sm font-bold text-brand-900">
           <Building2 className="h-4 w-4 text-brand-600"/>Resumen comercial
         </h3>
         <p className="mt-1 text-xs text-brand-500">Venta y adjudicación inmobiliaria.</p>
       </div>
       <span className="rounded-full border border-brand-200 bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-700">
         {buyer.estado_contrato?.replaceAll('_',' ')||'Sin estado'}
       </span>
     </div>
     <dl className="grid grid-cols-1 gap-x-6 sm:grid-cols-2">
       <Campo etiqueta="Código cliente" valor={buyer.codigo_cliente}/>
       <Campo etiqueta="Operación de venta" valor={buyer.codigo_venta}/>
       <Campo etiqueta="Proyecto inmobiliario" valor={operacion?.proyecto??'No registrado'}/>
       <Campo etiqueta="Lote adjudicado" valor={buyer.codigo_lote}/>
       <Campo etiqueta="Asesor comercial" valor={operacion?.asesor??'Sin asesor'}/>
       <Campo etiqueta="Modalidad" valor={detalle?.modalidad==='FINANCIADA'?'Financiado':
         detalle?.modalidad==='CONTADO'?'Contado':'No registrada'}/>
       <Campo etiqueta="Importe de venta" valor={currency(buyer.precio_venta)}/>
       <Campo etiqueta="Contrato" valor={buyer.codigo_contrato||'No registrado'}/>
     </dl>
     <p className="mt-3 flex items-center gap-2 text-[11px] text-brand-500">
       <UserCheck className="h-3.5 w-3.5"/>Los datos personales y pagos se muestran desde el expediente seguro de la venta.
     </p>
   </section>
   <DetalleVentaAmpliadoPanel idVenta={idVenta}/>
   {detalle?.modalidad==='FINANCIADA'&&<CronogramaVentaPanel idVenta={idVenta}/>}
   <section className="rounded-xl border border-brand-100 bg-white p-3 sm:p-5">
     <div className="mb-4 flex items-center gap-2 text-sm font-bold text-brand-900">
       <FileSignature className="h-4 w-4 text-brand-700"/>Documentación asociada
     </div>
     {buyer.id_contrato && buyer.codigo_contrato?
       <AnexosContratoPanel idContrato={buyer.id_contrato}
         codigoContrato={buyer.codigo_contrato} soloConsulta/>:
       <p className="flex items-center gap-2 text-xs text-brand-500">
         <Home className="h-4 w-4"/>No hay contrato asociado para consultar documentos.
       </p>}
   </section>
 </div>;
}
