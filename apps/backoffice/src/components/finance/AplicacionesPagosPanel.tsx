import {useEffect,useState,type FormEvent} from 'react';
import {ArrowDownToLine,History,RefreshCw,RotateCcw,ShieldCheck} from 'lucide-react';
import {toast} from 'sonner';
import {useAuth} from '../../contexts/AuthContext';
import {currency} from '../../utils/format';
import {
  crmBackend,type CrmImputacionPendiente,
  type CrmImputacionHistorica,type CrmImputacionesRespuesta
} from '../../services/crmBackend';

const numero=(n:number)=>Number(n.toFixed(2));
const fecha=(iso:string)=>{
  const d=new Date(iso);
  return Number.isNaN(d.getTime())?'—':
    new Intl.DateTimeFormat('es-PE',{timeZone:'America/Lima',dateStyle:'short'}).format(d);
};

export function AplicacionesPagosPanel(){
  const {can}=useAuth();
  const [datos,setDatos]=useState<CrmImputacionesRespuesta|null>(null);
  const [pagina,setPagina]=useState(1);
  const [version,setVersion]=useState(0);
  const [cargando,setCargando]=useState(true);
  const [error,setError]=useState<string|null>(null);
  const [procesando,setProcesando]=useState(false);
  const [elegido,setElegido]=useState<CrmImputacionPendiente|null>(null);
  const [monto,setMonto]=useState('');
  const [observacion,setObservacion]=useState('');
  const [confirmo,setConfirmo]=useState(false);
  const [solicitud,setSolicitud]=useState<string|null>(null);
  const [revirtiendo,setRevirtiendo]=useState<CrmImputacionHistorica|null>(null);
  const [motivo,setMotivo]=useState('');

  useEffect(()=>{
    let vivo=true;setCargando(true);setError(null);
    void crmBackend.listarImputaciones(pagina,20)
      .then(r=>{if(vivo)setDatos(r);})
      .catch((e:unknown)=>{
        if(vivo){setDatos(null);setError(e instanceof Error?e.message:
          'No se pudieron consultar los pagos confirmados.');
        }
      }).finally(()=>{if(vivo)setCargando(false);});
    return ()=>{vivo=false;};
  },[pagina,version]);

  const actualizar=()=>{setVersion(n=>n+1);};
  const seleccionar=(p:CrmImputacionPendiente)=>{
    setElegido(p);
    setMonto(numero(Math.min(p.saldo_pago,p.saldo_destino)).toFixed(2));
    setObservacion('');
    setConfirmo(false);
    setSolicitud(null);
    setRevirtiendo(null);
  };
  const dinero=Number(monto);
  const limite=elegido?Math.min(elegido.saldo_pago,elegido.saldo_destino):0;
  const montoValido=Boolean(elegido&&Number.isFinite(dinero)&&dinero>0
    &&dinero<=limite+1e-7
    &&Math.abs(dinero*100-Math.round(dinero*100))<1e-7);

  const aplicar=async(e:FormEvent<HTMLFormElement>)=>{
    e.preventDefault();
    if(!elegido||!montoValido||!confirmo||procesando||!can('finance.edit'))return;
    setProcesando(true);setError(null);
    const idSolicitud=solicitud??crypto.randomUUID();
    setSolicitud(idSolicitud);
    try{
      const r=await crmBackend.aplicarPagoConfirmado({
        idSolicitud,idPago:elegido.id_pago,tipo:elegido.tipo_destino,
        idCuota:elegido.tipo_destino==='CUOTA'?elegido.cuota_preautorizada:null,
        monto:numero(dinero),observaciones:observacion.trim()||null
      });
      toast.success(r.reutilizado?'Aplicación recuperada':'Abono aplicado',{
        description:`S/ ${numero(dinero).toFixed(2)} imputados correctamente al destino.`
      });
      setElegido(null);setSolicitud(null);setConfirmo(false);
      actualizar();
    }catch(e:unknown){
      setError(e instanceof Error?e.message:'No se pudo aplicar el pago.');
    }finally{setProcesando(false);}
  };

  const revertir=async(e:FormEvent<HTMLFormElement>)=>{
    e.preventDefault();
    if(!revirtiendo||motivo.trim().length<5||procesando||!can('finance.edit'))return;
    setProcesando(true);setError(null);
    try{
      const r=await crmBackend.revertirAplicacion(
        revirtiendo.id_aplicacion_pago,motivo
      );
      toast.success(r.reutilizado?'Reversión ya registrada':'Aplicación revertida',{
        description:'El abono deja de disminuir el saldo. Se conserva la auditoría.'
      });
      setRevirtiendo(null);setMotivo('');actualizar();
    }catch(e:unknown){
      setError(e instanceof Error?e.message:'No se pudo revertir la aplicación.');
    }finally{setProcesando(false);}
  };

  return <section className="space-y-4" aria-label="Imputación de pagos confirmados">
    <div className="rounded-xl border border-brand-100 bg-white p-4 sm:p-5">
      <div className="flex flex-wrap justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 font-bold text-brand-900">
            <ArrowDownToLine className="h-5 w-5"/>Aplicación de pagos confirmados
          </h2>
          <p className="mt-1 text-xs text-brand-600">
            Solo los pagos CONFIRMADOS, con voucher APROBADO, pueden reducir
            el saldo de cuotas o de la inicial adicional pactada.
          </p>
        </div>
        <button type="button" onClick={actualizar} disabled={cargando}
          className="flex items-center gap-2 rounded-lg border border-brand-200 px-3 py-2 text-xs font-semibold text-brand-700 disabled:opacity-50">
          <RefreshCw className="h-4 w-4"/>Actualizar
        </button>
      </div>
      <p className="mt-3 rounded-lg bg-slate-50 p-3 text-xs text-brand-700">
        Los pagos de separación no se vuelven a aplicar aquí. Los abonos
        de inicial se registran por separado de las cuotas. Un monto
        confirmado, pero todavía no imputado, continúa visible en Tesorería
        sin descontarse del saldo financiero.
      </p>
      {cargando&&<p className="mt-3 text-xs text-brand-500">Consultando disponibilidad…</p>}
      {error&&<p role="alert" className="mt-3 rounded-lg bg-rose-50 p-3 text-xs text-rose-800">{error}</p>}
      {!cargando&&!error&&datos?.items.length===0&&
        <p className="mt-3 rounded-lg border border-brand-100 p-3 text-xs text-brand-600">
          Actualmente no existen pagos confirmados con saldo pendiente de imputación.
        </p>}
      {!cargando&&!error&&Boolean(datos?.items.length)&&
      <div className="mt-4 overflow-auto rounded-lg border border-brand-100">
        <table className="w-full min-w-[735px] text-left text-xs">
          <thead className="bg-slate-100 text-brand-700"><tr>
            {['Pago / venta','Destino autorizado','Saldo del pago','Saldo del destino','Acción'].map(t=>
              <th key={t} className="px-3 py-2.5">{t}</th>)}
          </tr></thead>
          <tbody>{datos?.items.map(p=><tr key={p.id_pago} className="border-t border-brand-100">
            <td className="px-3 py-2 font-medium">{p.codigo_pago}
              <span className="block text-brand-600">{p.codigo_venta}</span>
            </td>
            <td className="px-3 py-2">
              {p.tipo_destino==='CUOTA'? `Cuota n.º ${p.numero_cuota}`:
                'Inicial adicional pactada'}
            </td>
            <td className="px-3 py-2 tabular-nums">{currency(p.saldo_pago)}</td>
            <td className="px-3 py-2 tabular-nums">{currency(p.saldo_destino)}</td>
            <td className="px-3 py-2">
              {can('finance.edit')&&<button type="button"
                disabled={procesando}
                onClick={()=>seleccionar(p)}
                className="rounded-lg bg-brand-900 px-3 py-1.5 font-semibold text-white disabled:opacity-40">
                Aplicar abono
              </button>}
            </td>
          </tr>)}</tbody>
        </table>
      </div>}
      {!cargando&&!error&&datos&&datos.paginas>1&&
        <div className="mt-4 flex justify-end gap-3 text-xs text-brand-600">
          <button type="button" disabled={pagina<=1||cargando}
            onClick={()=>setPagina(p=>Math.max(1,p-1))}
            className="rounded-lg border border-brand-200 px-3 py-1 disabled:opacity-50">
            Anterior</button>
          Página {pagina} de {datos.paginas}
          <button type="button" disabled={pagina>=datos.paginas||cargando}
            onClick={()=>setPagina(p=>p+1)}
            className="rounded-lg border border-brand-200 px-3 py-1 disabled:opacity-50">
            Siguiente</button>
        </div>}
      {elegido&&can('finance.edit')&&<form onSubmit={e=>void aplicar(e)}
        className="mt-4 space-y-3 rounded-xl border border-brand-200 bg-slate-50 p-4">
        <h3 className="font-semibold text-brand-900">Confirmar imputación: {elegido.codigo_pago}</h3>
        <p className="text-xs text-brand-700">
          Destino: {elegido.tipo_destino==='CUOTA'?
          `Cuota n.º ${elegido.numero_cuota}`:'Inicial adicional'} ·
          Máximo permitido: {currency(limite)}
        </p>
        <label className="block text-xs text-brand-700">
          Importe a aplicar (S/)
          <input required type="number" value={monto} min="0.01"
            max={limite} step="0.01"
            onChange={e=>{setMonto(e.target.value);setSolicitud(null);}}
            className="mt-1 block w-full max-w-xs rounded-lg border border-brand-200 px-3 py-2"/>
        </label>
        <label className="block text-xs text-brand-700">
          Observaciones (opcional)
          <textarea maxLength={255} rows={2} value={observacion}
            onChange={e=>{setObservacion(e.target.value);setSolicitud(null);}}
            className="mt-1 block w-full rounded-lg border border-brand-200 px-3 py-2"/>
        </label>
        <label className="flex gap-2 text-xs text-brand-700">
          <input type="checkbox" checked={confirmo}
            onChange={e=>setConfirmo(e.target.checked)}/>
          <span>Confirmo que la imputación corresponde al pago bancario
          ya aprobado y al destino mostrado.</span>
        </label>
        <div className="flex gap-2">
          <button type="submit" disabled={!montoValido||!confirmo||procesando}
            className="rounded-lg bg-brand-900 px-4 py-2 text-xs font-semibold text-white disabled:opacity-40">
            {procesando?'Guardando…':'Aplicar y actualizar saldo'}
          </button>
          <button type="button" disabled={procesando}
            onClick={()=>{setElegido(null);setSolicitud(null);}}
            className="rounded-lg border border-brand-200 px-4 py-2 text-xs">
            Cancelar
          </button>
        </div>
      </form>}
    </div>
    <div className="rounded-xl border border-brand-100 bg-white p-4 sm:p-5">
      <h3 className="flex items-center gap-2 font-semibold text-brand-900">
        <History className="h-5 w-5"/>Historial de aplicaciones del Sprint 4
      </h3>
      <p className="mt-1 text-xs text-brand-600">
        Las reversiones conservan importe, responsable, fecha y motivo.
        No se permite modificar aplicaciones históricas mediante este flujo.
      </p>
      {!datos?.historial.length&&<p className="mt-3 text-xs text-brand-600">
        Sin nuevas imputaciones registradas todavía.
      </p>}
      {Boolean(datos?.historial.length)&&
        <div className="mt-3 overflow-auto">
          <table className="w-full min-w-[680px] text-left text-xs">
            <thead><tr className="text-brand-600">
              {['Aplicación','Pago','Destino','Monto','Estado','Acción'].map(x=>
                <th key={x} className="px-2 py-2">{x}</th>)}
            </tr></thead>
            <tbody>{datos?.historial.map(h=><tr
              key={h.id_aplicacion_pago} className="border-t border-brand-100">
              <td className="px-2 py-2">#{h.id_aplicacion_pago}
                <span className="block text-brand-500">{fecha(h.fecha_registro)}</span>
              </td>
              <td className="px-2 py-2">{h.codigo_pago}</td>
              <td className="px-2 py-2">{h.tipo==='CUOTA'?
                `Cuota ${h.id_cuota}`:'Inicial'}</td>
              <td className="px-2 py-2">{currency(h.monto)}</td>
              <td className="px-2 py-2">
                {h.activo?<span className="text-green-700">Aplicado</span>:
                  <span className="text-amber-800">Revertido
                    <span className="block text-brand-600">{h.motivo_anulacion}</span>
                  </span>}
              </td>
              <td className="px-2 py-2">{h.activo&&can('finance.edit')&&
                <button type="button" onClick={()=>{
                  setRevirtiendo(h);setMotivo('');setElegido(null);
                }} className="inline-flex items-center gap-1 rounded-lg border border-amber-200 px-3 py-1.5 font-semibold text-amber-800">
                  <RotateCcw className="h-3.5 w-3.5"/>Solicitar reversión
                </button>}
              </td>
            </tr>)}</tbody>
          </table>
        </div>}
      {revirtiendo&&can('finance.edit')&&<form
        onSubmit={e=>void revertir(e)}
        className="mt-4 space-y-3 rounded-lg border border-amber-200 bg-amber-50 p-4">
        <h4 className="font-semibold text-amber-900">
          Reversión de la aplicación #{revirtiendo.id_aplicacion_pago}
        </h4>
        <p className="text-xs text-amber-900">
          Se devolverán {currency(revirtiendo.monto)} al saldo pendiente.
          Debe autorizarlo un usuario diferente de quien aplicó el abono.
        </p>
        <label className="block text-xs text-brand-700">
          Motivo de reversión (obligatorio)
          <textarea required minLength={5} maxLength={255} value={motivo}
            onChange={e=>setMotivo(e.target.value)} rows={2}
            className="mt-1 block w-full rounded-lg border border-amber-200 p-2"/>
        </label>
        <div className="flex gap-2">
          <button type="submit" disabled={motivo.trim().length<5||procesando}
            className="rounded-lg bg-amber-800 px-4 py-2 text-xs font-semibold text-white disabled:opacity-50">
            Confirmar reversión auditada
          </button>
          <button type="button" disabled={procesando}
            onClick={()=>setRevirtiendo(null)}
            className="rounded-lg border border-amber-200 px-4 py-2 text-xs">
            Cancelar
          </button>
        </div>
      </form>}
      <p className="mt-4 flex items-start gap-2 text-xs text-brand-600">
        <ShieldCheck className="h-4 w-4 shrink-0"/>
        El cronograma original y las condiciones financieras del contrato
        permanecen inalterados; el estado visible se calcula desde las
        aplicaciones confirmadas que continúan activas.
      </p>
    </div>
  </section>;
}
