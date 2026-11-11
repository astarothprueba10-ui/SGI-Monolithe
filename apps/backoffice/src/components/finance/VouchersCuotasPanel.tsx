import {useEffect,useState} from 'react';
import {CheckCircle2,Eye,FileWarning,Plus,RefreshCw,Search,ShieldCheck,XCircle} from 'lucide-react';
import {toast} from 'sonner';
import {crmBackend,type CrmVoucherCuotaItem} from '../../services/crmBackend';
import {currency} from '../../utils/format';
import {useAuth} from '../../contexts/AuthContext';
import {NuevoVoucherCuotaModal} from './NuevoVoucherCuotaModal';
import {RevisarVoucherCuotaModal} from './RevisarVoucherCuotaModal';

type Estado='TODOS'|'PENDIENTE'|'APROBADO'|'RECHAZADO';
const estados:Estado[]=['TODOS','PENDIENTE','APROBADO','RECHAZADO'];
const fecha=(valor:string)=>{
  const d=new Date(valor);
  return Number.isNaN(d.getTime())?'—':new Intl.DateTimeFormat('es-PE',{
    dateStyle:'short',timeZone:'America/Lima'
  }).format(d);
};

export function VouchersCuotasPanel() {
  const {can}=useAuth();
  const [nuevoAbierto,setNuevoAbierto]=useState(false);
  const [revisando,setRevisando]=useState<CrmVoucherCuotaItem|null>(null);
  const [decision,setDecision]=useState<'APROBAR'|'RECHAZAR'>('APROBAR');
  const [items,setItems]=useState<CrmVoucherCuotaItem[]>([]);
  const [estado,setEstado]=useState<Estado>('TODOS');
  const [busqueda,setBusqueda]=useState('');
  const [textoAplicado,setTextoAplicado]=useState('');
  const [pagina,setPagina]=useState(1);
  const [total,setTotal]=useState(0);
  const [paginas,setPaginas]=useState(1);
  const [cargando,setCargando]=useState(true);
  const [leyendo,setLeyendo]=useState<number|null>(null);
  const [error,setError]=useState<string|null>(null);
  const [revision,setRevision]=useState(0);

  useEffect(()=>{
    let activo=true;setCargando(true);setError(null);
    void crmBackend.listarVouchersCuotas({
      estado,busqueda:textoAplicado,pagina,tamano:20
    }).then(r=>{
      if(activo){setItems(r.items);setTotal(r.total);setPaginas(r.paginas);}
    }).catch((err:unknown)=>{
      if(activo){setItems([]);setError(err instanceof Error?err.message:
        'No fue posible consultar los comprobantes de cuotas.');}
    }).finally(()=>{if(activo)setCargando(false);});
    return ()=>{activo=false;};
  },[estado,textoAplicado,pagina,revision]);

  const abrir=async(item:CrmVoucherCuotaItem)=>{
    if(!item.archivo_disponible||leyendo!==null)return;
    setLeyendo(item.id_voucher);
    try{
      const r=await crmBackend.prepararLecturaVoucherCuota(item.id_voucher);
      if(r.bucket!=='vouchers-ventas-private'||!r.urlDescarga)
        throw new Error('El archivo privado no está disponible.');
      const url=new URL(r.urlDescarga);
      if(url.protocol!=='https:')throw new Error('El enlace no es seguro.');
      window.open(url.href,'_blank','noopener,noreferrer');
    }catch(err:unknown){
      toast.error('No se pudo abrir el comprobante',{
        description:err instanceof Error?err.message:'Compruebe la existencia del archivo.'
      });
    }finally{setLeyendo(null);}
  };

  return <section className="rounded-xl border border-brand-100 bg-white p-4 sm:p-5"
    aria-label="Comprobantes de cuotas reales">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div>
        <h2 className="text-base font-bold text-brand-900">
          Comprobantes de pago de cuotas
        </h2>
        <p className="mt-1 text-xs text-brand-600">
          Bandeja real de Finanzas. El estado del voucher y el pago se
          consultan directamente en el backend; no son datos de demostración.
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={()=>setRevision(n=>n+1)}
          disabled={cargando}
          className="inline-flex items-center gap-1.5 rounded-lg border border-brand-200 px-3 py-2 text-xs font-semibold text-brand-700 hover:bg-brand-50 disabled:opacity-50">
          <RefreshCw className="h-4 w-4"/>Actualizar
        </button>
        {can('finance.create')&&<button type="button"
          onClick={()=>setNuevoAbierto(true)}
          className="inline-flex items-center gap-1.5 rounded-lg bg-brand-900 px-3 py-2 text-xs font-semibold text-white">
          <Plus className="h-4 w-4"/>Nuevo comprobante de cuota
        </button>}
      </div>
    </div>
    <div className="mt-4 flex flex-wrap items-end gap-3">
      <label className="block min-w-[155px] text-xs text-brand-700">
        Estado del voucher
        <select value={estado} onChange={e=>{
          setEstado(e.target.value as Estado);setPagina(1);
        }} className="mt-1 block w-full rounded-lg border border-brand-200 bg-white px-3 py-2">
          {estados.map(s=><option key={s} value={s}>
            {s==='TODOS'?'Todos':s.charAt(0)+s.slice(1).toLowerCase()}
          </option>)}
        </select>
      </label>
      <form className="flex min-w-[220px] flex-1 gap-2" onSubmit={e=>{
        e.preventDefault();setPagina(1);setTextoAplicado(busqueda.trim());
      }}>
        <label className="flex-1 text-xs text-brand-700">
          Buscar voucher, venta, pago o cliente
          <input type="search" value={busqueda} maxLength={120}
            onChange={e=>setBusqueda(e.target.value)}
            placeholder="Código o comprador"
            className="mt-1 block w-full rounded-lg border border-brand-200 px-3 py-2"
          />
        </label>
        <button type="submit" title="Buscar" aria-label="Buscar comprobantes"
          className="mt-5 inline-flex items-center rounded-lg bg-brand-900 px-3 py-2 text-white">
          <Search className="h-4 w-4"/>
        </button>
      </form>
    </div>

    {cargando&&<p className="mt-4 text-xs text-brand-600">Consultando comprobantes…</p>}
    {error&&<p role="alert"
      className="mt-4 rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800">
      {error}</p>}
    {!cargando&&!error&&items.length===0&&
      <p className="mt-4 rounded-lg border border-brand-100 p-4 text-xs text-brand-600">
        No existen comprobantes de cuotas que coincidan con los filtros.
        Las separaciones se revisan en su propia bandeja.
      </p>}
    {!cargando&&!error&&items.length>0&&
      <div className="mt-4 overflow-auto rounded-lg border border-brand-100">
        <table className="w-full min-w-[850px] text-left text-xs">
          <thead className="bg-slate-100 text-brand-700"><tr>
            {['Voucher','Venta / titular','Pago / medio','Monto','Cargado',
              'Voucher / pago','Archivo','Acción'].map(x=>
              <th key={x} className="whitespace-nowrap px-3 py-2.5 font-bold">{x}</th>)}
          </tr></thead>
          <tbody className="divide-y divide-brand-100">{items.map(v=>
            <tr key={v.id_voucher}>
              <td className="px-3 py-2 font-semibold">{v.codigo_voucher}</td>
              <td className="px-3 py-2">
                <span className="block font-semibold">{v.codigo_venta}</span>
                <span className="text-brand-600">{v.nombre_cliente||'Sin titular identificado'}</span>
              </td>
              <td className="px-3 py-2">
                <span className="block">{v.codigo_pago}</span>
                <span className="text-brand-600">{v.metodo_pago}</span>
              </td>
              <td className="whitespace-nowrap px-3 py-2 font-semibold tabular-nums">
                {currency(v.monto_pago)}
              </td>
              <td className="whitespace-nowrap px-3 py-2">{fecha(v.fecha_carga)}</td>
              <td className="px-3 py-2">
                <span className={v.estado_voucher==='APROBADO'?
                  'font-semibold text-green-700':v.estado_voucher==='RECHAZADO'?
                  'font-semibold text-rose-700':'font-semibold text-amber-800'}>
                  {v.estado_voucher}
                </span>
                <span className="block text-brand-600">Pago: {v.estado_pago}</span>
              </td>
              <td className="px-3 py-2">
                {v.archivo_disponible?
                  <span className="inline-flex items-center gap-1 text-green-700">
                    <ShieldCheck className="h-4 w-4"/>Disponible
                  </span>:
                  <span className="inline-flex items-center gap-1 text-amber-800"
                    title="Referencia histórica sin archivo validado en el bucket privado">
                    <FileWarning className="h-4 w-4"/>Requiere conciliación
                  </span>}
              </td>
              <td className="px-3 py-2">
                <div className="flex flex-wrap gap-2">
                  <button type="button" onClick={()=>void abrir(v)}
                    disabled={!v.archivo_disponible||leyendo!==null}
                    className="inline-flex items-center gap-1 rounded-lg border border-brand-200 px-3 py-1.5 font-semibold text-brand-700 disabled:cursor-not-allowed disabled:opacity-40">
                    <Eye className="h-3.5 w-3.5"/>Ver archivo
                  </button>
                  {can('finance.edit')&&v.estado_voucher==='PENDIENTE'
                      &&v.estado_pago==='REGISTRADO'&&<>
                    <button type="button"
                      onClick={()=>{setDecision('APROBAR');setRevisando(v);}}
                      disabled={!v.archivo_disponible}
                      title="Confirma el pago, pero no abona aún la cuota"
                      className="inline-flex items-center gap-1 rounded-lg border border-green-200 px-2 py-1.5 font-semibold text-green-800 disabled:opacity-40">
                      <CheckCircle2 className="h-3.5 w-3.5"/>Aprobar
                    </button>
                    <button type="button"
                      onClick={()=>{setDecision('RECHAZAR');setRevisando(v);}}
                      className="inline-flex items-center gap-1 rounded-lg border border-rose-200 px-2 py-1.5 font-semibold text-rose-800">
                      <XCircle className="h-3.5 w-3.5"/>Rechazar
                    </button>
                  </>}
                </div>
              </td>
            </tr>)}</tbody>
        </table>
      </div>}
    {!error&&!cargando&&<div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-xs text-brand-600">
      <span>{total} comprobante{total===1?'':'s'} de cuotas</span>
      <div className="flex items-center gap-2">
        <button type="button" disabled={pagina<=1||cargando}
          onClick={()=>setPagina(n=>Math.max(1,n-1))}
          className="rounded-lg border border-brand-200 px-2.5 py-1.5 disabled:opacity-40">
          Anterior
        </button>
        <span>Página {pagina} de {paginas}</span>
        <button type="button" disabled={pagina>=paginas||cargando}
          onClick={()=>setPagina(n=>n+1)}
          className="rounded-lg border border-brand-200 px-2.5 py-1.5 disabled:opacity-40">
          Siguiente
        </button>
      </div>
    </div>}
    <p className="mt-4 text-[11px] text-brand-500">
      El revisor debe ser diferente del registrador. Aprobar confirma el pago
      sin aplicarlo a la cuota; rechazar registra el motivo y anula el pago.
      La aplicación de abonos confirmados se completará en el 5.3.4.
    </p>
    {can('finance.edit')&&<RevisarVoucherCuotaModal
      item={revisando} decision={decision}
      onClose={()=>setRevisando(null)}
      onRevisado={()=>setRevision(n=>n+1)}
    />}
    {can('finance.create')&&<NuevoVoucherCuotaModal
      open={nuevoAbierto}
      onClose={()=>setNuevoAbierto(false)}
      onRegistrado={()=>setRevision(n=>n+1)}
    />}
  </section>;
}
