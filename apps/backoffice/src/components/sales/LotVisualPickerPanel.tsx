import { Component, useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { MapIcon, Grid2X2Icon, RotateCcwIcon } from 'lucide-react';
import { LotVisualViewport } from './LotVisualViewport';
import { PlanSvgShapes } from '../projects/detail/PlanSvgShapes';
import { commercialLotService, estadoLote, soles, type FilaLote } from '../../services/commercialLotService';
import { coreService } from '../../services/coreService';
import { projectSvgService } from '../../services/projectSvgService';
import { buildDisplayGeometries, bounds, roundedLotPath } from '../../lib/lotMatrixGeometry';
import { MAP_STATUSES, mapLotColors, mapStatus } from '../../lib/lotMapPalette';
import { blockKey, focusBox, matrixFocusBox, hasSvgLot, validBox, type VisualBox } from '../../lib/lotVisualFocus';
import type { LoteResponse, PlanoInteractivoDetalleResponse } from '../../types/core';
import type { PlanoSvgDocumento } from '../../types/projectSvg';

type Result<T> = {status:'loading'|'ready'|'error';value:T};
const pending=<T,>(value:T):Result<T>=>({status:'loading',value});
const ready=<T,>(value:T):Result<T>=>({status:'ready',value});

type SelectionProps={selectable:ReadonlySet<number>;onPick:(id:number)=>void};
function MatrixPreview({lots,plan,selected,overview,selectable,onPick}:{lots:LoteResponse[];plan:PlanoInteractivoDetalleResponse|null;selected:LoteResponse|null;overview:boolean}&SelectionProps){
  const geometries=useMemo(()=>buildDisplayGeometries(lots,plan,lots[0]?.idProyecto??null),[lots,plan]);
  const byId=useMemo(()=>new Map(lots.map(l=>[l.idLote,l])),[lots]);
  const items=useMemo(()=>geometries.map(g=>{
    const b=bounds(g.puntos);
    return {g,box:[b.left,b.top,b.right-b.left,b.bottom-b.top] as VisualBox,lot:byId.get(g.idLote)!};
  }).filter(i=>validBox(i.box)&&i.lot),[geometries,byId]);
  if(!items.length)return <p className="p-8 text-center text-sm text-brand-500">No hay lotes activos para visualizar.</p>;
  const groups=new Map<string,typeof items>();
  for(const item of items){const k=blockKey(item.lot);groups.set(k,[...(groups.get(k)??[]),item]);}
  const labels=[...groups.values()].map(group=>({key:blockKey(group[0].lot),
    x:Math.min(...group.map(i=>i.box[0])),y:Math.min(...group.map(i=>i.box[1]))-9,
    label:group[0].lot.nombreManzana??group[0].lot.codigoManzana??'Manzana'}));
  const minX=Math.min(...items.map(i=>i.box[0]))-28,minY=Math.min(...items.map(i=>i.box[1]))-36;
  const full:VisualBox=[minX,minY,Math.max(...items.map(i=>i.box[0]+i.box[2]))-minX+28,
    Math.max(...items.map(i=>i.box[1]+i.box[3]))-minY+28];
  const target=items.find(i=>i.g.idLote===selected?.idLote);
  const focus=!overview&&target?matrixFocusBox(full,target.box):null;
  return <LotVisualViewport full={full} focus={focus}>{view=><svg viewBox={view.join(' ')} className="h-full w-full" role="group" aria-label="Matriz de lotes por manzanas">
    {labels.map(l=><text key={l.key} x={l.x} y={l.y} fontSize="11" fontWeight="600" fill="#334155">{l.label}</text>)}
    {items.map(({g,box,lot})=>{
      const active=lot.idLote===selected?.idLote,colors=mapLotColors(lot.codigoEstadoLote,active);
      const enabled=selectable.has(lot.idLote);
      return <g key={g.idLote} role={enabled?'button':'presentation'} tabIndex={enabled?0:undefined}
        aria-label={enabled?`Seleccionar lote ${lot.codigo}`:undefined} aria-pressed={enabled?active:undefined}
        className={enabled?'cursor-pointer focus-visible:outline-none focus-visible:opacity-70':undefined}
        onClick={enabled?()=>onPick(lot.idLote):undefined}
        onKeyDown={enabled?e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();onPick(lot.idLote);}}:undefined}>
        <path d={roundedLotPath(g.puntos)} fill={colors.fill} stroke={colors.stroke} strokeWidth={active?3:1.2}/>
        <text x={g.etiquetaX??box[0]+box[2]/2} y={g.etiquetaY??box[1]+box[3]/2} textAnchor="middle"
          dominantBaseline="middle" fontSize={Math.max(5,Math.min(11,box[2]/Math.max(6,lot.codigo.length*.65)))} fontWeight="700" fill={colors.text}>{lot.codigo}</text>
        <title>{lot.codigo} · {estadoLote(lot.codigoEstadoLote??'NO_DISPONIBLE')}</title>
      </g>;
    })}
  </svg>}</LotVisualViewport>;
}

