import { memo, useMemo, useRef, type SVGProps, type PointerEvent } from 'react';
import type { PlanoSvgDocumento, SvgFigura } from '../../../types/projectSvg';
import type { LoteResponse } from '../../../types/core';
import { figuraVinculable } from '../../../lib/projectSvg';
import { mapLotColors } from '../../../lib/lotMapPalette';

const numero=(figura: SvgFigura,campo: string) => Number(figura.atributos[campo] ?? 0);
function propsSvg(figura: SvgFigura): Pick<SVGProps<SVGElement>, 'fill' | 'stroke' | 'strokeWidth' | 'fillOpacity' | 'strokeOpacity' | 'opacity' | 'transform' | 'strokeLinecap' | 'strokeLinejoin'> {
  const a=figura.atributos;
  return {
    fill:a.fill ?? 'none', stroke:a.stroke ?? '#64748b',
    strokeWidth:a['stroke-width'] ? Number(a['stroke-width']) : 1.2,
    fillOpacity:a['fill-opacity'] ? Number(a['fill-opacity']) : undefined,
    strokeOpacity:a['stroke-opacity'] ? Number(a['stroke-opacity']) : undefined,
    opacity:a.opacity ? Number(a.opacity) : undefined,
    transform:a.transform || undefined,
    strokeLinecap:a['stroke-linecap'] as SVGProps<SVGElement>['strokeLinecap'] || undefined,
    strokeLinejoin:a['stroke-linejoin'] as SVGProps<SVGElement>['strokeLinejoin'] || undefined
  };
}

function Figura({ figura }: { figura: SvgFigura }) {
  const p=propsSvg(figura);
  switch(figura.tipo) {
    case 'path':return <path {...p} d={figura.atributos.d ?? ''}/>;
    case 'rect':return <rect {...p} x={numero(figura,'x')} y={numero(figura,'y')}
      width={numero(figura,'width')} height={numero(figura,'height')}
      rx={numero(figura,'rx')} ry={numero(figura,'ry')}/>;
    case 'polygon':return <polygon {...p} points={figura.atributos.points??''}/>;
    case 'polyline':return <polyline {...p} points={figura.atributos.points??''}/>;
    case 'circle':return <circle {...p} cx={numero(figura,'cx')} cy={numero(figura,'cy')} r={numero(figura,'r')}/>;
    case 'ellipse':return <ellipse {...p} cx={numero(figura,'cx')} cy={numero(figura,'cy')}
      rx={numero(figura,'rx')} ry={numero(figura,'ry')}/>;
    case 'line':return <line {...p} x1={numero(figura,'x1')} y1={numero(figura,'y1')}
      x2={numero(figura,'x2')} y2={numero(figura,'y2')}/>;
    case 'text':return <text {...p} x={numero(figura,'x')} y={numero(figura,'y')}
      fontSize={numero(figura,'font-size') || 11}
      textAnchor={figura.atributos['text-anchor'] as SVGProps<SVGTextElement>['textAnchor']}>{figura.texto}</text>;
  }
}

