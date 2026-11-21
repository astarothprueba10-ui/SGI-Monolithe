import { useEffect, useMemo, useState } from 'react';
import { CalculatorIcon, SearchIcon } from 'lucide-react';
import { Input, Select, FieldLabel } from '../../ui/Field';
import { projectConfigurationService } from '../../../services/projectConfigurationService';
import type { ConfiguracionProyectoResponse, SimulacionComercialResponse } from '../../../types/projectConfiguration';
import type { ProyectoResponse } from '../../../types/core';

type Props = { project: ProyectoResponse; config: ConfiguracionProyectoResponse; dirty: boolean };

function Dinero({ valor, moneda }: { valor: number | null; moneda: string }) {
  return <>{valor === null ? '—' : new Intl.NumberFormat('es-PE', { style: 'currency', currency: moneda }).format(valor)}</>;
}

function Resultado({ r }: { r: SimulacionComercialResponse }) {
  const items = [['Estado actual del lote', r.estadoInventario], ['Zona', r.codigoZona],
    ['Etapa comercial', r.codigoEtapa], ['Disponibilidad simulada', r.disponibilidad], ['Fecha', r.fecha]];
  const precios = [['Precio base', r.precioBase], ['Ajuste por tipo', r.ajusteTipo],
    ['Descuento', r.descuento], ['Precio simulado', r.precioSimulado]] as const;
  return <div className="space-y-3">
    <p role="status" className={`rounded-md p-3 text-sm ${r.resultado === 'SIMULADO'
      ? 'bg-emerald-50 text-emerald-800' : 'bg-amber-50 text-amber-900'}`}>{r.mensaje}</p>
    <div className="grid grid-cols-2 gap-2 md:grid-cols-3">{items.map(([label, valor]) =>
      <div key={label}><p className="text-xs text-brand-500">{label}</p>
        <p className="text-sm font-medium text-brand-900">{valor ?? '—'}</p></div>)}</div>
    {r.precioSimulado !== null && <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">{precios.map(([label, valor]) =>
      <div key={label} className="rounded-md border border-brand-100 p-3">
        <p className="text-xs text-brand-500">{label}</p>
        <p className="text-lg font-semibold text-brand-900"><Dinero valor={valor} moneda={r.moneda}/></p>
      </div>)}</div>}
  </div>;
}

export function CommercialSimulationPanel({ project, config, dirty }: Props) {
  const [id, setId] = useState('');
  const [busqueda, setBusqueda] = useState('');
  const [moneda, setMoneda] = useState(config.monedas.includes('PEN') ? 'PEN' : config.monedas[0] ?? '');
  const [resultado, setResultado] = useState<SimulacionComercialResponse | null>(null);
  const [error, setError] = useState('');
  const [cargando, setCargando] = useState(false);

  const filtrados = useMemo(() => config.lotes.filter(l =>
    l.codigo.toLowerCase().includes(busqueda.trim().toLowerCase())), [config.lotes, busqueda]);

  useEffect(() => {
    if (!config.lotes.some(l => String(l.id) === id)) {
      setId(config.lotes[0] ? String(config.lotes[0].id) : '');
    }
  }, [id, config.lotes]);

  useEffect(() => {
    if (!id || !moneda || dirty || config.version === 0) {
      setResultado(null);
      setCargando(false);
      return;
    }
    let activo = true;
    setResultado(null);
    setError('');
    setCargando(true);
    projectConfigurationService.simular(project.idProyecto, Number(id), config.version, moneda)
      .then(r => { if (activo) setResultado(r); })
      .catch((e: unknown) => { if (activo) setError(e instanceof Error ? e.message : 'No se pudo calcular la cotización.'); })
      .finally(() => { if (activo) setCargando(false); });
    return () => { activo = false; };
  }, [project.idProyecto, id, moneda, config.version, dirty]);

  return <section className="space-y-4 rounded-lg border border-brand-200 p-4">
    <div className="flex items-center gap-2">
      <CalculatorIcon className="h-5 w-5 text-brand-700" aria-hidden="true"/>
      <div>
        <h3 className="font-semibold text-brand-900">Simulador de precio y disponibilidad</h3>
        <p className="text-xs text-brand-500">Selecciona un lote y el precio se calcula automáticamente. No registra operaciones.</p>
      </div>
    </div>
    <div className="grid gap-3 md:grid-cols-[1fr_2fr_1fr]">
      <div><FieldLabel>Buscar lote</FieldLabel>
        <div className="relative"><SearchIcon className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-brand-400" aria-hidden="true"/>
          <Input aria-label="Buscar lote por código" className="pl-9" value={busqueda}
            onChange={e => setBusqueda(e.target.value)} placeholder="Ej. ALM-L008"/></div>
      </div>
      <div><FieldLabel>Lote ({filtrados.length} encontrados)</FieldLabel>
        <Select aria-label="Lote para simular" value={filtrados.some(l => String(l.id) === id) ? id : ''}
          onChange={e => setId(e.target.value)}>
          <option value="">Selecciona lote</option>
          {filtrados.map(l => <option key={l.id} value={l.id}>{l.codigo}</option>)}
        </Select>
      </div>
      <div><FieldLabel>Moneda</FieldLabel>
        <Select aria-label="Moneda de simulación" value={moneda}
          onChange={e => setMoneda(e.target.value)}>
          {config.monedas.map(m => <option key={m} value={m}>{m}</option>)}
        </Select></div>
    </div>
    {config.lotes.length === 0 && <p className="rounded-md bg-amber-50 p-3 text-sm text-amber-800">
      Este proyecto aún no tiene lotes en el catálogo. Registra la importación y vuelve al simulador.
    </p>}
    {filtrados.length === 0 && config.lotes.length > 0 && <p className="text-sm text-brand-500">Sin coincidencias para la búsqueda.</p>}
    {dirty && <p role="status" className="rounded-md bg-amber-50 p-3 text-sm text-amber-900">
      Tienes cambios pendientes. Guarda el borrador desde la parte superior para calcular con la versión actual.
    </p>}
    {!dirty && config.version === 0 && <p role="status" className="text-sm text-amber-800">
      Debes guardar el primer borrador antes de simular.
    </p>}
    {cargando && <p role="status" className="text-sm text-brand-600">Calculando precio del lote seleccionado…</p>}
    {error && !dirty && <p role="alert" className="rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</p>}
    {resultado && !dirty && <Resultado r={resultado}/>}
  </section>;
}