function SvgPreview({document,lots,selected,overview,onUnavailable,selectable,onPick}:{document:PlanoSvgDocumento;lots:LoteResponse[];selected:LoteResponse|null;overview:boolean;onUnavailable:()=>void}&SelectionProps){
  const host=useRef<HTMLDivElement>(null);
  const [view,setView]=useState<VisualBox|null>(null);
  const block=selected?blockKey(selected):null;
  useLayoutEffect(()=>{
    if(overview||!selected||!validBox(document.viewBox)){setView(null);return;}
    const elements=Array.from(host.current?.querySelectorAll<SVGGElement>('[data-lot-id]')??[]);
    const measure=(el:SVGGElement|undefined):VisualBox|null=>{
      if(!el)return null;
      try{const b=el.getBBox();const box:VisualBox=[b.x,b.y,b.width,b.height];return validBox(box)?box:null;}catch{return null;}
    };
    const target=measure(elements.find(el=>Number(el.dataset.lotId)===selected.idLote));
    if(!target){onUnavailable();return;}
    const ids=new Set(lots.filter(l=>blockKey(l)===block).map(l=>l.idLote));
    const neighbors=elements.filter(el=>ids.has(Number(el.dataset.lotId))).map(measure).filter((v):v is VisualBox=>v!==null);
    setView(focusBox(document.viewBox,target,neighbors));
  },[document,lots,selected,block,overview,onUnavailable]);
  return <div ref={host} className="h-full w-full">
    {validBox(document.viewBox)&&<LotVisualViewport full={document.viewBox} focus={overview?null:view}>{camera=>
      <PlanSvgShapes documento={document} lotes={lots} seleccionado={selected?.idLote??null} miniatura vista={camera} lotesSeleccionables={selectable} alSeleccionar={onPick}/>}</LotVisualViewport>}
  </div>;
}

class PreviewBoundary extends Component<{children:ReactNode},{failed:boolean}> {
  state={failed:false};
  static getDerivedStateFromError(){return {failed:true};}
  render(){return this.state.failed?<p role="alert" className="p-4 text-sm text-brand-600">No se pudo mostrar el plano. Puedes continuar usando el formulario de la operación.</p>:this.props.children;}
}

