import {useEffect,useMemo,useState,type FormEvent} from 'react';
import {AlertCircle,FilePlus2,Search} from 'lucide-react';
import {toast} from 'sonner';
import {Modal} from '../ui/Modal';
import {currency} from '../../utils/format';
import {
 crmBackend,type CrmOpcionesRegistroInicial
} from '../../services/crmBackend';

const mimes=['application/pdf','image/jpeg','image/png','image/webp'];
const fechaHoy=()=>{
 const p=new Intl.DateTimeFormat('es-PE',{
  timeZone:'America/Lima',year:'numeric',month:'2-digit',day:'2-digit'
 }).formatToParts(new Date());
 const val=(x:string)=>p.find(y=>y.type===x)?.value??'';
 return `${val('year')}-${val('month')}-${val('day')}`;
};
export function NuevoVoucherInicialModal({
 open,onClose,onRegistrado
}:{
 open:boolean;onClose:()=>void;onRegistrado:()=>void;
}){
 const [opciones,setOpciones]=useState<CrmOpcionesRegistroInicial|null>(null);
 const [busqueda,setBusqueda]=useState('');
 const [filtro,setFiltro]=useState('');
 const [planId,setPlanId]=useState('');
 const [monto,setMonto]=useState('');
 const [metodo,setMetodo]=useState('');
 const [fechaOperacion,setFechaOperacion]=useState(fechaHoy);
 const [numeroOperacion,setNumeroOperacion]=useState('');
 const [archivo,setArchivo]=useState<File|null>(null);
 const [idCarga,setIdCarga]=useState<string|null>(null);
 const [loading,setLoading]=useState(false);
 const [guardando,setGuardando]=useState(false);
 const [error,setError]=useState<string|null>(null);
 useEffect(()=>{
  if(!open||idCarga)return;
  let vivo=true;setLoading(true);setError(null);
  void crmBackend.opcionesRegistroVoucherInicial(filtro,60).then(r=>{
   if(vivo){setOpciones(r);setPlanId('');}
  }).catch((e:unknown)=>{
   if(vivo){setOpciones(null);setError(e instanceof Error?e.message:'No se pudo listar iniciales.');}
  }).finally(()=>{if(vivo)setLoading(false);});
  return()=>{vivo=false;};
 },[open,filtro,idCarga]);
 const plan=useMemo(()=>opciones?.items.find(x=>x.id_plan_pago===Number(planId)),
  [opciones,planId]);
 const valor=Number(monto.replace(',','.'));
 const valido=Boolean(plan&&valor>0&&Number.isFinite(valor)
   &&valor<=plan.saldo_pendiente
   &&Math.abs(Math.round(valor*100)-valor*100)<1e-7
   &&metodo&&fechaOperacion
   &&fechaOperacion<=fechaHoy()
   &&archivo&&archivo.size>0&&archivo.size<=5242880
   &&archivo.name.length<=180&&mimes.includes(archivo.type));
 const registrar=async(e:FormEvent<HTMLFormElement>)=>{
  e.preventDefault();
  if(guardando||(!idCarga&&!valido))return;
  setGuardando(true);setError(null);
  try{
   let cargaId=idCarga;
   if(!cargaId){
    if(!plan||!archivo)throw new Error('Seleccione plan y evidencia.');
    const carga=await crmBackend.prepararCargaVoucherInicial({
     idVenta:plan.id_venta,idPlanPago:plan.id_plan_pago,monto:valor,
     idMetodoPago:Number(metodo),fechaOperacion,
     numeroOperacion:numeroOperacion.trim()||null,
     nombreArchivo:archivo.name,tipoMime:archivo.type,tamanioBytes:archivo.size
    });
    await crmBackend.subirArchivoVoucherCuota(carga,archivo);
    cargaId=carga.idCarga;setIdCarga(cargaId);
   }
   const r=await crmBackend.registrarVoucherInicialPendiente(cargaId);
   toast.success(r.reutilizado?'Registro recuperado':'Voucher de inicial registrado',{
    description:'Pago REGISTRADO y voucher PENDIENTE: debe aprobarlo otra persona.'
   });
   setIdCarga(null);setPlanId('');setMonto('');setMetodo('');
   setNumeroOperacion('');setArchivo(null);setBusqueda('');setFiltro('');
   onRegistrado();onClose();
  }catch(e:unknown){
   setError(e instanceof Error?e.message:'No se pudo registrar la inicial.');
  }finally{setGuardando(false);}
 };
 return <Modal open={open} onClose={()=>{if(!guardando)onClose();}}
   width="max-w-2xl" title="Nuevo comprobante de inicial adicional"
   description="No incluye ni vuelve a cobrar los S/ 500 de la reserva.">
  <form className="space-y-4" onSubmit={e=>void registrar(e)}>
   <p className="rounded-lg bg-amber-50 p-3 text-xs text-amber-900">
    Este flujo corresponde a la inicial adicional pactada de un contrato
    financiado y firmado. El comprobante no se aplica hasta su revisión
    y confirmación por otra persona de Finanzas.
   </p>
   {!idCarga&&<>
    <div className="flex items-end gap-2">
     <label className="flex-1 text-xs text-brand-700">Buscar código de venta
      <input type="search" value={busqueda} maxLength={120}
       onChange={e=>setBusqueda(e.target.value)}
       onKeyDown={e=>{if(e.key==='Enter'){e.preventDefault();setFiltro(busqueda.trim());}}}
       placeholder="Código de venta"
       className="mt-1 block w-full rounded-lg border border-brand-200 px-3 py-2"/>
     </label>
     <button type="button" onClick={()=>setFiltro(busqueda.trim())}
      disabled={loading} title="Buscar" className="rounded-lg border border-brand-200 px-3 py-2">
      <Search className="h-4 w-4"/>
     </button>
    </div>
    <label className="block text-xs text-brand-700">Plan financiado con inicial adicional disponible
     <select required value={planId} disabled={loading}
      onChange={e=>{setPlanId(e.target.value);setMonto('');}}
      className="mt-1 block w-full rounded-lg border border-brand-200 bg-white px-3 py-2">
      <option value="">Seleccione venta y plan</option>
      {opciones?.items.map(x=><option key={x.id_plan_pago} value={x.id_plan_pago}>
        {x.codigo_venta} · Plan #{x.id_plan_pago} · Saldo {currency(x.saldo_pendiente)}
      </option>)}
     </select>
     {!loading&&opciones?.items.length===0&&
      <span className="mt-1 block text-amber-700">
       No se encontraron iniciales exigibles para el filtro indicado.
      </span>}
    </label>
    {plan&&<div className="rounded-lg bg-slate-50 p-3 text-xs text-brand-700">
     <p>Inicial adicional pactada: <strong>{currency(plan.inicial_adicional_pactada)}</strong></p>
     <p>Abonada y aplicada: {currency(plan.inicial_abonada)}</p>
     <p>Saldo de inicial: <strong>{currency(plan.saldo_pendiente)}</strong></p>
     <p className="mt-1">Reserva ya acreditada en el plan (no volver a imputar):
      {' '}{currency(plan.reserva_ya_acreditada)}</p>
    </div>}
    <div className="grid gap-3 sm:grid-cols-2">
     <label className="text-xs text-brand-700">Importe del comprobante (S/)
      <input required type="number" step="0.01" min="0.01"
       max={plan?.saldo_pendiente} value={monto}
       onChange={e=>setMonto(e.target.value)}
       className="mt-1 block w-full rounded-lg border border-brand-200 px-3 py-2"/>
     </label>
     <label className="text-xs text-brand-700">Método de pago
      <select required value={metodo} onChange={e=>setMetodo(e.target.value)}
       className="mt-1 block w-full rounded-lg border border-brand-200 bg-white px-3 py-2">
       <option value="">Seleccione</option>
       {opciones?.metodos.map(x=><option key={x.idMetodoPago} value={x.idMetodoPago}>{x.nombre}</option>)}
      </select>
     </label>
     <label className="text-xs text-brand-700">Fecha bancaria
      <input required type="date" max={fechaHoy()} value={fechaOperacion}
       onChange={e=>setFechaOperacion(e.target.value)}
       className="mt-1 block w-full rounded-lg border border-brand-200 px-3 py-2"/>
     </label>
     <label className="text-xs text-brand-700">Número de operación (si existe)
      <input value={numeroOperacion} maxLength={100}
       onChange={e=>setNumeroOperacion(e.target.value)}
       className="mt-1 block w-full rounded-lg border border-brand-200 px-3 py-2"/>
     </label>
    </div>
    <label className="block text-xs text-brand-700">
     Evidencia bancaria (PDF/JPG/PNG/WebP hasta 5 MiB)
     <input required type="file" accept=".pdf,.jpg,.jpeg,.png,.webp"
      onChange={e=>setArchivo(e.target.files?.[0]??null)}
      className="mt-1 block w-full rounded-lg border border-brand-200 px-3 py-2"/>
    </label>
   </>}
   {idCarga&&<div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs">
     El archivo ya se cargó. Reintente registrar usando el mismo identificador:
     no se generará otro pago.
     <button type="button" disabled={guardando} onClick={()=>setIdCarga(null)}
       className="mt-1 block font-semibold underline">
       Descartar intento y preparar una carga nueva
     </button>
   </div>}
   {error&&<p role="alert" className="flex items-start gap-2 rounded-lg bg-rose-50 p-3 text-xs text-rose-800">
     <AlertCircle className="h-4 w-4 shrink-0"/>{error}
   </p>}
   <div className="flex justify-end gap-2 border-t border-brand-100 pt-3">
    <button type="button" disabled={guardando} onClick={onClose}
     className="rounded-lg border border-brand-200 px-4 py-2 text-xs">Cancelar</button>
    <button type="submit" disabled={guardando||(!idCarga&&!valido)}
     className="inline-flex items-center gap-2 rounded-lg bg-brand-900 px-4 py-2 text-xs font-semibold text-white disabled:opacity-40">
     <FilePlus2 className="h-4 w-4"/>
     {guardando?'Registrando…':idCarga?'Reintentar registro':'Cargar y registrar pendiente'}
    </button>
   </div>
  </form>
 </Modal>;
}
