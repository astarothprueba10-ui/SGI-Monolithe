import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { RefreshCwIcon, ArrowRightLeftIcon, ArrowRightIcon, EyeIcon, CalendarDaysIcon, MapPinIcon, CheckCircle2Icon, ClockIcon, XCircleIcon, InfoIcon } from 'lucide-react';
import { crmBackend, type CrmCambioReserva, type CrmReservaVigenteVenta, type CrmPreparacionVenta } from '../../services/crmBackend';
import { coreService } from '../../services/coreService';
import type { ProyectoResponse, LoteResponse } from '../../types/core';
import { formatSoles } from '../../utils/financeMoney';
import { Button } from '../ui/Button';
import { Select, Input } from '../ui/Field';
import { Card } from '../ui/Card';
import { Modal } from '../ui/Modal';
const errorText=(e:unknown)=>e instanceof Error?e.message:'No se pudo completar la operación.';
const fechaSolicitud=(fecha:string)=>{
 const d=new Date(fecha);
 return Number.isNaN(d.getTime())?'Fecha no disponible':new Intl.DateTimeFormat('es-PE',{dateStyle:'medium',timeStyle:'short',timeZone:'America/Lima'}).format(d);
};
function EstadoSolicitud({estado}:{estado:CrmCambioReserva['estado']}){
 const config=estado==='PENDIENTE'?{label:'Pendiente',tone:'bg-amber-50 text-amber-800 ring-amber-200',Icon:ClockIcon}:
  estado==='APROBADA'?{label:'Aprobada',tone:'bg-emerald-50 text-emerald-800 ring-emerald-200',Icon:CheckCircle2Icon}:
  estado==='RECHAZADA'?{label:'Rechazada',tone:'bg-rose-50 text-rose-800 ring-rose-200',Icon:XCircleIcon}:
  {label:estado,tone:'bg-brand-50 text-brand-700 ring-brand-200',Icon:InfoIcon};
 return <span className={'inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ring-1 ring-inset '+config.tone}><config.Icon className="h-3.5 w-3.5" aria-hidden="true"/>{config.label}</span>;
}
function TrayectoReserva({s}:{s:CrmCambioReserva}){
 return <div className="grid grid-cols-1 items-center gap-2 sm:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)]">
  <div className="min-w-0 rounded-xl border border-brand-200 bg-brand-50/60 p-3">
   <p className="text-xs font-medium text-brand-600">Lote de origen</p>
   <p className="mt-1 break-words text-base font-bold text-brand-900">{s.loteAnterior}</p>
   <p className="mt-1 break-words text-xs text-brand-600">{s.proyectoAnterior}</p>
  </div>
  <ArrowRightIcon aria-hidden="true" className="mx-auto h-5 w-5 rotate-90 text-brand-400 sm:rotate-0"/>
  <div className="min-w-0 rounded-xl border border-emerald-200 bg-emerald-50/70 p-3">
   <p className="text-xs font-medium text-emerald-800">Lote solicitado</p>
   <p className="mt-1 break-words text-base font-bold text-brand-900">{s.loteNuevo}</p>
   <p className="mt-1 break-words text-xs text-brand-600">{s.proyectoNuevo}</p>
  </div>
 </div>;
}
function ResumenImportes({s}:{s:CrmCambioReserva}){
 return <div className="grid gap-2 sm:grid-cols-2">
  <div className="rounded-lg bg-brand-50 p-3"><p className="text-xs text-brand-600">Abono conservado</p><p className="mt-1 text-base font-semibold tabular-nums text-emerald-800">{formatSoles(s.credito)}</p></div>
  <div className="rounded-lg bg-brand-50 p-3"><p className="text-xs text-brand-600">Precio del lote destino al solicitar</p><p className="mt-1 text-base font-semibold tabular-nums text-brand-900">{formatSoles(s.precioDestino)}</p></div>
 </div>;
}
function EfectoSolicitud({s}:{s:CrmCambioReserva}){
 return <section className="space-y-2 rounded-xl border border-brand-200 bg-brand-50/50 p-4 text-sm text-brand-700">
  <h4 className="flex items-center gap-2 font-semibold text-brand-900"><InfoIcon className="h-4 w-4" aria-hidden="true"/>{s.estado==='PENDIENTE'?'¿Qué sucede al aprobar?':'Resultado de la solicitud'}</h4>
  {s.estado==='PENDIENTE'?<>
   <p>La reserva pasará al lote <strong>{s.loteNuevo}</strong> y el lote <strong>{s.loteAnterior}</strong> volverá a quedar disponible en el inventario. El traslado solo se realiza si el destino sigue disponible y sus condiciones comerciales no han cambiado.</p>
   <p>Se conservarán el abono de <strong>{formatSoles(s.credito)}</strong> y el vencimiento original. La aprobación no registra una venta.</p>
  </>:s.estado==='APROBADA'?<p>La reserva se trasladó de <strong>{s.loteAnterior}</strong> a <strong>{s.loteNuevo}</strong> al aprobar el cambio. Se conservaron el abono y el vencimiento original.</p>:
  s.estado==='RECHAZADA'?<p>El cambio no se realizó. La decisión conservó la reserva de origen y sus condiciones.</p>:<p>Consulta el estado actualizado antes de continuar.</p>}
  {Number(s.credito)!==Number(s.separacionDestino)&&<p className="rounded-lg bg-amber-50 p-3 text-xs text-amber-900">Separación de referencia del destino: {formatSoles(s.separacionDestino)}. Se conserva el abono original; la diferencia se contempla en el saldo de venta.</p>}
 </section>;
}
export function CambiosReservaPanel({onRecuperar}:{onRecuperar?:(solicitud:CrmCambioReserva)=>void}){
 const [items,setItems]=useState<CrmCambioReserva[]>([]);
 const [loading,setLoading]=useState(true);
 const [error,setError]=useState('');
 const [rev,setRev]=useState(0);
 const [detalleId,setDetalleId]=useState<number|null>(null);
 const [decision,setDecision]=useState<{item:CrmCambioReserva;aprobar:boolean}|null>(null);
 const [motivo,setMotivo]=useState('');
 const [busy,setBusy]=useState(false);
 const detalle=items.find(s=>s.idSolicitud===detalleId);
 const accionesBloqueadas=busy||loading||!!error;
 useEffect(()=>{let live=true;setLoading(true);setError('');
  void crmBackend.listarCambiosReserva().then(x=>{if(live)setItems(x.items);})
   .catch(e=>{if(live)setError(errorText(e));}).finally(()=>{if(live)setLoading(false);});
  return()=>{live=false;};},[rev]);
 const abrirDetalle=(s:CrmCambioReserva)=>{setDetalleId(s.idSolicitud);setDecision(null);setMotivo('');};
 const iniciarDecision=(s:CrmCambioReserva,aprobar:boolean)=>{
  if(accionesBloqueadas||!s.puedeDecidir||s.estado!=='PENDIENTE')return;
  setDetalleId(s.idSolicitud);setDecision({item:s,aprobar});setMotivo('');
 };
 const cerrarDetalle=()=>{if(busy)return;setDetalleId(null);setDecision(null);setMotivo('');};
 const resolver=async()=>{
  if(!decision||accionesBloqueadas||motivo.trim().length<5||!detalle?.puedeDecidir||detalle.estado!=='PENDIENTE'||detalle.idSolicitud!==decision.item.idSolicitud)return;
  setBusy(true);
  try{
   await crmBackend.decidirCambioReserva(decision.item.idSolicitud,{aprobar:decision.aprobar,motivo:motivo.trim()});
   toast.success(decision.aprobar?'Cambio aprobado y lote trasladado':'Solicitud rechazada');
   setDetalleId(null);setDecision(null);setMotivo('');setLoading(true);setRev(n=>n+1);
   window.dispatchEvent(new Event('sgi:financiamiento-alertas-actualizadas'));
  }catch(e){toast.error('No se pudo resolver la solicitud',{description:errorText(e)});}
  finally{setBusy(false);}
 };
 return <Card className="space-y-4 p-4">
   <div className="flex flex-wrap items-center justify-between gap-3">
    <div><h3 className="font-semibold text-brand-900">Solicitudes de cambio de reserva</h3>
    <p className="text-xs text-brand-600">Consulta los cambios de lote y proyecto. Solo Gerencia o Supervisión puede aprobar.</p></div>
    <Button icon={RefreshCwIcon} disabled={loading||busy} onClick={()=>{setLoading(true);setRev(n=>n+1);}}>Actualizar</Button>
   </div>
   {error&&<p role="alert" className="text-sm text-rose-700">{error}</p>}
   {loading?<p role="status" className="text-sm text-brand-500">Consultando solicitudes…</p>:!items.length&&!error?<p className="text-sm text-brand-500">No tienes solicitudes de cambio.</p>:null}
   {items.map(s=><article key={s.idSolicitud} className="overflow-hidden rounded-2xl border border-brand-200 bg-white shadow-sm">
    <header className="flex flex-wrap items-start justify-between gap-3 border-b border-brand-100 bg-brand-50/50 px-4 py-3 sm:px-5">
     <div className="min-w-0 flex-1">
      <div className="flex flex-wrap items-center gap-2 text-xs text-brand-600"><span className="rounded-md border border-brand-200 bg-white px-2 py-0.5 font-semibold">Solicitud #{s.idSolicitud}</span><span>{s.codigoReserva}</span></div>
      <h4 className="mt-2 break-words text-base font-bold text-brand-900">{s.cliente}</h4>
      <p className="mt-1 flex items-center gap-1.5 text-xs text-brand-600"><CalendarDaysIcon className="h-3.5 w-3.5" aria-hidden="true"/>{fechaSolicitud(s.fecha)}</p>
     </div>
     <EstadoSolicitud estado={s.estado}/>
    </header>
    <div className="space-y-3 p-4 sm:px-5">
     <TrayectoReserva s={s}/>
     <div className="min-w-0"><p className="text-xs font-medium text-brand-600">Motivo del cambio</p><p className="mt-1 line-clamp-2 break-words text-sm text-brand-900">{s.motivo}</p></div>
     <ResumenImportes s={s}/>
     {s.estado==='APROBADA'&&s.puedeRecuperar&&onRecuperar&&<div className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-emerald-50 p-3">
      <p className="text-xs text-emerald-800">Cambio aprobado. Puedes recuperar la preparación de la venta.</p>
      <Button type="button" variant="primary" size="sm" disabled={accionesBloqueadas} onClick={()=>onRecuperar(s)}>Recuperar proceso de venta</Button>
     </div>}
    </div>
    <footer className="flex flex-wrap items-center justify-between gap-2 border-t border-brand-100 px-4 py-3 sm:px-5">
     <Button type="button" size="sm" variant="secondary" icon={EyeIcon} disabled={accionesBloqueadas} onClick={()=>abrirDetalle(s)}>Ver detalle</Button>
     {s.puedeDecidir&&s.estado==='PENDIENTE'&&<div className="flex flex-wrap gap-2">
      <Button type="button" size="sm" variant="danger" disabled={accionesBloqueadas} onClick={()=>iniciarDecision(s,false)}>Rechazar</Button>
      <Button type="button" size="sm" variant="success" disabled={accionesBloqueadas} onClick={()=>iniciarDecision(s,true)}>Aprobar cambio</Button>
     </div>}
    </footer>
   </article>)}
   <Modal open={!!detalle} onClose={cerrarDetalle} title="Detalle de solicitud de cambio" description="Revisa la reserva y las condiciones del traslado." width="max-w-3xl"
    footer={<>
     <Button type="button" variant="secondary" disabled={busy} onClick={cerrarDetalle}>Cerrar</Button>
     {detalle?.puedeDecidir&&detalle.estado==='PENDIENTE'&&!decision&&<>
      <Button type="button" variant="danger" disabled={accionesBloqueadas} onClick={()=>iniciarDecision(detalle,false)}>Rechazar</Button>
      <Button type="button" variant="success" disabled={accionesBloqueadas} onClick={()=>iniciarDecision(detalle,true)}>Aprobar cambio</Button>
     </>}
     {decision&&<><Button type="button" disabled={busy} onClick={()=>{setDecision(null);setMotivo('');}}>Volver al detalle</Button>
      <Button type="button" variant={decision.aprobar?'success':'danger'} disabled={accionesBloqueadas||motivo.trim().length<5||!detalle?.puedeDecidir||detalle.estado!=='PENDIENTE'} onClick={()=>void resolver()}>{busy?'Procesando…':decision.aprobar?'Confirmar aprobación':'Confirmar rechazo'}</Button></>}
     {detalle&&detalle.estado==='APROBADA'&&detalle.puedeRecuperar&&onRecuperar&&<Button type="button" variant="primary" disabled={accionesBloqueadas} onClick={()=>{cerrarDetalle();onRecuperar(detalle);}}>Recuperar proceso de venta</Button>}
    </>}>
    {detalle&&<div className="space-y-4">
     <header className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#101f32] via-[#18354a] to-[#087b67] p-4 text-white sm:p-5">
      <div aria-hidden="true" className="pointer-events-none absolute -right-10 -top-20 h-52 w-52 rounded-full bg-white/10"/>
      <div className="relative flex flex-wrap items-start justify-between gap-3">
       <div className="min-w-0 flex-1"><p className="text-xs font-medium text-white/80">Solicitud #{detalle.idSolicitud} · {detalle.codigoReserva}</p><h3 className="mt-2 break-words text-xl font-bold">{detalle.cliente}</h3><p className="mt-2 text-xs text-white/80">Solicitada: {fechaSolicitud(detalle.fecha)}</p></div>
       <EstadoSolicitud estado={detalle.estado}/>
      </div>
     </header>
     <section className="space-y-2"><h4 className="flex items-center gap-2 text-sm font-semibold text-brand-900"><MapPinIcon className="h-4 w-4" aria-hidden="true"/>Cambio solicitado</h4>
      <TrayectoReserva s={detalle}/>
      <p className="text-sm text-brand-700">{detalle.cliente} solicitó trasladar su reserva del lote <strong>{detalle.loteAnterior}</strong> al lote <strong>{detalle.loteNuevo}</strong>{detalle.proyectoAnterior===detalle.proyectoNuevo?' dentro del mismo proyecto.':' en '+detalle.proyectoNuevo+'.'}</p>
     </section>
     <section className="rounded-xl border border-brand-200 p-4"><h4 className="text-sm font-semibold text-brand-900">Motivo registrado</h4><p className="mt-2 whitespace-pre-wrap break-words text-sm text-brand-700">{detalle.motivo}</p></section>
     <ResumenImportes s={detalle}/>
     <EfectoSolicitud s={detalle}/>
     {detalle.decision&&<section className="rounded-xl border border-brand-200 p-4"><h4 className="text-sm font-semibold text-brand-900">Sustento de la decisión</h4><p className="mt-2 whitespace-pre-wrap break-words text-sm text-brand-700">{detalle.decision}</p></section>}
     {decision&&<section className="space-y-2 rounded-xl border border-brand-200 p-4">
      <h4 className="text-sm font-semibold text-brand-900">{decision.aprobar?'Confirmar aprobación':'Confirmar rechazo'}</h4>
      <label className="block text-xs font-medium text-brand-700">Sustento de la decisión *
       <Input value={motivo} onChange={e=>setMotivo(e.target.value)} maxLength={500} className="mt-1" disabled={busy}/>
      </label>
      <p className="text-xs text-brand-600">Escribe al menos 5 caracteres. El sustento se guardará en el historial de la solicitud.</p>
     </section>}
    </div>}
   </Modal>
 </Card>;
}
export type CambioReservaPendienteResumen=Pick<CrmCambioReserva,'idSolicitud'|'loteAnterior'|'loteNuevo'|'proyectoNuevo'>;
export function ReservasVentaPanel({idProspecto,reservas,idLoteSeleccionado,disabled,onSeleccionar,onActualizar,onSolicitudPendiente,obtenerPreparacion}:{
 idProspecto:number;reservas:CrmReservaVigenteVenta[];idLoteSeleccionado:number;disabled:boolean;
 onSeleccionar:(r:CrmReservaVigenteVenta)=>void;onActualizar:()=>void;
 onSolicitudPendiente:(solicitud:CambioReservaPendienteResumen)=>void;
 obtenerPreparacion:()=>CrmPreparacionVenta;
}){
 const [items,setItems]=useState<CrmCambioReserva[]>([]);
 const [proyectos,setProyectos]=useState<ProyectoResponse[]>([]);
 const [lotes,setLotes]=useState<LoteResponse[]>([]);
 const [editor,setEditor]=useState<CrmReservaVigenteVenta|null>(null);
 const [proyecto,setProyecto]=useState('');
 const [lote,setLote]=useState('');
 const [motivo,setMotivo]=useState('');
 const [loading,setLoading]=useState(false);
 const [busy,setBusy]=useState(false);
 const [error,setError]=useState('');
 const [rev,setRev]=useState(0);
 useEffect(()=>{let live=true;
  void Promise.all([crmBackend.listarCambiosReserva(idProspecto),coreService.getActiveProjects()]).then(([x,p])=>{if(live){setItems(x.items);setProyectos(p.filter(a=>a.activo));}})
   .catch(e=>{if(live)setError(errorText(e));});
  return()=>{live=false;};},[idProspecto,rev]);
 useEffect(()=>{setEditor(null);setLote('');setMotivo('');setError('');},[idProspecto]);
 useEffect(()=>{let live=true;setLotes([]);setLote('');
  if(!editor||!proyecto)return;
  setLoading(true);
  void Promise.all([coreService.searchLots({idProyecto:Number(proyecto),activo:true}),coreService.getCommercializableLots(Number(proyecto))])
   .then(([all,ids])=>{if(live){const permitidos=new Set(ids);setLotes(all.filter(l=>l.activo&&l.codigoEstadoLote==='DISPONIBLE'&&permitidos.has(l.idLote)));}})
   .catch(e=>{if(live)setError(errorText(e));}).finally(()=>{if(live)setLoading(false);});
  return()=>{live=false;};},[editor,proyecto]);
 const solicitar=async()=>{
  if(!editor||!lote||motivo.trim().length<5||busy)return;
  setBusy(true);setError('');
  try{const respuesta=await crmBackend.solicitarCambioReserva({idProspecto,idReserva:editor.idReserva,idLote:Number(lote),motivo:motivo.trim(),preparacionVenta:obtenerPreparacion()});
   onSolicitudPendiente({idSolicitud:respuesta.idSolicitud,loteAnterior:editor.codigoLote,
     loteNuevo:lotes.find(l=>l.idLote===Number(lote))?.codigo??'Lote seleccionado',
     proyectoNuevo:proyectos.find(p=>p.idProyecto===Number(proyecto))?.nombre??'Proyecto seleccionado'});
   toast.success('Solicitud enviada a Gerencia y Supervisión');setEditor(null);setRev(n=>n+1);
   window.dispatchEvent(new Event('sgi:financiamiento-alertas-actualizadas'));
  }catch(e){setError(errorText(e));}finally{setBusy(false);}
 };
 return <section className="space-y-3 rounded-xl border border-brand-200 bg-brand-50/40 p-3">
  <div className="flex flex-wrap items-center justify-between gap-2">
   <h4 className="text-sm font-semibold text-brand-900">Lotes reservados ({reservas.length})</h4>
   <Button size="sm" icon={RefreshCwIcon} disabled={disabled||busy} onClick={()=>{setRev(n=>n+1);onActualizar();}}>Actualizar reservas</Button>
  </div>
  {reservas.map(r=>{
   const pendiente=items.find(s=>s.idReserva===r.idReserva&&s.estado==='PENDIENTE');
   const seleccionado=r.idLote===idLoteSeleccionado;
   return <div key={r.idReserva} className={'space-y-2 rounded-lg border bg-white p-3 '+(seleccionado?'border-brand-500':'border-brand-200')}>
    <div className="flex flex-wrap items-start justify-between gap-2">
     <div><p className="text-sm font-bold">{r.codigoLote}</p><p className="text-xs text-brand-600">{proyectos.find(p=>p.idProyecto===r.idProyecto)?.nombre||r.codigoReserva} · {r.codigoReserva}</p>
      <p className="text-xs text-brand-600">Separación: {formatSoles(r.montoReserva)} · Crédito confirmado: {formatSoles(r.montoReservaAplicable??0)}</p></div>
     <span className={'rounded px-2 py-1 text-xs font-semibold '+(r.estado==='PENDIENTE'?'bg-amber-50 text-amber-800':'bg-emerald-50 text-emerald-800')}>{r.estado==='PENDIENTE'?'Pendiente de Finanzas':'Vigente'}</span>
    </div>
    {pendiente?<p className="text-xs text-amber-800">Solicitud #{pendiente.idSolicitud}: {pendiente.loteNuevo} · Pendiente de aprobación.</p>:null}
    <div className="flex flex-wrap gap-2">
     {reservas.length>1&&<Button size="sm" variant={seleccionado?'primary':'secondary'} disabled={disabled||busy||seleccionado} onClick={()=>onSeleccionar(r)}>{seleccionado?'Seleccionado':'Seleccionar lote'}</Button>}
     <Button size="sm" icon={ArrowRightLeftIcon} disabled={disabled||busy||Boolean(pendiente)} onClick={()=>{setEditor(r);setProyecto(String(r.idProyecto));setMotivo('');setError('');}}>Cambiar lote seleccionado</Button>
     <Button size="sm" disabled={disabled||busy||Boolean(pendiente)} onClick={()=>{setEditor(r);setProyecto('');setMotivo('');setError('');}}>Cambiar proyecto</Button>
    </div>
   </div>;
  })}
  {editor&&<div className="space-y-2 rounded-lg border border-brand-200 bg-white p-3">
   <h5 className="text-sm font-semibold">Solicitar cambio de {editor.codigoLote}</h5>
   <label className="block text-xs font-semibold">Proyecto de destino
    <Select value={proyecto} onChange={e=>setProyecto(e.target.value)} disabled={busy} className="mt-1">
     <option value="">Selecciona proyecto</option>{proyectos.map(p=><option key={p.idProyecto} value={p.idProyecto}>{p.nombre}</option>)}
    </Select>
   </label>
   <label className="block text-xs font-semibold">Nuevo lote
    <Select value={lote} onChange={e=>setLote(e.target.value)} disabled={!proyecto||loading||busy} className="mt-1">
     <option value="">{loading?'Cargando inventario…':'Selecciona lote disponible'}</option>{lotes.map(l=><option key={l.idLote} value={l.idLote}>{l.codigo}</option>)}
    </Select>
   </label>
   <label className="block text-xs font-semibold">Motivo del cambio
    <Input value={motivo} maxLength={500} onChange={e=>setMotivo(e.target.value)} disabled={busy} className="mt-1"/>
   </label>
   <p className="text-xs text-brand-600">El lote y los pagos originales se conservan hasta aprobarse la solicitud.</p>
   <div className="flex flex-wrap justify-end gap-2"><Button disabled={busy} onClick={()=>setEditor(null)}>Cancelar</Button>
    <Button variant="primary" disabled={busy||loading||!lote||motivo.trim().length<5} onClick={()=>void solicitar()}>{busy?'Enviando…':'Enviar solicitud'}</Button></div>
  </div>}
  {error&&<p role="alert" className="text-xs text-rose-700">{error}</p>}
 </section>;
}
