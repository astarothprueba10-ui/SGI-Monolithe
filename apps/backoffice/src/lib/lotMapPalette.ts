// Los estados persistidos se mantienen intactos. Solo se agrupan para presentar el mapa.
export const MAP_STATUSES = [
  {code:'DISPONIBLE',label:'Disponibles',fill:'#12b981',stroke:'#0b8f63',text:'#ffffff',badge:'bg-emerald-100 text-emerald-800'},
  {code:'RESERVADO',label:'Separados',fill:'#f4b400',stroke:'#c58900',text:'#1f1f1f',badge:'bg-yellow-100 text-yellow-900'},
  {code:'VENDIDO',label:'Vendidos',fill:'#4169e1',stroke:'#244fc7',text:'#ffffff',badge:'bg-blue-100 text-blue-800'},
  {code:'BLOQUEADO',label:'Bloqueados',fill:'#ef4444',stroke:'#c62828',text:'#ffffff',badge:'bg-red-100 text-red-800'},
  {code:'NO_DISPONIBLE',label:'No disponibles',fill:'#8b95a7',stroke:'#667085',text:'#ffffff',badge:'bg-gray-100 text-gray-700'}
] as const;
export const MAP_SELECTED = {fill:'#ffffff',stroke:'#17202c',text:'#111111'} as const;
export function mapStatus(code?:string|null) {
  const normalized=code==='BLOQUEADO_COMERCIALMENTE'?'BLOQUEADO':code;
  return MAP_STATUSES.find(s=>s.code===normalized)??MAP_STATUSES[4];
}
export function mapLotColors(code?:string|null, selected=false) {
  return selected?MAP_SELECTED:mapStatus(code);
}
