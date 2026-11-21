import { PlusIcon, Trash2Icon } from 'lucide-react';
import { Button } from '../../ui/Button';
import { Input, Select, FieldLabel } from '../../ui/Field';
import type { ConfiguracionComercial, ConfiguracionProyectoResponse, TarifaComercial } from '../../../types/projectConfiguration';

type Props = { datos: ConfiguracionComercial; catalogos: ConfiguracionProyectoResponse; onChange: (datos: ConfiguracionComercial) => void };

function Opciones({ items }: { items: string[] }) {
  return <><option value="">Seleccionar</option>{items.map(i => <option key={i} value={i}>{i}</option>)}</>;
}

function FilaTarifa({ tarifa, catalogos, datos, cambiar, quitar }: Omit<Props, 'onChange'> & {
  tarifa: TarifaComercial; cambiar: (c: Partial<TarifaComercial>) => void; quitar: () => void;
}) {
  return <div className="rounded-lg border border-brand-200 p-3 space-y-2">
    <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
      <div><FieldLabel>Zona</FieldLabel><Select aria-label="Zona de tarifa" value={tarifa.codigoZona} onChange={e => cambiar({ codigoZona: e.target.value })}><Opciones items={catalogos.zonas}/></Select></div>
      <div><FieldLabel>Etapa</FieldLabel><Select aria-label="Etapa de tarifa" value={tarifa.codigoEtapa} onChange={e => cambiar({ codigoEtapa: e.target.value })}><Opciones items={datos.etapas.map(e => e.codigo)}/></Select></div>
      <div><FieldLabel>Moneda</FieldLabel><Select aria-label="Moneda de tarifa" value={tarifa.moneda} onChange={e => cambiar({ moneda: e.target.value })}><Opciones items={catalogos.monedas}/></Select></div>
      <div><FieldLabel>Tipo de tarifa</FieldLabel><Select aria-label="Tipo de tarifa" value={tarifa.tipoTarifa} onChange={e => cambiar({ tipoTarifa: e.target.value as TarifaComercial['tipoTarifa'] })}><option value="POR_M2">Por m²</option><option value="MONTO_FIJO">Monto fijo</option></Select></div>
    </div>
    <div className="grid grid-cols-2 gap-2 lg:grid-cols-[1fr_1fr_1fr_auto] items-end">
      <div><FieldLabel>Valor</FieldLabel><Input aria-label="Valor de tarifa" type="number" min="0.0001" step="0.0001" value={tarifa.valor} onChange={e => cambiar({ valor: Number(e.target.value) })}/></div>
      <div><FieldLabel>Vigente desde</FieldLabel><Input aria-label="Inicio de vigencia" type="date" value={tarifa.vigenteDesde} onChange={e => cambiar({ vigenteDesde: e.target.value })}/></div>
      <div><FieldLabel>Vigente hasta</FieldLabel><Input aria-label="Fin de vigencia" type="date" value={tarifa.vigenteHasta ?? ''} onChange={e => cambiar({ vigenteHasta: e.target.value || null })}/></div>
      <Button variant="danger" icon={Trash2Icon} onClick={quitar}>Quitar</Button>
    </div>
  </div>;
}

export function CommercialTariffEditor({ datos, catalogos, onChange }: Props) {
  const tarifas = datos.tarifas ?? [];
  function agregar() {
    const tarifa: TarifaComercial = { codigoZona: catalogos.zonas[0] ?? '', codigoEtapa: datos.etapas[0]?.codigo ?? '', moneda: catalogos.monedas.includes('PEN') ? 'PEN' : (catalogos.monedas[0] ?? ''), tipoTarifa: 'POR_M2', valor: 0, vigenteDesde: '', vigenteHasta: null };
    onChange({ ...datos, tarifas: [...tarifas, tarifa] });
  }
  return <section className="space-y-3">
    <div className="flex flex-wrap items-center justify-between gap-2">
      <div><h3 className="font-semibold text-brand-900">Tarifas por zona y etapa</h3><p className="text-xs text-brand-500">Una tarifa por combinación de zona, etapa comercial y moneda. Solo borrador.</p></div>
      <Button icon={PlusIcon} disabled={!catalogos.zonas.length || !datos.etapas.length || !catalogos.monedas.length || tarifas.length >= 2000} onClick={agregar}>Nueva tarifa</Button>
    </div>
    {tarifas.length === 0 && <p className="text-sm text-brand-500">Aún no hay tarifas configuradas en este borrador.</p>}
    {tarifas.map((tarifa, i) => <FilaTarifa key={i} tarifa={tarifa} catalogos={catalogos} datos={datos}
      cambiar={c => onChange({ ...datos, tarifas: tarifas.map((t, j) => j === i ? { ...t, ...c } : t) })}
      quitar={() => onChange({ ...datos, tarifas: tarifas.filter((_, j) => j !== i) })}/>)}
  </section>;
}
