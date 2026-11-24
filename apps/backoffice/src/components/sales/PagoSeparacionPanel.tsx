import type { Dispatch,SetStateAction } from 'react';
import { FileTextIcon,PlusIcon,Trash2Icon } from 'lucide-react';
import { Button } from '../ui/Button';
import { Input,Select } from '../ui/Field';
import { formatSoles } from '../../utils/financeMoney';
import { crearPagoSeparacion,errorComprobanteSeparacion,MAX_PAGOS_SEPARACION,requiereReferenciaSeparacion,resolverPagosSeparacion,
  type PagoSeparacionBorrador,type MetodoPagoSeparacion,type ValidacionPagosSeparacion } from '../../utils/pagosSeparacion';

type Props={pagos:PagoSeparacionBorrador[];total:number;validacion:ValidacionPagosSeparacion;disabled:boolean;
  onChange:Dispatch<SetStateAction<PagoSeparacionBorrador[]>>;nuevoId:()=>number};
export function PagoSeparacionPanel({pagos,total,validacion,disabled,onChange,nuevoId}:Props){
  const resueltos=resolverPagosSeparacion(pagos,total);
  const actualizar=(id:number,cambio:Partial<PagoSeparacionBorrador>)=>onChange(prev=>prev.map(p=>p.id===id?{...p,...cambio}:p));
  // Al adjuntar evidencia o introducir una referencia, se congela el importe declarado.
  const editar=(id:number,cambio:Partial<PagoSeparacionBorrador>)=>{
    const actual=resueltos.find(p=>p.id===id);
    if(!actual)return;
    actualizar(id,{monto:actual.monto,...cambio});
  };
  const adjuntar=async(id:number,archivo:File)=>{
    const error=errorComprobanteSeparacion(archivo);
    if(error){editar(id,{archivo:null,hashSha256:null,verificandoArchivo:false,errorArchivo:error});return;}
    editar(id,{archivo,hashSha256:null,verificandoArchivo:true,errorArchivo:null});
    try{
      const digest=await crypto.subtle.digest('SHA-256',await archivo.arrayBuffer());
      const hashSha256=Array.from(new Uint8Array(digest),v=>v.toString(16).padStart(2,'0')).join('');
      onChange(prev=>prev.map(p=>p.id===id&&p.archivo===archivo?{...p,hashSha256,verificandoArchivo:false}:p));
    }catch{
      onChange(prev=>prev.map(p=>p.id===id&&p.archivo===archivo?{...p,verificandoArchivo:false,errorArchivo:'No se pudo verificar el archivo. Adjunta el comprobante nuevamente.'}:p));
    }
  };
  const agregar=()=>{
    if(disabled||pagos.length>=MAX_PAGOS_SEPARACION)return;
    const id=nuevoId();
    const pendiente=validacion.diferencia;
    onChange(prev=>[...resolverPagosSeparacion(prev,total),crearPagoSeparacion(id,pendiente!==null&&pendiente>0?(pendiente/100).toFixed(2):'')]);
  };
  const diferencia=validacion.diferencia;
  return <section aria-label="Abonos y comprobantes de toda la separación" className="space-y-3">
    <div>
      <h4 className="text-sm font-semibold text-brand-900">Abonos y comprobantes</h4>
      <p className="mt-1 text-xs text-brand-500">Registra un abono por cada pago realizado. Un mismo pago puede cubrir varios lotes.</p>
    </div>
    {resueltos.map((p,i)=><div key={p.id} className="space-y-3 rounded-xl border border-brand-200 bg-white p-3 sm:p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h5 className="text-sm font-semibold text-brand-900">Abono {i+1}</h5>
        {pagos.length>1&&<Button type="button" variant="secondary" size="sm" icon={Trash2Icon} disabled={disabled}
          onClick={()=>onChange(prev=>prev.filter(x=>x.id!==p.id))}>Quitar abono</Button>}
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <label className="block min-w-0 text-xs font-medium text-brand-700" htmlFor={`abono-monto-${p.id}`}>Importe pagado (S/) *
          <Input id={`abono-monto-${p.id}`} className="mt-1 w-full" inputMode="decimal" value={p.monto} disabled={disabled}
            onChange={e=>actualizar(p.id,{monto:e.target.value})} placeholder="0.00"/>
        </label>
        <label className="block min-w-0 text-xs font-medium text-brand-700" htmlFor={`abono-metodo-${p.id}`}>Método de pago *
          <Select id={`abono-metodo-${p.id}`} className="mt-1 w-full" value={p.metodo} disabled={disabled}
            onChange={e=>editar(p.id,{metodo:e.target.value as MetodoPagoSeparacion,referencia:''})}>
            <option value="TRANSFERENCIA">Transferencia bancaria</option><option value="DEPOSITO">Depósito en cuenta</option>
            <option value="YAPE_PLIN">Billetera (Yape / Plin)</option><option value="EFECTIVO">Efectivo en caja</option><option value="OTRO">Otro medio</option>
          </Select>
        </label>
      </div>
      {p.metodo!=='EFECTIVO'&&<label className="block text-xs font-medium text-brand-700" htmlFor={`abono-ref-${p.id}`}>N.º de operación {requiereReferenciaSeparacion(p.metodo)?'*':'(opcional)'}
        <Input id={`abono-ref-${p.id}`} className="mt-1 w-full" maxLength={80} value={p.referencia} disabled={disabled}
          onChange={e=>editar(p.id,{referencia:e.target.value})} placeholder="Referencia de la transacción"/>
      </label>}
      <div className="space-y-2 rounded-lg border border-dashed border-brand-200 p-3">
        <label className="block text-xs font-semibold text-brand-800" htmlFor={`abono-archivo-${p.id}`}>Comprobante de pago *</label>
        <input id={`abono-archivo-${p.id}`} type="file" accept=".pdf,.jpg,.jpeg,.png,.webp,application/pdf,image/jpeg,image/png,image/webp" disabled={disabled}
          className="block w-full min-w-0 text-xs text-brand-700 file:mr-3 file:rounded-md file:border file:border-brand-200 file:bg-white file:px-3 file:py-2 file:text-xs file:font-semibold"
          onChange={e=>{const archivo=e.target.files?.[0];e.target.value='';if(archivo)void adjuntar(p.id,archivo)}}/>
        <p className="text-xs text-brand-500">PDF, JPG, PNG o WebP · máximo 5 MB por archivo.</p>
        {p.archivo&&<div className="flex min-w-0 flex-wrap items-center justify-between gap-2">
          <span className="min-w-0 break-all text-xs text-brand-700"><FileTextIcon className="mr-1 inline h-4 w-4"/>{p.archivo.name}</span>
          <Button type="button" size="sm" variant="secondary" disabled={disabled} onClick={()=>actualizar(p.id,{archivo:null,hashSha256:null,verificandoArchivo:false,errorArchivo:null})}>Quitar archivo</Button>
        </div>}
      </div>
      {validacion.errores[p.id]?.length>0&&<div className="space-y-1 text-xs text-amber-800" role="status">
        {[...new Set(validacion.errores[p.id])].map(e=><p key={e}>{e}</p>)}
      </div>}
    </div>)}
    <Button type="button" variant="secondary" icon={PlusIcon} className="w-full sm:w-auto" disabled={disabled||pagos.length>=MAX_PAGOS_SEPARACION} onClick={agregar}>Agregar otro abono</Button>
    <div className="space-y-2 rounded-xl border border-brand-200 bg-white p-3 text-sm" aria-live="polite">
      <div className="flex justify-between gap-2"><span>Total requerido</span><strong>{formatSoles(total)}</strong></div>
      <div className="flex justify-between gap-2"><span>Total declarado en abonos</span><strong>{formatSoles(validacion.registrado/100)}</strong></div>
      {diferencia!==null&&<div className={`flex flex-wrap justify-between gap-2 border-t border-brand-100 pt-2 ${diferencia===0?'text-emerald-800':'text-amber-800'}`}>
        <span>{diferencia>0?'Importe faltante':diferencia<0?'Exceso de pago':'Importes coinciden'}</span><strong>{formatSoles(Math.abs(diferencia)/100)}</strong>
      </div>}
      {diferencia===0&&<p className="text-xs text-brand-500">{validacion.valido?'Comprobantes adjuntos; sujetos a revisión por Finanzas.':'Completa las referencias y comprobantes pendientes.'}</p>}
    </div>
  </section>;
}
