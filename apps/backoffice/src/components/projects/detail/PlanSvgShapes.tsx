import type { SVGProps } from 'react';
import type { PlanoSvgDocumento, SvgFigura } from '../../../types/projectSvg';
import type { LoteResponse } from '../../../types/core';

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

export function PlanSvgShapes({ documento, lotes, seleccionado, alSeleccionar, alElegirFigura,
  miniatura=false }: {
  documento: PlanoSvgDocumento; lotes: readonly LoteResponse[]; seleccionado: number | null;
  alSeleccionar?: (id: number) => void; alElegirFigura?: (index: number) => void; miniatura?: boolean;
}) {
  const referencias = new Map(lotes.map(l => [l.codigo,l]));
  return <svg viewBox={documento.viewBox.join(' ')} preserveAspectRatio="xMidYMid meet"
    aria-label={`Plano vectorial de ${documento.nombreArchivo}`}
    className={miniatura ? 'h-full w-full' : 'min-h-[420px] max-h-[800px] w-full rounded-lg bg-brand-50'}>
    <rect x={documento.viewBox[0]} y={documento.viewBox[1]}
      width={documento.viewBox[2]} height={documento.viewBox[3]} fill="#f8fafc"/>
    {documento.elementos.map((figura,index)=>{
      const lote=figura.codigoLote ? referencias.get(figura.codigoLote) : undefined;
      const activo=lote?.idLote===seleccionado;
      const color=lote ? ({DISPONIBLE:'#089d67', RESERVADO:'#fbbf24',
        VENDIDO:'#dc2626', BLOQUEADO:'#f97316', NO_DISPONIBLE:'#94a3b8'}
      )[lote.codigoEstadoLote??'NO_DISPONIBLE'] : undefined;
      return <g key={index} role={miniatura?'presentation':'button'}
        tabIndex={miniatura?-1:0} aria-label={lote ? `Lote ${lote.codigo}` : `Figura sin vincular ${index+1}`}
        className={miniatura?'':'cursor-pointer focus:outline-none'}
        onClick={() => lote ? alSeleccionar?.(lote.idLote) : alElegirFigura?.(index)}
        onKeyDown={e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();lote ? alSeleccionar?.(lote.idLote) : alElegirFigura?.(index);}}}>
        <Figura figura={lote && figura.tipo!=='text'
          ? {...figura,atributos:{...figura.atributos,
            fill:activo?'#2563eb':color ?? figura.atributos.fill ?? '#e2e8f0',
            stroke:activo?'#1d4ed8':'#ffffff',
            'stroke-width':activo?'3':'1.5'}}
          : figura}/>
        {!miniatura && <title>{lote ? `${lote.codigo} · ${lote.nombreEstadoLote??lote.codigoEstadoLote}`
          : 'Figura sin vínculo: selecciónala para asociar un lote'}</title>}
      </g>;
    })}
  </svg>;
}
