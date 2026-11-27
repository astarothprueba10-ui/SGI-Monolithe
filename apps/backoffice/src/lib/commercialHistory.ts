import type { EventoComercial, TarifaComercial, TarifarioComercial } from '../types/projectConfiguration';

type LoteEvento = { id_lote: number; codigo_etapa?: string | null; situacion?: string; estadoInventario?: string; precio_final?: number | null };
type Foto = { motivo?: string; filas?: number; estado?: { etapasHabilitadas?: string[]; tarifas?: TarifaComercial[]; tarifario?:TarifarioComercial|null }; lotes?: LoteEvento[] };
function leer(json: string): Foto | null {
  try { const f=JSON.parse(json); return f && typeof f==='object' && !Array.isArray(f)?f:null; } catch { return null; }
}
const clave=(t:TarifaComercial)=>[t.codigoEtapa,t.codigoZona,t.moneda].join('|');
const firma=(t:TarifaComercial|undefined)=>t?[t.valor,t.tipoTarifa,t.vigenteDesde,t.vigenteHasta].join('|'):'';
const firmaLote=(l:LoteEvento|undefined)=>l?[l.codigo_etapa,l.situacion,l.estadoInventario,l.precio_final].join('|'):'';
export function resumirEvento(e:EventoComercial) {
  const antes=leer(e.anterior), despues=leer(e.nuevo);
  if(!antes||!despues)return null;
  const prev=antes.estado?.etapasHabilitadas??[], next=despues.estado?.etapasHabilitadas??[];
  const ta=new Map((antes.estado?.tarifas??[]).map(t=>[clave(t),t]));
  const td=new Map((despues.estado?.tarifas??[]).map(t=>[clave(t),t]));
  const tarifas=[...new Set([...ta.keys(),...td.keys()])].filter(k=>firma(ta.get(k))!==firma(td.get(k))).map(k=>({clave:k,antes:ta.get(k),despues:td.get(k)}));
  const la=new Map((antes.lotes??[]).map(l=>[l.id_lote,l]));
  const lotes=(despues.lotes??[]).filter(l=>firmaLote(la.get(l.id_lote))!==firmaLote(l)).map(l=>({id:l.id_lote,antes:la.get(l.id_lote),despues:l}));
  const tg=antes.estado?.tarifario, tn=despues.estado?.tarifario;
  const firmaGeneral=(x:TarifarioComercial|null|undefined)=>x?.general?JSON.stringify([x.general.precioBase,x.general.vigenteDesde,x.general.vigenteHasta,Object.entries(x.general.recargos).sort(([a],[b])=>a.localeCompare(b))]):'';
  const personalizadas=(tn?.personalizadas??[]).filter(c=>!(tg?.personalizadas??[]).includes(c));
  const heredadas=(tg?.personalizadas??[]).filter(c=>!(tn?.personalizadas??[]).includes(c));
  return { cambioGeneral:firmaGeneral(tg)!==firmaGeneral(tn),personalizadas,heredadas,motivo:typeof despues.motivo==='string'?despues.motivo:undefined, filas:despues.filas, abiertas:next, abrieron:next.filter(c=>!prev.includes(c)), cerraron:prev.filter(c=>!next.includes(c)), tarifas, lotes,
    protegidos:(despues.lotes??[]).filter(l=>l.situacion==='PROTEGIDA').length,
    bloqueados:(despues.lotes??[]).filter(l=>l.situacion==='BLOQUEADA').length };
}
export function fechaEvento(fecha:string):string {
  const d=new Date(fecha);
  return Number.isNaN(d.getTime())?'Fecha no disponible':new Intl.DateTimeFormat('es-PE',{dateStyle:'medium',timeStyle:'short',timeZone:'America/Lima'}).format(d);
}
