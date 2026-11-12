import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { DownloadIcon, EyeIcon, FileTextIcon, FolderOpenIcon, RefreshCwIcon, ShieldCheckIcon } from 'lucide-react';
import { PageHeader } from '../../components/portal/PageHeader';
import { Button } from '../../components/ui/Button';
import { Card, CardHeader } from '../../components/ui/Card';
import { ApiError } from '../../lib/apiClient';
import { portalCoreGet } from '../../lib/portalCoreApi';
import type {
  PortalDocumentoPublicado, PortalDocumentosResponse, PortalEnlaceDocumento
} from '../../types/portal-documentos-alertas';
import { formatDate } from '../../utils/format';

type FiltroDocumento = 'TODOS' | 'CONTRATO' | 'PLANO_LOTE' | 'MEMORIA_DESCRIPTIVA';
const filtros: { valor: FiltroDocumento; texto: string }[] = [
  { valor: 'TODOS', texto: 'Todos' },
  { valor: 'CONTRATO', texto: 'Contratos' },
  { valor: 'PLANO_LOTE', texto: 'Planos publicados' },
  { valor: 'MEMORIA_DESCRIPTIVA', texto: 'Memorias descriptivas' }
];

function validarEnlace(documento: PortalEnlaceDocumento): string {
  const url = new URL(documento.urlLectura);
  if (url.protocol !== 'https:' || !url.hostname.endsWith('.supabase.co')
      || !url.pathname.startsWith('/storage/v1/object/sign/contratos-firmados-private/')
      || !url.searchParams.has('token') || documento.tipoMime !== 'application/pdf'
      || documento.expiresInSeconds > 120 || documento.expiresInSeconds <= 0) {
    throw new Error('El servidor no proporcionó un enlace de lectura válido.');
  }
  return url.href;
}

