import { useEffect, useState } from 'react';
import {
  CalendarClockIcon, CoinsIcon, HistoryIcon, LandmarkIcon,
  ListOrderedIcon, LockKeyholeIcon, PercentIcon, RefreshCwIcon,
  ShieldCheckIcon, WalletIcon
} from 'lucide-react';
import { Button } from '../ui/Button';
import { Alert } from '../ui/Feedback';
import { formatSoles } from '../../utils/financeMoney';
import {
  financingConfigService,
  type PoliticaFinanciamientoActual
} from '../../services/financingConfigService';

const fechaLima = (iso: string) => {
  const fecha = new Date(iso);
  return Number.isNaN(fecha.getTime()) ? '—'
    : new Intl.DateTimeFormat('es-PE', {
      timeZone: 'America/Lima', day: '2-digit', month: '2-digit',
      year: 'numeric', hour: '2-digit', minute: '2-digit'
    }).format(fecha);
};

function TarjetaCondicion({
  icono: Icon, etiqueta, valor, detalle, destacado = false
}: {
  icono: typeof CoinsIcon;
  etiqueta: string;
  valor: string;
  detalle: string;
  destacado?: boolean;
}) {
  return (
    <div className={`relative min-w-0 overflow-hidden rounded-2xl border p-4 shadow-sm transition-colors sm:p-5 ${
      destacado ? 'border-accent-300/50 bg-amber-50/40' : 'border-brand-100 bg-white hover:border-brand-200'
    }`}>
      <div className="flex items-start justify-between gap-3">
        <span className="text-[12px] font-medium text-brand-500">{etiqueta}</span>
        <span className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
          destacado ? 'bg-amber-100 text-amber-700' : 'bg-brand-50 text-brand-800'
        }`}>
          <Icon className="h-4.5 w-4.5" aria-hidden="true" />
        </span>
      </div>
      <p className="mt-2 break-words text-xl font-bold tabular-nums text-brand-950 sm:text-2xl">{valor}</p>
      <p className="mt-2 text-[11px] leading-relaxed text-brand-500">{detalle}</p>
    </div>
  );
}

function valorInicial(p: PoliticaFinanciamientoActual): string {
  if (p.modoInicial === 'FIJA') return formatSoles(p.inicialFija);
  if (p.modoInicial === 'RANGO')
    return `${formatSoles(p.inicialMinima)} – ${formatSoles(p.inicialMaxima)}`;
  return `Desde ${formatSoles(p.inicialMinima)}`;
}

export function ConfiguracionPlanesFinanciamientoPanel() {
  const [datos, setDatos] = useState<PoliticaFinanciamientoActual | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    let vigente = true;
    setCargando(true);
    setError(null);
    void financingConfigService.obtenerPoliticaActual()
      .then(res => { if (vigente) setDatos(res); })
      .catch(e => {
        if (vigente) {
          setDatos(null);
          setError(e instanceof Error ? e.message : 'No se pudo consultar la política.');
        }
      })
      .finally(() => { if (vigente) setCargando(false); });
    return () => { vigente = false; };
  }, [revision]);

  if (cargando && !datos) {
    return <p role="status" className="p-6 text-sm text-brand-500">
      Consultando política financiera autorizada…
    </p>;
  }
  if (error) {
    return <div className="p-4">
      <Alert tone="danger" title="No se pudo consultar la configuración">
        {error}
      </Alert>
      <div className="mt-3">
        <Button icon={RefreshCwIcon} variant="secondary" onClick={() => setRevision(r => r + 1)}>
          Reintentar
        </Button>
      </div>
    </div>;
  }
  if (!datos) return null;

  const condiciones = [
    { etiqueta: 'Cuota de separación', valor: formatSoles(datos.montoSeparacion),
      detalle: 'Importe exigido al separar un lote', icono: CoinsIcon },
    { etiqueta: 'Inicial pactada', valor: valorInicial(datos),
      detalle: datos.modoInicial === 'MINIMA' ? 'Inicial mínima, sin máximo general'
        : datos.modoInicial === 'RANGO' ? 'Rango permitido de inicial' : 'Monto fijo obligatorio',
      icono: WalletIcon },
    { etiqueta: 'Tasa de interés', valor: `${datos.tasaNominalAnualPct}%`,
      detalle: 'Tasa nominal anual · no es tasa efectiva anual', icono: PercentIcon },
    { etiqueta: 'Número de cuotas', valor: `${datos.cuotasMin} – ${datos.cuotasMax}`,
      detalle: 'Cantidad mínima y máxima de cuotas', icono: ListOrderedIcon },
    { etiqueta: 'Vencimiento de separación',
      valor: `${datos.diasVencimientoSeparacion} días`,
      detalle: 'Días calendario desde el registro de la reserva', icono: CalendarClockIcon },
    { etiqueta: 'Sistema de amortización', valor: 'Francés',
      detalle: 'Cuotas periódicas con intereses sobre saldo', icono: LandmarkIcon }
  ];

  return <div className="space-y-5 p-4 sm:p-5">
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-brand-950 via-brand-900 to-brand-800 p-5 text-white shadow-sm sm:p-6">
      <div className="absolute -right-10 -top-16 h-40 w-40 rounded-full border border-white/10" aria-hidden="true"/>
      <div className="relative flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <span className="inline-flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-accent-300">
            <ShieldCheckIcon className="h-4 w-4" /> Política comercial protegida
          </span>
          <h3 className="mt-2 text-xl font-bold tracking-tight sm:text-2xl">
            Configuración financiera · Versión {datos.version}
          </h3>
          <p className="mt-2 text-xs leading-relaxed text-brand-100">
            Condiciones generales de referencia para separaciones y ventas financiadas.
          </p>
          <p className="mt-2 text-xs text-brand-200">
            Registrada: {fechaLima(datos.vigenteDesde)} (Perú)
          </p>
        </div>
        <div className="flex flex-col items-start gap-2 sm:items-end">
          <span className="inline-flex items-center gap-2 rounded-full border border-accent-300/30 bg-white/10 px-3 py-1.5 text-xs font-semibold text-accent-300">
            <LockKeyholeIcon className="h-3.5 w-3.5" /> Publicación protegida
          </span>
          <Button icon={RefreshCwIcon} variant="secondary" disabled={cargando}
            onClick={() => setRevision(r => r + 1)}>Actualizar</Button>
        </div>
      </div>
    </div>

    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {condiciones.map((x, i) => <TarjetaCondicion
        key={x.etiqueta} icono={x.icono}
        etiqueta={x.etiqueta} valor={x.valor}
        detalle={x.detalle} destacado={i === 2}
      />)}
    </div>

    <Alert tone="info" title="Configuración en modo consulta · protección activa">
      Esta versión reproduce las condiciones actuales. El motor de ventas continúa usando
      sus validaciones existentes hasta completar la integración de versiones y contratos.
      Para publicar cambios será obligatorio activar TOTP, confirmar cada modificación
      y registrar su auditoría. No se admiten cambios desde esta pantalla todavía.
    </Alert>

    <section className="overflow-hidden rounded-2xl border border-brand-100 bg-white">
      <div className="flex items-center gap-2 border-b border-brand-100 bg-brand-50/50 px-4 py-3 sm:px-5">
        <HistoryIcon className="h-4 w-4 text-brand-700" aria-hidden="true" />
        <h4 className="text-sm font-semibold text-brand-900">Historial de versiones</h4>
      </div>
      <div className="divide-y divide-brand-100">
        {datos.historial.map(v => (
          <div key={v.idPolitica} className="flex flex-wrap items-center justify-between gap-3 px-4 py-4 sm:px-5">
            <div>
              <p className="text-sm font-semibold text-brand-900">
                Versión {v.version} {v.version === datos.version ? '· Referencia vigente' : '· Histórica'}
              </p>
              <p className="mt-1 text-xs text-brand-500">{v.motivo}</p>
            </div>
            <span className="text-xs tabular-nums text-brand-500">
              {fechaLima(v.vigenteDesde)}
            </span>
          </div>
        ))}
      </div>
    </section>
  </div>;
}
