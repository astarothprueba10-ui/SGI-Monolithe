import { useEffect, useMemo, useState } from 'react';
import { CalendarRangeIcon, LayersIcon, PlusIcon, Trash2Icon, WandSparklesIcon } from 'lucide-react';
import { Button } from '../../ui/Button';
import { Input, Select, FieldLabel } from '../../ui/Field';
import { admiteMatrizRecargos, aplicarVigenciaTarifas, calcularMatrizTarifas, completarEtapasConTarifas,
  tarifaDeZona, actualizarTarifa, vigenciaValida } from '../../../lib/projectTariffMatrix';
import type { ConfiguracionComercial, ConfiguracionProyectoResponse, TarifaComercial } from '../../../types/projectConfiguration';

type Props = { datos: ConfiguracionComercial; catalogos: ConfiguracionProyectoResponse; onChange: (datos: ConfiguracionComercial) => void; readOnly?: boolean };
const dinero = (n: number, moneda: string) => new Intl.NumberFormat('es-PE',
  { style: 'currency', currency: moneda }).format(n);

export function CommercialTariffEditor({ datos, catalogos, onChange, readOnly = false }: Props) {
  const [etapa, setEtapa] = useState(datos.etapas[0]?.codigo ?? '');
  const [moneda, setMoneda] = useState(catalogos.monedas.includes('PEN') ? 'PEN' : catalogos.monedas[0] ?? '');
  const [desde, setDesde] = useState('');
  const [hasta, setHasta] = useState('');
  const [base, setBase] = useState(0);
  const [recargos, setRecargos] = useState({ A: 0, B: 0, C: 0 });
  const [aviso, setAviso] = useState('');
  const [error, setError] = useState('');
  const tarifas = datos.tarifas ?? [];
  const etapaActual = datos.etapas.find(e => e.codigo === etapa);
  const seleccion = useMemo(() => tarifas.filter(t => t.codigoEtapa === etapa && t.moneda === moneda),
    [tarifas, etapa, moneda]);
  const totalZonas = catalogos.zonas.length;
  const matrizDisponible = admiteMatrizRecargos(catalogos.zonas);

  useEffect(() => {
    if (!datos.etapas.some(e => e.codigo === etapa)) setEtapa(datos.etapas[0]?.codigo ?? '');
  }, [datos.etapas, etapa]);

  useEffect(() => {
    const ejemplos = tarifas.filter(t => t.codigoEtapa === etapa && t.moneda === moneda);
    const primera = ejemplos[0];
    const regular = tarifaDeZona(ejemplos, etapa, moneda, 'D')?.valor ?? 0;
    setDesde(primera?.vigenteDesde ?? '');
    setHasta(primera?.vigenteHasta ?? '');
    setBase(regular);
    setRecargos({
      A: Math.max(0, (tarifaDeZona(ejemplos, etapa, moneda, 'A')?.valor ?? regular) - regular),
      B: Math.max(0, (tarifaDeZona(ejemplos, etapa, moneda, 'B')?.valor ?? regular) - regular),
      C: Math.max(0, (tarifaDeZona(ejemplos, etapa, moneda, 'C')?.valor ?? regular) - regular)
    });
    setAviso('');
    setError('');
  }, [etapa, moneda]); // El cambio de etapa o moneda reajusta el editor masivo.

  function editar(tarifa: TarifaComercial) {
    onChange({ ...datos, tarifas: actualizarTarifa(tarifas, tarifa) });
    setAviso('Hay precios por guardar. Utiliza «Validar precios y continuar» al terminar.');
    setError('');
  }

  function agregar(zona: string) {
    if (!etapa || !moneda) return;
    const inicio = desde || seleccion[0]?.vigenteDesde;
    if (!inicio) { setError('Elige primero una fecha de inicio común para crear la tarifa.'); return; }
    editar({ codigoZona: zona, codigoEtapa: etapa, moneda, tipoTarifa: 'MONTO_FIJO',
      valor: base > 0 ? base : 0, vigenteDesde: inicio, vigenteHasta: hasta || null });
  }

  function quitar(zona: string) {
    if (!window.confirm(`¿Quitar la tarifa de ${zona} en ${etapaActual?.nombre ?? etapa}? Si existen lotes asociados, la publicación quedará pendiente hasta que se configure otra tarifa vigente.`)) return;
    onChange({ ...datos, tarifas: tarifas.filter(t => !(
      t.codigoEtapa === etapa && t.moneda === moneda && t.codigoZona === zona)) });
    setAviso('Tarifa retirada del borrador. Debe existir una tarifa válida para los lotes asociados antes de finalizar.');
  }

  function fechas(enTodas: boolean) {
    if (!vigenciaValida(desde, hasta || null)) {
      setError('Selecciona una fecha inicial válida. La fecha final es opcional y no puede preceder al inicio.');
      return;
    }
    const etapas = enTodas ? datos.etapas.map(e => e.codigo) : [etapa];
    const actualizadas = aplicarVigenciaTarifas(tarifas, etapas, moneda, desde, hasta || null);
    onChange({ ...datos, tarifas: actualizadas });
    setError('');
    setAviso(enTodas ? 'Vigencia aplicada a todas las etapas del borrador.' : 'Vigencia aplicada a esta etapa del borrador.');
  }

  function completar() {
    try {
      const nuevas = completarEtapasConTarifas(tarifas, etapa, datos.etapas.map(e => e.codigo), moneda);
      onChange({ ...datos, tarifas: nuevas });
      setAviso(`Se añadieron ${nuevas.length - tarifas.length} tarifas faltantes en otras etapas. Las existentes se conservaron.`);
      setError('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudieron copiar las tarifas.');
    }
  }

  function generar(enTodas: boolean) {
    if (!etapa || !moneda) return;
    try {
      const etapas = enTodas ? datos.etapas.map(e => e.codigo) : [etapa];
      const actualizadas = calcularMatrizTarifas(datos, catalogos.zonas, etapas, moneda,
        base, recargos, desde, hasta || null);
      onChange({ ...datos, tarifas: actualizadas });
      setError('');
      setAviso(enTodas ? `Matriz generada para ${etapas.length} etapas (${actualizadas.length} tarifas en el borrador).`
        : `Matriz generada para ${etapaActual?.nombre ?? etapa}. Valida los precios cuando termines.`);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo generar la matriz.');
    }
  }

  if (readOnly) return <section className="space-y-4">
    <h3 className="font-semibold text-brand-900">Matriz de tarifas</h3>
    <p className="text-sm text-brand-600">Consulta las tarifas de la configuración inicial publicada. El precio vigente individual puede diferir; los cambios de precios requieren una operación independiente, sin republicar.</p>
    <div className="grid gap-3 sm:grid-cols-2">
      <div><FieldLabel>Etapa comercial</FieldLabel><Select value={etapa} onChange={e => setEtapa(e.target.value)}>{datos.etapas.map(e => <option key={e.codigo} value={e.codigo}>{e.nombre}</option>)}</Select></div>
      <div><FieldLabel>Moneda</FieldLabel><Select value={moneda} onChange={e => setMoneda(e.target.value)}>{catalogos.monedas.map(m => <option key={m} value={m}>{m}</option>)}</Select></div>
    </div>
    <div className="overflow-auto rounded-lg border border-brand-200"><table className="w-full text-left text-sm">
      <thead className="bg-brand-50"><tr>{['Zona','Tarifa','Modalidad','Vigencia'].map(h => <th key={h} className="p-3">{h}</th>)}</tr></thead>
      <tbody>{catalogos.zonas.map(z => { const t = tarifaDeZona(tarifas, etapa, moneda, z); return <tr key={z} className="border-t border-brand-100">
        <td className="p-3">{z}</td><td className="p-3">{t ? dinero(t.valor, moneda) : 'Sin tarifa'}</td>
        <td className="p-3">{t ? t.tipoTarifa === 'POR_M2' ? 'Por m²' : 'Por lote' : '—'}</td>
        <td className="p-3">{t ? t.vigenteDesde + ' — ' + (t.vigenteHasta ?? 'Sin fin') : '—'}</td></tr>; })}</tbody>
    </table></div>
  </section>;

  return <section className="space-y-5">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div>
        <h3 className="text-base font-semibold text-brand-900">Matriz de tarifas</h3>
        <p className="text-sm text-brand-500">Un precio por zona y etapa. Edita solamente la etapa seleccionada.</p>
      </div>
      <span className="rounded-full bg-brand-50 px-3 py-1 text-xs font-medium text-brand-700">
        {tarifas.length} tarifas en el borrador
      </span>
    </div>

    <div className="flex flex-wrap gap-2" role="group" aria-label="Etapa comercial para editar tarifas">
      {datos.etapas.map(e => {
        const cantidad = tarifas.filter(t => t.codigoEtapa === e.codigo && t.moneda === moneda).length;
        return <button key={e.codigo} type="button" aria-pressed={etapa === e.codigo}
          onClick={() => setEtapa(e.codigo)}
          className={`rounded-lg border px-3 py-2 text-left text-sm transition-colors ${etapa === e.codigo
            ? 'border-[#4cbb17] bg-[#4cbb17]/10 text-brand-900'
            : 'border-brand-200 hover:bg-brand-50 text-brand-700'}`}>
          <span className="block font-semibold">{e.nombre}</span>
          <span className="text-xs">{cantidad}/{totalZonas} zonas · {e.codigo}</span>
        </button>;
      })}
    </div>

    <div className="flex flex-wrap items-end justify-between gap-3 rounded-lg border border-brand-100 bg-brand-50 p-3">
      <div>
        <p className="font-semibold text-brand-900">{etapaActual?.nombre ?? 'Selecciona una etapa'}</p>
        <p className="text-xs text-brand-500">
          {seleccion.length} tarifas de {totalZonas} zonas · {etapaActual?.disponibilidad ?? 'Sin regla comercial'}
        </p>
      </div>
      <div className="w-full sm:w-36">
        <FieldLabel>Moneda</FieldLabel>
        <Select aria-label="Moneda de tarifas" value={moneda} onChange={e => setMoneda(e.target.value)}>
          {catalogos.monedas.map(m => <option key={m} value={m}>{m}</option>)}
        </Select>
      </div>
    </div>

    <div className="overflow-x-auto rounded-lg border border-brand-200">
      <table className="min-w-[680px] w-full text-left text-sm">
        <thead className="bg-brand-50 text-brand-700">
          <tr><th className="p-3">Zona</th><th className="p-3">Precio / tarifa</th>
            <th className="p-3">Modalidad</th><th className="p-3">Vigencia</th><th className="p-3 text-right">Acción</th></tr>
        </thead>
        <tbody>
          {catalogos.zonas.map(zona => {
            const tarifa = tarifaDeZona(tarifas, etapa, moneda, zona);
            return <tr key={zona} className="border-t border-brand-100 hover:bg-brand-50/40">
              <td className="p-3 align-top"><span className="font-semibold text-brand-900">{zona}</span></td>
              {tarifa ? <>
                <td className="p-2 align-top">
                  <Input aria-label={`Precio zona ${zona}, etapa ${etapa}`} type="number" min="0.0001" step="0.0001"
                    value={tarifa.valor} onChange={e => editar({ ...tarifa, valor: Number(e.target.value) })}/>
                </td>
                <td className="p-2 align-top">
                  <Select aria-label={`Tipo tarifa zona ${zona}`} value={tarifa.tipoTarifa}
                    onChange={e => editar({ ...tarifa, tipoTarifa: e.target.value as TarifaComercial['tipoTarifa'] })}>
                    <option value="MONTO_FIJO">Por lote</option><option value="POR_M2">Por m²</option>
                  </Select>
                </td>
                <td className="p-3 align-top">
                  <span className="text-xs text-brand-700">Desde {tarifa.vigenteDesde}</span>
                  <span className="block text-xs text-brand-500">
                    {tarifa.vigenteHasta ? `Hasta ${tarifa.vigenteHasta}` : 'Sin fecha de fin'}
                  </span>
                </td>
                <td className="p-2 align-top text-right">
                  <Button size="sm" variant="ghost" icon={Trash2Icon}
                    aria-label={`Quitar tarifa zona ${zona}`} onClick={() => quitar(zona)}>Quitar</Button>
                </td>
              </> : <td className="p-3" colSpan={4}>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-xs text-amber-800">Sin tarifa configurada para esta etapa.</span>
                  <Button size="sm" icon={PlusIcon} onClick={() => agregar(zona)}>Crear tarifa</Button>
                </div>
              </td>}
            </tr>;
          })}
        </tbody>
      </table>
    </div>
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-brand-50 p-3">
      <div>
        <p className="text-sm font-semibold text-brand-900">¿Las demás etapas utilizan las mismas tarifas?</p>
        <p className="text-xs text-brand-500">
          Copia estas zonas a otras etapas solo donde todavía falten precios. No reemplaza tarifas existentes.
        </p>
      </div>
      <Button size="sm" icon={LayersIcon} disabled={!seleccion.length || datos.etapas.length < 2}
        onClick={completar}>Completar tarifas faltantes</Button>
    </div>
    <p className="text-xs text-brand-500">
      Los precios son de la etapa seleccionada; los descuentos promocionales se calculan aparte.
      Una tarifa sin fecha final continúa vigente hasta que se cambie.
    </p>

    <details className="rounded-lg border border-brand-200 p-4">
      <summary className="flex cursor-pointer items-center gap-2 text-sm font-semibold text-brand-900">
        <CalendarRangeIcon className="h-4 w-4"/>Editar fechas en bloque (sin modificar una por una)
      </summary>
      <div className="mt-4 space-y-3">
        <div className="grid gap-3 sm:grid-cols-2">
          <div><FieldLabel>Vigente desde</FieldLabel>
            <Input aria-label="Inicio de vigencia común" type="date" value={desde}
              onChange={e => setDesde(e.target.value)}/></div>
          <div><FieldLabel>Vigente hasta (opcional)</FieldLabel>
            <Input aria-label="Fin de vigencia común" type="date" min={desde || undefined}
              value={hasta} onChange={e => setHasta(e.target.value)}/></div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" icon={CalendarRangeIcon} onClick={() => fechas(false)}>Aplicar a esta etapa</Button>
          <Button size="sm" onClick={() => fechas(true)}>Aplicar a todas las etapas</Button>
        </div>
        <p className="text-xs text-brand-500">Si dejas «Vigente hasta» vacío, las tarifas no tienen caducidad automática.</p>
      </div>
    </details>

    {matrizDisponible && <details className="rounded-lg border border-brand-200 p-4">
      <summary className="flex cursor-pointer items-center gap-2 text-sm font-semibold text-brand-900">
        <WandSparklesIcon className="h-4 w-4"/>Generar automáticamente precios por cruces de zonas A, B y C
      </summary>
      <div className="mt-4 space-y-3">
        <p className="text-xs text-brand-600">
          Elige un precio base para D y los recargos de A, B y C. Se generan las combinaciones A+B,
          A+C, B+C y A+B+C sumando sus recargos, sin duplicarlos. Esta función es opcional y exclusiva
          de proyectos cuyas zonas tienen esos códigos.
        </p>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <div><FieldLabel>Precio base D ({moneda})</FieldLabel>
            <Input aria-label="Precio base zona D" type="number" min={1} value={base}
              onChange={e => setBase(Number(e.target.value))}/></div>
          {(['A','B','C'] as const).map(codigo => <div key={codigo}>
            <FieldLabel>Recargo zona {codigo} ({moneda})</FieldLabel>
            <Input aria-label={`Recargo zona ${codigo}`} type="number" min={0} value={recargos[codigo]}
              onChange={e => setRecargos(prev => ({ ...prev, [codigo]: Number(e.target.value) }))}/>
          </div>)}
        </div>
        <div className="rounded-md bg-brand-50 p-3 text-xs text-brand-700">
          <span className="font-semibold">Ejemplo A+B:</span> {dinero(base + recargos.A + recargos.B, moneda)}
          {' · '}<span className="font-semibold">A+B+C:</span>
          {' '}{dinero(base + recargos.A + recargos.B + recargos.C, moneda)}
          <p className="mt-1">Los precios de zona incorporan los recargos. Evita repetirlos mediante ajustes de tipo de lote.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button icon={LayersIcon} onClick={() => generar(false)}>Generar precios de esta etapa</Button>
          <Button icon={WandSparklesIcon} onClick={() => generar(true)}>Generar para todas las etapas</Button>
        </div>
        <p className="text-xs text-brand-500">
          Estas acciones solo actualizan el borrador, no los precios publicados. Revisa la tabla y continúa para validar y guardar.
        </p>
      </div>
    </details>}

    {error && <p role="alert" className="rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</p>}
    {aviso && <p role="status" className="rounded-md bg-emerald-50 p-3 text-sm text-emerald-800">{aviso}</p>}
  </section>;
}
