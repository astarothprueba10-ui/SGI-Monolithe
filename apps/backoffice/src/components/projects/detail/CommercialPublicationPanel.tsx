import { useEffect, useState } from 'react';
import { ShieldCheckIcon } from 'lucide-react';
import { Button } from '../../ui/Button';
import { useAuth } from '../../../contexts/AuthContext';
import { projectConfigurationService } from '../../../services/projectConfigurationService';
import { estadoInventarioLegible, resumirPublicacion } from '../../../lib/commercialPresentation';
import { CommercialStageReleaseSelector } from './CommercialStageReleaseSelector';
import type { ConfiguracionProyectoResponse, PublicacionComercialResponse } from '../../../types/projectConfiguration';
import type { ProyectoResponse } from '../../../types/core';

type Props = {
  project: ProyectoResponse;
  config: ConfiguracionProyectoResponse;
  dirty: boolean;
  onPublished: () => void;
};

const moneda = new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN' });
const importe = (v: number | null) => v === null ? '—' : moneda.format(v);
const etiquetas = {
  HABILITADA: 'Precio configurado',
  BLOQUEADA: 'Bloqueada comercialmente',
  PROTEGIDA: 'Operación protegida',
  ERROR: 'Error de validación'
};

function Resumen({ r }: { r: PublicacionComercialResponse }) {
  const contadores = resumirPublicacion(r.lotes);
  const errores = r.lotes.filter(l => l.situacion === 'ERROR');
  const noAsignados = r.lotes.filter(l => l.situacion === 'BLOQUEADA' && !l.codigoEtapa);
  const resumen = [
    { titulo: 'Precios preparados', valor: contadores.preciosPreparados },
    { titulo: 'Se habilitarán ahora', valor: contadores.habilitarInventario },
    { titulo: 'Seguirán sin habilitar', valor: contadores.sinHabilitar },
    { titulo: 'Bloqueados comercialmente', valor: contadores.bloqueados },
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
    {contadores.yaDisponibles > 0 && <p className="rounded-md bg-brand-50 p-3 text-sm text-brand-700">
      {contadores.yaDisponibles} lote(s) ya figuran como «Disponible en inventario». No se revertirán
      por dejar una etapa sin seleccionar. Sus restricciones comerciales siguen aplicándose.
    </p>}
    {errores.length > 0 && <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
      <p className="font-semibold">Publicación detenida: {errores.length} lote(s) requieren corrección.</p>
      <ul className="mt-2 list-disc space-y-1 pl-5">
        {errores.map(l => <li key={l.idLote}><strong>{l.codigo}</strong>: {l.mensaje}</li>)}
      </ul>
    </div>}
    {noAsignados.length > 0 && <div role="status" className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
      <p className="font-semibold">{noAsignados.length} lote(s) sin etapa comercial quedarán bloqueados comercialmente.</p>
      <p className="mt-1">No podrán separarse ni venderse. Su estado de inventario no se modifica.</p>
      <p className="mt-1 font-medium">{noAsignados.map(l => l.codigo).join(', ')}</p>
    </div>}
    <div className="max-h-96 overflow-auto rounded-md border border-brand-200">
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
            {l.habilitarInventario ? 'Se habilitará' : 'Sin cambios'}
          </td>
          <td className="p-2 whitespace-nowrap">{importe(l.precioActual)}</td>
          <td className="p-2 whitespace-nowrap">{importe(l.precioFinal)}</td>
          <td className="p-2 whitespace-nowrap">{importe(l.descuento)}</td>
          <td className="p-2">{l.mensaje}{l.vigenteHasta ? ` Vigente hasta ${l.vigenteHasta}.` : ''}</td>
        </tr>)}</tbody>
      </table>
    </div>
  </div>;
}

