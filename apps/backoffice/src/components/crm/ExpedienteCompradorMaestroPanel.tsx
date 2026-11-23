import { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft, CalendarDays, ChevronDown, FileText, FolderOpen,
  History, Layers3, RefreshCw, UserRound,
} from 'lucide-react';
import {
  crmBackend, type CrmBuyer, type CrmBuyerPortfolio, type CrmCompradorExpediente,
} from '../../services/crmBackend';
import { ExpedienteCompradorPanel } from './ExpedienteCompradorPanel';
import { currency } from '../../utils/format';

type Vista = 'adquisiciones' | 'personales' | 'historial';
type GrupoProyecto = { id: number; nombre: string; operaciones: CrmBuyer[] };

function fecha(value?: string | null) {
  if (!value) return 'Sin fecha registrada';
  return new Date(value).toLocaleDateString('es-PE', { timeZone: 'America/Lima' });
}

function Campo({ etiqueta, valor }: { etiqueta: string; valor?: string | null }) {
  return <div className="border-b border-brand-100 py-3">
    <dt className="text-[11px] font-medium uppercase tracking-wide text-brand-500">{etiqueta}</dt>
    <dd className="mt-1 break-words text-sm font-semibold text-brand-900">{valor || 'No registrado'}</dd>
  </div>;
}

function Modalidad({ value }: { value?: string }) {
  const financiado = value === 'FINANCIADA';
  return <span className={`inline-flex whitespace-nowrap rounded-full border px-2.5 py-1 text-[11px] font-semibold ${
    financiado
      ? 'border-sky-200 bg-sky-50 text-sky-700'
      : 'border-slate-200 bg-slate-50 text-slate-700'
  }`}>{financiado ? 'Financiado' : 'Contado'}</span>;
}

