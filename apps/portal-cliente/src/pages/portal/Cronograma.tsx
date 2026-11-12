import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CalendarClockIcon, CheckCircle2Icon, RefreshCwIcon,
  SearchIcon, ShieldCheckIcon, WalletIcon
} from 'lucide-react';
import { PageHeader } from '../../components/portal/PageHeader';
import { Card, CardHeader } from '../../components/ui/Card';
import { portalCoreGet } from '../../lib/portalCoreApi';
import { ApiError } from '../../lib/apiClient';
import type {
  EstadoCuotaReal, PortalCronogramaResponse, PortalCuotaReal,
  PortalMovimientoConfirmado
} from '../../types/portal-cronograma';
import { formatCurrency, formatDate } from '../../utils/format';

type Filtro = 'TODAS' | EstadoCuotaReal | 'ATRASADAS' | 'PROXIMAS';
const filtros: { valor: Filtro; texto: string }[] = [
  { valor: 'TODAS', texto: 'Todas' },
  { valor: 'PENDIENTE', texto: 'Pendientes' },
  { valor: 'PARCIAL', texto: 'Parciales' },
  { valor: 'VENCIDA', texto: 'Vencidas' },
  { valor: 'PAGADA', texto: 'Pagadas' },
  { valor: 'ATRASADAS', texto: 'Atrasadas' },
  { valor: 'PROXIMAS', texto: 'Próximos 7 días' }
];
const tonos: Record<EstadoCuotaReal, string> = {
  PENDIENTE: 'bg-slateux-100 text-slateux-700',
  PARCIAL: 'bg-warn-50 text-warn-700',
  VENCIDA: 'bg-danger-50 text-danger-700',
  PAGADA: 'bg-success-50 text-success-700',
  ANULADA: 'bg-slateux-100 text-slateux-500'
};

function Indicador({ titulo, valor, detalle }: {
  titulo: string; valor: string; detalle?: string;
}) {
  return <div className="rounded-field border border-slateux-200 bg-white p-4">
    <p className="text-xs font-medium text-slateux-500">{titulo}</p>
    <p className="mt-1 text-lg font-semibold tabular-nums text-ink-800">{valor}</p>
    {detalle && <p className="mt-1 text-xs text-slateux-500">{detalle}</p>}
  </div>;
}

function Estado({ cuota }: { cuota: PortalCuotaReal }) {
  const label = cuota.estadoCalculado.replace(/_/g, ' ').toLowerCase();
  return <div className="flex flex-col items-start gap-1">
    <span className={'inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ' + tonos[cuota.estadoCalculado]}>
      {label.charAt(0).toUpperCase() + label.slice(1)}
    </span>
    {cuota.cuotaAtrasada && <span className="text-xs font-medium text-danger-700">
      Atrasada {cuota.diasMora} {cuota.diasMora === 1 ? 'día' : 'días'}
    </span>}
    {cuota.proxima7Dias && <span className="text-xs text-warn-700">Vence en los próximos 7 días</span>}
    {cuota.estadoDifiereRegistro && <span className="text-xs text-slateux-500">
      Estado histórico distinto
    </span>}
  </div>;
}

