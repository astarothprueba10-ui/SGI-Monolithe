import { useState } from 'react';
import { Select, FieldLabel } from '../../ui/Field';
import type { ConfiguracionComercial, ConfiguracionProyectoResponse, ReglaEtapaComercial } from '../../../types/projectConfiguration';
import { asignacion, asignar } from '../../../lib/projectConfiguration';

type Props = { datos: ConfiguracionComercial; catalogos: ConfiguracionProyectoResponse; onChange: (datos: ConfiguracionComercial) => void; readOnly?: boolean };

function EtapaSelect({ value, etapas, onChange, label, empty }: {
  value: string; etapas: ReglaEtapaComercial[]; onChange: (v: string) => void; label: string; empty: string;
}) {
  return <Select aria-label={label} value={value} onChange={e => onChange(e.target.value)}>
    <option value="">{empty}</option>
    {etapas.map((etapa, i) => <option key={i} value={etapa.codigo}>{etapa.codigo} — {etapa.nombre}</option>)}
  </Select>;
}

function Manzanas({ datos, catalogos, onChange, readOnly }: Props) {
  return <div className="grid gap-2 md:grid-cols-2">
    {catalogos.manzanas.map(m => <div key={m.id} className="rounded-md border border-brand-100 p-3">
      <FieldLabel>{m.codigo} — {m.nombre}</FieldLabel>
      {readOnly ? <p className="rounded-md border border-gray-200 bg-gray-100 p-2 text-sm text-gray-600">{datos.etapas.find(e=>e.codigo===asignacion(datos.manzanas,m.id))?.nombre??'Sin asignar'}</p> : <EtapaSelect label={`Etapa de manzana ${m.codigo}`} value={asignacion(datos.manzanas, m.id)} etapas={datos.etapas}
        empty="Sin asignar" onChange={v => onChange({ ...datos, manzanas: asignar(datos.manzanas, m.id, v) })}/>}
    </div>)}
  </div>;
}

function Lotes({ datos, catalogos, onChange, readOnly }: Props) {
  const [manzana, setManzana] = useState('');
  const lotes = catalogos.lotes.filter(l => String(l.idManzana) === manzana);
  return <div className="space-y-3">
    <div><FieldLabel>{readOnly?'Consultar lotes por manzana':'Manzana para excepciones individuales'}</FieldLabel>
      <Select aria-label="Manzana para excepciones" value={manzana} onChange={e => setManzana(e.target.value)}>
        <option value="">Selecciona una manzana</option>
        {catalogos.manzanas.map(m => <option key={m.id} value={m.id}>{m.codigo} — {m.nombre}</option>)}
      </Select></div>
    <div className="grid gap-2 md:grid-cols-2">
      {lotes.map(l => <div key={l.id} className="rounded-md border border-brand-100 p-3">
        <FieldLabel>{l.codigo}</FieldLabel>
        {readOnly ? <p className="rounded-md border border-gray-200 bg-gray-100 p-2 text-sm text-gray-600">{datos.etapas.find(e=>e.codigo===(asignacion(datos.lotes,l.id)||asignacion(datos.manzanas,l.idManzana)))?.nombre??'Sin asignar'} · {asignacion(datos.lotes,l.id)?'Asignación individual':'Heredada de manzana'}</p> : <EtapaSelect label={`Excepción de lote ${l.codigo}`} value={asignacion(datos.lotes, l.id)} etapas={datos.etapas}
          empty={`Heredar manzana (${asignacion(datos.manzanas, l.idManzana) || 'sin asignar'})`}
          onChange={v => onChange({ ...datos, lotes: asignar(datos.lotes, l.id, v) })}/>}
      </div>)}
    </div>
  </div>;
}

export function CommercialAssignmentEditor(props: Props) {
  return <section className="space-y-4">
    <div><h3 className="font-semibold text-brand-900">Asignaciones comerciales</h3>
      <p className="text-xs text-brand-500">Cada manzana se asigna a una etapa comercial. Una excepción por lote prevalecerá sobre la manzana al publicar las reglas.</p></div>
    <Manzanas {...props}/>
    <Lotes {...props}/>
  </section>;
}
