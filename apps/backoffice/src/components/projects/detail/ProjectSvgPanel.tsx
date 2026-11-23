import { useEffect, useRef, useState } from 'react';
import { DownloadIcon, FileArchiveIcon, FileUpIcon, Link2Icon, SaveIcon, ShieldCheckIcon } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '../../ui/Button';
import { Select } from '../../ui/Field';
import { PlanSvgShapes } from './PlanSvgShapes';
import { leerSvgVectorial, totalVinculados, vincularFigura } from '../../../lib/projectSvg';
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
  const input=useRef<HTMLInputElement>(null);
  const actual=borrador??documento;
  const vinculados=actual?totalVinculados(actual,lotes):0;

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
        setArchivoSvg(file);setBorrador(plano);setFigura(null);setLoteVincular('');
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
    if(figura===null || !actual || !loteVincular)return;
    try{
      const actualizado=vincularFigura(actual,figura,loteVincular,lotes);
      setBorrador(actualizado);setFigura(null);setLoteVincular('');
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
    <div className="rounded-xl border border-brand-200 bg-white p-3">
      {actual
        ? <PlanSvgShapes documento={actual} lotes={lotes} seleccionado={seleccionado}
            alSeleccionar={onSelect} alElegirFigura={puedeConfigurar ? setFigura : undefined}/>
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
        <Select id="lot-svg-link" value={loteVincular} onChange={e=>setLoteVincular(e.target.value)}>
          <option value="">Selecciona el código del lote</option>
          {lotes.map(l=><option key={l.idLote} value={l.codigo}>{l.codigo}</option>)}
        </Select>
      </div>
      <Button icon={Link2Icon} disabled={!loteVincular} onClick={vincular}>Asociar figura</Button>
      <Button onClick={()=>setFigura(null)}>Cancelar</Button>
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
