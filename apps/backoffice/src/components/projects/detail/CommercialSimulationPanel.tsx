import { useState } from 'react';
import { CalculatorIcon } from 'lucide-react';
import { Button } from '../../ui/Button';
import { Select, FieldLabel } from '../../ui/Field';
import { projectConfigurationService } from '../../../services/projectConfigurationService';
import type { ConfiguracionProyectoResponse, SimulacionComercialResponse } from '../../../types/projectConfiguration';
import type { ProyectoResponse } from '../../../types/core';

type Props = { project: ProyectoResponse; config: ConfiguracionProyectoResponse; dirty: boolean };

function Dinero({ valor, moneda }: { valor: number | null; moneda: string }) {
  return <>{valor === null ? '—' : new Intl.NumberFormat('es-PE', { style: 'currency', currency: moneda }).format(valor)}</>;
}

function Resultado({ r }: { r: SimulacionComercialResponse }) {
  const items = [['Estado actual del lote', r.estadoInventario], ['Zona', r.codigoZona],
    ['Etapa comercial', r.codigoEtapa], ['Disponibilidad simulada', r.disponibilidad], ['Fecha', r.fecha], ['Versión', String(r.version)]];
  const precios = [['Precio base', r.precioBase], ['Ajuste por tipo', r.ajusteTipo],
    ['Descuento', r.descuento], ['Precio simulado', r.precioSimulado]] as const;
  return <div className="space-y-3">
    <p role="status" className={`rounded-md p-3 text-sm ${r.resultado === 'SIMULADO' ? 'bg-emerald-50 text-emerald-800' : 'bg-amber-50 text-amber-900'}`}>{r.mensaje}</p>
    <div className="grid grid-cols-2 gap-2 lg:grid-cols-3">{items.map(([label, valor]) =>
      <div key={label}><p className="text-xs text-brand-500">{label}</p><p className="text-sm font-medium text-brand-900">{valor ?? '—'}</p></div>)}</div>
    {r.precioSimulado !== null && <div className="grid gap-2 grid-cols-2 lg:grid-cols-4">{precios.map(([label, valor]) =>
      <div key={label} className="rounded-md border border-brand-100 p-3"><p className="text-xs text-brand-500">{label}</p>
      <p className="text-lg font-semibold text-brand-900"><Dinero valor={valor} moneda={r.moneda}/></p></div>)}</div>}
  </div>;
}

export function CommercialSimulationPanel({ project, config, dirty }: Props) {
  const [id, setId] = useState('');
  const [moneda, setMoneda] = useState(config.monedas.includes('PEN') ? 'PEN' : config.monedas[0] ?? '');
  const [r, setR] = useState<SimulacionComercialResponse | null>(null);
  const [error, setError] = useState('');
  const [cargando, setCargando] = useState(false);
  const habilitado = config.version > 0 && !dirty && !!id && !!moneda && !cargando;
  async function simular() {
    if (!habilitado) return;
    setCargando(true); setError(''); setR(null);
    try { setR(await projectConfigurationService.simular(project.idProyecto, Number(id), config.version, moneda)); }
    catch (e: unknown) { setError(e instanceof Error ? e.message : 'No se pudo simular.'); }
    finally { setCargando(false); }
  }
  return <section className="rounded-lg border border-brand-200 p-4 space-y-3">
    <h3 className="font-semibold text-brand-900">Simulador de precio y disponibilidad</h3>
    <p className="text-xs text-brand-500">Consulta teórica del borrador guardado y ajustes por tipo vigentes. No registra precios ni autoriza ventas.</p>
    {(dirty || config.version === 0) && <p className="text-sm text-amber-800">Guarda el borrador antes de simular.</p>}
    <div className="grid gap-3 md:grid-cols-[2fr_1fr_auto] items-end">
      <div><FieldLabel>Lote</FieldLabel><Select aria-label="Lote para simular" value={id} disabled={cargando} onChange={e => { setId(e.target.value); setR(null); }}>
        <option value="">Selecciona lote</option>{config.lotes.map(l => <option key={l.id} value={l.id}>{l.codigo}</option>)}</Select></div>
      <div><FieldLabel>Moneda</FieldLabel><Select aria-label="Moneda de simulación" value={moneda} disabled={cargando} onChange={e => { setMoneda(e.target.value); setR(null); }}>
        {config.monedas.map(m => <option key={m} value={m}>{m}</option>)}</Select></div>
      <Button icon={CalculatorIcon} disabled={!habilitado} onClick={simular}>{cargando ? 'Simulando...' : 'Simular lote'}</Button>
    </div>
    {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
    {r && !dirty && <Resultado r={r}/>}
  </section>;
}
