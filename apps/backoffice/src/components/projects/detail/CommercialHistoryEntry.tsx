import { fechaEvento, resumirEvento } from '../../../lib/commercialHistory';
import { estadoInventarioLegible } from '../../../lib/commercialPresentation';
import type { ConfiguracionProyectoResponse, EventoComercial, TarifaComercial } from '../../../types/projectConfiguration';

const tipos:Record<string,string>={IMPORTACION:'Importación inicial',INICIAL:'Configuración inicial finalizada',DISPONIBILIDAD:'Cambio de disponibilidad',TARIFAS:'Actualización de tarifa',ETAPAS:'Actualización de etapas comerciales',REPARACION:'Corrección técnica de referencias'};
const precio=(v:number|null|undefined,moneda='PEN')=>v==null?'—':new Intl.NumberFormat('es-PE',{style:'currency',currency:moneda}).format(v);
const tarifa=(t:TarifaComercial|undefined)=>t?`${precio(t.valor,t.moneda)} ${t.tipoTarifa==='POR_M2'?'/ m²':'/ lote'} · ${t.vigenteDesde} a ${t.vigenteHasta??'sin fin'}`:'Sin tarifa';
export function CommercialHistoryEntry({ evento:e, config }: { evento:EventoComercial; config:ConfiguracionProyectoResponse }) {
  const r=resumirEvento(e);
  const nombre=(c:string)=>config.datos.etapas.find(t=>t.codigo===c)?.nombre??c;
  const estado=(v:string|undefined)=>v?estadoInventarioLegible(v):'—';
  return <details className="rounded-md border border-brand-200 p-3">
    <summary className="cursor-pointer text-sm font-semibold text-brand-900">{tipos[e.tipo]??'Evento comercial'}<span className="ml-2 font-normal text-brand-600">· {e.actorNombre||(e.actor===null?'Sistema — corrección técnica':`Usuario #${e.actor} (nombre no disponible)`)} · {fechaEvento(e.fecha)} (Perú)</span></summary>
    {!r?<p className="mt-3 text-sm text-brand-600">Detalle histórico no disponible.</p>:<div className="mt-3 space-y-3 text-sm">
      {e.tipo==='IMPORTACION'&&<p>Se confirmó la carga inicial{typeof r.filas==='number'?` de ${r.filas} filas`:''}.</p>}
      {e.tipo==='INICIAL'&&<><p>Etapas abiertas: {r.abiertas.map(nombre).join(', ')||'Ninguna'}.</p><p>{r.tarifas.length} tarifas configuradas · {r.lotes.length} lotes registrados en la política · {r.protegidos} operaciones protegidas · {r.bloqueados} lotes cerrados comercialmente.</p></>}
      {e.tipo==='DISPONIBILIDAD'&&<><p>Etapas abiertas: {r.abrieron.map(nombre).join(', ')||'Ninguna nueva'}.</p><p>Etapas cerradas: {r.cerraron.map(nombre).join(', ')||'Ninguna nueva'}.</p><p>{r.lotes.length} lotes con cambios de estado o política.</p></>}
      {e.tipo==='REPARACION'&&<p>Se sincronizaron los códigos de zona sin modificar precios de lotes ni operaciones.</p>}
      {e.tipo==='ETAPAS'&&<p>Se actualizaron las etapas comerciales. Las etapas nuevas quedan cerradas.</p>}
      {e.tipo==='TARIFAS'&&<p>{r.tarifas.length} combinaciones modificadas · {r.lotes.length} lotes con cambios. Las operaciones protegidas se conservan.</p>}
      {r.tarifas.length>0&&<details><summary className="cursor-pointer font-medium">Ver tarifas ({r.tarifas.length})</summary><div className="mt-2 overflow-auto"><table className="w-full text-left text-xs"><thead className="bg-brand-50"><tr>{['Etapa','Zona','Antes','Después'].map(h=><th key={h} className="p-2">{h}</th>)}</tr></thead><tbody>{r.tarifas.map(t=>{const x=t.despues??t.antes!;return <tr key={t.clave} className="border-t border-brand-100"><td className="p-2">{nombre(x.codigoEtapa)}</td><td className="p-2">{x.codigoZona}</td><td className="p-2">{tarifa(t.antes)}</td><td className="p-2">{tarifa(t.despues)}</td></tr>;})}</tbody></table></div></details>}
      {r.lotes.length>0&&<details><summary className="cursor-pointer font-medium">Ver detalle de lotes ({r.lotes.length})</summary><div className="mt-2 max-h-80 overflow-auto"><table className="w-full text-left text-xs"><thead className="sticky top-0 bg-brand-50"><tr>{['Lote','Estado anterior','Estado nuevo','Precio anterior','Precio nuevo'].map(h=><th key={h} className="p-2">{h}</th>)}</tr></thead><tbody>{r.lotes.map(l=><tr key={l.id} className="border-t border-brand-100"><td className="p-2">{config.lotes.find(x=>x.id===l.id)?.codigo??`Lote #${l.id}`}</td><td className="p-2">{estado(l.antes?.estadoInventario)}</td><td className="p-2">{estado(l.despues.estadoInventario)}</td><td className="p-2">{precio(l.antes?.precio_final)}</td><td className="p-2">{precio(l.despues.precio_final)}</td></tr>)}</tbody></table></div></details>}
    </div>}
  </details>;
}
