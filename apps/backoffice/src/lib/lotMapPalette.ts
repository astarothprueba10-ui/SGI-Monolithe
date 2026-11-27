// Los estados persistidos se mantienen intactos. Solo se agrupan para presentar el mapa.
export const MAP_STATUSES = [
  {code:'DISPONIBLE',label:'Disponibles',fill:'#15966c',stroke:'#08734e',text:'#ffffff',badge:'bg-emerald-100 text-emerald-800'},
  {code:'RESERVADO',label:'Separados',fill:'#c49a26',stroke:'#8c6811',text:'#181b20',badge:'bg-yellow-100 text-yellow-900'},
  {code:'VENDIDO',label:'Vendidos',fill:'#2563b8',stroke:'#19488d',text:'#ffffff',badge:'bg-blue-100 text-blue-800'},
  {code:'BLOQUEADO',label:'Bloqueados',fill:'#dc454d',stroke:'#a52b33',text:'#ffffff',badge:'bg-red-100 text-red-800'},
  {code:'NO_DISPONIBLE',label:'No disponibles',fill:'#8792a3',stroke:'#596577',text:'#ffffff',badge:'bg-gray-100 text-gray-700'}
] as const;
export const MAP_SELECTED = {fill:'#ffffff',stroke:'#17202c',text:'#111111'} as const;
export function mapStatus(code?:string|null) {
  const normalized=code==='BLOQUEADO_COMERCIALMENTE'?'BLOQUEADO':code;
  return MAP_STATUSES.find(s=>s.code===normalized)??MAP_STATUSES[4];
}
export function mapLotColors(code?:string|null, selected=false) {
  return selected?MAP_SELECTED:mapStatus(code);
}
