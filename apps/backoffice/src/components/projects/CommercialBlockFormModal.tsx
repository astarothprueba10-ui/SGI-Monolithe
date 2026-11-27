import {useState} from 'react';
import {Modal} from '../ui/Modal';
import {Button} from '../ui/Button';
import {Input,FieldLabel,Select} from '../ui/Field';
import {commercialBlockService,estadoManzana,etiquetasManzana} from '../../services/commercialBlockService';
import type {ListadoManzanas,ManzanaComercial} from '../../services/commercialBlockService';
import type {ProyectoResponse} from '../../types/core';
type Props={project:ProyectoResponse;listado:ListadoManzanas;block:ManzanaComercial|null;etapaInicial:string;onClose:()=>void;onSuccess:(data:ListadoManzanas)=>void};
export function CommercialBlockFormModal({project,listado,block,etapaInicial,onClose,onSuccess}:Props){
 const [codigo,setCodigo]=useState(block?.codigo??listado.codigoSugerido);
 const [nombre,setNombre]=useState(block?.nombre??listado.nombreSugerido);
 const [etapa,setEtapa]=useState(block?.codigoEtapa??(listado.etapas.some(e=>e.codigo===etapaInicial)?etapaInicial:listado.etapas[0]?.codigo??''));
 const [activa,setActiva]=useState(block?.activa??true);
 const [zonas,setZonas]=useState<number[]>(block?.zonas.map(z=>z.id)??[]);
 const [busy,setBusy]=useState(false);
 const [error,setError]=useState('');
 const [confirmar,setConfirmar]=useState(false);
 const seleccion=listado.etapas.find(e=>e.codigo===etapa);
 const estado=estadoManzana(activa,block?.lotes??0,block?.vendidos??0,!!seleccion?.habilitada);
 const valido=!!seleccion&&/^[A-Z0-9][A-Z0-9_-]{0,29}$/.test(codigo)&&!!nombre.trim()&&zonas.length>0&&zonas.every(id=>listado.zonas.some(z=>z.id===id&&z.activa));
 const cambiaEtapa=!!block&&block.codigoEtapa!==etapa;
 const tieneLotes=(block?.lotes??0)>0;
 const cambiarCodigo=(v:string)=>{
   const normal=v.toUpperCase().replace(/[^A-Z0-9_-]/g,'');
   if(nombre===`Manzana ${codigo.replace(/^.*[-_]/,'')}`)setNombre(`Manzana ${normal.replace(/^.*[-_]/,'')}`);
   setCodigo(normal);
 };
 async function guardar(){
   if(!valido||busy)return;
   setBusy(true);setError('');
   try{
     const data=await commercialBlockService.guardar(project.idProyecto,{id:block?.id??null,revision:listado.revision,codigo,nombre:nombre.trim(),codigoEtapa:etapa,activa,zonas:[...zonas].sort((a,b)=>a-b)});
     onSuccess(data);onClose();
   }catch(e){setError(e instanceof Error?e.message:'No se pudo guardar la manzana.');setConfirmar(false);}
   finally{setBusy(false);}
 }
 return <Modal open onClose={()=>{if(!busy)onClose();}} title={confirmar?'Confirmar cambios de manzana':block?'Editar manzana':'Nueva manzana'} width="max-w-2xl" footer={<><Button variant="ghost" disabled={busy} onClick={()=>confirmar?setConfirmar(false):onClose()}>{confirmar?'Volver':'Cancelar'}</Button><Button variant="primary" disabled={!valido||busy} onClick={()=>confirmar?void guardar():setConfirmar(true)}>{busy?'Guardando…':confirmar?'Confirmar y guardar':block?'Guardar cambios':'Crear manzana'}</Button></>}>
   <div className="space-y-4">
    <div className="rounded-lg border border-brand-100 bg-brand-50/50 p-3 text-xs"><p className="text-brand-500">Proyecto</p><strong className="text-sm text-brand-900">{project.nombre}</strong><p className="font-mono text-brand-600">{project.codigo}</p></div>
    {error&&<div role="alert" className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}
    {!confirmar?<fieldset disabled={busy} className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2">
       <div><FieldLabel htmlFor="manzana-etapa-comercial">Etapa comercial *</FieldLabel><Select id="manzana-etapa-comercial" value={etapa} onChange={e=>setEtapa(e.target.value)}><option value="">Seleccionar etapa…</option>{listado.etapas.map(e=><option key={e.codigo} value={e.codigo}>{e.nombre} ({e.codigo})</option>)}</Select></div>
       <div><FieldLabel htmlFor="manzana-estado-comercial">Estado</FieldLabel><Select id="manzana-estado-comercial" value={estado} onChange={e=>setActiva(e.target.value!=='INACTIVA')} disabled={estado==='VENDIDA'||tieneLotes}><option value="ACTIVA" disabled={!seleccion?.habilitada}>Activa</option><option value="INACTIVA" disabled={tieneLotes}>Inactiva</option><option value="BLOQUEADA_COMERCIALMENTE" disabled={!!seleccion?.habilitada}>Bloqueada comercialmente</option>{estado==='VENDIDA'&&<option value="VENDIDA">Vendida</option>}</Select><p className="mt-1 text-xs text-brand-500">La disponibilidad de la etapa y las ventas determinan el estado comercial.</p></div>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
       <div><FieldLabel htmlFor="manzana-codigo">Código *</FieldLabel><Input id="manzana-codigo" value={codigo} maxLength={30} placeholder={listado.codigoSugerido} disabled={tieneLotes} onChange={e=>cambiarCodigo(e.target.value)}/></div>
       <div><FieldLabel htmlFor="manzana-nombre">Nombre *</FieldLabel><Input id="manzana-nombre" maxLength={100} value={nombre} placeholder={listado.nombreSugerido} onChange={e=>setNombre(e.target.value)}/></div>
      </div>
      {tieneLotes&&<p className="text-xs text-brand-500">El código no se cambia cuando existen lotes asociados, para proteger sus referencias.</p>}
      <div><FieldLabel>Zonas asociadas *</FieldLabel><p className="mb-2 text-xs text-brand-500">Selecciona las zonas que contendrá la manzana. Las zonas utilizadas por los lotes existentes deben conservarse.</p>
       <div className="flex flex-wrap gap-2">{listado.zonas.filter(z=>z.activa||zonas.includes(z.id)).map(z=><label key={z.id} className={`flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-sm ${zonas.includes(z.id)?'border-brand-400 bg-brand-50':'border-brand-100'}`}><input type="checkbox" checked={zonas.includes(z.id)} disabled={!z.activa&&!zonas.includes(z.id)} onChange={e=>setZonas(p=>e.target.checked?[...p,z.id]:p.filter(id=>id!==z.id))}/><strong>{z.codigo}</strong><span>{z.nombre}{!z.activa?' (inactiva)':''}</span></label>)}</div>
       {!listado.zonas.some(z=>z.activa)&&<p className="text-sm text-amber-700">Crea o activa una zona antes de guardar.</p>}
      </div>
    </fieldset>:<div className="space-y-3 text-sm"><p><strong>{codigo} · {nombre}</strong></p><p>Etapa comercial: {seleccion?.nombre}</p><p>Estado resultante: {etiquetasManzana[estado]}</p><p>Zonas: {listado.zonas.filter(z=>zonas.includes(z.id)).map(z=>z.codigo).join(', ')}</p>{cambiaEtapa&&<p className="rounded-md bg-amber-50 p-3 text-amber-800">Se revisarán los precios y disponibilidad de los lotes elegibles. Las operaciones protegidas conservan sus condiciones.</p>}</div>}
   </div>
 </Modal>;
}