export const PlanSvgShapes = memo(function PlanSvgShapes({ documento, lotes, seleccionado, alSeleccionar, alElegirFigura,
  miniatura=false, vista, alMoverVista, figuraActiva=null }: {
  documento: PlanoSvgDocumento; lotes: readonly LoteResponse[]; seleccionado: number | null;
  alSeleccionar?: (id: number) => void; alElegirFigura?: (index: number) => void; miniatura?: boolean;
  vista?: number[]; alMoverVista?: (v:number[])=>void; figuraActiva?: number|null;
}) {
  const referencias = useMemo(()=>new Map(lotes.map(l => [l.codigo,l])),[lotes]);
  const box=vista??documento.viewBox;
  const zoom=!!alMoverVista && box[2]<documento.viewBox[2]-0.00001;
  const drag=useRef<{id:number;x:number;y:number;box:number[];inverse:DOMMatrix;moving:boolean}|null>(null);
  const suppressClick=useRef(false);
  function down(e:PointerEvent<SVGSVGElement>){
    suppressClick.current=false;
    if(!zoom||e.button!==0||!e.isPrimary)return;
    const matrix=e.currentTarget.getScreenCTM();
    if(!matrix)return;
    drag.current={id:e.pointerId,x:e.clientX,y:e.clientY,box:[...box],inverse:matrix.inverse(),moving:false};
  }
  function move(e:PointerEvent<SVGSVGElement>){
    const d=drag.current;
    if(!d||d.id!==e.pointerId)return;
    if(!d.moving&&Math.hypot(e.clientX-d.x,e.clientY-d.y)<5)return;
    if(!d.moving){d.moving=true;suppressClick.current=true;e.currentTarget.setPointerCapture(e.pointerId);}
    const a=new DOMPoint(d.x,d.y).matrixTransform(d.inverse);
    const c=new DOMPoint(e.clientX,e.clientY).matrixTransform(d.inverse);
    alMoverVista?.([d.box[0]+a.x-c.x,d.box[1]+a.y-c.y,d.box[2],d.box[3]]);
  }
  function up(e:PointerEvent<SVGSVGElement>){
    if(drag.current?.id!==e.pointerId)return;
    drag.current=null;
    if(e.currentTarget.hasPointerCapture(e.pointerId))e.currentTarget.releasePointerCapture(e.pointerId);
  }
  return <svg viewBox={box.join(' ')} preserveAspectRatio="xMidYMid meet"
    aria-label={`Plano vectorial de ${documento.nombreArchivo}`}
    onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up} onLostPointerCapture={up}
    onPointerLeave={e=>{if(!drag.current?.moving)up(e);}}
    onClickCapture={e=>{if(suppressClick.current){e.stopPropagation();suppressClick.current=false;}}}
    style={miniatura?undefined:{touchAction:zoom?'none':'auto',userSelect:'none'}}
    className={miniatura ? 'h-full w-full' : `h-[min(75vh,800px)] min-h-[420px] w-full rounded-lg bg-brand-50 ${zoom?'cursor-grab active:cursor-grabbing':''}`}>
    <rect x={documento.viewBox[0]} y={documento.viewBox[1]}
      width={documento.viewBox[2]} height={documento.viewBox[3]} fill="#f8fafc"/>
    {documento.elementos.map((figura,index)=>{
      const lote=figura.codigoLote ? referencias.get(figura.codigoLote) : undefined;
      const superficie=figuraVinculable(figura);
      const activo=!!lote&&lote.idLote===seleccionado;
      const editing=!!alElegirFigura;
      const interactivo=!miniatura && superficie && (editing||!!lote);
      const colors=mapLotColors(lote?.codigoEstadoLote,activo);
      const elegido=figuraActiva===index;
      const seleccionar=()=>{if(editing)alElegirFigura?.(index);if(lote)alSeleccionar?.(lote.idLote);};
      return <g key={index} role={interactivo?'button':'presentation'}
        tabIndex={interactivo?0:-1} aria-label={interactivo?(lote ? `Lote ${lote.codigo}` : `Figura sin vincular ${index+1}`):undefined}
        pointerEvents={interactivo?'visiblePainted':'none'}
        className={interactivo?(zoom?'cursor-grab':'cursor-pointer'):undefined}
        onClick={interactivo?seleccionar:undefined}
        onKeyDown={interactivo?e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();seleccionar();}}:undefined}>
        <Figura figura={superficie && (lote||elegido)
          ? {...figura,atributos:{...figura.atributos,
            fill:lote?colors.fill:figura.atributos.fill??'none',
            stroke:elegido?'#2563eb':colors.stroke,
            'stroke-width':elegido||activo?'3':'1.5',
            ...(lote?{'fill-opacity':'1','opacity':'1'}:{})}}
          : figura}/>
        {interactivo && <title>{lote ? `${lote.codigo} · ${lote.nombreEstadoLote??lote.codigoEstadoLote}`
          : 'Figura sin vínculo: selecciónala para asociar un lote'}</title>}
      </g>;
    })}
  </svg>;
});