function Movimientos({ items }: { items: PortalMovimientoConfirmado[] }) {
  return <Card as="section">
    <CardHeader title="Aplicaciones de pagos confirmados"
      description="Solo los importes aplicados reducen saldos; no se muestran vouchers pendientes."
      icon={<CheckCircle2Icon className="h-[18px] w-[18px]" />} />
    {items.length === 0
      ? <p className="p-5 text-sm text-slateux-600">Todavía no se registran pagos confirmados y aplicados a este plan.</p>
      : <div className="overflow-x-auto">
        <table className="w-full min-w-[620px] text-left text-sm">
          <thead className="border-b border-slateux-200 bg-slateux-50 text-xs text-slateux-500">
            <tr>
              <th className="px-5 py-3 font-semibold">Pago</th>
              <th className="px-5 py-3 font-semibold">Aplicación</th>
              <th className="px-5 py-3 font-semibold">Fecha</th>
              <th className="px-5 py-3 text-right font-semibold">Importe aplicado</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slateux-100">
            {items.map(m => <tr key={m.idAplicacion}>
              <td className="px-5 py-3 font-medium text-ink-800">{m.codigoPago ?? 'Pago registrado'}</td>
              <td className="px-5 py-3 text-slateux-600">
                {m.tipo === 'INICIAL' ? 'Inicial adicional' : 'Cuota ' + String(m.numeroCuota ?? '—')}
              </td>
              <td className="px-5 py-3 text-slateux-600">
                {m.fechaAplicacion ? formatDate(m.fechaAplicacion) : 'No registrada'}
              </td>
              <td className="px-5 py-3 text-right font-semibold tabular-nums text-ink-800">
                {formatCurrency(m.montoAplicado)}
              </td>
            </tr>)}
          </tbody>
        </table>
      </div>}
  </Card>;
}