type PickerProps={project:number;selected:LoteResponse|null;stageName?:string;focusRevision?:number;selectionHint?:string}&SelectionProps;
function LotVisualPicker({project,selected,stageName,focusRevision=0,selectable,onPick,selectionHint}:PickerProps){
  const [rows,setRows]=useState<Result<FilaLote[]>>(pending([]));
  const [matrix,setMatrix]=useState<Result<PlanoInteractivoDetalleResponse|null>>(pending(null));
  const [svg,setSvg]=useState<Result<PlanoSvgDocumento|null>>(pending(null));
  const [mode,setMode]=useState<'auto'|'matriz'|'svg'>('auto');
  const [retry,setRetry]=useState(0);
  const [overview,setOverview]=useState(false);
  const [unavailableId,setUnavailableId]=useState<number|null>(null);
  useEffect(()=>{
    let active=true;
    setRows(pending([]));setMatrix(pending(null));setSvg(pending(null));
    setUnavailableId(null);
    commercialLotService.listarMapa(project).then(data=>{
      if(!Array.isArray(data)||data.some(f=>!f?.lote||f.lote.idProyecto!==project))throw new Error('Inventario inválido');
      if(active)setRows(ready(data.filter(f=>f.lote.activo)));
    }).catch(()=>{if(active)setRows({status:'error',value:[]});});
    coreService.getCurrentMatrix(project).then(data=>{
      if(data&&(!data.plano||!Array.isArray(data.lotes)||data.lotes.some(g=>!Array.isArray(g.puntos)||g.puntos.some(p=>!Number.isFinite(p.x)||!Number.isFinite(p.y)))))throw new Error('Matriz inválida');
      if(active)setMatrix(ready(data));
    }).catch(()=>{if(active)setMatrix({status:'error',value:null});});
    projectSvgService.obtener(project).then(data=>{
      const doc=data?.documento??null;
      if(doc&&(!validBox(doc.viewBox)||!Array.isArray(doc.elementos)||doc.elementos.some(f=>!f?.atributos)))throw new Error('SVG inválido');
      if(active)setSvg(ready(doc));
    }).catch(()=>{if(active)setSvg({status:'error',value:null});});
    return ()=>{active=false;};
  },[project,retry]);
  useEffect(()=>{setOverview(false);setUnavailableId(null);},[selected?.idLote,focusRevision]);
  const lots=useMemo(()=>rows.value.map(f=>({...f.lote,codigoEstadoLote:f.estado,nombreEstadoLote:estadoLote(f.estado),
    nombreEtapa:f.nombreEtapa??undefined,codigoEtapa:f.codigoEtapa??undefined})),[rows.value]);
  const row=rows.value.find(f=>f.lote.idLote===selected?.idLote);
  const lot=lots.find(l=>l.idLote===selected?.idLote)??null;
  const svgUsable=hasSvgLot(svg.value,selected)&&!(selected&&unavailableId===selected.idLote);
  const showSvg=mode!=='matriz'&&svgUsable;
  const markUnavailable=useMemo(()=>()=>setUnavailableId(selected?.idLote??null),[selected?.idLote]);
  const waiting=rows.status==='loading'||(!showSvg&&matrix.status==='loading');
  return <section aria-label="Vista del lote" className="min-w-0 space-y-3 rounded-xl border border-brand-200 bg-white p-3 sm:p-4">
    <div className="flex flex-wrap items-center justify-between gap-2">
      <div><h3 className="flex items-center gap-2 text-sm font-semibold text-brand-900"><MapIcon className="h-4 w-4"/> Vista del lote</h3>
      <p className="mt-1 text-xs text-brand-500">Ubicación y entorno comercial</p></div>
      <button type="button" disabled={!selected} onClick={()=>setOverview(v=>!v)} className="inline-flex items-center gap-1 rounded-md border border-brand-200 px-2 py-1.5 text-xs text-brand-700 disabled:opacity-50"><RotateCcwIcon className="h-3 w-3"/>{overview?'Centrar lote':'Ver proyecto'}</button>
    </div>
    <div className="flex flex-wrap gap-1 rounded-lg bg-brand-50 p-1" role="group" aria-label="Tipo de vista">
      {(['auto','svg','matriz'] as const).map(m=><button key={m} type="button" aria-pressed={mode===m} disabled={m==='svg'&&!svgUsable} onClick={()=>setMode(m)}
        className={`flex-1 rounded-md px-2 py-1.5 text-xs font-medium disabled:opacity-40 ${mode===m?'bg-brand-900 text-white':'text-brand-600 hover:bg-white'}`}>{m==='auto'?'Automática':m==='svg'?'Plano SVG':'Matriz'}</button>)}
    </div>
    <div className="min-w-0">
      {waiting?<p className="flex h-[300px] items-center justify-center rounded-lg bg-brand-50 text-sm text-brand-500">Cargando vista del proyecto…</p>:rows.status==='error'||(!showSvg&&matrix.status==='error')?
        <div className="space-y-2 p-4 text-center"><p className="text-sm text-brand-600">No se pudo consultar el plano.</p><button type="button" className="text-xs font-semibold underline" onClick={()=>setRetry(v=>v+1)}>Reintentar</button></div>:
        showSvg&&svg.value?<SvgPreview key={`svg-${selected?.idLote}-${focusRevision}-${overview}`} document={svg.value} lots={lots} selected={lot} overview={overview} onUnavailable={markUnavailable} selectable={selectable} onPick={onPick}/>:
          <MatrixPreview key={`matriz-${selected?.idLote}-${focusRevision}-${overview}`} lots={lots} plan={matrix.value} selected={lot} overview={overview} selectable={selectable} onPick={onPick}/>}
    </div>
    {selectionHint&&<p className="rounded-lg bg-brand-50 p-2 text-xs text-brand-600">{selectionHint}</p>}
    {mode!=='matriz'&&!showSvg&&svg.status!=='loading'&&<p className="flex items-center gap-1.5 text-xs text-brand-500"><Grid2X2Icon className="h-3.5 w-3.5 shrink-0"/>{svg.status==='error'?'SVG no disponible para consulta.':svg.value&&selected?'Lote sin figura SVG vinculada; se muestra la matriz.':'Se muestra la matriz del proyecto.'}</p>}
    {!showSvg&&matrix.status==='ready'&&!matrix.value&&<p className="text-xs text-brand-500">Distribución referencial por manzanas, sin posiciones guardadas.</p>}
    <div className="flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-brand-600">{MAP_STATUSES.map(s=><span key={s.code} className="inline-flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-sm" style={{background:s.fill}}/>{s.label}</span>)}</div>
    {selected?<div className="space-y-2 rounded-lg border border-brand-200 p-3">
      <p className="text-xs font-medium text-brand-500">Lote en consulta</p><div className="flex flex-wrap items-center justify-between gap-2"><strong className="text-base text-brand-900">{selected.codigo}</strong>{row&&<span className={`rounded-full px-2 py-1 text-xs ${mapStatus(row.estado).badge}`}>{estadoLote(row.estado)}</span>}</div>
      <p className="text-xs text-brand-600">{selected.nombreManzana??'Manzana'} · {selected.areaM2??'—'} m² · {row?.nombreEtapa??stageName??'Etapa sin identificar'}</p>
      <dl className="space-y-1 border-t border-brand-100 pt-2 text-xs">
        <div className="flex justify-between gap-2"><dt>Zona</dt><dd className="text-right font-medium">{selected.nombreZona??'—'}</dd></div>
        <div className="flex justify-between gap-2"><dt>Precio oficial consultado</dt><dd className="font-semibold">{soles(row?.precio)}</dd></div>
        {row?.promocionAplicada!=null&&row.promocionAplicada>0&&<div className="flex justify-between gap-2 text-emerald-700"><dt>Promoción aplicada</dt><dd>−{soles(row.promocionAplicada)}</dd></div>}
      </dl><p className="text-[11px] text-brand-500">Vista informativa. Confirma el lote en el formulario para verificar las condiciones vigentes.</p>
    </div>:<p className="rounded-lg bg-brand-50 p-3 text-xs text-brand-600">Selecciona un lote autorizado en la lista o en el plano.</p>}
  </section>;
}

export function LotVisualPickerPanel(props:PickerProps){
  return <PreviewBoundary key={props.project}><LotVisualPicker key={props.project} {...props}/></PreviewBoundary>;
}
