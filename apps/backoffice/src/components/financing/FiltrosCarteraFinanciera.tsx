import { RefreshCwIcon } from 'lucide-react';
import { Button } from '../ui/Button';
import { Input, SearchInput, Select } from '../ui/Field';

/** Misma estructura visual de filtros CRM: campos con etiqueta superior y fechas en segunda fila. */
export interface FiltrosCarteraState {
  busqueda:string;
  proyecto:string;
  lote:string;
  estado:string;
  fechaDesde:string;
  fechaHasta:string;
}

interface Props {
  filtros:FiltrosCarteraState;
  proyectos:string[];
  lotes:{codigo:string;proyecto:string}[];
  onBusqueda:(v:string)=>void;
  onProyecto:(v:string)=>void;
  onLote:(v:string)=>void;
  onEstado:(v:string)=>void;
  onFechaDesde:(v:string)=>void;
  onFechaHasta:(v:string)=>void;
  onLimpiar:()=>void;
}

export const FILTROS_CARTERA_VACIOS:FiltrosCarteraState = {
  busqueda:'',proyecto:'',lote:'',estado:'',fechaDesde:'',fechaHasta:''
};

const ESTADOS = [
  {valor:'',etiqueta:'Todos los estados'},
  {valor:'ACTIVO',etiqueta:'Activo'},
  {valor:'PENDIENTE_FIRMA',etiqueta:'Pendiente de firma'},
  {valor:'COMPLETADO',etiqueta:'Completado'},
  {valor:'ANULADO',etiqueta:'Anulado'}
] as const;

export function FiltrosCarteraFinanciera({
  filtros,proyectos,lotes,onBusqueda,onProyecto,onLote,onEstado,
  onFechaDesde,onFechaHasta,onLimpiar
}:Props) {
  const disponibles = lotes.filter(l => !filtros.proyecto || l.proyecto===filtros.proyecto);
  const lotesUnicos = [...new Set(disponibles.map(l => l.codigo))].sort((a,b)=>a.localeCompare(b,'es'));

  return <div className="space-y-3 py-4" aria-label="Filtros de planes y saldos">
    <div className="flex flex-wrap items-end gap-3">
      <div className="w-full sm:w-72">
        <span className="mb-1.5 block text-xs font-medium text-brand-600">
          Buscar venta o comprador
        </span>
        <SearchInput className="w-full" label="Buscar venta o comprador"
          placeholder="Nombre, código, lote o plan…"
          value={filtros.busqueda} onValueChange={onBusqueda}/>
      </div>
      <div className="w-full sm:w-56">
        <label htmlFor="cartera-proyecto" className="mb-1.5 block text-xs font-medium text-brand-600">
          Proyecto
        </label>
        <Select id="cartera-proyecto" aria-label="Filtrar por proyecto"
          value={filtros.proyecto} onChange={e=>onProyecto(e.target.value)}>
          <option value="">Todos los proyectos</option>
          {proyectos.map(p=><option key={p} value={p}>{p}</option>)}
        </Select>
      </div>
      <div className="w-full sm:w-48">
        <label htmlFor="cartera-lote" className="mb-1.5 block text-xs font-medium text-brand-600">
          Lote
        </label>
        <Select id="cartera-lote" aria-label="Filtrar por lote"
          value={filtros.lote} onChange={e=>onLote(e.target.value)}>
          <option value="">Todos los lotes</option>
          {lotesUnicos.map(l=><option key={l} value={l}>{l}</option>)}
        </Select>
      </div>
      <div className="w-full sm:w-48">
        <label htmlFor="cartera-estado" className="mb-1.5 block text-xs font-medium text-brand-600">
          Estado
        </label>
        <Select id="cartera-estado" aria-label="Filtrar por estado"
          value={filtros.estado} onChange={e=>onEstado(e.target.value)}>
          {ESTADOS.map(s=><option key={s.valor} value={s.valor}>{s.etiqueta}</option>)}
        </Select>
      </div>
    </div>
    <div className="flex flex-wrap items-end gap-3">
      <div className="w-full sm:w-48">
        <label htmlFor="cartera-fecha-desde" className="mb-1.5 block text-xs font-medium text-brand-600">
          Fecha desde
        </label>
        <Input id="cartera-fecha-desde" type="date" aria-label="Fecha desde"
          value={filtros.fechaDesde} max={filtros.fechaHasta || undefined}
          onChange={e=>onFechaDesde(e.target.value)}/>
      </div>
      <div className="w-full sm:w-48">
        <label htmlFor="cartera-fecha-hasta" className="mb-1.5 block text-xs font-medium text-brand-600">
          Fecha hasta
        </label>
        <Input id="cartera-fecha-hasta" type="date" aria-label="Fecha hasta"
          value={filtros.fechaHasta} min={filtros.fechaDesde || undefined}
          onChange={e=>onFechaHasta(e.target.value)}/>
      </div>
      <Button size="sm" icon={RefreshCwIcon} onClick={onLimpiar}>Limpiar filtros</Button>
      <span className="pb-1 text-[11px] text-brand-400">
        Las fechas acotan las ventas del período global; no modifican los KPI.
      </span>
    </div>
  </div>;
}
