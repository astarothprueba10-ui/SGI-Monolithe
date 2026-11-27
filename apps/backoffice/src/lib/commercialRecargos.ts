import type { TarifaComercial, MatrizBase } from '../types/projectConfiguration';
export const solesRecargo=(v:number)=>new Intl.NumberFormat('es-PE',{style:'currency',currency:'PEN'}).format(v);
export function componentesMatriz(zonas:readonly string[]):string[]|null {
 const set=new Set(zonas);
 if(!set.has('D'))return null;
 const partes=new Set<string>();
 for(const z of zonas){
  if(z==='D')continue;
  if(!/^[A-CE-Z]+$/.test(z)||new Set(z).size!==z.length)return null;
  for(const k of z){if(!set.has(k))return null;partes.add(k);}
 }
 return [...partes].sort();
}
export function totalZona(z:string,b:number,r:Record<string,number>):number {
 return Math.round((b+(z==='D'?0:[...z].reduce((s,k)=>s+r[k],0)))*100)/100;
}
export function adicionalPorZona(tarifas:readonly TarifaComercial[],zona:string,etapa?:string):string {
 const hoy=new Intl.DateTimeFormat('en-CA',{timeZone:'America/Lima',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
 const vigentes=tarifas.filter(t=>(!etapa||t.codigoEtapa===etapa)&&t.moneda==='PEN'&&t.tipoTarifa==='MONTO_FIJO'&&t.vigenteDesde<=hoy&&(!t.vigenteHasta||t.vigenteHasta>=hoy));
 const montos=vigentes.filter(t=>t.codigoZona===zona).flatMap(t=>{
  const d=vigentes.find(b=>b.codigoEtapa===t.codigoEtapa&&b.codigoZona==='D');
  return d?[Math.round((t.valor-d.valor)*100)/100]:[];
 });
 if(!montos.length)return 'Sin tarifa vigente';
 const min=Math.min(...montos),max=Math.max(...montos);
 return min===max?solesRecargo(min):solesRecargo(min)+' – '+solesRecargo(max);
}

export function adicionalGeneral(m:MatrizBase|null|undefined,zona:string):string {
 if(!m)return 'Sin matriz general';
 const hoy=new Intl.DateTimeFormat('en-CA',{timeZone:'America/Lima',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
 if(m.vigenteDesde>hoy||m.vigenteHasta&&m.vigenteHasta<hoy)return 'Sin tarifa vigente';
 if(zona!=='D'&&(!/^[A-CE-Z]+$/.test(zona)||new Set(zona).size!==zona.length||[...zona].some(k=>!Object.prototype.hasOwnProperty.call(m.recargos,k))))return 'Sin tarifa vigente';
 return solesRecargo(Math.round((totalZona(zona,m.precioBase,m.recargos)-m.precioBase)*100)/100);
}
export function origenTarifario(general:MatrizBase|null|undefined,personalizadas:readonly string[],etapa:string):string {
 return personalizadas.includes(etapa)?'Personalizado':general?'Heredado del general':'Sin matriz general';
}
