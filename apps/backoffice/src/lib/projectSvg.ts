import type { LoteResponse } from '../types/core';
import type { PlanoSvgDocumento, SvgFigura, SvgFiguraTipo } from '../types/projectSvg';

const ALLOWED = new Set<SvgFiguraTipo>(['path','rect','circle','ellipse','polygon','polyline','line','text']);
const ATTRS = new Set(['d','x','y','x1','y1','x2','y2','cx','cy','r','rx','ry','width','height',
  'points','fill','stroke','stroke-width','fill-opacity','stroke-opacity','opacity','transform','font-size',
  'text-anchor','stroke-linecap','stroke-linejoin']);
const COLORS = /^(?:#[0-9a-fA-F]{3,8}|none|transparent|black|white|green|blue|red|gray|grey|silver|navy|teal|olive|lime|yellow|orange|rgb\(\s*[0-9,\s.]+\))$/;
const PATH = /^[-+0-9eE.,\sMmLlHhVvCcSsQqTtAaZz]+$/;
const NUMS = /^[-+0-9eE.,\s]+$/;
const TRANSFORM = /^(?:(?:matrix|translate|scale|rotate|skewX|skewY)\([-+0-9eE.,\s]+\)\s*)+$/;

export function codigoLoteVinculado(texto: string | null | undefined, lotes: readonly Pick<LoteResponse,'codigo'>[]): string | null {
  if (!texto) return null;
  const clave = texto.trim().toUpperCase();
  return lotes.find(l => l.codigo.trim().toUpperCase() === clave)?.codigo ?? null;
}

export function totalVinculados(documento: PlanoSvgDocumento, lotes: readonly Pick<LoteResponse,'codigo'>[]): number {
  const codigos = new Set(lotes.map(l => l.codigo));
  return new Set(documento.elementos.map(e => e.codigoLote).filter(c => c && codigos.has(c))).size;
}

function validarAtributo(clave: string, valor: string): boolean {
  if (!ATTRS.has(clave) || !valor || valor.length > 16000) return false;
  if (clave === 'fill' || clave === 'stroke') return COLORS.test(valor);
  if (clave === 'd') return PATH.test(valor);
  if (clave === 'points') return NUMS.test(valor);
  if (clave === 'transform') return TRANSFORM.test(valor);
  if (clave === 'text-anchor') return ['start','middle','end'].includes(valor);
  if (clave === 'stroke-linecap') return ['butt','round','square'].includes(valor);
  if (clave === 'stroke-linejoin') return ['round','miter','bevel'].includes(valor);
  return Number.isFinite(Number(valor)) && /^[-+0-9.eE]+$/.test(valor);
}

export function leerSvgVectorial(contenido: string, nombreArchivo: string,
    lotes: readonly Pick<LoteResponse,'codigo'>[]): PlanoSvgDocumento {
  if (!/\.svg$/i.test(nombreArchivo) || contenido.length > 2200000 || /<!DOCTYPE|<!ENTITY|<\?xml-stylesheet/i.test(contenido))
    throw new Error('Usa un SVG vectorial de hasta 2 MB, sin entidades, DTD ni hojas de estilo externas.');
  const xml = new DOMParser().parseFromString(contenido,'image/svg+xml');
  if (xml.getElementsByTagName('parsererror').length || xml.documentElement.localName !== 'svg')
    throw new Error('El archivo no contiene un SVG válido.');
  const root=xml.documentElement;
  const vb=root.getAttribute('viewBox')?.trim().split(/[\s,]+/).map(Number);
  const viewBox=vb?.length===4 ? vb : [0,0,Number(root.getAttribute('width')),Number(root.getAttribute('height'))];
  if (viewBox.length!==4 || viewBox.some(v=>!Number.isFinite(v) || Math.abs(v)>1e7) || viewBox[2]<=0 || viewBox[3]<=0)
    throw new Error('El SVG necesita viewBox o dimensiones numéricas válidas.');
  const elementos: SvgFigura[]=[];
  const usados=new Set<string>();
  let visitados=0;
  const recorrer=(node: Element, transformPadre='', codigoPadre: string | null = null)=>{
    if(++visitados>4500) throw new Error('El archivo es demasiado complejo (más de 4,500 elementos).');
    const etiqueta=node.localName as SvgFiguraTipo;
    const transform=node.getAttribute('transform')?.trim() ?? '';
    if(transform && !validarAtributo('transform',transform)) throw new Error('Transformación SVG no compatible.');
    const transformTotal=[transformPadre,transform].filter(Boolean).join(' ');
    const codigoGrupo = [node.getAttribute('data-lote'),node.getAttribute('id'),node.getAttribute('data-code')]
      .map(x => codigoLoteVinculado(x,lotes)).find(Boolean) ?? codigoPadre;
    if(ALLOWED.has(etiqueta)){
      const atributos: Record<string,string>={};
      for(const atributo of Array.from(node.attributes)){
        if(ATTRS.has(atributo.name)){
          if(!validarAtributo(atributo.name,atributo.value.trim()))
            throw new Error('El SVG contiene un atributo vectorial inválido: '+atributo.name);
          atributos[atributo.name]=atributo.value.trim();
        }
      }
      if(transformTotal) atributos.transform=transformTotal;
      const opciones=[node.getAttribute('data-lote'),node.getAttribute('id'),node.getAttribute('data-code')];
      const codigoPropio=opciones.map(x=>codigoLoteVinculado(x,lotes)).find(Boolean) ?? null;
      const codigo=codigoPropio ?? (codigoGrupo && !usados.has(codigoGrupo) ? codigoGrupo : null);
      if(codigo && usados.has(codigo)) throw new Error('Un mismo lote figura más de una vez en el SVG: '+codigo);
      if(codigo) usados.add(codigo);
      const texto=etiqueta==='text' ? (node.textContent??'').trim().slice(0,150) : null;
      if(elementos.length>=2000) throw new Error('El plano supera 2,000 figuras. Simplifica el SVG en AutoCAD.');
      elementos.push({tipo:etiqueta,atributos,texto,codigoLote:codigo});
      return;
    }
    if(!['svg','g','defs','title','desc','metadata'].includes(etiqueta)) {
      // Elementos activos, referencias externas, CSS e imágenes se omiten por seguridad.
      return;
    }
    if(['defs','title','desc','metadata'].includes(etiqueta)) return;
    for(const hijo of Array.from(node.children)) recorrer(hijo,transformTotal,codigoGrupo);
  };
  recorrer(root);
  if(!elementos.length) throw new Error('El SVG no contiene figuras compatibles (trazos, polígonos o rectángulos).');
  return {nombreArchivo,viewBox,elementos};
}

export function vincularFigura(documento: PlanoSvgDocumento, indice: number, codigo: string | null,
  lotes: readonly Pick<LoteResponse,'codigo'>[]): PlanoSvgDocumento {
  if(indice<0 || indice>=documento.elementos.length) throw new Error('Figura fuera del plano.');
  const codigoValido=codigo===null ? null : codigoLoteVinculado(codigo,lotes);
  if(codigo!==null && !codigoValido) throw new Error('El lote no pertenece a este proyecto.');
  if(codigoValido && documento.elementos.some((e,i)=>i!==indice && e.codigoLote===codigoValido))
    throw new Error('Este lote ya tiene otra figura asociada.');
  return {...documento,elementos:documento.elementos.map((e,i)=>i===indice ? {...e,codigoLote:codigoValido}:e)};
}
