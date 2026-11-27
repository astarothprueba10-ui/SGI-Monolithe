import { useEffect, useState } from 'react';
import { ShieldCheckIcon } from 'lucide-react';
import { Button } from '../../ui/Button';
import { useAuth } from '../../../contexts/AuthContext';
import { projectConfigurationService } from '../../../services/projectConfigurationService';
import { estadoInventarioLegible, resumirPublicacion } from '../../../lib/commercialPresentation';
import type { ConfiguracionProyectoResponse, PublicacionComercialResponse } from '../../../types/projectConfiguration';
import type { ProyectoResponse } from '../../../types/core';

type Props = {
  project: ProyectoResponse;
  config: ConfiguracionProyectoResponse;
  dirty: boolean;
  onPublished: () => void;
  onReviewTariffs: () => void;
  etapasSeleccionadas: string[];
  onBusyChange: (busy: boolean) => void;
};

const moneda = new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN' });
const importe = (v: number | null) => v === null ? '—' : moneda.format(v);
const etiquetas = {
  HABILITADA: 'Precio configurado',
  BLOQUEADA: 'Bloqueada comercialmente',
  PROTEGIDA: 'Operación protegida',
  ERROR: 'Error de validación'
};

function Resumen({ r, onReviewTariffs }: { r: PublicacionComercialResponse; onReviewTariffs: () => void }) {
  const contadores = resumirPublicacion(r.lotes);
  const errores = r.lotes.filter(l => l.situacion === 'ERROR');
  const grupos = new Map<string, typeof errores>();
  errores.forEach(l => grupos.set(l.mensaje, [...(grupos.get(l.mensaje) ?? []), l]));
  const noAsignados = r.lotes.filter(l => l.situacion === 'BLOQUEADA' && !l.codigoEtapa);
  const resumen = [
    { titulo: 'Precios preparados', valor: contadores.preciosPreparados },
    { titulo: 'Lotes que se habilitarán', valor: contadores.habilitarInventario },
    { titulo: 'Lotes que se cerrarán', valor: r.lotes.filter(l => l.bloquearInventario).length },
    { titulo: 'Operaciones protegidas', valor: contadores.protegidos },
    { titulo: 'Errores', valor: contadores.errores }
  ];
  return <div className="space-y-3">
    <div className="grid grid-cols-2 gap-2 md:grid-cols-3 xl:grid-cols-6">
      {resumen.map(item => <div key={item.titulo} className="rounded-md border border-brand-100 p-3">
        <p className="text-xs text-brand-500">{item.titulo}</p>
        <p className={`text-xl font-semibold ${item.titulo === 'Errores' && item.valor ? 'text-red-700' : 'text-brand-900'}`}>{item.valor}</p>
      </div>)}
    </div>
    {r.lotes.some(l => l.bloquearInventario) && <p className="rounded-md bg-brand-50 p-3 text-sm text-brand-700">
      {r.lotes.filter(l => l.bloquearInventario).length} lote(s) disponibles pasarán a no habilitado para ventas al cerrar su etapa.
    </p>}
    {errores.length > 0 && <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
      <p className="font-semibold">Publicación detenida: {errores.length} lote(s) requieren corrección.</p>
      <ul className="mt-2 list-disc space-y-1 pl-5">
        {[...grupos.entries()].map(([mensaje, filas]) => <li key={mensaje}><strong>{filas.length} lote(s)</strong>: {mensaje}
          <details className="mt-1"><summary className="cursor-pointer">Ver lotes afectados</summary><p>{filas.map(f => f.codigo).join(', ')}</p></details></li>)}
      </ul>
      <Button size="sm" onClick={onReviewTariffs}>Revisar matriz de tarifas</Button>
    </div>}
    {noAsignados.length > 0 && <div role="status" className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
      <p className="font-semibold">{noAsignados.length} lote(s) sin etapa comercial quedarán bloqueados comercialmente.</p>
      <p className="mt-1">No podrán separarse ni venderse. Los disponibles pasarán a no habilitado.</p>
      <p className="mt-1 font-medium">{noAsignados.map(l => l.codigo).join(', ')}</p>
    </div>}
    <details className="rounded-md border border-brand-200 p-3"><summary className="cursor-pointer text-sm font-semibold">Ver detalle por lote (opcional)</summary>
    <div className="mt-3 max-h-96 overflow-auto rounded-md border border-brand-200">
      <table className="min-w-[950px] w-full text-xs text-left">
        <thead className="sticky top-0 bg-brand-50 text-brand-900"><tr>
          {['Lote','Inventario actual','Etapa comercial','Política','Cambio en inventario','Precio actual','Precio final','Descuento','Detalle'].map(h=>
            <th key={h} className="p-2">{h}</th>)}
        </tr></thead>
        <tbody>{r.lotes.map(l => <tr key={l.idLote} className="border-t border-brand-100">
          <td className="p-2 font-medium">{l.codigo}</td>
          <td className="p-2">{estadoInventarioLegible(l.estadoInventario)}</td>
          <td className="p-2">{l.codigoEtapa ?? 'Sin asignar'}</td>
          <td className={`p-2 font-medium ${l.situacion === 'ERROR' ? 'text-red-700' : ''}`}>{etiquetas[l.situacion]}</td>
          <td className={`p-2 font-semibold ${l.habilitarInventario ? 'text-emerald-700' : 'text-brand-600'}`}>
            {l.habilitarInventario ? 'Se habilitará' : l.bloquearInventario ? 'Se bloqueará' : 'Sin cambios'}
          </td>
          <td className="p-2 whitespace-nowrap">{importe(l.precioActual)}</td>
          <td className="p-2 whitespace-nowrap">{importe(l.precioFinal)}</td>
          <td className="p-2 whitespace-nowrap">{importe(l.descuento)}</td>
          <td className="p-2">{l.mensaje}{l.vigenteHasta ? ` Vigente hasta ${l.vigenteHasta}.` : ''}</td>
        </tr>)}</tbody>
      </table>
    </div></details>
  </div>;
}

