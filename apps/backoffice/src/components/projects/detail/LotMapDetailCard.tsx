import { BadgeCheckIcon, CalendarCheckIcon, CircleDollarSignIcon, HashIcon, LayersIcon,
  MapPinIcon, MapIcon, RulerIcon, TicketIcon, Building2Icon, ShieldCheckIcon } from 'lucide-react';
import type { LoteResponse } from '../../../types/core';
import type { LucideIcon } from 'lucide-react';
import { area } from '../../../utils/format';
import { Button } from '../../ui/Button';

const dinero = new Intl.NumberFormat('es-PE',{style:'currency',currency:'PEN'});
function Linea({ icono:Icono, nombre, valor }: { icono:LucideIcon; nombre:string; valor:React.ReactNode }) {
  return <div className="flex items-center justify-between gap-2 border-b border-brand-100 px-5 py-3 last:border-b-0">
    <dt className="flex items-center gap-2 text-xs font-medium text-brand-500"><Icono className="h-4 w-4 shrink-0 text-brand-400"/>{nombre}</dt>
    <dd className="text-right text-sm font-semibold text-brand-900">{valor}</dd>
  </div>;
}
export function LotMapDetailCard({ lote, precio, puedeOperar, onSeparar, onVender }: {
  lote:LoteResponse|null; precio:number|null; puedeOperar:boolean;
  onSeparar:()=>void; onVender:()=>void;
}) {
  return <aside className="h-fit overflow-hidden rounded-2xl border border-brand-200 bg-white shadow-sm xl:sticky xl:top-6">
    <div className="relative overflow-hidden bg-gradient-to-br from-brand-900 via-brand-800 to-emerald-700 p-5 text-white">
      <div className="absolute -bottom-10 -right-8 h-36 w-48 rounded-full bg-emerald-400/20"/>
      <div className="absolute -top-10 right-0 h-28 w-28 rounded-full bg-amber-400/15"/>
      <p className="relative text-xs font-medium text-white/75">Lote seleccionado</p>
      <h2 className="relative mt-1 text-xl font-bold tracking-tight">{lote ? `Lote ${lote.codigo}` : 'Selecciona un lote'}</h2>
      <p className="relative mt-1 text-xs text-white/85">{lote
        ? `${lote.nombreManzana??lote.codigoManzana??'Sin manzana'} · ${lote.nombreEtapa??lote.codigoEtapa??'Sin etapa'}`
        : 'Pulsa un lote de la matriz o el plano SVG'}</p>
    </div>
    {!lote ? <div className="flex min-h-56 flex-col items-center justify-center gap-3 p-6 text-center text-brand-500">
      <MapIcon className="h-9 w-9 text-brand-300"/>
      <p className="text-sm">Los datos y las operaciones aparecerán aquí.</p>
    </div> : <>
      <dl>
        <Linea icono={HashIcon} nombre="Código" valor={lote.codigo}/>
        <Linea icono={TicketIcon} nombre="Número" valor={lote.numero||'—'}/>
        <Linea icono={LayersIcon} nombre="Etapa comercial" valor={lote.nombreEtapa??lote.codigoEtapa??'—'}/>
        <Linea icono={Building2Icon} nombre="Manzana" valor={lote.nombreManzana??lote.codigoManzana??'—'}/>
        <Linea icono={MapPinIcon} nombre="Zona" valor={lote.nombreZona??lote.codigoZona??'—'}/>
        <Linea icono={RulerIcon} nombre="Área" valor={lote.areaM2!=null?area(lote.areaM2):'—'}/>
        <Linea icono={CircleDollarSignIcon} nombre="Precio oficial" valor={precio!=null?dinero.format(precio):'Sin precio'}/>
        <Linea icono={BadgeCheckIcon} nombre="Inventario" valor={<span className={`rounded-full px-2.5 py-1 text-xs ${lote.codigoEstadoLote==='DISPONIBLE'
          ? 'bg-emerald-100 text-emerald-800' : lote.codigoEstadoLote==='VENDIDO'
          ? 'bg-red-100 text-red-800' : lote.codigoEstadoLote==='NO_DISPONIBLE'
          ? 'bg-gray-100 text-gray-700' : 'bg-amber-100 text-amber-900'}`}>
          {lote.nombreEstadoLote??lote.codigoEstadoLote??'Sin estado'}</span>}/>
        <Linea icono={ShieldCheckIcon} nombre="Activo" valor={lote.activo?'Sí':'No'}/>
      </dl>
      <div className="space-y-2 p-4">
        <div className="grid grid-cols-2 gap-2">
          <Button variant="success" icon={CalendarCheckIcon} disabled={!puedeOperar}
            className="min-h-11 w-full" onClick={onSeparar}>Separar</Button>
          <Button variant="primary" icon={TicketIcon} disabled={!puedeOperar}
            className="min-h-11 w-full" onClick={onVender}>Vender</Button>
        </div>
        {!puedeOperar && <p className="text-center text-xs text-brand-500">
          Solo se habilitan operaciones para lotes activos, disponibles, con precio oficial y autorización comercial.
        </p>}
      </div>
    </>}
  </aside>;
}
