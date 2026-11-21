import { PlusIcon, Trash2Icon } from 'lucide-react';
import { Button } from '../../ui/Button';
import { Input, Select, FieldLabel } from '../../ui/Field';
import type { ConfiguracionComercial, ReglaEtapaComercial } from '../../../types/projectConfiguration';
import { actualizarEtapa, etapaEnUso, nuevaEtapa } from '../../../lib/projectConfiguration';

type Props = { datos: ConfiguracionComercial; onChange: (datos: ConfiguracionComercial) => void };
const MODOS = [
  ['PROMOCION', 'Disponible con promoción'],
  ['REGULAR', 'Disponible a precio regular'],
  ['ANTICIPADA', 'Venta anticipada sin promoción'],
  ['BLOQUEADA', 'Bloqueada']
] as const;

function Descuento({ etapa, onChange }: { etapa: ReglaEtapaComercial; onChange: (c: Partial<ReglaEtapaComercial>) => void }) {
  return <div className="grid grid-cols-2 gap-2">
    <div><FieldLabel>Tipo de descuento</FieldLabel>
      <Select aria-label="Tipo de descuento" value={etapa.tipoDescuento} disabled={etapa.disponibilidad !== 'PROMOCION'}
        onChange={e => onChange({ tipoDescuento: e.target.value as ReglaEtapaComercial['tipoDescuento'], descuento: 0 })}>
        <option value="NINGUNO">Ninguno</option><option value="PORCENTAJE">Porcentaje (%)</option><option value="MONTO_FIJO">Monto fijo (PEN)</option>
      </Select>
    </div>
    <div><FieldLabel>Valor</FieldLabel>
      <Input aria-label="Valor de descuento" type="number" min={0} step="0.01" value={etapa.descuento}
        disabled={etapa.tipoDescuento === 'NINGUNO'} onChange={e => onChange({ descuento: Number(e.target.value) })} />
    </div>
  </div>;
}

function FilaEtapa({ etapa, onChange, remove, enUso }: {
  etapa: ReglaEtapaComercial; onChange: (c: Partial<ReglaEtapaComercial>) => void; remove: () => void; enUso: boolean;
}) {
  return <div className="rounded-lg border border-brand-200 p-3 space-y-3">
    <div className="grid gap-3 md:grid-cols-[1fr_2fr_2fr_auto] items-end">
      <div><FieldLabel>Código</FieldLabel><Input aria-label="Código de etapa" maxLength={30} value={etapa.codigo}
        onChange={e => onChange({ codigo: e.target.value.toUpperCase().replace(/[^A-Z0-9_-]/g, '') })}/></div>
      <div><FieldLabel>Nombre</FieldLabel><Input aria-label="Nombre de etapa" maxLength={100} value={etapa.nombre}
        onChange={e => onChange({ nombre: e.target.value })}/></div>
      <div><FieldLabel>Condición comercial</FieldLabel><Select aria-label="Condición comercial" value={etapa.disponibilidad}
        onChange={e => onChange({ disponibilidad: e.target.value as ReglaEtapaComercial['disponibilidad'] })}>
        {MODOS.map(([id, label]) => <option key={id} value={id}>{label}</option>)}</Select></div>
      <Button variant="danger" icon={Trash2Icon} disabled={enUso} onClick={remove} title={enUso ? 'Quita las asignaciones primero' : 'Quitar del borrador'}>Quitar</Button>
    </div>
    <Descuento etapa={etapa} onChange={onChange}/>
  </div>;
}

export function CommercialStageEditor({ datos, onChange }: Props) {
  return <section className="space-y-3">
    <div className="flex flex-wrap items-center justify-between gap-2">
      <div><h3 className="font-semibold text-brand-900">Etapas comerciales</h3>
      <p className="text-xs text-brand-500">Define grupos de venta independientes de las etapas físicas.</p></div>
      <Button icon={PlusIcon} disabled={datos.etapas.length >= 100} onClick={() => onChange({ ...datos, etapas: [...datos.etapas, nuevaEtapa(datos.etapas)] })}>Nueva etapa</Button>
    </div>
    {datos.etapas.length === 0 && <p className="text-sm text-brand-500">Agrega una etapa para comenzar.</p>}
    {datos.etapas.map((etapa, i) => <FilaEtapa key={i} etapa={etapa}
      enUso={etapaEnUso(datos, etapa.codigo)} onChange={c => onChange(actualizarEtapa(datos, i, c))}
      remove={() => onChange({ ...datos, etapas: datos.etapas.filter((_, index) => index !== i) })}/>)}
  </section>;
}