export function Cronograma() {
  const navigate = useNavigate();
  const [datos, setDatos] = useState<PortalCronogramaResponse | null>(null);
  const [elegida, setElegida] = useState<number | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [version, setVersion] = useState(0);
  const [filtro, setFiltro] = useState<Filtro>('TODAS');
  const [busqueda, setBusqueda] = useState('');

  useEffect(() => {
    const controller = new AbortController();
    setCargando(true);
    setError(null);
    void portalCoreGet<PortalCronogramaResponse>('/portal-cliente/cronograma', controller.signal)
      .then(r => { if (!controller.signal.aborted) setDatos(r); })
      .catch((e: unknown) => {
        if (controller.signal.aborted) return;
        setDatos(null);
        if (e instanceof ApiError && e.status === 401) {
          navigate('/login', { replace: true });
          return;
        }
        setError(e instanceof Error ? e.message : 'No se pudo consultar el cronograma.');
      })
      .finally(() => { if (!controller.signal.aborted) setCargando(false); });
    return () => controller.abort();
  }, [navigate, version]);

  const operaciones = datos?.items ?? [];
  const actual = operaciones.find(o => o.idVenta === elegida) ?? operaciones[0] ?? null;
  const cuotas = actual?.cuotas ?? [];
  const visibles = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    return cuotas.filter(c => {
      const coincideEstado = filtro === 'TODAS'
        || (filtro === 'ATRASADAS' ? c.cuotaAtrasada
          : filtro === 'PROXIMAS' ? c.proxima7Dias
            : c.estadoCalculado === filtro);
      const coincideTexto = !q || ('cuota ' + c.numero).includes(q)
        || String(c.numero) === q || c.fechaVencimiento.includes(q);
      return coincideEstado && coincideTexto;
    });
  }, [cuotas, filtro, busqueda]);

  const plan = actual?.financiamiento;
  return <div className="space-y-6">
    <PageHeader eyebrow="Mi financiamiento" title="Cronograma, cuotas y saldos"
      description="Información contractual y aplicaciones confirmadas. Sin cuotas ni pagos simulados." />
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-field border border-slateux-200 bg-white px-4 py-3">
      <p className="flex items-center gap-2 text-xs text-slateux-600">
        <ShieldCheckIcon className="h-4 w-4" />
        Consulta privada · {datos ? 'Corte ' + formatDate(datos.fechaCorte) + ' (Perú)' : 'Acceso autenticado'}
      </p>
      <button type="button" disabled={cargando} onClick={() => setVersion(v => v + 1)}
        className="inline-flex items-center gap-2 rounded-field border border-slateux-200 px-3 py-2 text-xs font-semibold text-ink-700 disabled:opacity-50">
        <RefreshCwIcon className="h-4 w-4" /> Actualizar
      </button>
    </div>

    {cargando && <Card as="section" className="p-7">
      <p role="status" className="text-sm text-slateux-600">Consultando sus cuotas y aplicaciones confirmadas…</p>
    </Card>}
    {error && <Card as="section" className="border-danger-200 p-6">
      <h2 className="font-semibold text-danger-700">No se pudo cargar el cronograma</h2>
      <p role="alert" className="mt-2 text-sm text-danger-700">{error}</p>
      <p className="mt-2 text-xs text-slateux-500">No mostraremos importes ficticios ni información de otras cuentas.</p>
    </Card>}

    {!cargando && !error && datos && operaciones.length === 0 &&
      <Card as="section" className="p-7">
        <h2 className="font-semibold text-ink-800">Sin compras vinculadas a esta cuenta</h2>
        <p className="mt-2 text-sm text-slateux-600">
          No existe un expediente de compra asociado a su identidad. Comuníquese con la inmobiliaria si ya formalizó una operación.
        </p>
      </Card>}

    {!cargando && !error && actual && <>
      <Card as="section" className="p-5">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="text-base font-semibold text-ink-800">{actual.proyecto}</h2>
            <p className="mt-1 text-sm text-slateux-600">
              {actual.codigoVenta} · {actual.manzana ?? 'Manzana sin registrar'} · Lote {actual.numeroLote}
            </p>
          </div>
          {operaciones.length > 1 && <label className="flex flex-col gap-1 text-xs font-semibold text-slateux-600">
            Seleccionar mi compra
            <select value={actual.idVenta} onChange={e => {
              setElegida(Number(e.target.value));
              setFiltro('TODAS');
              setBusqueda('');
            }} className="rounded-field border border-slateux-300 bg-white px-3 py-2 text-sm text-ink-800">
              {operaciones.map(o => <option key={o.idVenta} value={o.idVenta}>
                {o.codigoVenta} · {o.proyecto} · Lote {o.numeroLote}
              </option>)}
            </select>
          </label>}
        </div>
      </Card>

      {!plan ? <Card as="section" className="p-6">
        <div className="flex items-center gap-2 text-warn-700">
          <CalendarClockIcon className="h-5 w-5" />
          <h2 className="font-semibold">Sin cronograma exigible disponible</h2>
        </div>
        <p className="mt-2 text-sm leading-relaxed text-slateux-600">
          Esta operación no tiene un plan activo con contrato firmado y vigente.
          No se mostrarán proyecciones como cuotas pendientes ni saldos exigibles.
        </p>
      </Card> : <>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Indicador titulo="Total de cuotas pactado" valor={formatCurrency(plan.totalCuotasPactado)}
            detalle={String(plan.numeroCuotas) + ' cuotas contractuales'} />
          <Indicador titulo="Aplicado a cuotas" valor={formatCurrency(plan.totalAplicadoCuotas)}
            detalle="Solo pagos confirmados y aplicados" />
          <Indicador titulo="Saldo de cuotas" valor={formatCurrency(plan.saldoCuotas)}
            detalle="Importe pendiente del financiamiento" />
          <Indicador titulo="Inicial por conciliar" valor={formatCurrency(plan.saldoInicial)}
            detalle="No implica mora automática" />
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Indicador titulo="Cuotas pagadas" valor={String(actual.resumenEstados.pagadas) + ' de ' + String(plan.numeroCuotas)} />
          <Indicador titulo="Cuotas parciales" valor={String(actual.resumenEstados.parciales)} />
          <Indicador titulo="Cuotas atrasadas" valor={String(actual.resumenEstados.atrasadas)}
            detalle={formatCurrency(actual.resumenEstados.montoAtrasado) + ' con atraso'} />
          <Indicador titulo="Vencen en 7 días" valor={String(actual.resumenEstados.proximas7Dias)}
            detalle={formatCurrency(actual.resumenEstados.montoProximo) + ' por vencer'} />
        </div>
        <Card as="section" className="p-4">
          <p className="flex items-center gap-2 text-sm font-medium text-ink-800">
            <WalletIcon className="h-4 w-4" />
            Reserva acreditada: {formatCurrency(plan.reservaAcreditada)} ·
            Capital financiado: {formatCurrency(plan.capitalFinanciado)}
          </p>
          <p className="mt-2 text-xs leading-relaxed text-slateux-600">
            {datos?.advertenciaInicial} {datos?.advertenciaPagos}
          </p>
          {actual.resumenEstados.discrepanciasRegistro > 0 &&
            <p className="mt-2 text-xs text-warn-700">
              Existen {actual.resumenEstados.discrepanciasRegistro} estados históricos distintos del cálculo actual.
              Se muestran los estados calculados sin alterar registros.
            </p>}
        </Card>

        <Card as="section">
          <CardHeader title="Detalle del cronograma" icon={<CalendarClockIcon className="h-[18px] w-[18px]" />}
            description={String(visibles.length) + ' de ' + String(cuotas.length) + ' cuotas'} />
          <div className="flex flex-wrap items-center gap-2 border-b border-slateux-200 px-5 py-4">
            <div role="group" aria-label="Filtrar cuotas por estado" className="flex flex-wrap gap-1.5">
              {filtros.map(f => <button key={f.valor} type="button" aria-pressed={filtro === f.valor}
                onClick={() => setFiltro(f.valor)}
                className={'rounded-full border px-3 py-1.5 text-xs font-semibold ' +
                  (filtro === f.valor ? 'border-ink-800 bg-ink-800 text-white' : 'border-slateux-200 text-slateux-600')}>
                {f.texto}
              </button>)}
            </div>
            <div className="relative ml-auto w-full sm:w-60">
              <SearchIcon className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slateux-400" />
              <input type="search" value={busqueda} onChange={e => setBusqueda(e.target.value)}
                placeholder="Buscar cuota o fecha" aria-label="Buscar cuota o fecha"
                className="w-full rounded-field border border-slateux-200 py-2 pl-9 pr-3 text-sm text-ink-800" />
            </div>
          </div>
          {visibles.length === 0
            ? <p className="p-6 text-sm text-slateux-600">No hay cuotas para el filtro seleccionado.</p>
            : <div className="overflow-x-auto">
              <table className="w-full min-w-[830px] text-left text-sm">
                <caption className="sr-only">Cuotas con capital, intereses, abonos, saldo y vencimiento</caption>
                <thead className="border-b border-slateux-200 bg-slateux-50 text-xs text-slateux-500">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Cuota</th>
                    <th className="px-4 py-3 font-semibold">Vencimiento</th>
                    <th className="px-4 py-3 text-right font-semibold">Capital</th>
                    <th className="px-4 py-3 text-right font-semibold">Interés</th>
                    <th className="px-4 py-3 text-right font-semibold">Monto</th>
                    <th className="px-4 py-3 text-right font-semibold">Abonado</th>
                    <th className="px-4 py-3 text-right font-semibold">Saldo</th>
                    <th className="px-4 py-3 font-semibold">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slateux-100">
                  {visibles.map(c => <tr key={c.idCuota} className="hover:bg-slateux-50">
                    <td className="px-4 py-3 font-semibold text-ink-800">{c.numero}</td>
                    <td className="px-4 py-3 text-slateux-600">{formatDate(c.fechaVencimiento)}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{formatCurrency(c.capital)}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{formatCurrency(c.interes)}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{formatCurrency(c.montoCuota)}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{formatCurrency(c.abonadoConfirmado)}</td>
                    <td className="px-4 py-3 text-right font-semibold tabular-nums">{formatCurrency(c.saldoCuota)}</td>
                    <td className="px-4 py-3"><Estado cuota={c} /></td>
                  </tr>)}
                </tbody>
              </table>
            </div>}
        </Card>
        <Movimientos items={actual.movimientosConfirmados} />
      </>}
    </>}
  </div>;
}
