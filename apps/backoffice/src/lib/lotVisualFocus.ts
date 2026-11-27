import type { LoteResponse } from '../types/core';
import type { PlanoSvgDocumento } from '../types/projectSvg';
import { figuraVinculable } from './projectSvg';

export type VisualBox = [number,number,number,number];
export const validBox=(b:readonly number[]|null|undefined):b is VisualBox =>
  !!b&&b.length===4&&b.every(Number.isFinite)&&b[2]>0&&b[3]>0;
export const blockKey=(l:LoteResponse)=>String(l.idManzana??l.codigoManzana??l.nombreManzana??l.idLote);
export function selectedVisualLot(lotes:readonly LoteResponse[],project:number,principal:string,editorPrincipal:boolean,candidato:string,editorAdicional:boolean,adicional:string,consulta:number|null=null,confirmados:readonly number[]=[]){
  const id=consulta!==null&&(consulta===Number(principal)||confirmados.includes(consulta))?consulta:Number(editorAdicional&&adicional?adicional:editorPrincipal&&candidato?candidato:principal);
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

// Ajusta la cámara a la relación real del visor, sin deformar el plano.
export function fitVisualBox(box:VisualBox,aspect:number):VisualBox {
  const ratio=Number.isFinite(aspect)&&aspect>0?aspect:1;
  const w=Math.max(box[2],box[3]*ratio),h=w/ratio;
  return [box[0]+(box[2]-w)/2,box[1]+(box[3]-h)/2,w,h];
}
export function clampVisualBox(full:VisualBox,view:VisualBox):VisualBox {
  const factor=Math.min(1,full[2]/view[2],full[3]/view[3]);
  const w=view[2]*factor,h=view[3]*factor;
  return [Math.max(full[0],Math.min(full[0]+full[2]-w,view[0]+(view[2]-w)/2)),
    Math.max(full[1],Math.min(full[1]+full[3]-h,view[1]+(view[3]-h)/2)),w,h];
}
export function zoomVisualBox(full:VisualBox,view:VisualBox,factor:number):VisualBox {
  const scale=Math.max(1,Math.min(24,full[2]/view[2]*factor));
  const w=full[2]/scale,h=full[3]/scale;
  return clampVisualBox(full,[view[0]+(view[2]-w)/2,view[1]+(view[3]-h)/2,w,h]);
}
// En una manzana muy larga se prioriza el lote y los vecinos inmediatos.
export function matrixFocusBox(full:VisualBox,target:VisualBox):VisualBox {
  const w=Math.min(full[2],target[2]*6),h=Math.min(full[3],target[3]*4.5);
  return clampVisualBox(full,[target[0]+(target[2]-w)/2,target[1]+(target[3]-h)/2,w,h]);
}
