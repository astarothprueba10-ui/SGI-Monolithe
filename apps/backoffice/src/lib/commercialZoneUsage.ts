import type { ConfiguracionProyectoResponse } from '../types/projectConfiguration';
export function contarZonaEtapa(c: ConfiguracionProyectoResponse, etapa: string): Map<string,number> {
  const manzanas=new Map(c.datos.manzanas.map(a=>[a.id,a.codigoEtapa]));
  const lotes=new Map(c.datos.lotes.map(a=>[a.id,a.codigoEtapa]));
  const uso=new Map<string,number>();
  for(const l of c.lotes) {
    if(!l.codigoZona || (lotes.get(l.id)??manzanas.get(l.idManzana))!==etapa)continue;
    uso.set(l.codigoZona,(uso.get(l.codigoZona)??0)+1);
  }
  return uso;
}