export function ExpedienteCompradorMaestroPanel({
  buyer, projectFocus,
}: { buyer: CrmBuyerPortfolio; projectFocus?: number }) {
  const [data, setData] = useState<CrmCompradorExpediente | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [revision, setRevision] = useState(0);
  const [vista, setVista] = useState<Vista>('adquisiciones');
  const [seleccion, setSeleccion] = useState<CrmBuyer | null>(null);
  const [proyectoAbierto, setProyectoAbierto] = useState<number | null>(null);

  useEffect(() => {
    let alive = true;
    setData(null);
    setError('');
    setLoading(true);
    void crmBackend.expedienteMaestroComprador(buyer.id_cliente)
      .then((result) => { if (alive) setData(result); })
      .catch((err: unknown) => {
        if (alive) setError(err instanceof Error ? err.message : 'No se pudo cargar el expediente.');
      })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [buyer.id_cliente, revision]);

  useEffect(() => {
    setSeleccion(null);
    setVista('adquisiciones');
    setProyectoAbierto(null);
  }, [buyer.id_cliente]);

  const grupos = useMemo<GrupoProyecto[]>(() => {
    const mapa = new Map<number, GrupoProyecto>();
    for (const op of data?.operaciones ?? []) {
      const id = op.id_proyecto ?? 0;
      let grupo = mapa.get(id);
      if (!grupo) {
        grupo = { id, nombre: op.proyecto_nombre || 'Proyecto sin identificar', operaciones: [] };
        mapa.set(id, grupo);
      }
      grupo.operaciones.push(op);
    }
    return Array.from(mapa.values()).sort((a, b) =>
      a.id === projectFocus ? -1 : b.id === projectFocus ? 1 :
        a.nombre.localeCompare(b.nombre, 'es')
    );
  }, [data, projectFocus]);

  const operaciones = useMemo(() =>
    [...(data?.operaciones ?? [])].sort((a, b) =>
      (b.fecha_formalizacion ?? b.fecha_venta).localeCompare(a.fecha_formalizacion ?? a.fecha_venta)
    ), [data]);

  if (loading) return <div className="flex items-center justify-center gap-2 p-12 text-sm text-brand-500">
    <RefreshCw className="h-5 w-5 animate-spin" /> Cargando expediente maestro…
  </div>;
  if (error || !data) return <div className="rounded-xl border border-amber-200 bg-amber-50 p-5">
    <p className="text-sm text-amber-900">{error || 'No se encontró el expediente del cliente.'}</p>
    <button type="button" className="mt-3 text-sm font-semibold text-brand-800 underline"
      onClick={() => setRevision(x => x + 1)}>Reintentar</button>
  </div>;

  const cliente = data.cliente;
  const t = data.totales;
  return <div className="space-y-5">
    <div className="rounded-xl border border-brand-100 bg-gradient-to-r from-brand-50/70 to-white p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="rounded-xl border border-brand-100 bg-white p-3 text-brand-700">
            <UserRound className="h-6 w-6" />
          </div>
          <div>
            <h3 className="text-base font-bold text-brand-900">{cliente.nombre_completo}</h3>
            <p className="mt-1 font-mono text-xs text-brand-600">{cliente.codigo_cliente}</p>
            <p className="mt-1 text-xs text-brand-500">Una persona · Histórico de compras por contrato</p>
          </div>
        </div>
        <span className="rounded-full border border-brand-200 bg-white px-3 py-1 text-xs text-brand-700">
          Operaciones según permisos de acceso
        </span>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
        {[
          { nombre: 'Lotes adquiridos', valor: t.cantidad_lotes },
          { nombre: 'Compras', valor: t.cantidad_compras },
          { nombre: 'Proyectos', valor: t.cantidad_proyectos },
        ].map(k => <div className="rounded-lg border border-brand-100 bg-white p-3" key={k.nombre}>
          <p className="text-[11px] text-brand-500">{k.nombre}</p>
          <p className="mt-1 text-xl font-bold tabular-nums text-brand-900">{k.valor}</p>
        </div>)}
      </div>
    </div>

    {seleccion ? <>
      <button type="button" onClick={() => setSeleccion(null)}
        className="inline-flex items-center gap-2 rounded-lg border border-brand-200 px-3 py-2 text-sm font-semibold text-brand-700 hover:bg-brand-50">
        <ArrowLeft className="h-4 w-4"/> Volver a las adquisiciones
      </button>
      <section className="rounded-xl border border-brand-100 bg-brand-50/50 p-4">
        <h3 className="font-semibold text-brand-900">{seleccion.proyecto_nombre} · {seleccion.codigo_lote}</h3>
        <p className="mt-1 font-mono text-xs text-brand-600">{seleccion.codigo_contrato}</p>
        <p className="mt-1 text-xs text-brand-500">Contrato, documentación y pagos exclusivos de este lote.</p>
      </section>
      <ExpedienteCompradorPanel key={seleccion.id_venta} buyer={seleccion}/>
    </> : <>
      <div role="tablist" aria-label="Secciones del expediente"
        className="flex flex-wrap gap-1 rounded-xl border border-brand-100 bg-brand-50/50 p-1.5">
        {([
          ['adquisiciones', FolderOpen, 'Adquisiciones'],
          ['personales', UserRound, 'Datos personales'],
          ['historial', History, 'Historial completo'],
        ] as const).map(([key, Icon, nombre]) =>
          <button type="button" role="tab" aria-selected={vista === key}
            key={key} onClick={() => setVista(key)}
            className={`inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-xs font-semibold transition-colors ${
              vista === key ? 'bg-white text-brand-900 shadow-sm' : 'text-brand-600 hover:bg-white/70'
            }`}>
            <Icon className="h-4 w-4"/>{nombre}
          </button>
        )}
      </div>

      {vista === 'personales' && <section role="tabpanel"
        className="rounded-xl border border-brand-100 bg-white p-4 sm:p-6">
        <div className="mb-3 flex items-center gap-2"><UserRound className="h-4 w-4 text-brand-700"/>
          <h3 className="font-semibold text-brand-900">Ficha personal única</h3></div>
        <p className="text-xs text-brand-500">Datos actuales del cliente registrados en el núcleo de personas, sin duplicarlos por lote.</p>
        <dl className="mt-3 grid grid-cols-1 gap-x-8 sm:grid-cols-2">
          <Campo etiqueta="Cliente" valor={cliente.nombre_completo}/>
          <Campo etiqueta="Código único" valor={cliente.codigo_cliente}/>
          <Campo etiqueta="Documento" valor={[cliente.tipo_documento, cliente.numero_documento].filter(Boolean).join(' ')}/>
          <Campo etiqueta="Estado civil" valor={cliente.estado_civil}/>
          <Campo etiqueta="Teléfono" valor={cliente.telefono}/>
          <Campo etiqueta="Correo electrónico" valor={cliente.correo}/>
          <Campo etiqueta="Dirección" valor={cliente.direccion}/>
          <Campo etiqueta="Distrito" valor={cliente.distrito}/>
          <Campo etiqueta="Provincia" valor={cliente.provincia}/>
          <Campo etiqueta="Departamento" valor={cliente.departamento}/>
        </dl>
      </section>}

      {vista === 'adquisiciones' && <div role="tabpanel" className="space-y-3">
        <div>
          <h3 className="text-sm font-bold text-brand-900">Adquisiciones por proyecto</h3>
          <p className="mt-1 text-xs text-brand-500">
            Se muestra el histórico accesible de todos los proyectos. El filtro de la tabla no elimina otras compras del expediente.
          </p>
        </div>
        {grupos.map((grupo, index) => {
          const abierto = proyectoAbierto === null ? index === 0 : proyectoAbierto === grupo.id;
          return <section key={grupo.id} className="overflow-hidden rounded-xl border border-brand-100 bg-white">
            <button type="button" aria-expanded={abierto}
              onClick={() => setProyectoAbierto(abierto ? -1 : grupo.id)}
              className="flex w-full flex-wrap items-center justify-between gap-3 bg-brand-50/40 px-4 py-4 text-left hover:bg-brand-50">
              <span className="flex min-w-0 items-center gap-3">
                <Layers3 className="h-5 w-5 shrink-0 text-brand-600"/>
                <span><span className="block font-semibold text-brand-900">{grupo.nombre}</span>
                  <span className="mt-1 block text-xs text-brand-500">
                    {new Set(grupo.operaciones.map(o=>o.id_venta)).size} compras · {new Set(grupo.operaciones.map(o=>o.id_lote)).size} lotes
                  </span>
                </span>
              </span>
              <ChevronDown className={`h-4 w-4 text-brand-500 transition-transform ${abierto ? 'rotate-180' : ''}`}/>
            </button>
            {abierto && <div className="divide-y divide-brand-100">
              {grupo.operaciones.map(op => <div key={op.id_contrato ?? op.id_venta}
                className="flex flex-wrap items-center justify-between gap-3 p-4">
                <div className="min-w-0">
                  <p className="font-semibold text-brand-900">{op.codigo_lote}</p>
                  <p className="mt-1 font-mono text-xs text-brand-600">{op.codigo_contrato}</p>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <Modalidad value={op.modalidad}/>
                    <span className="rounded-full border border-brand-200 px-2 py-1 text-[11px] font-semibold text-brand-700">
                      {op.estado_contrato}
                    </span>
                    <span className="text-xs text-brand-500">{fecha(op.fecha_formalizacion ?? op.fecha_venta)}</span>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="whitespace-nowrap text-sm font-semibold text-brand-900">{currency(op.precio_venta)}</span>
                  <button type="button" onClick={() => setSeleccion(op)}
                    className="inline-flex items-center gap-2 whitespace-nowrap rounded-lg border border-brand-200 bg-white px-3 py-2 text-xs font-semibold text-brand-800 hover:bg-brand-50">
                    <FileText className="h-4 w-4"/> Ver contrato y pagos
                  </button>
                </div>
              </div>)}
            </div>}
          </section>;
        })}
      </div>}

      {vista === 'historial' && <section role="tabpanel"
        className="rounded-xl border border-brand-100 bg-white p-4 sm:p-5">
        <div className="mb-4 flex items-center gap-2">
          <History className="h-4 w-4 text-brand-700"/>
          <h3 className="font-semibold text-brand-900">Historial cronológico de adquisiciones</h3>
        </div>
        <div className="space-y-3">
          {operaciones.map(op => <div key={op.id_contrato ?? op.id_venta}
            className="flex flex-wrap items-center justify-between gap-3 border-b border-brand-100 pb-3">
            <div className="flex items-start gap-3">
              <CalendarDays className="mt-1 h-4 w-4 text-brand-500"/>
              <div>
                <p className="text-xs text-brand-500">{fecha(op.fecha_formalizacion ?? op.fecha_venta)}</p>
                <p className="mt-1 text-sm font-semibold text-brand-900">{op.proyecto_nombre} · {op.codigo_lote}</p>
                <p className="mt-1 font-mono text-xs text-brand-500">{op.codigo_contrato} · {op.estado_contrato}</p>
              </div>
            </div>
            <button type="button" onClick={() => setSeleccion(op)}
              className="rounded-lg border border-brand-200 px-3 py-2 text-xs font-semibold text-brand-700 hover:bg-brand-50">
              Ver expediente
            </button>
          </div>)}
        </div>
      </section>}
    </>}
  </div>;
}