export function CommercialPublicationPanel({ project, config, dirty, onPublished, onReviewTariffs, etapasSeleccionadas, onBusyChange }: Props) {
  const { can } = useAuth();
  const [resultado, setResultado] = useState<PublicacionComercialResponse | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const [aceptado, setAceptado] = useState(false);
  const [error, setError] = useState('');
  const [intento, setIntento] = useState(0);
  const puedeConsultar = can('lots.edit') && project.activo && !dirty && config.version > 0;
  const claveSeleccion = JSON.stringify([...etapasSeleccionadas].sort());
  const puede = puedeConsultar && !ocupado;

  useEffect(() => {
    if (!puedeConsultar) return;
    let vigente = true;
    setOcupado(true); onBusyChange(true); setError(''); setResultado(null); setAceptado(false);
    const etapasHabilitar: string[] = JSON.parse(claveSeleccion);
    projectConfigurationService.revisarPublicacion(project.idProyecto, config.version, etapasHabilitar)
      .then(r => { if (vigente) setResultado(r); })
      .catch((e: unknown) => { if (vigente) setError(e instanceof Error ? e.message : 'No se pudo revisar la configuración.'); })
      .finally(() => { if (vigente) { setOcupado(false); onBusyChange(false); } });
    return () => { vigente = false; onBusyChange(false); };
  }, [project.idProyecto, config.version, claveSeleccion, puedeConsultar, intento, onBusyChange]);

  async function publicar() {
    if (!puede || !aceptado || !resultado || resultado.publicado || resultado.lotes.some(l => l.situacion === 'ERROR')) return;
    setOcupado(true); onBusyChange(true); setError('');
    try {
      const r = await projectConfigurationService.publicar(project.idProyecto, config.version, etapasSeleccionadas, resultado.huella);
      setResultado(r); onPublished();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'No se pudo finalizar la configuración.'); setResultado(null);
    } finally { setOcupado(false); onBusyChange(false); setAceptado(false); }
  }

  return <section className="space-y-4 rounded-lg border border-brand-200 p-4">
    <div><h3 className="font-semibold text-brand-900">Finalizar configuración inicial</h3>
      <p className="text-sm text-brand-600">Revisa el resumen. Los precios y la disponibilidad se aplicarán una sola vez al confirmar.</p></div>
    <div className="flex flex-wrap gap-2">{config.datos.etapas.map(e => {
      const abierta = etapasSeleccionadas.includes(e.codigo);
      return <span key={e.codigo} className={`rounded-md border px-2 py-1 text-xs ${abierta ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-gray-200 bg-gray-100 text-gray-600'}`}>{e.nombre}: {abierta ? 'Abierta' : 'Cerrada'}</span>;
    })}</div>
    {ocupado && <p role="status" className="text-sm text-brand-600">Validando configuración con el servidor…</p>}
    {!puedeConsultar && <p className="text-sm text-brand-600">Guarda la configuración y verifica tus permisos antes de finalizar.</p>}
    {error && <div role="alert" className="rounded-md bg-red-50 p-3 text-sm text-red-700">{error} <Button size="sm" disabled={ocupado} onClick={() => setIntento(n => n+1)}>Reintentar validación</Button></div>}
    {resultado && !dirty && <>
      <Resumen r={resultado} onReviewTariffs={onReviewTariffs}/>
      {!resultado.publicado && <>
        <label className="flex items-start gap-2 text-sm text-brand-800">
          <input type="checkbox" className="mt-1" checked={aceptado} disabled={!puede || resultado.lotes.some(l => l.situacion === 'ERROR')} onChange={e => setAceptado(e.target.checked)}/>
          Confirmo los precios y la disponibilidad revisados. Las ventas, reservas y bloqueos individuales se conservan.
        </label>
        <Button variant="primary" icon={ShieldCheckIcon} disabled={!puede || !aceptado || resultado.lotes.some(l => l.situacion === 'ERROR')} onClick={() => void publicar()}>Finalizar configuración inicial</Button>
      </>}
    </>}
  </section>;
}
