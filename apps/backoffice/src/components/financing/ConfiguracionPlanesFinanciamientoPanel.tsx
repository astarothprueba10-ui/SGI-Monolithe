import { useEffect, useState } from 'react';
import { coreService } from '../../services/coreService';
import type { ProyectoResponse } from '../../types/core';
import {
  CalendarClockIcon, CoinsIcon, LandmarkIcon, ListOrderedIcon,
  LockKeyholeIcon, PercentIcon, RefreshCwIcon, ShieldCheckIcon, WalletIcon
} from 'lucide-react';
import { Button } from '../ui/Button';
import { Alert } from '../ui/Feedback';
import { formatSoles } from '../../utils/financeMoney';
import { SeguridadFinancieraTotpPanel } from './SeguridadFinancieraTotpPanel';
import { PublicarPoliticaFinancieraPanel } from './PublicarPoliticaFinancieraPanel';
import { HistorialPoliticasFinancierasPanel } from './HistorialPoliticasFinancierasPanel';
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
    <div className={`min-w-0 rounded-xl border px-3 py-3.5 transition-colors sm:p-4 ${
      destacado ? 'border-amber-200 bg-amber-50/60' : 'border-brand-100 bg-brand-50/35'
    }`}>
      <div className="flex min-w-0 items-center gap-2">
        <Icon className={`h-4 w-4 shrink-0 ${destacado ? 'text-amber-700' : 'text-brand-500'}`}
          aria-hidden="true" />
        <p className="min-w-0 text-xs font-medium text-brand-600">{etiqueta}</p>
      </div>
      <p className="mt-2 break-words text-lg font-bold tabular-nums text-brand-950 sm:text-xl">
        {valor}
      </p>
      <p className="mt-1.5 text-[11px] leading-relaxed text-brand-500">{detalle}</p>
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
  const [idProyecto,setIdProyecto] = useState<number | undefined>();
  const [proyectos,setProyectos] = useState<ProyectoResponse[]>([]);
  const [errorProyectos,setErrorProyectos] = useState(false);
  useEffect(()=>{
    let vigente=true;
    void coreService.getActiveProjects().then(p=>{if(vigente)setProyectos(p);})
      .catch(()=>{if(vigente)setErrorProyectos(true);});
    return ()=>{vigente=false;};
  },[]);
  const selector=<div className="space-y-2 p-3">
    <label className="block text-sm font-medium text-brand-800">
      Ámbito de la política financiera
      <select className="mt-1 block w-full rounded-md border border-brand-200 p-2"
        value={idProyecto??''} onChange={e=>{setDatos(null);setCargando(true);setError(null);setIdProyecto(e.target.value?Number(e.target.value):undefined);}}>
        <option value="">Política general</option>
        {proyectos.map(p=><option key={p.idProyecto} value={p.idProyecto}>{p.nombre}</option>)}
      </select>
    </label>
    {errorProyectos && <p className="text-sm text-red-700">No se pudieron listar los proyectos.</p>}
  </div>;

  useEffect(() => {
    let vigente = true;
    setCargando(true);
    setError(null);
    void financingConfigService.obtenerPoliticaActual(idProyecto)
      .then(res => { if (vigente) setDatos(res); })
      .catch(e => {
        if (vigente) {
          setDatos(null);
          setError(e instanceof Error ? e.message : 'No se pudo consultar la política.');
        }
      })
      .finally(() => { if (vigente) setCargando(false); });
    return () => { vigente = false; };
  }, [revision,idProyecto]);

  if (cargando && !datos) {
    return <>{selector}<p role="status" className="p-6 text-sm text-brand-500">
      Consultando política financiera autorizada…
    </p></>;
  }
  if (error) {
    return <div className="p-4">
      {selector}
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

  return <div className="space-y-6 p-3 sm:p-5 lg:p-6">
    {selector}
    <header className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-brand-950 via-brand-900 to-brand-800 px-5 py-6 text-white shadow-sm sm:px-7">
      <div className="pointer-events-none absolute -right-10 -top-20 h-48 w-48 rounded-full border border-white/10" aria-hidden="true"/>
      <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="inline-flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-accent-300">
            <ShieldCheckIcon className="h-4 w-4" aria-hidden="true"/>
            Política comercial protegida
          </p>
          <h2 className="mt-2 text-xl font-bold tracking-tight sm:text-2xl">
            Configuración financiera
          </h2>
          <p className="mt-1.5 max-w-2xl text-xs leading-relaxed text-brand-100 sm:text-sm">
            Consulte las condiciones vigentes y prepare la siguiente versión con revisión y autorización segura.
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2 sm:flex-col sm:items-end">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-medium text-white">
            <LockKeyholeIcon className="h-3.5 w-3.5" aria-hidden="true"/>
            {datos.publicacionHabilitada ? 'Publicación con doble verificación' : 'Publicación no habilitada'}
          </span>
          <Button icon={RefreshCwIcon} variant="secondary" disabled={cargando}
            onClick={() => setRevision(r => r + 1)}>
            Actualizar datos
          </Button>
        </div>
      </div>
    </header>

    <div className="grid grid-cols-1 items-start gap-5 xl:grid-cols-2 xl:gap-6">
      <section aria-labelledby="version-financiera-actual"
        className="min-w-0 overflow-hidden rounded-2xl border border-brand-100 bg-white shadow-sm">
        <div className="border-b border-brand-100 px-4 py-5 sm:px-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-brand-500">Versión actual</p>
              <h3 id="version-financiera-actual" className="mt-1 text-xl font-bold text-brand-950">
                Versión {datos.version}
              </h3>
              <p className="mt-1 text-xs text-brand-500">{datos.idProyecto ? (datos.modoAplicacion==='PROPIA'?'Política propia del proyecto':'Hereda la política general') : 'Política general'} · Solo lectura</p>
              <p className="mt-1.5 text-xs text-brand-500">
                Vigente desde {fechaLima(datos.vigenteDesde)} (Perú)
              </p>
            </div>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
              <ShieldCheckIcon className="h-3.5 w-3.5" aria-hidden="true"/> Vigente
            </span>
          </div>
        </div>
        <div className="grid grid-cols-1 gap-3 p-4 sm:grid-cols-2 sm:p-5">
          {condiciones.map((x, i) => <TarjetaCondicion key={x.etiqueta}
            icono={x.icono} etiqueta={x.etiqueta} valor={x.valor}
            detalle={x.detalle} destacado={i === 2}/>)}
        </div>
        <div className="border-t border-brand-100 bg-brand-50/50 px-4 py-3 text-xs leading-relaxed text-brand-600 sm:px-5">
          Las operaciones anteriores conservan las condiciones aceptadas y sus cronogramas originales.
        </div>
      </section>

      <div className="min-w-0">
        <PublicarPoliticaFinancieraPanel key={`${datos.idProyecto??0}:${datos.idPolitica}:${datos.idPoliticaProyecto??0}`} politica={datos}
          onPublicada={() => setRevision(r => r + 1)} />
      </div>
    </div>

    <SeguridadFinancieraTotpPanel />
    <HistorialPoliticasFinancierasPanel politica={datos} />
  </div>;
}
