import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AlertTriangleIcon, CheckCircle2Icon, RefreshCwIcon, ReceiptTextIcon, ShieldCheckIcon } from 'lucide-react';
import { PageHeader } from '../../components/portal/PageHeader';
import { RegistrarPagoForm } from '../../components/portal/RegistrarPagoForm';
import { Button } from '../../components/ui/Button';
import { Card, CardHeader } from '../../components/ui/Card';
import { portalCoreGet } from '../../lib/portalCoreApi';
import { ApiError } from '../../lib/apiClient';
import type { PortalVoucher, PortalVouchersResponse } from '../../types/portal-vouchers';
import { formatCurrency, formatDate } from '../../utils/format';

const tonos: Record<PortalVoucher['estadoVoucher'], string> = {
  PENDIENTE: 'bg-warn-50 text-warn-700',
  APROBADO: 'bg-success-50 text-success-700',
  RECHAZADO: 'bg-danger-50 text-danger-700'
};
const etiquetas: Record<PortalVoucher['estadoVoucher'], string> = {
  PENDIENTE: 'En revisión',
  APROBADO: 'Aprobado',
  RECHAZADO: 'Rechazado'
};

export function Pagos() {
  const navigate = useNavigate();
  const [datos, setDatos] = useState<PortalVouchersResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(true);
  const [version, setVersion] = useState(0);
  const [venta, setVenta] = useState('TODAS');

  useEffect(() => {
    const controller = new AbortController();
    setCargando(true);
    setError(null);
    void portalCoreGet<PortalVouchersResponse>('/portal-cliente/vouchers', controller.signal)
      .then(r => { if (!controller.signal.aborted) setDatos(r); })
      .catch((e: unknown) => {
        if (controller.signal.aborted) return;
        setDatos(null);
        if (e instanceof ApiError && e.status === 401) {
          navigate('/login', { replace: true });
          return;
        }
        setError(e instanceof Error ? e.message : 'No se pudieron consultar los comprobantes.');
      })
      .finally(() => { if (!controller.signal.aborted) setCargando(false); });
    return () => controller.abort();
  }, [navigate, version]);

  const comprobantes = datos?.comprobantes ?? [];
  const visibles = useMemo(() => comprobantes.filter(c =>
    venta === 'TODAS' || String(c.idVenta) === venta
  ), [comprobantes, venta]);
  const enRevision = comprobantes.filter(c => c.estadoVoucher === 'PENDIENTE').length;
  const rechazados = comprobantes.filter(c => c.estadoVoucher === 'RECHAZADO').length;
  const aprobados = comprobantes.filter(c => c.estadoVoucher === 'APROBADO').length;

  return <div className="space-y-6">
    <PageHeader eyebrow="Pagos y vouchers" title="Mis comprobantes de pago"
      description="Presente un voucher privado y consulte su revisión real por Finanzas. Los comprobantes no sustituyen los abonos confirmados." />
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-field border border-slateux-200 bg-white px-4 py-3">
      <p className="flex items-center gap-2 text-xs text-slateux-600">
        <ShieldCheckIcon className="h-4 w-4" />Acceso privado · Compras vinculadas a su identidad
      </p>
      <Button variant="secondary" size="sm" disabled={cargando}
        onClick={() => setVersion(v => v + 1)} icon={<RefreshCwIcon className="h-4 w-4" />}>
        Actualizar
      </Button>
    </div>
    {cargando && <Card as="section" className="p-6">
      <p role="status" className="text-sm text-slateux-600">Consultando los vouchers de sus operaciones…</p>
    </Card>}
    {error && <Card as="section" className="border-danger-200 p-6">
      <h2 className="font-semibold text-danger-700">No se pudo consultar el historial</h2>
      <p role="alert" className="mt-2 text-sm text-danger-700">{error}</p>
      <p className="mt-2 text-xs text-slateux-500">No se mostrarán pagos simulados ni datos de terceros.</p>
    </Card>}
    {!cargando && !error && datos && datos.operaciones.length === 0 &&
      <Card as="section" className="p-6">
        <h2 className="font-semibold text-ink-800">Sin compras vinculadas</h2>
        <p className="mt-2 text-sm text-slateux-600">
          Su cuenta no tiene operaciones que permitan presentar un comprobante.
        </p>
      </Card>}
    {!cargando && !error && datos && datos.operaciones.length > 0 && <>
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-field border border-slateux-200 bg-white p-4">
          <p className="text-xs text-slateux-500">En revisión</p>
          <p className="mt-1 text-xl font-semibold text-ink-800">{enRevision}</p>
        </div>
        <div className="rounded-field border border-slateux-200 bg-white p-4">
          <p className="text-xs text-slateux-500">Aprobados</p>
          <p className="mt-1 text-xl font-semibold text-ink-800">{aprobados}</p>
        </div>
        <div className="rounded-field border border-slateux-200 bg-white p-4">
          <p className="text-xs text-slateux-500">Rechazados</p>
          <p className="mt-1 text-xl font-semibold text-ink-800">{rechazados}</p>
        </div>
      </div>
      {rechazados > 0 && <div role="alert" className="flex flex-wrap items-center gap-3 rounded-field border border-danger-200 bg-danger-50 p-4">
        <AlertTriangleIcon className="h-5 w-5 text-danger-700" />
        <p className="flex-1 text-sm text-danger-700">Hay {rechazados} comprobante(s) rechazado(s). Consulte el motivo y presente una nueva evidencia si corresponde.</p>
        <Link to="/portal/cronograma" className="text-sm font-semibold text-ink-800 underline">Ver cronograma</Link>
      </div>}
      <p className="rounded-field border border-slateux-200 bg-slateux-50 p-4 text-xs leading-relaxed text-slateux-600">
        {datos.advertencia} Una aprobación de voucher no garantiza que su importe se haya aplicado a una cuota. Consulte el saldo confirmado en <Link to="/portal/cronograma" className="font-semibold underline">Mi cronograma</Link>.
      </p>
      <div className="grid gap-6 lg:grid-cols-[1fr_400px] lg:items-start">
        <Card as="section">
          <CardHeader title="Historial de comprobantes"
            description={`${visibles.length} comprobante(s) de sus compras`}
            icon={<ReceiptTextIcon className="h-[18px] w-[18px]" />}
            action={datos.operaciones.length > 1 ? <select
              aria-label="Filtrar por compra" value={venta}
              onChange={e => setVenta(e.target.value)}
              className="rounded-field border border-slateux-300 bg-white p-2 text-xs text-ink-800">
              <option value="TODAS">Todas mis compras</option>
              {datos.operaciones.map(o => <option key={o.idVenta} value={o.idVenta}>{o.codigoVenta}</option>)}
            </select> : undefined} />
          {visibles.length === 0
            ? <p className="p-5 text-sm text-slateux-600">Todavía no hay comprobantes registrados para esta selección.</p>
            : <ul className="divide-y divide-slateux-200">
              {visibles.map(p => <li key={p.idVoucher} className="px-5 py-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-ink-800">
                      {p.destino === 'INICIAL' ? 'Inicial adicional' : 'Cuota ' + (p.numeroCuota ?? '—')}
                      {' · '}{formatCurrency(p.monto)}
                    </p>
                    <p className="mt-1 text-xs text-slateux-600">
                      {p.codigoVenta} · {formatDate(p.fechaOperacion)} · {p.metodoPago}
                    </p>
                    <p className="mt-1 break-words text-xs text-slateux-500">
                      {p.codigoVoucher} · {p.nombreArchivo}
                      {p.numeroOperacion && ' · Op. ' + p.numeroOperacion}
                    </p>
                  </div>
                  <span className={'rounded-full px-2.5 py-1 text-xs font-semibold ' + tonos[p.estadoVoucher]}>
                    {etiquetas[p.estadoVoucher]}
                  </span>
                </div>
                {p.estadoVoucher === 'APROBADO' && <p className="mt-3 flex items-start gap-2 text-xs text-success-700">
                  <CheckCircle2Icon className="h-4 w-4 shrink-0" />
                  Aprobado por Finanzas. Importe aplicado: {formatCurrency(p.montoAplicado)}.
                  {p.montoAplicado < p.monto ? ' Puede quedar una imputación pendiente.' : ''}
                </p>}
                {p.estadoVoucher === 'PENDIENTE' && <p className="mt-3 text-xs text-warn-700">
                  Pendiente de revisión. No constituye pago confirmado ni reduce el saldo.
                </p>}
                {p.estadoVoucher === 'RECHAZADO' && <p className="mt-3 rounded-field bg-danger-50 p-3 text-xs text-danger-700">
                  Motivo: {p.motivoRechazo ?? 'Consulte con Finanzas para conocer la observación.'}
                </p>}
              </li>)}
            </ul>}
        </Card>
        <RegistrarPagoForm operaciones={datos.operaciones} metodos={datos.metodos}
          onRegistrado={() => setVersion(v => v + 1)} />
      </div>
    </>}
  </div>;
}
