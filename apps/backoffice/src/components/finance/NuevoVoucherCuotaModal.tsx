import {useEffect,useMemo,useState,type FormEvent} from 'react';
import {AlertCircle,FileUp,Search} from 'lucide-react';
import {toast} from 'sonner';
import {Modal} from '../ui/Modal';
import {currency} from '../../utils/format';
import {
  crmBackend,
  type CrmCuotaDisponibleParaPago,
  type CrmOpcionesRegistroCuota
} from '../../services/crmBackend';

const MIMES=['application/pdf','image/jpeg','image/png','image/webp'];
const hoyLima=()=>{
  const d=new Date();
  return new Intl.DateTimeFormat('en-CA',{
    timeZone:'America/Lima',year:'numeric',month:'2-digit',day:'2-digit'
  }).format(d);
};

export function NuevoVoucherCuotaModal({
  open,onClose,onRegistrado
}:{
  open:boolean;
  onClose:()=>void;
  onRegistrado:()=>void;
}){
  const [opciones,setOpciones]=useState<CrmOpcionesRegistroCuota|null>(null);
  const [busqueda,setBusqueda]=useState('');
  const [busquedaAplicada,setBusquedaAplicada]=useState('');
  const [idCuota,setIdCuota]=useState('');
  const [monto,setMonto]=useState('');
  const [idMetodo,setIdMetodo]=useState('');
  const [fechaOperacion,setFechaOperacion]=useState(hoyLima);
  const [numeroOperacion,setNumeroOperacion]=useState('');
  const [archivo,setArchivo]=useState<File|null>(null);
  const [consultando,setConsultando]=useState(false);
  const [guardando,setGuardando]=useState(false);
  const [error,setError]=useState<string|null>(null);
  const [idCargaPendiente,setIdCargaPendiente]=useState<string|null>(null);

  useEffect(()=>{
    if(!open||idCargaPendiente)return;
    let vivo=true;setConsultando(true);setError(null);
    void crmBackend.opcionesRegistroVoucherCuota(busquedaAplicada,60)
      .then(r=>{if(vivo){setOpciones(r);setIdCuota('');}})
      .catch((e:unknown)=>{
        if(vivo){setOpciones(null);
          setError(e instanceof Error?e.message:'No se pudieron cargar las cuotas.');}
      }).finally(()=>{if(vivo)setConsultando(false);});
    return ()=>{vivo=false;};
  },[open,busquedaAplicada,idCargaPendiente]);

  const cuota=useMemo<CrmCuotaDisponibleParaPago|undefined>(
    ()=>opciones?.items.find(i=>i.id_cuota===Number(idCuota)),[opciones,idCuota]
  );
  const numeroMonto=Number(monto.replace(',','.'));
  const fechaMax=hoyLima();
  const archivoValido=Boolean(archivo&&archivo.size>0&&archivo.size<=5242880
      &&archivo.name.length<=180&&MIMES.includes(archivo.type));
  const montoValido=Boolean(cuota&&Number.isFinite(numeroMonto)
      &&numeroMonto>0&&numeroMonto<=cuota.saldo_pendiente
      &&Math.round(numeroMonto*100)===numeroMonto*100);
  const hayDatosValidos=Boolean(cuota&&montoValido&&archivoValido
      &&idMetodo&&fechaOperacion&&fechaOperacion<=fechaMax);

  const cerrar=()=>{
    if(!guardando)onClose();
  };
  const buscar=(e:FormEvent<HTMLFormElement>)=>{
    e.preventDefault();
    if(!guardando){setIdCuota('');setBusquedaAplicada(busqueda.trim());}
  };
  const registrar=async(e:FormEvent<HTMLFormElement>)=>{
    e.preventDefault();
    if(guardando)return;
    setError(null);
    if(!idCargaPendiente&&!hayDatosValidos){
      setError('Seleccione una cuota, importe permitido, método, fecha y comprobante PDF o imagen (máx. 5 MiB).');
      return;
    }
    setGuardando(true);
    try{
      let id=idCargaPendiente;
      if(!id){
        if(!cuota||!archivo)throw new Error('Faltan datos de la cuota o comprobante.');
        const carga=await crmBackend.prepararCargaVoucherCuota({
          idVenta:cuota.id_venta,
          idCuota:cuota.id_cuota,
          monto:numeroMonto,
          idMetodoPago:Number(idMetodo),
          fechaOperacion,
          numeroOperacion:numeroOperacion.trim()||null,
          nombreArchivo:archivo.name,
          tipoMime:archivo.type,
          tamanioBytes:archivo.size
        });
        await crmBackend.subirArchivoVoucherCuota(carga,archivo);
        id=carga.idCarga;
        setIdCargaPendiente(id);
      }
      const registro=await crmBackend.registrarVoucherCuotaPendiente(id);
      toast.success(registro.reutilizado?'Comprobante recuperado':'Comprobante registrado',{
        description:`Pago n.º ${registro.idPago} · Voucher n.º ${registro.idVoucher}. Pendiente de aprobación por Finanzas.`
      });
      setIdCargaPendiente(null);
      setIdCuota('');setMonto('');setIdMetodo('');setNumeroOperacion('');
      setArchivo(null);setBusqueda('');setBusquedaAplicada('');
      onRegistrado();onClose();
    }catch(e:unknown){
      setError(e instanceof Error?e.message:'No se pudo registrar el comprobante.');
    }finally{setGuardando(false);}
  };

  return <Modal open={open} onClose={cerrar}
    title="Registrar comprobante de cuota"
    description="Registro pendiente: no reduce el saldo ni aprueba el pago."
    width="max-w-2xl">
    <form className="space-y-4" onSubmit={e=>void registrar(e)}>
      <div className="rounded-lg bg-amber-50 p-3 text-xs text-amber-900">
        El comprobante debe ser verificado por Finanzas. La cuota y su saldo
        permanecerán sin cambios durante esta carga.
      </div>
      {!idCargaPendiente&&<>
        <form className="flex gap-2" onSubmit={buscar}>
          <label className="flex-1 text-xs text-brand-700">
            Buscar venta o cuota (código)
            <input value={busqueda} maxLength={120}
              onChange={e=>setBusqueda(e.target.value)}
              placeholder="Ej. VTA-2026-0001"
              className="mt-1 block w-full rounded-lg border border-brand-200 px-3 py-2"
            />
          </label>
          <button type="submit" disabled={consultando}
            className="mt-5 rounded-lg border border-brand-200 px-3 text-brand-700 disabled:opacity-40"
            aria-label="Buscar venta">
            <Search className="h-4 w-4"/>
          </button>
        </form>
        <label className="block text-xs text-brand-700">
          Venta y cuota a la que se propone imputar el abono
          <select required value={idCuota}
            onChange={e=>{setIdCuota(e.target.value);setMonto('');}}
            disabled={consultando}
            className="mt-1 block w-full rounded-lg border border-brand-200 bg-white px-3 py-2">
            <option value="">Seleccione una cuota activa</option>
            {opciones?.items.map(c=><option key={c.id_cuota} value={c.id_cuota}>
              {c.codigo_venta} · Cuota {c.numero_cuota}
              {' · Saldo: '}{currency(c.saldo_pendiente)}
            </option>)}
          </select>
          {consultando&&<span className="mt-1 block">Consultando cuotas…</span>}
          {!consultando&&opciones?.items.length===0&&<span className="mt-1 block text-amber-700">
            Sin cuotas elegibles con ese filtro; pruebe otro código.
          </span>}
        </label>
        {cuota&&<div className="rounded-lg bg-slate-50 p-3 text-xs">
          <strong className="text-brand-800">
            Venta {cuota.codigo_venta} · Cuota n.º {cuota.numero_cuota}
          </strong>
          <div className="mt-1 text-brand-600">
            Importe de la cuota: {currency(cuota.monto_cuota)} ·
            Pendiente confirmado: {currency(cuota.saldo_pendiente)}
          </div>
          <p className="mt-1 text-brand-500">
            Se permiten abonos parciales. La imputación es propuesta y será
            validada después de aprobar el pago.
          </p>
        </div>}
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="text-xs text-brand-700">
            Monto declarado (S/)
            <input required type="number" min="0.01" max={cuota?.saldo_pendiente??undefined}
              step="0.01" inputMode="decimal" value={monto}
              onChange={e=>setMonto(e.target.value)}
              className="mt-1 block w-full rounded-lg border border-brand-200 px-3 py-2"
            />
          </label>
          <label className="text-xs text-brand-700">
            Método de pago
            <select required value={idMetodo} onChange={e=>setIdMetodo(e.target.value)}
              className="mt-1 block w-full rounded-lg border border-brand-200 bg-white px-3 py-2">
              <option value="">Seleccione</option>
              {opciones?.metodos.map(m=><option key={m.idMetodoPago} value={m.idMetodoPago}>
                {m.nombre}
              </option>)}
            </select>
          </label>
          <label className="text-xs text-brand-700">
            Fecha de operación bancaria
            <input required type="date" value={fechaOperacion} max={fechaMax}
              onChange={e=>setFechaOperacion(e.target.value)}
              className="mt-1 block w-full rounded-lg border border-brand-200 px-3 py-2"
            />
          </label>
          <label className="text-xs text-brand-700">
            Número de operación (cuando exista)
            <input maxLength={100} value={numeroOperacion}
              onChange={e=>setNumeroOperacion(e.target.value)}
              className="mt-1 block w-full rounded-lg border border-brand-200 px-3 py-2"
              placeholder="Operación, depósito o referencia"
            />
          </label>
        </div>
        <label className="block text-xs text-brand-700">
          Comprobante de pago (PDF/JPG/PNG/WebP)
          <input required type="file" accept=".pdf,.jpg,.jpeg,.png,.webp"
            onChange={e=>setArchivo(e.target.files?.[0]??null)}
            className="mt-1 block w-full rounded-lg border border-brand-200 px-3 py-2"
          />
          <span className={archivo&&!archivoValido?'mt-1 block text-rose-700':
            'mt-1 block text-brand-500'}>
            {archivo&&!archivoValido?'Formato o tamaño inválido. Máximo 5 MiB.':
              'Archivo privado, máximo 5 MiB. No se envía al cliente.'}
          </span>
        </label>
      </>}
      {idCargaPendiente&&<div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
        El archivo ya fue subido. El registro está pendiente; puede reintentar
        sin volver a cargarlo ni crear un segundo pago.
      </div>}
      {error&&<p role="alert" className="flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800">
        <AlertCircle className="h-4 w-4 shrink-0"/>{error}
      </p>}
      <div className="flex justify-end gap-2 border-t border-brand-100 pt-4">
        <button type="button" onClick={cerrar} disabled={guardando}
          className="rounded-lg border border-brand-200 px-4 py-2 text-xs font-semibold text-brand-700 disabled:opacity-40">
          Cancelar
        </button>
        <button type="submit" disabled={guardando||(!idCargaPendiente&&!hayDatosValidos)}
          className="inline-flex items-center gap-2 rounded-lg bg-brand-900 px-4 py-2 text-xs font-semibold text-white disabled:opacity-40">
          <FileUp className="h-4 w-4"/>
          {guardando?'Registrando…':idCargaPendiente?'Reintentar registro':
            'Cargar y registrar pendiente'}
        </button>
      </div>
    </form>
  </Modal>;
}
