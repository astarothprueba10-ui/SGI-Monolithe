import {useEffect,useState,type FormEvent} from 'react';
import {AlertTriangle,CheckCircle2,FileCheck2,XCircle} from 'lucide-react';
import {toast} from 'sonner';
import {Modal} from '../ui/Modal';
import {currency} from '../../utils/format';
import {crmBackend,type CrmVoucherCuotaItem} from '../../services/crmBackend';

type Decision='APROBAR'|'RECHAZAR';

export function RevisarVoucherCuotaModal({
  item,decision,onClose,onRevisado
}:{
  item:CrmVoucherCuotaItem|null;
  decision:Decision;
  onClose:()=>void;
  onRevisado:()=>void;
}){
  const [motivo,setMotivo]=useState('');
  const [observaciones,setObservaciones]=useState('');
  const [confirmo,setConfirmo]=useState(false);
  const [guardando,setGuardando]=useState(false);
  const [error,setError]=useState<string|null>(null);
  useEffect(()=>{
    setMotivo('');setObservaciones('');setConfirmo(false);setError(null);
  },[item?.id_voucher,decision]);

  const aprobar=decision==='APROBAR';
  const elegible=Boolean(item&&item.estado_voucher==='PENDIENTE'
    &&item.estado_pago==='REGISTRADO');
  const puedeGuardar=Boolean(elegible&&(!aprobar||item?.archivo_disponible)
    &&(aprobar?confirmo:motivo.trim().length>=5&&motivo.trim().length<=255)
    &&observaciones.length<=500&&!guardando);

  const confirmar=async(e:FormEvent<HTMLFormElement>)=>{
    e.preventDefault();
    if(!item||!puedeGuardar)return;
    setGuardando(true);setError(null);
    try{
      const r=await crmBackend.revisarVoucherCuota(item.id_voucher,{
        aprobar,motivo:aprobar?null:motivo.trim(),
        observaciones:observaciones.trim()||null
      });
      toast.success(r.reutilizado?'Decisión ya registrada':
        aprobar?'Comprobante aprobado':'Comprobante rechazado',{
        description:aprobar
          ?'Pago confirmado y pendiente de aplicación a cuotas (5.3.4).'
          :'Pago anulado con motivo registrado. No se afectó el saldo.'
      });
      onRevisado();
      onClose();
    }catch(err:unknown){
      setError(err instanceof Error?err.message:'No se pudo revisar el comprobante.');
    }finally{setGuardando(false);}
  };

  return <Modal
    open={item!==null}
    onClose={()=>{if(!guardando)onClose();}}
    width="max-w-xl"
    title={aprobar?'Aprobar comprobante de cuota':'Rechazar comprobante de cuota'}
    description="Decisión de Finanzas con auditoría y control del revisor">
    {item&&<form className="space-y-4" onSubmit={e=>void confirmar(e)}>
      <div className="rounded-lg border border-brand-100 bg-slate-50 p-3 text-xs">
        <p className="font-semibold text-brand-900">{item.codigo_voucher}</p>
        <p className="mt-1 text-brand-700">
          {item.codigo_venta} · {item.nombre_cliente||'Titular no identificado'}
        </p>
        <p className="mt-1 text-brand-700">Pago: {item.codigo_pago}
          {' · '}{item.metodo_pago}
        </p>
        {item.numero_operacion&&<p className="mt-1 text-brand-600">
          Referencia bancaria: {item.numero_operacion}
        </p>}
        <p className="mt-2 font-semibold text-brand-900">
          Monto declarado: {currency(item.monto_pago)}
        </p>
        <p className="mt-1 text-brand-600">Archivo: {item.nombre_archivo}</p>
      </div>

      {!elegible&&<p role="alert" className="flex items-start gap-2 rounded-lg bg-amber-50 p-3 text-xs text-amber-900">
        <AlertTriangle className="h-4 w-4 shrink-0"/>
        El voucher ya no está pendiente de revisión. Actualice la bandeja.
      </p>}
      {aprobar&&!item.archivo_disponible&&<p role="alert"
        className="flex items-start gap-2 rounded-lg bg-rose-50 p-3 text-xs text-rose-800">
        <AlertTriangle className="h-4 w-4 shrink-0"/>
        El archivo no está disponible en Storage. No es posible aprobarlo.
        Puede rechazarlo justificando el motivo correspondiente.
      </p>}
      {aprobar&&<div className="rounded-lg bg-amber-50 p-3 text-xs text-amber-900">
        <p>
          Abra el archivo mediante <strong>Ver archivo</strong> en la bandeja y
          contraste manualmente titular, importe, referencia y operación bancaria.
          La presencia de un PDF o imagen no acredita por sí sola el ingreso.
        </p>
        <label className="mt-3 flex items-start gap-2 font-medium">
          <input type="checkbox" checked={confirmo}
            onChange={e=>setConfirmo(e.target.checked)}
            className="mt-0.5"
          />
          Confirmo que revisé la evidencia y verifiqué el ingreso.
          Entiendo que el pago quedará confirmado pero sin aplicarse aún
          a la cuota hasta el bloque 5.3.4.
        </label>
      </div>}
      {!aprobar&&<label className="block text-xs text-brand-700">
        Motivo de rechazo (obligatorio, 5 a 255 caracteres)
        <textarea required minLength={5} maxLength={255}
          rows={3} value={motivo} onChange={e=>setMotivo(e.target.value)}
          placeholder="Describa claramente la inconsistencia detectada"
          className="mt-1 block w-full rounded-lg border border-brand-200 px-3 py-2"
        />
      </label>}

      <label className="block text-xs text-brand-700">
        Observaciones de Finanzas (opcional)
        <textarea maxLength={500} rows={2} value={observaciones}
          onChange={e=>setObservaciones(e.target.value)}
          placeholder="Detalle de la revisión documental y bancaria"
          className="mt-1 block w-full rounded-lg border border-brand-200 px-3 py-2"
        />
      </label>
      {error&&<p role="alert" className="rounded-lg bg-rose-50 p-3 text-xs text-rose-800">
        {error}
      </p>}
      <div className="flex flex-wrap justify-end gap-2 border-t border-brand-100 pt-3">
        <button type="button" disabled={guardando} onClick={onClose}
          className="rounded-lg border border-brand-200 px-4 py-2 text-xs font-semibold text-brand-700 disabled:opacity-50">
          Cancelar
        </button>
        <button type="submit" disabled={!puedeGuardar}
          className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-semibold text-white disabled:opacity-40 ${
            aprobar?'bg-green-700':'bg-rose-700'
          }`}>
          {aprobar?<FileCheck2 className="h-4 w-4"/>:
            <XCircle className="h-4 w-4"/>}
          {guardando?'Guardando…':aprobar?'Confirmar aprobación':'Confirmar rechazo'}
        </button>
      </div>
      <p className="flex items-center gap-1 text-[11px] text-brand-500">
        <CheckCircle2 className="h-3.5 w-3.5"/>
        El sistema conserva una sola decisión auditada por voucher.
        Ninguna acción modifica el saldo ni marca una cuota como pagada.
      </p>
    </form>}
  </Modal>;
}
