import { useState } from 'react';
import { PlusIcon, PencilIcon, Trash2Icon } from 'lucide-react';
import { Button } from '../../ui/Button';
import { Input, Select, FieldLabel } from '../../ui/Field';
import { Modal } from '../../ui/Modal';
import type { ConfiguracionComercial, ReglaEtapaComercial, ConfiguracionProyectoResponse } from '../../../types/projectConfiguration';
import { actualizarEtapa, etapaEnUso, nuevaEtapa, validarConfiguracion, condicionPrecio } from '../../../lib/projectConfiguration';
import { contarLotesPorEtapa } from '../../../lib/commercialPresentation';

type Props = {
  datos: ConfiguracionComercial;
  catalogos: ConfiguracionProyectoResponse;
  onChange: (datos: ConfiguracionComercial) => void | Promise<boolean>;
  readOnly?: boolean;
  projectName: string;
};
const MODOS = [
  ['PROMOCION', 'Precio promocional'],
  ['REGULAR', 'Precio regular']
] as const;

export function CommercialStageEditor({ datos, catalogos, onChange, readOnly = false, projectName }: Props) {
  const [edicion, setEdicion] = useState<{ index: number; etapa: ReglaEtapaComercial } | null>(null);
  const [error, setError] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [quitar, setQuitar] = useState<string | null>(null);
  const config = { ...catalogos, datos };
  const abrir = (index: number) => {
    setError('');
    setEdicion({ index, etapa: index < 0 ? nuevaEtapa(datos.etapas) : { ...datos.etapas[index], disponibilidad: datos.etapas[index].disponibilidad === 'BLOQUEADA' ? 'BLOQUEADA' : condicionPrecio(datos.etapas[index].disponibilidad) } });
  };
  const cerrar = () => { if (!guardando) { setEdicion(null); setQuitar(null); setError(''); } };
  const cambiar = (cambio: Partial<ReglaEtapaComercial>) => setEdicion(actual => {
    if (!actual) return actual;
    const etapa = { ...actual.etapa, ...cambio };
    if (etapa.disponibilidad !== 'PROMOCION') { etapa.tipoDescuento = 'NINGUNO'; etapa.descuento = 0; }
    if (etapa.tipoDescuento === 'NINGUNO') etapa.descuento = 0;
    return { ...actual, etapa };
  });
  async function aplicar(nuevos: ConfiguracionComercial) {
    if (readOnly || guardando) return;
    const fallo = validarConfiguracion(nuevos);
    if (fallo) { setError(fallo); return; }
    setGuardando(true); setError('');
    try {
      const ok = await onChange(nuevos);
      if (ok === false) { setError('No se guardó la etapa. Revisa el mensaje del servicio y vuelve a intentarlo.'); return; }
      setEdicion(null); setQuitar(null);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'No se pudo guardar la etapa comercial.');
    } finally { setGuardando(false); }
  }
  function guardar() {
    if (!edicion) return;
    const { index, etapa: original } = edicion;
    const etapa = { ...original, nombre: original.nombre.trim(), codigo: original.codigo.trim() };
    if (datos.etapas.some((e, i) => i !== index && e.codigo === etapa.codigo)) {
      setError('Ya existe una etapa comercial con ese código.'); return;
    }
    if (index < 0 && datos.etapas.length >= 100) { setError('Máximo 100 etapas comerciales.'); return; }
    if (!etapa.nombre || etapa.nombre.length > 100) { setError('Ingresa un nombre de hasta 100 caracteres.'); return; }
    void aplicar(index < 0 ? { ...datos, etapas: [...datos.etapas, etapa] } : actualizarEtapa(datos, index, etapa));
  }
  const etapa = edicion?.etapa;
  return <section className="space-y-4">
    <div className="flex flex-wrap items-center justify-between gap-2">
      <div><h3 className="font-semibold text-brand-900">Etapas comerciales</h3>
        <p className="text-xs text-brand-500">Organiza los grupos de venta, condiciones de precio y promociones de {projectName}.</p></div>
      {!readOnly && <Button variant="primary" icon={PlusIcon} disabled={guardando || datos.etapas.length >= 100} onClick={() => abrir(-1)}>Nueva etapa comercial</Button>}
    </div>
    <div className="overflow-x-auto rounded-lg border border-brand-100 bg-white">
      <table className="w-full text-left text-sm">
        <thead className="bg-brand-50 text-xs text-brand-700"><tr>
          {['Orden','Código','Nombre','Condición del precio','Descuento','Lotes asignados',...(!readOnly ? ['Acciones'] : [])].map(h => <th key={h} className="p-3">{h}</th>)}
        </tr></thead>
        <tbody>{datos.etapas.map((e,i) => <tr key={e.codigo} className="border-t border-brand-100">
          <td className="p-3">{i+1}</td><td className="p-3 font-medium">{e.codigo}</td><td className="p-3">{e.nombre}</td>
          <td className="p-3">{MODOS.find(([id]) => id === condicionPrecio(e.disponibilidad))?.[1]}{e.disponibilidad === 'BLOQUEADA' && <div className="text-xs text-brand-500">Bloqueo histórico conservado</div>}</td>
          <td className="p-3">{e.tipoDescuento === 'NINGUNO' ? '—' : e.tipoDescuento === 'PORCENTAJE' ? e.descuento + '%' : 'S/ ' + e.descuento.toFixed(2)}</td>
          <td className="p-3">{contarLotesPorEtapa(config,e.codigo)}</td>
          {!readOnly && <td className="p-3"><div className="flex gap-2">
            <Button size="sm" icon={PencilIcon} disabled={guardando} onClick={() => abrir(i)}>Editar</Button>
            <Button size="sm" variant="danger" icon={Trash2Icon} disabled={guardando || etapaEnUso(datos,e.codigo)} onClick={() => {setError('');setQuitar(e.codigo);}}>Quitar</Button>
          </div></td>}
        </tr>)}</tbody>
      </table>
      {datos.etapas.length === 0 && <p className="p-5 text-sm text-brand-500">No hay etapas comerciales registradas.</p>}
    </div>
    <p className="text-xs text-brand-500">La condición del precio no habilita ventas. Selecciona las etapas que deseas liberar en Publicación. Los bloqueos históricos se conservan.</p>
    <Modal open={!!edicion && !readOnly} onClose={cerrar} title={edicion?.index === -1 ? 'Nueva etapa comercial' : 'Editar etapa comercial'}
      description="Configura el precio regular o promocional de la etapa." width="max-w-2xl"
      footer={<><Button disabled={guardando} onClick={cerrar}>Cancelar</Button><Button variant="primary" disabled={guardando || readOnly} onClick={guardar}>{guardando ? 'Guardando…' : edicion?.index === -1 ? 'Crear etapa comercial' : 'Guardar cambios'}</Button></>}>
      {etapa && <fieldset disabled={guardando} className="space-y-4">
        <div className="rounded-md border border-brand-200 bg-brand-50 p-3 text-sm"><strong>Proyecto:</strong><div>{projectName}</div></div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div><FieldLabel htmlFor="comercial-codigo">Código *</FieldLabel><Input id="comercial-codigo" maxLength={30} value={etapa.codigo} onChange={e => cambiar({codigo:e.target.value.toUpperCase().replace(/[^A-Z0-9_-]/g,'')})}/></div>
          <div><FieldLabel htmlFor="comercial-nombre">Nombre *</FieldLabel><Input id="comercial-nombre" maxLength={100} value={etapa.nombre} onChange={e => cambiar({nombre:e.target.value})}/></div>
          <div><FieldLabel htmlFor="comercial-condicion">Condición del precio *</FieldLabel><Select id="comercial-condicion" disabled={etapa.disponibilidad === 'BLOQUEADA'} value={condicionPrecio(etapa.disponibilidad)} onChange={e => cambiar({disponibilidad:e.target.value as ReglaEtapaComercial['disponibilidad']})}>
            {MODOS.map(([id,label]) => <option key={id} value={id}>{label}</option>)}</Select></div>
          <div><FieldLabel htmlFor="comercial-descuento">Tipo de descuento</FieldLabel><Select id="comercial-descuento" disabled={etapa.disponibilidad !== 'PROMOCION'} value={etapa.tipoDescuento} onChange={e => cambiar({tipoDescuento:e.target.value as ReglaEtapaComercial['tipoDescuento'],descuento:0})}>
            <option value="NINGUNO">Ninguno</option><option value="PORCENTAJE">Porcentaje (%)</option><option value="MONTO_FIJO">Monto fijo (PEN)</option></Select></div>
          <div><FieldLabel htmlFor="comercial-valor">Valor del descuento</FieldLabel><Input id="comercial-valor" type="number" min={0} step="0.01" disabled={etapa.tipoDescuento === 'NINGUNO'} value={etapa.descuento} onChange={e => cambiar({descuento:Number(e.target.value)})}/></div>
        </div>
        {etapa.disponibilidad === 'BLOQUEADA' && <p className="rounded-md bg-brand-50 p-3 text-xs text-brand-700">Esta etapa conserva un bloqueo histórico. El cambio de su condición de precio estará disponible cuando se migre el control de liberación independiente.</p>}
        {error && <p role="alert" className="rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      </fieldset>}
    </Modal>
    <Modal open={!!quitar && !readOnly} onClose={cerrar} title="Quitar etapa comercial"
      footer={<><Button disabled={guardando} onClick={cerrar}>Cancelar</Button><Button variant="danger" disabled={guardando || !quitar || etapaEnUso(datos,quitar)} onClick={() => void aplicar({...datos,etapas:datos.etapas.filter(e => e.codigo !== quitar)})}>Quitar</Button></>}>
      <p>Se quitará la etapa {quitar} del borrador si no tiene asignaciones ni tarifas.</p>
      {error && <p role="alert" className="text-red-700">{error}</p>}
    </Modal>
  </section>;
}
