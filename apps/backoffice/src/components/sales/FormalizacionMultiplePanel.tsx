import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '../ui/Button';
import { Input, Select } from '../ui/Field';
import { Modal } from '../ui/Modal';
import { EditarDatosCompradorModal } from './EditarDatosCompradorModal';
import { crmBackend, type CrmReservaVigenteVenta, type CrmSaleValidationInput, type CrmDatosCompradorVenta } from '../../services/crmBackend';
import { coreService } from '../../services/coreService';
import { calcularVenta, validarInicialTotal, type CondicionesFrancesas } from '../../utils/financiamientoFrances';
import { formatSoles } from '../../utils/financeMoney';
import { validarPagoVenta, type MetodoPagoVenta } from '../../utils/crmPagoVenta';

type Draft = {
 reserva:CrmReservaVigenteVenta; precio:number; politica:CondicionesFrancesas;
 incluir:boolean; modalidad:'CONTADO'|'FINANCIADA'; inicial:string; cuotas:string;
 metodo:MetodoPagoVenta; referencia:string; archivo:File|null;
};
type Props = {
 idProspecto:number; reservas:CrmReservaVigenteVenta[];
 proyectos:Array<{idProyecto:number;nombre:string}>;
 compradorExistente:boolean; puedeReasignar:boolean; asesorNombre:string;
 observaciones:string; onBusy:(busy:boolean)=>void; onCompleted:()=>void;
};
const credito=(d:Draft)=>Number(d.reserva.montoReservaAplicable??0);
const resumen=(d:Draft)=>{
 try {
  if(d.modalidad==='FINANCIADA'&&(!d.inicial.trim()||!d.cuotas.trim()||validarInicialTotal(d.inicial,d.precio,credito(d),d.politica)))return null;
  return calcularVenta(d.precio,credito(d),d.modalidad==='FINANCIADA'?Number(d.inicial):0,d.modalidad==='FINANCIADA'?Number(d.cuotas):0,d.politica);
 }catch{return null;}
};
const pago=(d:Draft)=>{const r=resumen(d);return r?d.modalidad==='FINANCIADA'?r.inicialAdicional:r.saldoContado:null;};
const mensaje=(e:unknown)=>e instanceof Error?e.message:'No se pudo completar la operación.';

