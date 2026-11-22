import { useRef, useState } from 'react';
import { FileUpIcon, Link2Icon, SaveIcon, ShieldCheckIcon } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '../../ui/Button';
import { Select } from '../../ui/Field';
import { PlanSvgShapes } from './PlanSvgShapes';
import { leerSvgVectorial, totalVinculados, vincularFigura } from '../../../lib/projectSvg';
import { projectSvgService } from '../../../services/projectSvgService';
import type { LoteResponse } from '../../../types/core';
import type { PlanoSvgDocumento } from '../../../types/projectSvg';

export function ProjectSvgPanel({ proyecto, lotes, documento, onSave, seleccionado, onSelect,
  puedeConfigurar, soloMiniatura=false }: {
  proyecto:number; lotes:LoteResponse[]; documento:PlanoSvgDocumento|null;
  onSave:(doc:PlanoSvgDocumento)=>void; seleccionado:number|null;
  onSelect:(id:number)=>void; puedeConfigurar:boolean; soloMiniatura?:boolean;
}) {
  const [borrador,setBorrador]=useState<PlanoSvgDocumento|null>(null);
  const [figura,setFigura]=useState<number|null>(null);
  const [loteVincular,setLoteVincular]=useState('');
  const [guardando,setGuardando]=useState(false);
  const [error,setError]=useState('');
  const input=useRef<HTMLInputElement>(null);
  const actual=borrador??documento;
  const vinculados=actual?totalVinculados(actual,lotes):0;

  async function importar(file:File) {
    setError('');
    try {
      if(file.size>2*1024*1024 || file.size<1) throw new Error('El SVG debe ocupar entre 1 byte y 2 MB.');
      const contenido=await file.text();
      const plano=leerSvgVectorial(contenido,file.name,lotes);
      setBorrador(plano);setFigura(null);setLoteVincular('');
      toast.info(`SVG leído: ${plano.elementos.length} figuras, ${totalVinculados(plano,lotes)} lotes vinculados.`);
    }catch(e:unknown){setError(e instanceof Error?e.message:'No se pudo leer el SVG.');}
  }

  async function guardar() {
    if(!borrador || guardando)return;
    setGuardando(true);setError('');
    try{
      const respuesta=await projectSvgService.guardar(proyecto,borrador);
      onSave(respuesta.documento);setBorrador(null);
      toast.success('Plano SVG guardado para este proyecto.');
    }catch(e:unknown){setError(e instanceof Error?e.message:'No se pudo guardar el plano.');}
    finally{setGuardando(false);}
  }

  function vincular() {
    if(!borrador && documento) setBorrador(documento);
    if(figura===null || !actual || !loteVincular)return;
    try{
      const actualizado=vincularFigura(actual,figura,loteVincular,lotes);
      setBorrador(actualizado);setFigura(null);setLoteVincular('');
    }catch(e:unknown){setError(e instanceof Error?e.message:'No se pudo vincular el lote.');}
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
      <div>
        <h3 className="font-semibold text-brand-900">Plano vectorial del proyecto</h3>
        <p className="text-xs text-brand-500">SVG exportado desde AutoCAD u otra herramienta CAD. Sin alterar la matriz de lotes.</p>
        {actual && <p className="mt-1 text-xs font-medium text-brand-800">
          {actual.nombreArchivo} · {actual.elementos.length} figuras · {vinculados}/{lotes.length} lotes asociados
          {borrador && ' · Cambios sin guardar'}
        </p>}
      </div>
      {puedeConfigurar && <div className="flex gap-2">
        <input ref={input} type="file" accept=".svg,image/svg+xml" className="hidden"
          aria-label="Archivo SVG de AutoCAD" onChange={e=>{const file=e.target.files?.[0];if(file)void importar(file);e.target.value='';}}/>
        <Button icon={FileUpIcon} onClick={()=>input.current?.click()}>Importar SVG</Button>
        <Button icon={SaveIcon} variant="primary" disabled={!borrador || guardando}
          onClick={()=>void guardar()}>{guardando?'Guardando…':'Guardar plano'}</Button>
      </div>}
    </div>
    <div className="rounded-xl border border-brand-200 bg-white p-3">
      {actual
        ? <PlanSvgShapes documento={actual} lotes={lotes} seleccionado={seleccionado}
            alSeleccionar={onSelect} alElegirFigura={puedeConfigurar ? setFigura : undefined}/>
        : <div className="flex min-h-72 flex-col items-center justify-center gap-3 text-center text-brand-600">
            <FileUpIcon className="h-10 w-10 text-brand-400"/>
            <p className="font-semibold">Este proyecto aún no tiene un plano SVG importado.</p>
            <p className="max-w-md text-xs">La vista Matriz sigue operativa. Exporta tu plano CAD a SVG y vincula sus figuras a los lotes.</p>
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
      <span>Solo se admiten trazos vectoriales seguros, sin scripts ni enlaces externos. La asociación automática
        requiere que el identificador o <code>data-lote</code> de la figura coincida con un código del inventario.
        Puedes vincular otras figuras pulsándolas. Un DXF o DWG debe exportarse primero como SVG.
        Los precios y estados siempre se consultan en el sistema, no en el archivo.</span>
    </div>
    {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-800">{error}</p>}
  </div>;
}
