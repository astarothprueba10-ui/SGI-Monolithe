import { useState, useRef } from 'react';
import { toast } from 'sonner';
import { crmBackend, type CrmDetail } from '../../services/crmBackend';
import { coreService } from '../../services/coreService';
import type { LoteResponse } from '../../types/core';
import { Button } from '../ui/Button';
import { Select } from '../ui/Field';
import { Alert } from '../ui/Feedback';
import { formatSoles } from '../../utils/financeMoney';

export function CrmLoteInteresPanel({detalle,puedeEditar,onSaved}:{
  detalle:CrmDetail;puedeEditar:boolean;onSaved:()=>Promise<void>
}) {
  const [idInteres,setIdInteres]=useState<number|null>(null);
  const [lotes,setLotes]=useState<LoteResponse[]>([]);
  const [candidato,setCandidato]=useState('');
  const [motivo,setMotivo]=useState('');
  const [cargando,setCargando]=useState(false);
  const [guardando,setGuardando]=useState(false);
  const [error,setError]=useState('');
  const revision=useRef(0);
  const interes=detalle.intereses.find(i=>i.idInteres===idInteres);
  const abrir=async(i:CrmDetail['intereses'][number])=>{
    if(!puedeEditar||guardando)return;
    const actual=++revision.current;
    setIdInteres(i.idInteres);setLotes([]);setCandidato('');setMotivo('');setError('');setCargando(true);
    try{
      const [inventario,comercializables]=await Promise.all([
        coreService.searchLots({idProyecto:i.idProyecto,activo:true}),
        coreService.getCommercializableLots(i.idProyecto)
      ]);
      if(actual!==revision.current)return;
      const permitidos=new Set(comercializables);
      setLotes((inventario??[]).filter(l=>l.idProyecto===i.idProyecto&&l.activo===true&&l.codigoEstadoLote==='DISPONIBLE'&&permitidos.has(l.idLote)));
    }catch(e:unknown){if(actual===revision.current)setError(e instanceof Error?e.message:'No se pudieron cargar los lotes.');}
    finally{if(actual===revision.current)setCargando(false);}
  };
  const cancelar=()=>{
    if(guardando)return;
    ++revision.current;setIdInteres(null);setCargando(false);setError('');
  };
  const guardar=async()=>{
    if(!puedeEditar||!interes||guardando||motivo.trim().length<5||!lotes.some(l=>l.idLote===Number(candidato)))return;
    setGuardando(true);setError('');
    try{
      await crmBackend.cambiarLoteInteres(detalle.prospecto.id_prospecto,interes.idProyecto,Number(candidato),interes.idLoteInteres??null,motivo.trim());
      setIdInteres(null);
      toast.success('Lote de interés guardado en CRM.');
      try{await onSaved();}catch{toast.info('El lote se guardó. Vuelve a abrir el expediente para actualizar la información.');}
    }catch(e:unknown){setError(e instanceof Error?e.message:'No se pudo guardar el lote de interés.');}
    finally{setGuardando(false);}
  };
  return <div className="rounded-xl border border-brand-100 bg-white p-3 shadow-sm sm:p-4">
    <h4 className="mb-2 text-[12px] font-semibold uppercase tracking-wide text-brand-700">Intereses comerciales activos</h4>
    {!detalle.intereses.length&&<p className="text-xs text-brand-500">No hay proyectos de interés registrados.</p>}
    {detalle.reservasActivas?.filter(r=>!detalle.intereses.some(i=>i.idProyecto===r.idProyecto)).map(r=><div key={r.idReserva} className="mb-2 rounded-md border border-brand-100 p-2 text-xs">
      <strong>{r.proyecto}</strong><p>{r.lote} · {r.codigo} · {formatSoles(r.monto)} · {r.estado==='PENDIENTE'?'Pendiente de Finanzas':'Vigente'}</p>
    </div>)}
    {detalle.intereses.map(i=><div key={i.idInteres} className="mb-2 space-y-2 rounded-lg bg-brand-50/40 p-3 text-xs">
      <strong>{i.proyecto}</strong><p>Lote de interés principal: {i.codigoLoteInteres??'Sin lote identificado'}</p>
      {!!detalle.reservasActivas?.some(r=>r.idProyecto===i.idProyecto)&&<div className="space-y-1 rounded-md border border-brand-100 bg-white p-2">
        <p className="font-semibold text-brand-700">Lotes con separación registrada</p>
        {detalle.reservasActivas.filter(r=>r.idProyecto===i.idProyecto).map(r=><div key={r.idReserva} className="flex flex-wrap justify-between gap-1">
          <span className="font-medium">{r.lote} · {r.codigo}</span><span>{formatSoles(r.monto)} · {r.estado==='PENDIENTE'?'Pendiente de Finanzas':'Vigente'}</span>
        </div>)}
      </div>}
      {i.comentario&&<p className="text-brand-500">Referencia anterior: {i.comentario}</p>}
      {puedeEditar&&idInteres!==i.idInteres&&<Button type="button" variant="secondary" size="sm" disabled={guardando} onClick={()=>void abrir(i)}>
        {i.idLoteInteres?'Cambiar lote de interés':'Registrar lote de interés'}
      </Button>}
      {idInteres===i.idInteres&&<div className="space-y-2 rounded-lg border border-brand-200 bg-white p-3">
        <label className="block font-medium">Lote disponible *
          <Select className="mt-1" value={candidato} disabled={cargando||guardando} onChange={e=>setCandidato(e.target.value)}>
            <option value="">{cargando?'Consultando lotes…':'Seleccione un lote'}</option>
            {lotes.filter(l=>l.idLote!==i.idLoteInteres).map(l=><option key={l.idLote} value={l.idLote}>{l.codigo} · {l.nombreManzana??''} · {l.areaM2??0} m²</option>)}
          </Select>
        </label>
        <label className="block font-medium">Motivo *
          <textarea rows={2} maxLength={500} className="mt-1 block w-full rounded-lg border border-brand-200 p-2" disabled={guardando} value={motivo} onChange={e=>setMotivo(e.target.value)} placeholder="Preferencia expresada por el cliente"/>
        </label>
        <p className="text-brand-500">La preferencia quedará registrada en el expediente y se preseleccionará en separaciones si el lote sigue disponible.</p>
        {error&&<Alert tone="danger" title="No se pudo completar la acción">{error}</Alert>}
        <div className="flex flex-wrap justify-end gap-2">
          <Button type="button" variant="secondary" disabled={guardando} onClick={cancelar}>Cancelar</Button>
          <Button type="button" disabled={guardando||cargando||!candidato||motivo.trim().length<5} onClick={()=>void guardar()}>{guardando?'Guardando…':'Guardar interés'}</Button>
        </div>
      </div>}
    </div>)}
  </div>;
}