export function FormalizacionMultiplePanel({idProspecto,reservas,proyectos,compradorExistente,puedeReasignar,asesorNombre,observaciones,onBusy,onCompleted}:Props){
 const [drafts,setDrafts]=useState<Draft[]>([]);
 const [loading,setLoading]=useState(true);
 const [error,setError]=useState('');
 const [revision,setRevision]=useState(0);
 const [busy,setBusy]=useState(false);
 const [revisar,setRevisar]=useState<Draft[]|null>(null);
 const [confirmar,setConfirmar]=useState<{lotes:Draft[];comprador:CrmDatosCompradorVenta}|null>(null);
 const [incierto,setIncierto]=useState(false);
 const enCurso=useRef(false);
 useEffect(()=>{
  let activo=true;setLoading(true);setError('');setDrafts([]);setRevisar(null);setConfirmar(null);
  void Promise.all(reservas.map(async reserva=>{
   const [p,politica]=await Promise.all([coreService.getCurrentLotPrice(reserva.idLote,'PEN'),crmBackend.obtenerCondicionesVenta(idProspecto,reserva.idLote)]);
   const precio=Number(p?.precio);
   if(!p||p.idLote!==reserva.idLote||!p.activo||p.codigoMoneda!=='PEN'||!Number.isFinite(precio)||precio<=0||!politica?.idPolitica)
    throw new Error('No se verificaron las condiciones del lote '+reserva.codigoLote);
   const inicial=politica.modoInicial==='FIJA'?Number(politica.inicialFija):Math.max(Number(politica.inicialMinima??0),Number(reserva.montoReservaAplicable??0));
   return {reserva,precio,politica,incluir:true,modalidad:'FINANCIADA',inicial:String(inicial),cuotas:String(Math.max(politica.cuotasMin,Math.min(12,politica.cuotasMax))),metodo:'TRANSFERENCIA',referencia:'',archivo:null} as Draft;
  })).then(d=>{if(activo)setDrafts(d);}).catch(e=>{if(activo)setError(mensaje(e));}).finally(()=>{if(activo)setLoading(false);});
  return()=>{activo=false;};
 },[idProspecto,reservas,revision]);
 const actualizar=(id:number,patch:Partial<Draft>)=>setDrafts(prev=>prev.map(d=>d.reserva.idReserva===id?{...d,...patch}:d));
 const seleccion=drafts.filter(d=>d.incluir);
 const total=seleccion.reduce((s,d)=>s+Math.round((pago(d)??0)*100),0)/100;
 const totalCredito=seleccion.reduce((s,d)=>s+Math.round(credito(d)*100),0)/100;
 const totalInicial=seleccion.reduce((s,d)=>s+Math.round((d.modalidad==='FINANCIADA'?Number(d.inicial)||0:d.precio)*100),0)/100;
 const proyecto=(d:Draft)=>proyectos.find(p=>p.idProyecto===d.reserva.idProyecto)?.nombre??'Proyecto '+d.reserva.idProyecto;
 const datos=(d:Draft):CrmSaleValidationInput=>({
  idProspecto,idLote:d.reserva.idLote,modalidad:d.modalidad,montoTotal:d.precio,
  montoInicial:d.modalidad==='FINANCIADA'?Number(d.inicial):null,
  numeroCuotas:d.modalidad==='FINANCIADA'?Number(d.cuotas):null,tasaInteresMensualPct:null,
  observaciones:observaciones.trim()||null
 });
 const validar=async()=>{
  if(enCurso.current||incierto||!seleccion.length)return;
  setError('');
  try {
   const refs=new Set<string>(),huellas=new Set<string>();
   for(const d of seleccion){
    const debe=pago(d);
    if(d.reserva.estado!=='VIGENTE')throw new Error(d.reserva.codigoLote+': Finanzas debe aprobar la separación.');
    if(debe===null)throw new Error(d.reserva.codigoLote+': revise la inicial y número de cuotas.');
    if(debe>0){
     if(!d.archivo)throw new Error(d.reserva.codigoLote+': adjunte un comprobante individual.');
     const e=validarPagoVenta(d.metodo,d.referencia,[d.archivo]);if(e)throw new Error(d.reserva.codigoLote+': '+e);
     const ref=d.referencia.trim().toUpperCase();if(ref&&refs.has(ref))throw new Error('No se puede reutilizar el número de operación de otro lote.');
     if(ref)refs.add(ref);
     const hash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',await d.archivo.arrayBuffer()))).map(n=>n.toString(16).padStart(2,'0')).join('');
     if(huellas.has(hash))throw new Error('No reutilice el mismo comprobante para otro lote.');huellas.add(hash);
    }
   }
   enCurso.current=true;setBusy(true);onBusy(true);
   for(const d of seleccion){
    const v=await crmBackend.validarVenta(datos(d));
    if(!v.elegible||v.idPolitica!==d.politica.idPolitica||Number(v.montoReservaAplicable)!==credito(d)||
     Number(d.modalidad==='FINANCIADA'?v.montoInicialAdicional:v.saldoContado)!==pago(d))
     throw new Error(d.reserva.codigoLote+': las condiciones cambiaron. Actualice las reservas antes de continuar.');
   }
   setRevisar(seleccion.map(d=>({...d})));
  }catch(e){setError(mensaje(e));}finally{enCurso.current=false;setBusy(false);onBusy(false);}
 };
 const registrar=async()=>{
  if(!confirmar||enCurso.current||incierto)return;
  enCurso.current=true;setBusy(true);onBusy(true);setError('');
  let enviado=false;
  try{
   const ventas=await Promise.all(confirmar.lotes.map(async d=>{
    const importe=pago(d)!;
    const comprobantes=importe>0&&d.archivo?[await crmBackend.subirComprobanteVenta(datos(d),d.archivo)]:[];
    return {...datos(d),creditoEsperado:credito(d),pagoEsperado:importe,
     datosComprador:{...confirmar.comprador,idProyectoInteres:d.reserva.idProyecto},
     datosPago:{idPoliticaEsperada:d.politica.idPolitica,metodoPago:importe>0?d.metodo:'EFECTIVO' as const,
      numeroOperacion:importe>0?d.referencia.trim()||null:null,comprobantes}};
   }));
   enviado=true;
   const r=await crmBackend.registrarVentasMultiples(ventas);
   if(!r.success||r.ventas.length!==ventas.length)throw new Error('No se recibió confirmación completa.');
   toast.success('Venta registrada',{description:r.ventas.length+' lote(s), cada uno con su contrato y pago pendiente de revisión.'});
   setConfirmar(null);onCompleted();
  }catch(e){
   if(enviado){setIncierto(true);setConfirmar(null);setError(mensaje(e)+' Consulte el listado de ventas antes de intentar nuevamente.');}
   else setError(mensaje(e));
  }finally{enCurso.current=false;setBusy(false);onBusy(false);}
 };
 if(loading)return <p className="py-4 text-sm text-brand-500">Consultando precios y políticas individuales…</p>;
 if(!drafts.length)return <div className="rounded-xl border border-rose-200 p-3"><p className="text-sm text-rose-700">{error||'No hay reservas para formalizar.'}</p><Button onClick={()=>setRevision(n=>n+1)}>Reintentar</Button></div>;
 return <section className="space-y-4">
  <header className="flex items-start gap-3 border-t border-brand-100 pt-5"><span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-800 text-xs font-bold text-white">3</span><div><h3 className="text-sm font-semibold text-brand-900">Condiciones y pago por lote</h3><p className="text-xs text-brand-500">Selecciona los lotes a formalizar. Cada inicial descuenta únicamente su propia separación confirmada.</p></div></header>
  {drafts.map(d=>{const r=resumen(d),debe=pago(d),id=d.reserva.idReserva;return <article key={id} className="space-y-3 rounded-xl border border-brand-200 bg-white p-4">
   <div className="flex flex-wrap items-center justify-between gap-2"><label className="flex items-center gap-2 text-sm font-semibold"><input type="checkbox" checked={d.incluir} onChange={e=>actualizar(id,{incluir:e.target.checked})}/>{d.reserva.codigoLote}</label><span className="text-xs text-brand-600">{proyecto(d)}</span></div>
   <div className="flex justify-between text-sm"><span>Precio oficial</span><strong>{formatSoles(d.precio)}</strong></div>
   <div className="flex justify-between text-sm text-emerald-800"><span>Separación confirmada</span><strong>− {formatSoles(credito(d))}</strong></div>
   {d.reserva.estado!=='VIGENTE'&&<p className="rounded-lg bg-amber-50 p-2 text-xs text-amber-800">Pendiente de aprobación de Finanzas. No puede formalizarse todavía.</p>}
   {d.incluir&&<>
    <label className="block text-xs font-medium">Modalidad<Select value={d.modalidad} onChange={e=>actualizar(id,{modalidad:e.target.value as Draft['modalidad'],archivo:null,referencia:''})}><option value="FINANCIADA">Financiada</option><option value="CONTADO">Al contado</option></Select></label>
    {d.modalidad==='FINANCIADA'&&<div className="grid grid-cols-2 gap-3">
     <label className="text-xs font-medium">Inicial total (S/)<Input type="number" step="0.01" value={d.inicial} disabled={d.politica.modoInicial==='FIJA'} onChange={e=>actualizar(id,{inicial:e.target.value,archivo:null,referencia:''})}/></label>
     <label className="text-xs font-medium">Cuotas ({d.politica.cuotasMin}–{d.politica.cuotasMax})<Input type="number" min={d.politica.cuotasMin} max={d.politica.cuotasMax} value={d.cuotas} onChange={e=>actualizar(id,{cuotas:e.target.value})}/></label>
     <p className="col-span-2 text-xs text-brand-500">Tasa nominal anual: {d.politica.tasaNominalAnualPct}% · Política v{d.politica.version}</p>
     {r&&<div className="col-span-2 flex flex-wrap justify-between gap-2 rounded-lg bg-brand-50 p-3 text-xs"><span>Capital: <strong>{formatSoles(r.capitalFinanciado)}</strong></span><span>Cuota mensual: <strong>{formatSoles(r.cuotaMensual)}</strong></span><span>Intereses: <strong>{formatSoles(r.interesTotal)}</strong></span></div>}
    </div>}
    <div className="flex justify-between border-t border-brand-100 pt-2 text-sm"><strong>{d.modalidad==='FINANCIADA'?'Inicial adicional a pagar':'Saldo al contado'}</strong><strong>{debe===null?'—':formatSoles(debe)}</strong></div>
    {debe!==null&&debe>0&&<div className="space-y-2 rounded-lg border border-brand-100 p-3">
     <div className="grid grid-cols-1 gap-3 sm:grid-cols-2"><label className="text-xs font-medium">Método de pago<Select value={d.metodo} onChange={e=>actualizar(id,{metodo:e.target.value as MetodoPagoVenta,referencia:'',archivo:null})}><option value="TRANSFERENCIA">Transferencia</option><option value="DEPOSITO">Depósito</option><option value="YAPE_PLIN">Yape / Plin</option><option value="EFECTIVO">Efectivo</option><option value="OTRO">Otro</option></Select></label><label className="text-xs font-medium">N.º de operación<Input maxLength={80} disabled={d.metodo==='EFECTIVO'} value={d.referencia} onChange={e=>actualizar(id,{referencia:e.target.value})}/></label></div>
     <label className="block text-xs font-semibold">Comprobante exclusivo de {d.reserva.codigoLote} *<input type="file" accept=".pdf,.jpg,.jpeg,.png,.webp" className="mt-2 block w-full text-xs" onChange={e=>{actualizar(id,{archivo:e.target.files?.[0]??null});e.target.value='';}}/></label>
     {d.archivo&&<div className="flex items-center justify-between gap-2 text-xs"><span className="truncate">{d.archivo.name}</span><Button size="sm" variant="secondary" onClick={()=>actualizar(id,{archivo:null})}>Quitar</Button></div>}
     <p className="text-xs text-brand-500">Un archivo por pago, PDF o imagen hasta 5 MB.</p>
    </div>}
    {debe===0&&<p className="text-xs text-emerald-700">La separación cubre el importe exigible. No se necesita un nuevo comprobante.</p>}
   </>}
  </article>;})}
  <div className="space-y-2 rounded-xl border border-brand-200 bg-brand-50 p-4 text-sm">
   <div className="flex justify-between"><span>Lotes a formalizar</span><strong>{seleccion.length}</strong></div>
   <div className="flex justify-between"><span>Iniciales y saldos pactados</span><strong>{formatSoles(totalInicial)}</strong></div>
   <div className="flex justify-between text-emerald-800"><span>Separaciones acreditadas</span><strong>− {formatSoles(totalCredito)}</strong></div>
   <div className="flex justify-between border-t border-brand-200 pt-2 text-base"><strong>Total a pagar</strong><strong>{seleccion.every(d=>pago(d)!==null)?formatSoles(total):'Por calcular'}</strong></div>
  </div>
  {error&&<p role="alert" className="rounded-lg bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}
  <Button variant="primary" disabled={busy||incierto||!seleccion.length||seleccion.some(d=>d.reserva.estado!=='VIGENTE'||pago(d)===null)} onClick={()=>void validar()}>Revisar y formalizar {seleccion.length} lote(s)</Button>
  <EditarDatosCompradorModal open={revisar!==null} idProspecto={idProspecto} lote={revisar?.map(d=>d.reserva.codigoLote).join(', ')??''} proyecto={revisar?.[0]?proyecto(revisar[0]):''} idProyectoVenta={revisar?.[0]?.reserva.idProyecto??0} compradorExistente={compradorExistente} modalidad={revisar?.[0]?.modalidad??'FINANCIADA'} puedeReasignar={puedeReasignar} asesorNombre={asesorNombre} onClose={()=>setRevisar(null)} onGuardar={comprador=>{if(revisar){setConfirmar({lotes:revisar,comprador});setRevisar(null);}}}/>
  <Modal open={confirmar!==null} onClose={()=>{if(!busy)setConfirmar(null);}} title="Confirmar formalización" description="Se crearán las ventas pendientes juntas, con un contrato y comprobante por lote." footer={<div className="flex justify-end gap-2"><Button variant="secondary" disabled={busy} onClick={()=>setConfirmar(null)}>Volver</Button><Button variant="primary" disabled={busy||incierto} onClick={()=>void registrar()}>{busy?'Registrando…':'Confirmar registro'}</Button></div>}>
   {confirmar?.lotes.map(d=><div key={d.reserva.idReserva} className="flex justify-between border-b border-brand-100 py-3 text-sm"><span>{d.reserva.codigoLote} · {d.modalidad==='FINANCIADA'?'Inicial adicional':'Contado'}</span><strong>{formatSoles(pago(d)??0)}</strong></div>)}
   <div className="mt-3 flex justify-between font-semibold"><span>Total a pagar</span><strong>{formatSoles((confirmar?.lotes??[]).reduce((s,d)=>s+Math.round((pago(d)??0)*100),0)/100)}</strong></div>
   {error&&<p role="alert" className="mt-2 text-sm text-rose-700">{error}</p>}
  </Modal>
 </section>;
}
