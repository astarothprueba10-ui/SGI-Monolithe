import type { LoteResponse } from '../types/core';
import type { PlanoSvgDocumento } from '../types/projectSvg';
import { figuraVinculable } from './projectSvg';

export type VisualBox = [number,number,number,number];
export const validBox=(b:readonly number[]|null|undefined):b is VisualBox =>
  !!b&&b.length===4&&b.every(Number.isFinite)&&b[2]>0&&b[3]>0;
export const blockKey=(l:LoteResponse)=>String(l.idManzana??l.codigoManzana??l.nombreManzana??l.idLote);
export function selectedVisualLot(lotes:readonly LoteResponse[],project:number,principal:string,editorPrincipal:boolean,candidato:string,editorAdicional:boolean,adicional:string){
  const id=Number(editorAdicional&&adicional?adicional:editorPrincipal&&candidato?candidato:principal);
  return lotes.find(l=>l.activo&&l.idProyecto===project&&l.idLote===id)??null;
}
export function hasSvgLot(doc:PlanoSvgDocumento|null,lote:LoteResponse|null){
  return !!doc&&(!lote||doc.elementos.some(f=>f.codigoLote===lote.codigo&&figuraVinculable(f,doc.viewBox)));
}
// El encuadre incluye toda la manzana localizada y margen para las adyacentes.
export function focusBox(full:VisualBox,selected:VisualBox,neighbors:VisualBox[]):VisualBox {
  const boxes=[selected,...neighbors].filter(validBox);
  const x=Math.min(...boxes.map(b=>b[0])),y=Math.min(...boxes.map(b=>b[1]));
  const right=Math.max(...boxes.map(b=>b[0]+b[2])),bottom=Math.max(...boxes.map(b=>b[1]+b[3]));
  const px=Math.max(selected[2]*1.1,(right-x)*.12),py=Math.max(selected[3]*1.1,(bottom-y)*.18);
  const w=Math.min(full[2],Math.max(right-x+2*px,full[2]/6));
  const h=Math.min(full[3],Math.max(bottom-y+2*py,full[3]/6));
  return [Math.max(full[0],Math.min(full[0]+full[2]-w,(x+right-w)/2)),
    Math.max(full[1],Math.min(full[1]+full[3]-h,(y+bottom-h)/2)),w,h];
}
