import {useEffect,useState} from 'react';
import {History,ShieldCheck,RefreshCw} from 'lucide-react';
import {crmBackend,type CrmCambioDatoPersonal} from '../../services/crmBackend';

const ETIQUETAS:Record<string,string>={
 nombres:'Nombres',apellidoPaterno:'Apellido paterno',apellidoMaterno:'Apellido materno',
 telefono:'Teléfono',correo:'Correo',direccion:'Dirección',
 tipoDocumento:'Tipo de documento',numeroDocumento:'N.º de documento'
};
function fechaLima(f:string){
 const d=new Date(f);
 return Number.isNaN(d.getTime())?'Sin fecha':new Intl.DateTimeFormat('es-PE',{
   dateStyle:'medium',timeStyle:'short',timeZone:'America/Lima'
 }).format(d);
}
export function CrmHistorialDatosPersonalesPanel({idProspecto,revision=0}:{
  idProspecto:number;revision?:number
}) {
 const [historial,setHistorial]=useState<CrmCambioDatoPersonal[]>([]);
 const [cargando,setCargando]=useState(true);
 const [error,setError]=useState(false);
 useEffect(()=>{
  let activo=true;
  setCargando(true);setError(false);
  void crmBackend.datosPersonales(idProspecto).then(data=>{
    if(activo) setHistorial(data.historial??[]);
  }).catch(()=>{if(activo)setError(true)})
    .finally(()=>{if(activo)setCargando(false)});
  return ()=>{activo=false};
 },[idProspecto,revision]);
 return <section className="rounded-xl border border-brand-100 bg-white p-3 shadow-sm sm:p-4">
   <div className="mb-3 flex items-center justify-between gap-2">
     <h4 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-brand-800">
       <span className="rounded-md bg-violet-50 p-1.5 text-violet-700"><History className="h-4 w-4"/></span>
       Correcciones de datos personales
     </h4>
     <span className="rounded-full bg-brand-50 px-2.5 py-1 text-[11px] font-semibold text-brand-600">
       {historial.length}
     </span>
   </div>
   {cargando?<p className="py-4 text-center text-xs text-brand-500">Cargando auditoría…</p>:
     error?<p className="flex items-center gap-2 text-xs text-red-600">
       <RefreshCw className="h-4 w-4"/>No se pudo consultar el historial.</p>:
     !historial.length?<p className="rounded-lg bg-slate-50 p-3 text-xs text-brand-500">
       No existen correcciones registradas en esta ficha.</p>:
     <div className="space-y-2">
       {historial.map(h=>{
         const diferencias=Object.keys(ETIQUETAS).filter(key=>
           String(h.antes?.[key as keyof typeof h.antes]??'')!==
           String(h.despues?.[key as keyof typeof h.despues]??''));
         return <details key={h.id} className="group rounded-lg border border-brand-100 bg-slate-50/60 px-3 py-2.5">
           <summary className="flex cursor-pointer flex-wrap items-start justify-between gap-2 text-xs text-brand-800">
             <span className="font-semibold">{h.motivo}</span>
             <span className="text-[11px] text-brand-500">{fechaLima(h.fecha)}</span>
           </summary>
           <p className="mt-2 flex items-center gap-1.5 text-[11px] text-brand-600">
             <ShieldCheck className="h-3.5 w-3.5"/>Registrado por {h.actor||'Usuario interno'}
           </p>
           <div className="mt-2 space-y-2">
             {diferencias.map(k=><div key={k} className="grid min-w-0 gap-1 rounded-md bg-white p-2 text-[11px] sm:grid-cols-[120px_1fr]">
               <span className="font-semibold text-brand-700">{ETIQUETAS[k]}</span>
               <div className="min-w-0 break-all text-brand-700">
                 <span className="text-rose-700">{String(h.antes?.[k as keyof typeof h.antes]||'—')}</span>
                 <span className="mx-2 text-brand-400">→</span>
                 <span className="font-semibold text-emerald-700">{String(h.despues?.[k as keyof typeof h.despues]||'—')}</span>
               </div>
             </div>)}
           </div>
         </details>
       })}
     </div>}
 </section>;
}