export function Documentos() {
  const navigate = useNavigate();
  const [datos, setDatos] = useState<PortalDocumentosResponse | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [errorDocumento, setErrorDocumento] = useState<string | null>(null);
  const [documentoOcupado, setDocumentoOcupado] = useState<string | null>(null);
  const [filtro, setFiltro] = useState<FiltroDocumento>('TODOS');
  const [venta, setVenta] = useState('TODAS');
  const [version, setVersion] = useState(0);

  useEffect(() => {
    const abort = new AbortController();
    setCargando(true);
    setError(null);
    void portalCoreGet<PortalDocumentosResponse>('/portal-cliente/documentos', abort.signal)
      .then(r => { if (!abort.signal.aborted) setDatos(r); })
      .catch((err: unknown) => {
        if (abort.signal.aborted) return;
        setDatos(null);
        if (err instanceof ApiError && err.status === 401) {
          navigate('/login', { replace: true });
          return;
        }
        setError(err instanceof Error ? err.message : 'No se pudo consultar el expediente.');
      })
      .finally(() => { if (!abort.signal.aborted) setCargando(false); });
    return () => abort.abort();
  }, [navigate,version]);

  const items = datos?.items ?? [];
  const ventas = useMemo(() => Array.from(new Map(items.map(d =>
    [d.idVenta,d.codigoVenta] as const)).entries()), [items]);
  const visibles = useMemo(() => items.filter(d =>
    (venta === 'TODAS' || String(d.idVenta) === venta)
      && (filtro === 'TODOS' || (filtro === 'CONTRATO' ? d.tipo === 'CONTRATO'
        : d.categoria === filtro))
  ), [items,venta,filtro]);

  async function abrirDocumento(d: PortalDocumentoPublicado, descargar: boolean) {
    if (documentoOcupado !== null) return;
    const llave = d.tipo + '-' + d.idDocumento;
    setDocumentoOcupado(llave);
    setErrorDocumento(null);
    try {
      const enlace = await portalCoreGet<PortalEnlaceDocumento>(
        `/portal-cliente/documentos/${d.tipo}/${d.idDocumento}/url-firmada`);
      const url = validarEnlace(enlace);
      if (!descargar) {
        const pestaña = window.open(url, '_blank', 'noopener,noreferrer');
        if (!pestaña) window.location.assign(url);
      } else {
        const respuesta = await fetch(url, { cache: 'no-store', credentials: 'omit' });
        if (!respuesta.ok) throw new Error('El archivo ya no está disponible para descarga.');
        const blob = await respuesta.blob();
        if (blob.size < 1 || blob.size > 10485760) {
          throw new Error('El PDF no superó la verificación de tamaño.');
        }
        const temporal = URL.createObjectURL(blob);
        try {
          const enlaceDescarga = document.createElement('a');
          enlaceDescarga.href = temporal;
          enlaceDescarga.download = d.nombreArchivo.replace(/[^a-zA-Z0-9._ -]/g, '_');
          document.body.appendChild(enlaceDescarga);
          enlaceDescarga.click();
          enlaceDescarga.remove();
        } finally {
          window.setTimeout(() => URL.revokeObjectURL(temporal), 1500);
        }
      }
    } catch (err: unknown) {
      if (err instanceof ApiError && err.status === 401) {
        navigate('/login', { replace: true });
      } else {
        setErrorDocumento(err instanceof Error ? err.message : 'No fue posible abrir el documento.');
      }
    } finally {
      setDocumentoOcupado(null);
    }
  }

  return <div className="space-y-6">
    <PageHeader eyebrow="Documentos" title="Documentación de mis compras"
      description="Contratos y anexos publicados para su cuenta, disponibles solo mediante enlaces privados temporales." />
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-field border border-slateux-200 bg-white px-4 py-3">
      <p className="flex items-center gap-2 text-xs text-slateux-600">
        <ShieldCheckIcon className="h-4 w-4" />PDF publicados y verificados en Storage privado
      </p>
      <Button variant="secondary" size="sm" disabled={cargando}
        onClick={() => setVersion(v => v + 1)}
        icon={<RefreshCwIcon className="h-4 w-4" />}>Actualizar</Button>
    </div>
    {cargando && <Card as="section" className="p-7">
      <p role="status" className="text-sm text-slateux-600">Verificando documentos publicados de sus compras…</p>
    </Card>}
    {error && <Card as="section" className="border-danger-200 p-6">
      <p role="alert" className="text-sm text-danger-700">{error}</p>
      <p className="mt-2 text-xs text-slateux-500">No se muestran documentos de ejemplo ni enlaces de descarga no autorizados.</p>
    </Card>}
    {!cargando && !error && datos && <Card as="section">
      <CardHeader title="Mis documentos publicados"
        description={`${datos.total} archivo(s) autorizados para esta cuenta`}
        icon={<FolderOpenIcon className="h-[18px] w-[18px]" />}
        action={ventas.length > 1 ? <select value={venta}
          aria-label="Filtrar documentos por compra" onChange={e => setVenta(e.target.value)}
          className="rounded-field border border-slateux-300 bg-white p-2 text-xs">
          <option value="TODAS">Todas mis compras</option>
          {ventas.map(([id,codigo]) => <option key={id} value={id}>{codigo}</option>)}
        </select> : undefined}/>
      <div className="flex flex-wrap gap-2 border-b border-slateux-200 px-5 py-4">
        {filtros.map(o => <button key={o.valor} type="button"
          aria-pressed={filtro===o.valor} onClick={() => setFiltro(o.valor)}
          className={`rounded-full border px-3 py-1.5 text-xs font-semibold ${filtro===o.valor
            ? 'border-ink-800 bg-ink-800 text-white'
            : 'border-slateux-200 text-slateux-600'}`}>
          {o.texto}
        </button>)}
      </div>
      {errorDocumento && <p role="alert" className="m-5 rounded-field bg-danger-50 p-3 text-sm text-danger-700">
        {errorDocumento}
      </p>}
      {visibles.length===0 ? <div className="p-6 text-sm text-slateux-600">
        <p className="font-medium text-ink-800">No hay documentos disponibles en esta selección.</p>
        <p className="mt-2">El área responsable debe publicar expresamente el PDF.
          Los contratos, planos y anexos sin autorización o sin archivo real no aparecen aquí.</p>
      </div> : <ul className="divide-y divide-slateux-200">
        {visibles.map(d => {
          const ocupado = documentoOcupado===d.tipo+'-'+d.idDocumento;
          return <li key={d.tipo+'-'+d.idDocumento} className="flex flex-wrap items-center gap-4 px-5 py-4">
            <FileTextIcon className="h-5 w-5 shrink-0 text-slateux-500" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-ink-800">{d.nombre}</p>
              <p className="mt-1 text-xs text-slateux-600">
                {d.codigoVenta} · {d.codigoContrato} · versión {d.numeroVersion}
              </p>
              <p className="mt-1 text-xs text-slateux-500">
                Publicado {formatDate(d.fechaPublicacion)} · PDF · {(d.tamanioBytes/1024).toFixed(0)} KiB
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="ghost" size="sm" disabled={documentoOcupado!==null}
                loading={ocupado} icon={<EyeIcon className="h-4 w-4" />}
                onClick={() => void abrirDocumento(d,false)}>Ver</Button>
              <Button variant="secondary" size="sm" disabled={documentoOcupado!==null}
                icon={<DownloadIcon className="h-4 w-4" />}
                onClick={() => void abrirDocumento(d,true)}>Descargar</Button>
            </div>
          </li>;
        })}
      </ul>}
    </Card>}
  </div>;
}
