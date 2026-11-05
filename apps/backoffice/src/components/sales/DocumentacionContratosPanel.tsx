import { useEffect, useState, type FormEvent } from 'react';
import { ChevronDown, ChevronUp, FileText, FolderOpen, RefreshCw, Search } from 'lucide-react';
import { crmBackend, type CrmContratosDocumentacionPage } from '../../services/crmBackend';
import { AnexosContratoPanel } from './AnexosContratoPanel';

const TAMANO_PAGINA = 10;

export function DocumentacionContratosPanel() {
  const [busqueda, setBusqueda] = useState('');
  const [consulta, setConsulta] = useState('');
  const [pagina, setPagina] = useState(1);
  const [revision, setRevision] = useState(0);
  const [datos, setDatos] = useState<CrmContratosDocumentacionPage | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [seleccionado, setSeleccionado] = useState<number | null>(null);

  useEffect(() => {
    let activo = true;
    setCargando(true);
    setError(null);
    crmBackend.listarContratosDocumentacion(consulta, pagina, TAMANO_PAGINA)
      .then((respuesta) => {
        if (!activo) return;
        if (!Array.isArray(respuesta.items)) {
          throw new Error('El listado de contratos no tiene el formato esperado.');
        }
        setDatos(respuesta);
      })
      .catch((err: unknown) => {
        if (!activo) return;
        setDatos(null);
        setError(err instanceof Error ? err.message : 'No fue posible consultar los contratos.');
      })
      .finally(() => {
        if (activo) setCargando(false);
      });
    return () => { activo = false; };
  }, [consulta, pagina, revision]);

  const buscar = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSeleccionado(null);
    setPagina(1);
    setConsulta(busqueda.trim());
  };

  const totalPaginas = Math.max(1, Math.ceil((datos?.total ?? 0) / TAMANO_PAGINA));

  return (
    <section className="mb-6 rounded-xl border border-brand-100 bg-white p-5">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-base font-semibold text-brand-900">
            <FolderOpen className="h-5 w-5" /> Documentación de contratos
          </h2>
          <p className="mt-1 text-xs text-brand-600">
            Planos y memorias descriptivas de contratos pendientes de firma y vigentes.
          </p>
        </div>
        <button type="button" onClick={() => setRevision((actual) => actual + 1)}
          disabled={cargando}
          className="inline-flex items-center gap-2 rounded-lg border border-brand-200 px-3 py-2 text-xs font-semibold text-brand-800 disabled:opacity-50">
          <RefreshCw className="h-4 w-4" /> Actualizar listado
        </button>
      </div>

      <form onSubmit={buscar} className="mb-4 flex flex-wrap gap-2">
        <input type="search" value={busqueda} maxLength={120}
          onChange={(event) => setBusqueda(event.target.value)}
          placeholder="Buscar contrato, venta, comprador, proyecto o lote"
          className="min-w-0 flex-1 rounded-lg border border-brand-200 px-3 py-2 text-sm" />
        <button type="submit" className="inline-flex items-center gap-2 rounded-lg bg-brand-900 px-4 py-2 text-sm font-semibold text-white">
          <Search className="h-4 w-4" /> Buscar
        </button>
      </form>

      {cargando ? (
        <p role="status" className="py-6 text-center text-sm text-brand-600">Consultando documentación de contratos...</p>
      ) : error ? (
        <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <p>{error}</p>
          <button type="button" className="mt-2 underline" onClick={() => setRevision((actual) => actual + 1)}>Reintentar</button>
        </div>
      ) : !datos?.items.length ? (
        <div className="rounded-lg bg-brand-50 py-7 text-center text-sm text-brand-600">
          <FileText className="mx-auto mb-2 h-7 w-7" /> No hay contratos para los filtros seleccionados.
        </div>
      ) : (
        <div className="space-y-3">
          {datos.items.map((contrato) => {
            const abierto = seleccionado === contrato.idContrato;
            return (
              <article key={contrato.idContrato} className="rounded-xl border border-brand-100 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-sm font-semibold text-brand-900">{contrato.codigoContrato}</h3>
                      <span className={`rounded-full px-2 py-1 text-[11px] font-semibold ${contrato.estadoContrato === 'VIGENTE' ? 'bg-emerald-50 text-emerald-800' : 'bg-amber-50 text-amber-800'}`}>
                        {contrato.estadoContrato === 'VIGENTE' ? 'Vigente' : contrato.estadoContrato.replace(/_/g, ' ')}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-brand-600">Venta: {contrato.codigoVenta} · {contrato.comprador}</p>
                    <p className="mt-1 text-xs text-brand-600">{contrato.nombreProyecto} · {contrato.codigoLote}</p>
                    <div className="mt-2 flex flex-wrap gap-2 text-[11px]">
                      <span className={`rounded-full px-2 py-1 ${contrato.tienePdfContrato ? 'bg-emerald-50 text-emerald-800' : 'bg-brand-50 text-brand-600'}`}>
                        Contrato PDF: {contrato.tienePdfContrato ? 'Registrado' : 'Pendiente'}
                      </span>
                      <span className={`rounded-full px-2 py-1 ${contrato.tienePlanoLote ? 'bg-emerald-50 text-emerald-800' : 'bg-amber-50 text-amber-800'}`}>
                        Plano: {contrato.tienePlanoLote ? 'Registrado' : 'Pendiente'}
                      </span>
                      <span className={`rounded-full px-2 py-1 ${contrato.tieneMemoriaDescriptiva ? 'bg-emerald-50 text-emerald-800' : 'bg-amber-50 text-amber-800'}`}>
                        Memoria: {contrato.tieneMemoriaDescriptiva ? 'Registrada' : 'Pendiente'}
                      </span>
                    </div>
                  </div>
                  <button type="button" aria-expanded={abierto}
                    onClick={() => setSeleccionado(abierto ? null : contrato.idContrato)}
                    className="inline-flex items-center gap-2 rounded-lg border border-brand-200 px-3 py-2 text-xs font-semibold text-brand-800">
                    {abierto ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    {abierto ? 'Ocultar anexos' : 'Gestionar anexos'}
                  </button>
                </div>
                {abierto && (
                  <AnexosContratoPanel key={contrato.idContrato}
                    idContrato={contrato.idContrato}
                    codigoContrato={contrato.codigoContrato}
                    onUpdated={() => setRevision((actual) => actual + 1)} />
                )}
              </article>
            );
          })}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-2 text-xs text-brand-600">
            <span>{datos.total} contrato(s) · Página {pagina} de {totalPaginas}</span>
            <div className="flex gap-2">
              <button type="button" disabled={pagina <= 1}
                onClick={() => { setSeleccionado(null); setPagina((actual) => actual - 1); }}
                className="rounded-lg border border-brand-200 px-3 py-2 disabled:opacity-50">Anterior</button>
              <button type="button" disabled={pagina >= totalPaginas}
                onClick={() => { setSeleccionado(null); setPagina((actual) => actual + 1); }}
                className="rounded-lg border border-brand-200 px-3 py-2 disabled:opacity-50">Siguiente</button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
