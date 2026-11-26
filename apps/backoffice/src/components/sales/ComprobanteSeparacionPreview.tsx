import { useEffect,useState } from 'react';
import { ExternalLinkIcon,FileTextIcon,LoaderCircleIcon } from 'lucide-react';
import { toast } from 'sonner';
import { crmBackend,type CrmAbonosSeparacion } from '../../services/crmBackend';
import { formatSoles } from '../../utils/financeMoney';

export function ComprobanteSeparacionPreview({idReserva,puedeSubsanar=false,vistaGrupo=false}:{idReserva:number;puedeSubsanar?:boolean;vistaGrupo?:boolean}){
  const [datos,setDatos]=useState<CrmAbonosSeparacion|null>(null);
  const [cargando,setCargando]=useState(true);
  const [error,setError]=useState('');
  const [intento,setIntento]=useState(0);
  const [abriendo,setAbriendo]=useState<number|null>(null);
  const [subsanando,setSubsanando]=useState<number|null>(null);
  const [archivo,setArchivo]=useState<File|null>(null);
  const [guardando,setGuardando]=useState(false);
  const subsanar=async()=>{
    if(subsanando===null||!archivo||guardando)return;
    setGuardando(true);
    try{
      await crmBackend.subsanarComprobanteSeparacion(idReserva,subsanando,archivo);
      toast.success('Comprobante reemplazado; pendiente de nueva revisión.');
      setSubsanando(null);setArchivo(null);setIntento(i=>i+1);
    }catch(e:unknown){toast.error('No se pudo subsanar',{description:e instanceof Error?e.message:'Intenta nuevamente.'});}
    finally{setGuardando(false);}
  };
  useEffect(()=>{
    let vigente=true;
    setDatos(null);setError('');setCargando(true);
    void crmBackend.listarComprobantesSeparacion(idReserva)
      .then(r=>{if(vigente)setDatos(r);})
      .catch((e:unknown)=>{if(vigente)setError(e instanceof Error?e.message:'No se pudieron consultar los comprobantes.');})
      .finally(()=>{if(vigente)setCargando(false);});
    return ()=>{vigente=false;};
  },[idReserva,intento]);
  const abrir=async(idVoucher:number)=>{
    if(abriendo!==null)return;
    const ventana=window.open('about:blank','_blank');
    if(!ventana){toast.error('Habilita las ventanas emergentes para ver el comprobante.');return;}
    ventana.opener=null;setAbriendo(idVoucher);
    try{
      const enlace=await crmBackend.obtenerComprobanteSeparacionEspecifico(idReserva,idVoucher);
      ventana.location.replace(enlace.urlDescarga);
    }catch(e:unknown){ventana.close();toast.error('No se pudo abrir el comprobante',{description:e instanceof Error?e.message:'Intenta nuevamente.'});}
    finally{setAbriendo(null);}
  };
  return <section className="border-t border-brand-100 pt-4 space-y-3">
    <h3 className="text-sm font-semibold text-brand-900">Comprobantes de separación</h3>
    {datos?.agrupada&&<p className="text-xs text-brand-500">{vistaGrupo?'Cada comprobante representa un abono de la operación completa. No se duplica por lote.':'Los comprobantes pertenecen a la operación completa. El importe asignado a este lote es parte del mismo abono, no otro ingreso.'}</p>}
    {cargando?<p role="status" className="flex items-center gap-2 text-xs text-brand-500"><LoaderCircleIcon className="h-4 w-4 animate-spin"/>Consultando comprobantes…</p>
      :error?<div className="rounded-md border border-amber-200 p-3 text-xs text-amber-900">{error} <button type="button" className="underline" onClick={()=>setIntento(x=>x+1)}>Reintentar</button></div>
      :!datos?.items.length?<p className="text-xs text-brand-500">No hay comprobantes registrados.</p>
      :datos.items.map(v=><div key={v.idVoucher} className="rounded-lg border border-brand-200 p-3 space-y-2">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0"><p className="break-all text-sm font-semibold"><FileTextIcon className="mr-1 inline h-4 w-4"/>{v.nombreArchivo}</p><p className="text-xs text-brand-500">{v.metodo} · {v.estado}</p></div>
          <div className="text-right"><p className="font-semibold text-sm">{formatSoles(v.montoAbono)}</p>{datos.agrupada&&!vistaGrupo&&<p className="text-xs text-brand-500">Asignado a este lote: {formatSoles(v.montoLote)}</p>}</div>
        </div>
        <button type="button" className="inline-flex items-center gap-1 text-xs font-medium text-brand-800 underline disabled:opacity-50" disabled={abriendo!==null} onClick={()=>void abrir(v.idVoucher)}>{abriendo===v.idVoucher?'Abriendo…':'Ver archivo original'}<ExternalLinkIcon className="h-3 w-3"/></button>
        {puedeSubsanar&&datos.agrupada&&v.estado==='RECHAZADO'&&<div className="border-t border-brand-100 pt-2">
          {subsanando===v.idVoucher?<div className="space-y-2">
            <p className="text-xs text-brand-600">Reemplaza únicamente el comprobante de este abono. Se conserva su importe y referencia, y Finanzas debe aprobarlo nuevamente.</p>
            <input type="file" accept=".pdf,.jpg,.jpeg,.png,.webp" disabled={guardando} onChange={e=>setArchivo(e.target.files?.[0]??null)} className="block w-full text-xs"/>
            <div className="flex flex-wrap justify-end gap-2">
              <button type="button" disabled={guardando} onClick={()=>{setSubsanando(null);setArchivo(null)}} className="rounded border px-3 py-2 text-xs">Cancelar</button>
              <button type="button" disabled={guardando||!archivo} onClick={()=>void subsanar()} className="rounded bg-brand-800 px-3 py-2 text-xs text-white disabled:opacity-50">{guardando?'Enviando…':'Enviar a revisión'}</button>
            </div>
          </div>:<button type="button" disabled={guardando} onClick={()=>{setSubsanando(v.idVoucher);setArchivo(null)}} className="text-xs font-semibold text-brand-800 underline">Subsanar comprobante rechazado</button>}
        </div>}
      </div>)}
  </section>;
}
