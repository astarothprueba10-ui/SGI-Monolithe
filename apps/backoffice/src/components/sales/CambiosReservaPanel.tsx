import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { RefreshCwIcon, ArrowRightLeftIcon } from 'lucide-react';
import { crmBackend, type CrmCambioReserva, type CrmReservaVigenteVenta, type CrmPreparacionVenta } from '../../services/crmBackend';
import { coreService } from '../../services/coreService';
import type { ProyectoResponse, LoteResponse } from '../../types/core';
import { formatSoles } from '../../utils/financeMoney';
import { Button } from '../ui/Button';
import { Select, Input } from '../ui/Field';
import { Card } from '../ui/Card';
const errorText=(e:unknown)=>e instanceof Error?e.message:'No se pudo completar la operación.';
export function CambiosReservaPanel({onRecuperar}:{onRecuperar?:(solicitud:CrmCambioReserva)=>void}){
 const [items,setItems]=useState<CrmCambioReserva[]>([]);
 const [loading,setLoading]=useState(true);
 const [error,setError]=useState('');
 const [rev,setRev]=useState(0);
 const [decision,setDecision]=useState<{item:CrmCambioReserva;aprobar:boolean}|null>(null);
 const [motivo,setMotivo]=useState('');
 const [busy,setBusy]=useState(false);
 useEffect(()=>{let live=true;setLoading(true);setError('');
  void crmBackend.listarCambiosReserva().then(x=>{if(live)setItems(x.items);})
   .catch(e=>{if(live)setError(errorText(e));}).finally(()=>{if(live)setLoading(false);});
  return()=>{live=false;};},[rev]);
 const resolver=async()=>{
  if(!decision||busy||motivo.trim().length<5)return;
  setBusy(true);
  try{
   await crmBackend.decidirCambioReserva(decision.item.idSolicitud,{aprobar:decision.aprobar,motivo:motivo.trim()});
   toast.success(decision.aprobar?'Cambio aprobado y lote trasladado':'Solicitud rechazada');
   setDecision(null);setRev(n=>n+1);
   window.dispatchEvent(new Event('sgi:financiamiento-alertas-actualizadas'));
  }catch(e){toast.error('No se pudo resolver la solicitud',{description:errorText(e)});}
  finally{setBusy(false);}
 };
 return <Card className="space-y-4 p-4">
   <div className="flex flex-wrap items-center justify-between gap-3">
    <div><h3 className="font-semibold text-brand-900">Solicitudes de cambio de reserva</h3>
    <p className="text-xs text-brand-600">Solo Gerencia o Supervisión puede aprobar. Se conserva el abono y el vencimiento original.</p></div>
    <Button icon={RefreshCwIcon} disabled={loading} onClick={()=>setRev(n=>n+1)}>Actualizar</Button>
   </div>
   {error&&<p role="alert" className="text-sm text-rose-700">{error}</p>}
   {loading?<p className="text-sm text-brand-500">Consultando solicitudes…</p>:!items.length&&!error?<p className="text-sm text-brand-500">No tienes solicitudes de cambio.</p>:null}
   {items.map(s=><article key={s.idSolicitud} className="space-y-2 rounded-lg border border-brand-200 p-3">
    <div className="flex flex-wrap items-center justify-between gap-2"><strong className="text-sm">{s.cliente} · {s.codigoReserva}</strong>
     <span className={'rounded-md px-2 py-1 text-xs font-semibold '+(s.estado==='PENDIENTE'?'bg-amber-50 text-amber-800':s.estado==='APROBADA'?'bg-emerald-50 text-emerald-800':'bg-rose-50 text-rose-800')}>{s.estado}</span></div>
    <p className="text-sm">{s.proyectoAnterior} / <strong>{s.loteAnterior}</strong> → {s.proyectoNuevo} / <strong>{s.loteNuevo}</strong></p>
    <p className="text-xs text-brand-600">Motivo: {s.motivo} · Abono conservado: {formatSoles(s.credito)} · Precio destino: {formatSoles(s.precioDestino)}</p>
    {s.credito!==s.separacionDestino&&<p className="text-xs text-amber-800">Separación de referencia del destino: {formatSoles(s.separacionDestino)}. Se mantiene el abono original; la diferencia se contempla en el saldo de venta.</p>}
    {s.decision&&<p className="text-xs text-brand-600">Decisión: {s.decision}</p>}
    {s.estado==='APROBADA'&&s.puedeRecuperar&&onRecuperar&&<div className="flex flex-wrap items-center justify-between gap-2 rounded-md bg-emerald-50 p-3">
      <p className="text-xs text-emerald-800">Cambio aprobado. Puedes recuperar la preparación de la venta.</p>
      <Button type="button" variant="primary" size="sm" disabled={busy||loading} onClick={()=>onRecuperar(s)}>Recuperar proceso de venta</Button>
    </div>}
    {s.puedeDecidir&&<div className="flex flex-wrap gap-2">
      <Button size="sm" variant="success" disabled={busy} onClick={()=>{setDecision({item:s,aprobar:true});setMotivo('');}}>Aprobar cambio</Button>
      <Button size="sm" variant="danger" disabled={busy} onClick={()=>{setDecision({item:s,aprobar:false});setMotivo('');}}>Rechazar</Button>
    </div>}
    {decision?.item.idSolicitud===s.idSolicitud&&<div className="space-y-2 rounded-md bg-brand-50 p-3">
      <label className="block text-xs font-medium">Sustento de la decisión
       <Input value={motivo} onChange={e=>setMotivo(e.target.value)} maxLength={500} className="mt-1" disabled={busy}/>
      </label>
      <div className="flex justify-end gap-2"><Button disabled={busy} onClick={()=>setDecision(null)}>Cancelar</Button>
       <Button variant={decision.aprobar?'primary':'danger'} disabled={busy||motivo.trim().length<5} onClick={()=>void resolver()}>{busy?'Procesando…':'Confirmar decisión'}</Button></div>
    </div>}
   </article>)}
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
