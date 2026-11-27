import { useEffect, useMemo, useRef, useState } from 'react';
import { DownloadIcon, FileArchiveIcon, FileUpIcon, Link2Icon, SaveIcon, ShieldCheckIcon, PlusIcon, MinusIcon, MaximizeIcon } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '../../ui/Button';
import { Select } from '../../ui/Field';
import { PlanSvgShapes } from './PlanSvgShapes';
import { leerSvgVectorial, totalVinculados, vincularFigura, asociacionesLote, figuraVinculable } from '../../../lib/projectSvg';
import { projectSvgService } from '../../../services/projectSvgService';
import type { LoteResponse } from '../../../types/core';
import type { ArchivoCadInfo, PlanoSvgDocumento } from '../../../types/projectSvg';

export function ProjectSvgPanel({ proyecto, lotes, documento, onSave, seleccionado, onSelect,
  puedeConfigurar, soloMiniatura=false }: {
  proyecto:number; lotes:LoteResponse[]; documento:PlanoSvgDocumento|null;
  onSave:(doc:PlanoSvgDocumento)=>void; seleccionado:number|null;
  onSelect:(id:number)=>void; puedeConfigurar:boolean; soloMiniatura?:boolean;
}) {
  const [borrador,setBorrador]=useState<PlanoSvgDocumento|null>(null);
  const [archivoSvg,setArchivoSvg]=useState<File|null>(null);
  const [originales,setOriginales]=useState<ArchivoCadInfo[]>([]);
  const [figura,setFigura]=useState<number|null>(null);
  const [loteVincular,setLoteVincular]=useState('');
  const [guardando,setGuardando]=useState(false);
  const [error,setError]=useState('');
  const [editando,setEditando]=useState(false);
  const [vista,setVista]=useState<number[]|null>(null);
  const [confirmarReemplazo,setConfirmarReemplazo]=useState(false);
  const input=useRef<HTMLInputElement>(null);
  const actual=borrador??documento;
  const box=actual?(vista??actual.viewBox):null;
  const escala=actual&&box?actual.viewBox[2]/box[2]:1;
  const asociaciones=useMemo(()=>actual&&loteVincular?asociacionesLote(actual,loteVincular):[],[actual,loteVincular]);
  const otras=asociaciones.filter(i=>i!==figura);
  const errores=useMemo(()=>actual?actual.elementos.flatMap((f,i)=>f.codigoLote&&!figuraVinculable(f)?[{i,codigo:f.codigoLote,tipo:f.tipo}]:[]):[],[actual]);
  function moverVista(v:number[]){
    if(!actual)return;
    const [x,y,w,h]=actual.viewBox;
    setVista([Math.max(x,Math.min(x+w-v[2],v[0])),Math.max(y,Math.min(y+h-v[3],v[1])),v[2],v[3]]);
  }
  function cambiarZoom(factor:number){
    if(!actual||!box)return;
    const z=Math.max(1,Math.min(16,escala*factor));
    const w=actual.viewBox[2]/z,h=actual.viewBox[3]/z;
    moverVista([box[0]+(box[2]-w)/2,box[1]+(box[3]-h)/2,w,h]);
  }
  function elegirFigura(i:number){
    if(!actual||guardando)return;
    setFigura(i);setLoteVincular(actual.elementos[i].codigoLote??'');setConfirmarReemplazo(false);setError('');
  }
  function desvincular(i:number){
    if(!actual||guardando||!puedeConfigurar)return;
    setBorrador(vincularFigura(actual,i,null,lotes));setFigura(null);setLoteVincular('');setConfirmarReemplazo(false);setError('');
    toast.info('Asociación retirada. Guarda la vista SVG para confirmar.');
  }
  const vinculados=useMemo(()=>actual?totalVinculados(actual,lotes):0,[actual,lotes]);

  useEffect(()=>{
    let vivo=true;
    projectSvgService.listarOriginales(proyecto)
      .then(f=>{if(vivo)setOriginales(f);})
      .catch((e:unknown)=>{if(vivo)setError(e instanceof Error?e.message:'No se pudieron consultar los archivos CAD.');});
    return ()=>{vivo=false;};
  },[proyecto]);

  async function importar(file:File) {
    if(guardando) return;
    setError('');
    try {
      if(file.size>20*1024*1024 || file.size<16)
        throw new Error('Adjunta un DWG o SVG de hasta 20 MB.');
      const extension=file.name.split('.').pop()?.toLowerCase();
      if(extension==='dwg'){
        setGuardando(true);
        const registro=await projectSvgService.subirOriginal(proyecto,file);
        setOriginales(prev=>[registro,...prev.filter(f=>f.id!==registro.id)].sort((a,b)=>b.version-a.version));
        toast.success('DWG original guardado. Para mostrar sus figuras, importa también el SVG exportado desde CAD.');
      }else if(extension==='svg'){
        if(file.size>2*1024*1024)
          throw new Error('Para el visor interactivo, optimiza el SVG a 2 MB o menos.');
        const plano=leerSvgVectorial(await file.text(),file.name,lotes);
        setArchivoSvg(file);setBorrador(plano);setFigura(null);setLoteVincular('');setVista(null);setEditando(true);setConfirmarReemplazo(false);
        toast.info(`Vista previa: ${plano.elementos.length} figuras, ${totalVinculados(plano,lotes)} lotes vinculados.`);
      }else throw new Error('Solo se admiten archivos .dwg y .svg.');
    }catch(e:unknown){setError(e instanceof Error?e.message:'No se pudo leer o subir el plano.');}
    finally{setGuardando(false);}
  }

  async function guardar() {
    if(!borrador || guardando)return;
    setGuardando(true);setError('');
    try{
      // El original se guarda separado del JSON sanitizado de visualización.
      if(archivoSvg){
        const original=await projectSvgService.subirOriginal(proyecto,archivoSvg);
        setOriginales(prev=>[original,...prev.filter(f=>f.id!==original.id)].sort((a,b)=>b.version-a.version));
      }
      const respuesta=await projectSvgService.guardar(proyecto,borrador);
      onSave(respuesta.documento);setBorrador(null);setArchivoSvg(null);
      toast.success('Plano SVG vinculado al proyecto. Los precios y estados siguen en el inventario.');
    }catch(e:unknown){setError(e instanceof Error?e.message:'No se pudo guardar el plano.');}
    finally{setGuardando(false);}
  }

  function vincular() {
    if(figura===null || !actual || !loteVincular || guardando || !puedeConfigurar)return;
    if(otras.length&&!confirmarReemplazo){setError('Confirma que deseas reemplazar la asociación anterior.');return;}
    try{
      const actualizado=vincularFigura(actual,figura,loteVincular,lotes,confirmarReemplazo);
      setBorrador(actualizado);setFigura(null);setLoteVincular('');setConfirmarReemplazo(false);setError('');
      const lote=lotes.find(l=>l.codigo===loteVincular);if(lote)onSelect(lote.idLote);
    }catch(e:unknown){setError(e instanceof Error?e.message:'No se pudo vincular el lote.');}
  }

  async function descargar(id:number) {
    try {
      const respuesta=await projectSvgService.enlaceDescarga(proyecto,id);
      window.open(respuesta.url,'_blank','noopener,noreferrer');
    } catch(e:unknown){setError(e instanceof Error?e.message:'No se pudo descargar el plano.');}
  }

  if(soloMiniatura){
    return actual
      ? <PlanSvgShapes documento={actual} lotes={lotes} seleccionado={seleccionado} miniatura/>
      : <div className="flex h-full items-center justify-center text-xs font-medium text-brand-500">
          Importa un SVG para visualizar el plano real del proyecto.
        </div>;
  }

  return <div className="space-y-4">
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-brand-200 bg-brand-50/60 p-4">
      <div className="space-y-1">
        <h3 className="font-semibold text-brand-900">Plano vectorial del proyecto</h3>
        <p className="text-xs text-brand-500">DWG: archivo técnico original. SVG: vista interactiva con figuras y lotes asociados.</p>
        {actual && <p className="text-xs font-medium text-brand-800">
          {actual.nombreArchivo} · {actual.elementos.length} figuras · {vinculados}/{lotes.length} lotes asociados
          {borrador && ' · Cambios sin guardar'}
        </p>}
      </div>
      {puedeConfigurar && <div className="flex flex-wrap gap-2">
        <input ref={input} type="file" accept=".dwg,.svg,application/acad,image/svg+xml"
          className="hidden" aria-label="Archivo de plano DWG o SVG"
          onChange={e=>{const file=e.target.files?.[0];if(file)void importar(file);e.target.value='';}}/>
        <Button icon={FileUpIcon} disabled={guardando} onClick={()=>input.current?.click()}>Importar DWG / SVG</Button>
        <Button icon={SaveIcon} variant="primary" disabled={!borrador || guardando}
          onClick={()=>void guardar()}>{guardando?'Guardando…':'Guardar vista SVG'}</Button>
      </div>}
    </div>
    {originales.length>0 && <section className="space-y-2 rounded-xl border border-brand-200 p-4">
      <h4 className="flex items-center gap-2 text-sm font-semibold text-brand-900"><FileArchiveIcon className="h-4 w-4"/>Archivos técnicos del proyecto</h4>
      <p className="text-xs text-brand-500">Versiones almacenadas en un bucket privado de Supabase Storage; sin duplicar registros del inventario.</p>
      <div className="max-h-48 space-y-2 overflow-y-auto">
        {originales.map(f=><div key={f.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-brand-50 px-3 py-2 text-xs">
          <div className="min-w-0">
            <span className="font-semibold text-brand-900">v{f.version} · {f.nombre}</span>
            <span className="ml-2 text-brand-500">{f.formato} · {(f.bytes/1024/1024).toFixed(2)} MB</span>
          </div>
          <Button size="sm" icon={DownloadIcon} onClick={()=>void descargar(f.id)}>Descargar</Button>
        </div>)}
      </div>
    </section>}
    {actual && <div className="flex flex-wrap items-center justify-between gap-2">
      <div className="flex items-center gap-2" aria-label="Controles de zoom">
        <Button size="sm" icon={MinusIcon} disabled={escala<=1.00001} onClick={()=>cambiarZoom(1/1.5)}>−</Button>
        <span className="min-w-16 text-center text-sm font-semibold tabular-nums">{Math.round(escala*100)} %</span>
        <Button size="sm" icon={PlusIcon} disabled={escala>=15.999} onClick={()=>cambiarZoom(1.5)}>+</Button>
        <Button size="sm" icon={MaximizeIcon} onClick={()=>setVista(null)}>Ajustar</Button>
      </div>
      {puedeConfigurar && <Button size="sm" disabled={guardando} variant={editando?'primary':undefined}
        onClick={()=>{setEditando(v=>!v);setFigura(null);setLoteVincular('');setConfirmarReemplazo(false);setError('');}}>
        {editando?'Salir de asociaciones':'Configurar asociaciones'}
      </Button>}
      <p className="w-full text-xs text-brand-500">Amplía con + y arrastra el plano para desplazarte. Un clic selecciona la figura.</p>
    </div>}
    {actual && puedeConfigurar && errores.length>0 && <section className="space-y-2 rounded-lg border border-amber-200 bg-amber-50 p-3">
      <p className="text-sm font-semibold text-amber-900">Asociaciones a textos o líneas ({errores.length})</p>
      <p className="text-xs text-amber-900">Puedes retirar estos vínculos y asociar la superficie correcta. Los cambios no se guardan hasta confirmar.</p>
      {errores.map(e=><div key={e.i} className="flex flex-wrap items-center justify-between gap-2 text-xs">
        <span>{e.codigo} · Figura {e.i+1} ({e.tipo})</span>
        <Button size="sm" disabled={guardando} onClick={()=>{desvincular(e.i);setEditando(true);}}>Desvincular</Button>
      </div>)}
    </section>}
    <div className="rounded-xl border border-brand-200 bg-white p-3">
      {actual
        ? <PlanSvgShapes documento={actual} lotes={lotes} seleccionado={seleccionado}
            alSeleccionar={onSelect} alElegirFigura={puedeConfigurar && editando && !guardando ? elegirFigura : undefined}
            vista={box??undefined} alMoverVista={moverVista} figuraActiva={figura}/>
        : <div className="flex min-h-72 flex-col items-center justify-center gap-3 text-center text-brand-600">
            <FileUpIcon className="h-10 w-10 text-brand-400"/>
            <p className="font-semibold">Todavía no hay un SVG vinculado a este proyecto.</p>
            <p className="max-w-md text-xs">Puedes guardar el DWG original ahora. Para mostrar el plano vectorial,
              exporta desde AutoCAD un SVG y asocia sus figuras a los lotes existentes.</p>
          </div>}
    </div>
    {figura!==null && actual && puedeConfigurar && <div className="flex flex-wrap items-end gap-3 rounded-xl border border-amber-200 bg-amber-50 p-3">
      <div className="min-w-60 flex-1">
        <label htmlFor="lot-svg-link" className="mb-2 block text-sm font-semibold text-brand-900">
          Vincular figura {figura+1} con un lote existente
        </label>
        <Select id="lot-svg-link" value={loteVincular} onChange={e=>{setLoteVincular(e.target.value);setConfirmarReemplazo(false);setError('');}}>
          <option value="">Selecciona el código del lote</option>
          {lotes.map(l=><option key={l.idLote} value={l.codigo}>{l.codigo}{asociacionesLote(actual,l.codigo).length?' · Asociado':''}</option>)}
        </Select>
      </div>
      {otras.length>0 && <div className="w-full rounded-md border border-amber-300 bg-white p-2 text-xs text-amber-900">
        <p>Este lote está asociado a {otras.map(i=>`figura ${i+1} (${actual.elementos[i].tipo})`).join(', ')}.</p>
        <label className="mt-2 flex items-center gap-2"><input type="checkbox" checked={confirmarReemplazo} onChange={e=>setConfirmarReemplazo(e.target.checked)}/> Reemplazar asociación anterior por esta figura</label>
      </div>}
      <Button icon={Link2Icon} disabled={!loteVincular||guardando||(otras.length>0&&!confirmarReemplazo)} onClick={vincular}>Asociar figura</Button>
      {actual.elementos[figura].codigoLote && <Button disabled={guardando} onClick={()=>desvincular(figura)}>Desvincular figura</Button>}
      <Button onClick={()=>{setFigura(null);setLoteVincular('');setError('');setConfirmarReemplazo(false);}}>Cancelar</Button>
    </div>}
    <div className="flex items-start gap-2 rounded-lg bg-brand-50 p-3 text-xs text-brand-600">
      <ShieldCheckIcon className="h-4 w-4 shrink-0 text-emerald-700"/>
      <span>Un archivo DWG no se convierte automáticamente al subirlo. El visor utiliza un SVG vectorial
        exportado desde CAD. Sus identificadores o atributos <code>data-lote</code> se vinculan con el
        inventario de este proyecto; los precios, etapas y estados se consultan siempre en el sistema.</span>
    </div>
    {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-800">{error}</p>}
  </div>;
}