export function CommercialPublicationPanel({ project, config, dirty, onPublished }: Props) {
  const { can } = useAuth();
  const [publicada, setPublicada] = useState<number | null>(null);
  const [etapasHabilitar, setEtapasHabilitar] = useState<string[]>([]);
  const [resultado, setResultado] = useState<PublicacionComercialResponse | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const [aceptado, setAceptado] = useState(false);
  const [error, setError] = useState('');
  const [intento, setIntento] = useState(0);
  const puede = can('lots.edit') && project.activo && !dirty
    && publicada === 0 && config.version > 0 && !ocupado;

  useEffect(() => {
    let activo = true;
    setPublicada(null);
    projectConfigurationService.versionPublicada(project.idProyecto)
      .then(r => { if (activo) setPublicada(r.version); })
      .catch((e: unknown) => {
        if (activo) setError(e instanceof Error ? e.message : 'No se pudo consultar la publicación.');
      });
    return () => { activo = false; };
  }, [project.idProyecto, intento]);

  function cambiarEtapa(codigo: string, marcada: boolean) {
    setEtapasHabilitar(prev => marcada
      ? [...prev.filter(x => x !== codigo), codigo]
      : prev.filter(x => x !== codigo));
    setResultado(null);
    setAceptado(false);
  }

  async function revisar() {
    if (!puede) return;
    setOcupado(true);
    setError('');
    setResultado(null);
    setAceptado(false);
    try {
      setResultado(await projectConfigurationService.revisarPublicacion(
        project.idProyecto, config.version, etapasHabilitar));
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'No se pudo revisar.');
    } finally { setOcupado(false); }
  }

  async function publicar() {
    if (!puede || !aceptado || !resultado || resultado.publicado
      || resultado.lotes.some(l => l.situacion === 'ERROR')) return;
    setOcupado(true);
    setError('');
    try {
      const r = await projectConfigurationService.publicar(
        project.idProyecto, config.version, etapasHabilitar, resultado.huella);
      setResultado(r);
      setPublicada(r.versionPublicada);
      onPublished();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'No se pudo publicar.');
      setResultado(null);
    } finally {
      setOcupado(false);
      setAceptado(false);
    }
  }

  return <section className="space-y-4 rounded-lg border border-brand-200 p-4">
    <div>
      <h3 className="font-semibold text-brand-900">Publicación de política comercial</h3>
      <p className="text-sm text-brand-600">{publicada === null ? 'Consultando política vigente…'
        : publicada > 0 ? `Política publicada v${publicada}` : 'Sin política publicada'}</p>
      <p className="mt-1 text-sm text-brand-600">
        Publicar precios y descuentos no implica habilitar todos los lotes para la venta.
        Las reservas y ventas existentes se respetan.
      </p>
    </div>

    {dirty && <p className="rounded-md bg-amber-50 p-3 text-sm text-amber-800">
      Guarda los cambios pendientes antes de revisar una publicación.
    </p>}

    {publicada !== null && publicada > 0 && <p role="status" className="rounded-md bg-emerald-50 p-3 text-sm text-emerald-800">
      Proyecto publicado. No se permiten nuevas versiones ni importaciones masivas.
    </p>}

    {publicada === 0 && <CommercialStageReleaseSelector config={config} seleccion={etapasHabilitar}
      disabled={!puede} onChange={cambiarEtapa}/>}

    {error && <div role="alert" className="text-sm text-red-700">
      {error}{publicada === null && <Button size="sm" onClick={() => { setError(''); setIntento(n => n + 1); }}>Reintentar</Button>}
    </div>}

    {publicada === 0 && <Button disabled={!puede} icon={ShieldCheckIcon} onClick={() => void revisar()}>
      {ocupado ? 'Procesando…' : 'Revisar publicación'}
    </Button>}

    {resultado && !dirty && <>
      <Resumen r={resultado}/>
      {resultado.publicado
        ? <p role="status" className="rounded-md bg-emerald-50 p-3 text-sm text-emerald-800">
            Política v{resultado.version} publicada. Los precios y las habilitaciones seleccionadas están vigentes.
          </p>
        : <>
          <label className="flex items-start gap-2 text-sm text-brand-800">
            <input type="checkbox" className="mt-1" checked={aceptado}
              disabled={!puede || resultado.lotes.some(l => l.situacion === 'ERROR')}
              onChange={e => setAceptado(e.target.checked)}/>
            Confirmo los precios y restricciones revisados y la liberación exclusivamente de los lotes indicados
            en «Se habilitarán ahora». Los demás conservarán su estado de inventario.
          </label>
          <Button variant="primary" disabled={!puede || !aceptado
            || resultado.lotes.some(l => l.situacion === 'ERROR')}
            onClick={() => void publicar()}>
            Publicar política comercial
          </Button>
        </>}
    </>}
  </section>;
}
