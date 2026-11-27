import {useEffect,useState} from 'react';
import {Modal} from '../ui/Modal';
import {Button} from '../ui/Button';
import {FieldLabel,Input,Select} from '../ui/Field';
import {commercialLotService,estadoLote,soles} from '../../services/commercialLotService';
import type {FilaLote,ListadoLotes,VistaLote,ConsultaLote} from '../../services/commercialLotService';
import type {ProyectoResponse} from '../../types/core';

type Props={project:ProyectoResponse;data:ListadoLotes;fila:FilaLote|null;etapaInicial:string;onClose:()=>void;onSuccess:(data:ListadoLotes)=>void};
const dimensiones=[['areaM2','Área m² *'],['frenteM','Frente m'],['fondoM','Fondo m'],['lateralDerechoM','Lat. der. m'],['lateralIzquierdoM','Lat. izq. m']] as const;
export function CommercialLotFormModal({project,data,fila,etapaInicial,onClose,onSuccess}:Props){
 const lot=fila?.lote;const cat=data.catalogo;
 const [etapa,setEtapa]=useState(fila?.codigoEtapa??(etapaInicial==='all'?'':etapaInicial));
 const [manzana,setManzana]=useState(lot?.idManzana?String(lot.idManzana):'');
 const [zona,setZona]=useState(lot?.idZona?String(lot.idZona):'');
 const [medidas,setMedidas]=useState(()=>Object.fromEntries(dimensiones.map(([k])=>[k,lot?.[k]==null?'':String(lot[k])])) as Record<typeof dimensiones[number][0],string>);
 const [observaciones,setObservaciones]=useState(lot?.observaciones??'');
 const [vista,setVista]=useState<VistaLote|null>(null);
 const [claveVista,setClaveVista]=useState('');
 const [loading,setLoading]=useState(false);const [busy,setBusy]=useState(false);
 const [error,setError]=useState('');const [revisionError,setRevisionError]=useState('');
 const [retry,setRetry]=useState(0);
 const opcionesManzana=cat.manzanas.filter(m=>m.activa&&(lot?m.id===lot.idManzana:m.codigoEtapa===etapa));
 const bloque=cat.manzanas.find(m=>String(m.id)===manzana);
 const opcionesZona=bloque?.zonas.filter(z=>z.activa)??[];
 const seleccion=cat.etapas.find(e=>e.codigo===etapa);
 const numero=data.sugerencias[manzana]?.numero;const codigo=data.sugerencias[manzana]?.codigo;
 const validMedidas=dimensiones.every(([k])=>(k!=='areaM2'&&!medidas[k])||(/^\d{1,10}(\.\d{1,2})?$/.test(medidas[k])&&Number(medidas[k])>0));
 const puedeRevisar=!!etapa&&!!manzana&&!!zona&&Number(medidas.areaM2)>0&&/^\d{1,10}(\.\d{1,2})?$/.test(medidas.areaM2)&&!fila?.protegido;
 function consulta():ConsultaLote{return {idLote:lot?.idLote??null,idManzana:Number(manzana),idZona:Number(zona),codigoEtapa:etapa,areaM2:Number(medidas.areaM2)};}
 const claveConsulta=JSON.stringify(consulta());
 useEffect(()=>{
   setVista(null);setClaveVista('');setRevisionError('');setLoading(false);
   if(!puedeRevisar)return;
   let vigente=true;setLoading(true);
   const id=window.setTimeout(()=>{
     commercialLotService.revisar(project.idProyecto,consulta()).then(v=>{if(vigente){setVista(v);setClaveVista(claveConsulta);}}).catch(e=>{if(vigente)setRevisionError(e instanceof Error?e.message:'No se pudo calcular el precio.');}).finally(()=>{if(vigente)setLoading(false);});
   },200);
   return()=>{vigente=false;window.clearTimeout(id);};
 },[project.idProyecto,lot?.idLote,etapa,manzana,zona,medidas.areaM2,puedeRevisar,retry]);
 const cambioComercial=!lot||fila?.codigoEtapa!==etapa||lot.idZona!==Number(zona)||lot.areaM2!==Number(medidas.areaM2);
 const permitido=!!vista&&claveVista===claveConsulta&&!loading&&!busy&&validMedidas&&puedeRevisar&&(!cat.publicado||!cambioComercial||vista.calculado);
 const estado=lot&&!cambioComercial?fila?.estado??'NO_DISPONIBLE':vista?.estado??(cat.publicado&&seleccion&&!seleccion.habilitada?'BLOQUEADO_COMERCIALMENTE':'NO_DISPONIBLE');
 async function guardar(){
   if(!permitido||!vista||claveVista!==claveConsulta)return;setBusy(true);setError('');
   const opc=(k:typeof dimensiones[number][0])=>medidas[k]?Number(medidas[k]):null;
   try{
     const r=await commercialLotService.guardar(project.idProyecto,{revision:vista.revision,ubicacion:consulta(),frenteM:opc('frenteM'),fondoM:opc('fondoM'),lateralDerechoM:opc('lateralDerechoM'),lateralIzquierdoM:opc('lateralIzquierdoM'),observaciones:observaciones.trim()||null,codigoRevisado:vista.codigo,numeroRevisado:vista.numero,precioRevisado:vista.precioFinal});
     onSuccess(r);onClose();
   }catch(e){setError(e instanceof Error?e.message:'No se pudo guardar el lote.');}
   finally{setBusy(false);}
 }
 return <Modal open title={lot?'Editar lote':'Nuevo lote'} width="max-w-3xl" onClose={()=>{if(!busy)onClose();}} footer={<><Button variant="ghost" disabled={busy} onClick={onClose}>Cancelar</Button><Button variant="primary" disabled={!permitido} onClick={()=>void guardar()}>{busy?'Guardando…':lot?'Guardar cambios':'Crear lote'}</Button></>}>
 <div className="space-y-5">
  <div className="rounded-lg border border-brand-100 bg-brand-50/50 p-3 text-xs"><p className="text-brand-500">Proyecto</p><strong className="text-sm text-brand-900">{project.nombre}</strong><p>{project.codigo}</p></div>
  {error&&<p role="alert" className="rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</p>}
  <fieldset disabled={busy||!!fila?.protegido} className="space-y-5">
  <section><h4 className="mb-3 text-xs font-semibold uppercase tracking-wide text-brand-600">Ubicación comercial</h4>
   <div className="grid gap-4 sm:grid-cols-3">
    <div><FieldLabel htmlFor="lot-etapa-comercial">Etapa comercial *</FieldLabel><Select id="lot-etapa-comercial" value={etapa} onChange={e=>{setEtapa(e.target.value);if(!lot){setManzana('');setZona('');}}}><option value="">Seleccionar etapa…</option>{cat.etapas.map(e=><option key={e.codigo} value={e.codigo}>{e.nombre}</option>)}</Select></div>
    <div><FieldLabel htmlFor="lot-manzana">Manzana *</FieldLabel><Select id="lot-manzana" value={manzana} disabled={!etapa||!!lot} onChange={e=>{setManzana(e.target.value);setZona('');}}><option value="">Seleccionar manzana…</option>{opcionesManzana.map(m=><option key={m.id} value={String(m.id)}>{m.codigo} — {m.nombre}</option>)}</Select></div>
    <div><FieldLabel htmlFor="lot-zona">Zona *</FieldLabel><Select id="lot-zona" disabled={!manzana} value={zona} onChange={e=>setZona(e.target.value)}><option value="">Seleccionar zona…</option>{opcionesZona.map(z=><option key={z.id} value={String(z.id)}>{z.codigo} — {z.nombre}</option>)}</Select></div>
   </div>
   {lot&&<p className="mt-2 text-xs text-brand-500">La manzana y el código se conservan para mantener su vínculo con el plano. Cambiar la etapa crea una asignación individual.</p>}
   {manzana&&!opcionesZona.length&&<p className="mt-2 text-xs text-amber-700">Configura las zonas de esta manzana antes de registrar el lote.</p>}
  </section>
  <section><h4 className="mb-3 text-xs font-semibold uppercase tracking-wide text-brand-600">Identificación y estado</h4>
   <div className="grid gap-4 sm:grid-cols-3">
    <div><FieldLabel htmlFor="lot-codigo">Código</FieldLabel><Input id="lot-codigo" value={lot?.codigo??vista?.codigo??codigo??''} placeholder="Automático" readOnly className="bg-brand-50"/></div>
    <div><FieldLabel htmlFor="lot-numero">Número</FieldLabel><Input id="lot-numero" value={lot?.numero??vista?.numero??numero??''} placeholder="Automático" readOnly className="bg-brand-50"/></div>
    <div><FieldLabel htmlFor="lot-estado">Estado {lot?'actual / resultante':'inicial'}</FieldLabel><Input id="lot-estado" value={etapa?estadoLote(estado):''} placeholder="Según etapa comercial" readOnly className="bg-brand-50"/></div>
   </div>
  </section>
  <section><h4 className="mb-3 text-xs font-semibold uppercase tracking-wide text-brand-600">Dimensiones</h4><div className="grid grid-cols-2 gap-3 md:grid-cols-5">{dimensiones.map(([k,label])=><div key={k}><FieldLabel htmlFor={'lot-'+k}>{label}</FieldLabel><Input id={'lot-'+k} type="number" min="0.01" step="0.01" value={medidas[k]} onChange={e=>setMedidas(v=>({...v,[k]:e.target.value}))} placeholder={k==='areaM2'?'450.00':'0.00'}/></div>)}</div></section>
  <section className="rounded-lg border border-brand-200 bg-brand-50/50 p-4">
   <h4 className="text-sm font-semibold text-brand-900">Precio de venta (PEN)</h4>
   <p className="mb-3 text-xs text-brand-500">Calculado desde Configuración comercial. No se modifica directamente en el lote.</p>
   {loading?<p className="text-sm">Calculando precio…</p>:revisionError?<p role="alert" className="text-sm text-red-700">{revisionError} <Button size="sm" onClick={()=>setRetry(n=>n+1)}>Revisar otra vez</Button></p>:vista?<div className="space-y-2 text-sm">
     <div className="flex justify-between gap-3"><span>Precio base (zona regular)</span><strong>{soles(vista.precioBase)}</strong></div>
     <div className="flex justify-between gap-3"><span>Adicional por zona {opcionesZona.find(z=>String(z.id)===zona)?.codigo}</span><strong>{soles(vista.adicional)}</strong></div>
     {!!vista.ajusteHistorico&&<div className="flex justify-between"><span>Ajuste histórico</span><strong>{soles(vista.ajusteHistorico)}</strong></div>}
     <div className="flex justify-between"><span>Descuento de etapa</span><strong>{vista.descuento==null?'—':'− '+soles(vista.descuento)}</strong></div>
     <div className="flex justify-between items-center border-t border-brand-200 pt-3"><span>Precio final simulado</span><strong className="text-xl text-brand-900">{soles(vista.precioFinal)}</strong></div>
     {vista.precioBase==null&&vista.calculado&&<p className="text-xs text-amber-700">La etapa no tiene tarifa regular D vigente; no se puede desglosar el recargo.</p>}
     <p className={vista.calculado?'text-xs text-brand-500':'text-xs text-amber-800'}>{vista.mensaje}</p>
   </div>:<p className="text-sm text-brand-600">Selecciona etapa, manzana, zona y área para simular el precio.</p>}
   {lot&&<p className="mt-3 text-sm">Precio oficial vigente: <strong>{soles(fila?.precio)}</strong></p>}
   {!cat.publicado&&<p className="mt-2 text-xs text-brand-500">El precio es referencial hasta finalizar la configuración inicial.</p>}
  </section>
  <div><FieldLabel htmlFor="lot-observaciones">Observaciones</FieldLabel><textarea id="lot-observaciones" rows={2} maxLength={2000} value={observaciones} onChange={e=>setObservaciones(e.target.value)} className="w-full rounded-md border border-brand-200 p-2 text-sm"/></div>
  </fieldset>
 </div></Modal>;
}
