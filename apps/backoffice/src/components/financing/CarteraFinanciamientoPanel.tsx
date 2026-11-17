import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {toast} from 'sonner';
import { CalendarClockIcon, CoinsIcon, FileStackIcon, LandmarkIcon, RefreshCwIcon, WalletIcon, EyeIcon, FileSpreadsheetIcon } from 'lucide-react';
import { crmBackend, type CrmCarteraReal, type CrmPlanCarteraReal } from '../../services/crmBackend';
import { CrmPeriodoGlobal, type PeriodoCrmModo } from '../crm/CrmPeriodoGlobal';
import { calcularRangoCrm } from '../../utils/crmPeriodo';
import { getPeruTodayDateString } from '../Workers/workerDateUtils';
import { formatSoles } from '../../utils/financeMoney';
import { KpiCard, type Kpi } from '../ui/KpiCard';
import { Card, CardHeader } from '../ui/Card';
import { Tabs } from '../ui/Tabs';
import { Table, TD, TH, TR } from '../ui/Table';
import { FiltrosCarteraFinanciera, FILTROS_CARTERA_VACIOS, type FiltrosCarteraState } from './FiltrosCarteraFinanciera';
import { Alert, EmptyState } from '../ui/Feedback';
import { Button } from '../ui/Button';
import {Pagination} from '../ui/Pagination';
import {consultarReporteFinanciero,generarExcelFinanciamiento,descargarReporte} from '../../utils/financiamientoExportExcel';
import { AlertasCuotasPanel } from './AlertasCuotasPanel';
import { RevisionClausulaPanel } from './RevisionClausulaPanel';
import { PlanFinanciamientoDetalleModal } from './PlanFinanciamientoDetalleModal';

const estadoPlan = (p: CrmPlanCarteraReal) => {
  if (p.estadoFiltro==='ANULADO') return { etiqueta:'Anulado', clases:'border-slate-200 bg-slate-50 text-slate-700' };
  if (!p.cuotasExigibles) return {
    etiqueta:'Pendiente de firma',
    clases:'border-amber-200 bg-amber-50 text-amber-800'
  };
  if (p.estadoPlan==='COMPLETADO') return {
    etiqueta:'Completado',
    clases:'border-emerald-200 bg-emerald-50 text-emerald-800'
  };
  return {etiqueta:'Activo',clases:'border-emerald-200 bg-emerald-50 text-emerald-800'};
};

const fechaCorta = (v: string) => new Intl.DateTimeFormat('es-PE',{
  day:'2-digit',month:'2-digit',year:'numeric',timeZone:'UTC'
}).format(new Date(`${v.slice(0,10)}T12:00:00Z`));

/** Cartera de ventas del período, con saldos vigentes a la fecha de consulta. */
export function CarteraFinanciamientoPanel() {
  const [searchParams,setSearchParams] = useSearchParams();
  const vista = searchParams.get('tab')==='alertas'?'ALERTAS':'PLANES';
  const cambiarVista = (tab: string) => {
    setSearchParams({tab:tab==='ALERTAS'?'alertas':'planes'});
  };
  const [modo,setModo] = useState<PeriodoCrmModo>('ANIO');
  const [fechaReferencia,setFechaReferencia] = useState(getPeruTodayDateString);
  const [fechaDesde,setFechaDesde] = useState(getPeruTodayDateString);
  const [fechaHasta,setFechaHasta] = useState(getPeruTodayDateString);
  const rango = useMemo(() => calcularRangoCrm(
    modo,fechaReferencia,fechaDesde,fechaHasta
  ),[modo,fechaReferencia,fechaDesde,fechaHasta]);

  const [filtrosTabla,setFiltrosTabla] = useState<FiltrosCarteraState>({...FILTROS_CARTERA_VACIOS});
  const [consulta,setConsulta] = useState('');
  const [catalogos,setCatalogos] = useState<CrmCarteraReal['filtros']>({proyectos:[],lotes:[]});
  const [pagina,setPagina] = useState(1);
  const [revision,setRevision] = useState(0);
  const [datos,setDatos] = useState<CrmCarteraReal | null>(null);
  const [cargando,setCargando] = useState(true);
  const [error,setError] = useState<string | null>(null);
  const [seleccionado,setSeleccionado] = useState<CrmPlanCarteraReal | null>(null);
  const [exportando,setExportando] = useState(false);
  const [progresoExportacion,setProgresoExportacion] = useState('');

  useEffect(() => {
    const timer=window.setTimeout(() => {
      setPagina(1);
      setConsulta(filtrosTabla.busqueda);
    },350);
    return () => window.clearTimeout(timer);
  },[filtrosTabla.busqueda]);

  const cambiarFiltroTabla = (cambios:Partial<FiltrosCarteraState>) => {
    setFiltrosTabla(prev=>({...prev,...cambios}));
    setPagina(1);
  };
  const limpiarFiltrosTabla = () => {
    setFiltrosTabla({...FILTROS_CARTERA_VACIOS});
    setConsulta('');
    setPagina(1);
  };
  const rangoTablaInvalido = Boolean(filtrosTabla.fechaDesde && filtrosTabla.fechaHasta
    && filtrosTabla.fechaDesde > filtrosTabla.fechaHasta);

  useEffect(() => {
    setPagina(1);
    setSeleccionado(null);
  },[rango]);

  useEffect(() => {
    if(!rango || rangoTablaInvalido){
      if(!rango) setDatos(null);
      setCargando(false);
      setError(rangoTablaInvalido
        ? 'La fecha desde no puede ser posterior a la fecha hasta.'
        : 'Selecciona un rango de fechas válido para consultar los indicadores y planes.');
      return;
    }
    let vigente=true;
    setCargando(true);
    setError(null);
    // Mantener los KPI estables mientras se aplican filtros exclusivos de la tabla.
    void crmBackend.listarCarteraFinancieraReal({
      vista:'PLANES',busqueda:consulta,pagina,tamano:20,
      desde:rango.desde,hastaExclusivo:rango.hastaExclusivo,
      proyecto:filtrosTabla.proyecto,lote:filtrosTabla.lote,
      estado:filtrosTabla.estado,
      fechaTablaDesde:filtrosTabla.fechaDesde,
      fechaTablaHasta:filtrosTabla.fechaHasta
    }).then(resultado => {
      if(vigente) {
        setDatos(resultado);
        setCatalogos(resultado.filtros);
      }
    }).catch(cause => {
      if(vigente)setError(cause instanceof Error?cause.message:'No pudimos consultar la cartera financiera.');
    }).finally(() => {if(vigente)setCargando(false);});
    return () => {vigente=false;};
  },[rango,consulta,pagina,revision,rangoTablaInvalido,
    filtrosTabla.proyecto,filtrosTabla.lote,filtrosTabla.estado,
    filtrosTabla.fechaDesde,filtrosTabla.fechaHasta]);

  const resumen = datos?.resumen;
  const planes = (datos?.items ?? []) as CrmPlanCarteraReal[];

  const kpis: Kpi[] = [
    {id:'planes',label:'Planes financiados',value:resumen?String(resumen.planes):'—',
      hint:'Ventas registradas en el período',icon:FileStackIcon,tone:'sky'},
    {id:'capital',label:'Capital financiado activo',value:resumen?formatSoles(resumen.capitalFinanciadoActivo):'—',
      hint:'De los contratos exigibles',icon:LandmarkIcon,tone:'brand'},
    {id:'saldo',label:'Saldo de cuotas por cobrar',value:resumen?formatSoles(resumen.saldoCuotas):'—',
      hint:'Saldo vigente',icon:WalletIcon,tone:'emerald'},
    {id:'inicial',label:'Inicial por conciliar',value:resumen?formatSoles(resumen.inicialPorConciliar):'—',
      hint:'Pendiente de aplicación confirmada',icon:CoinsIcon,tone:'amber'},
    {id:'mora',label:'Cuotas vencidas con saldo',value:resumen?formatSoles(resumen.montoVencido):'—',
      hint:'Saldo vencido',icon:CalendarClockIcon,tone:'rose'}
  ];

  const exportarExcel = async () => {
    if(!rango || exportando)return;
    setExportando(true);
    setProgresoExportacion('Preparando reporte…');
    try{
      const reporte=await consultarReporteFinanciero(rango,setProgresoExportacion);
      setProgresoExportacion('Generando archivo Excel…');
      const archivo=await generarExcelFinanciamiento(reporte);
      const inicio=rango.desde.slice(0,10);
      const fin=new Date(new Date(rango.hastaExclusivo).getTime()-86400000).toISOString().slice(0,10);
      descargarReporte(archivo,`MONOLITHE_Financiamiento_${inicio}_${fin}.xlsx`);
      toast.success('Reporte Excel generado',{
        description:`${reporte.planes.length} planes y ${reporte.alertas.length} alertas de las ventas del período.`
      });
    }catch(e:unknown){
      toast.error('No se pudo exportar el financiamiento',{
        description:e instanceof Error?e.message:'Verifica tu conexión e inténtalo nuevamente.'
      });
    }finally{setExportando(false);setProgresoExportacion('');}
  };
  const nombrePeriodo = modo='HOY'?'Hoy':modo==='SEMANA'?'Semana':modo==='MES'?'Mes':
    modo==='ANIO'?'Año':'Rango';
  const etiquetaPeriodo = modo==='RANGO'?`${fechaDesde || '—'} a ${fechaHasta || '—'}`:fechaReferencia;

  return <section className="min-w-0 space-y-5" aria-label="Cartera financiera de ventas reales">
    <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
      <div className="min-w-0 flex-1 [&>section]:mb-0">
        <CrmPeriodoGlobal
          descripcion="Filtra el Resumen de Financiamiento según la fecha de registro de la venta."
          modo={modo} onModoChange={setModo}
          fechaReferencia={fechaReferencia} onFechaReferenciaChange={setFechaReferencia}
          fechaDesde={fechaDesde} onFechaDesdeChange={setFechaDesde}
          fechaHasta={fechaHasta} onFechaHastaChange={setFechaHasta}
        />
      </div>
      <div className="flex shrink-0 flex-col items-start gap-1 lg:items-end">
        <Button icon={FileSpreadsheetIcon} onClick={()=>void exportarExcel()} disabled={exportando||!rango}>
          {exportando?'Exportando…':'Exportar Excel'}
        </Button>
        {exportando&&<span role="status" className="max-w-56 text-[11px] text-brand-500">
          {progresoExportacion}
        </span>}
      </div>
    </div>

    <section aria-label="Indicadores financieros del período">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-sm font-semibold text-brand-900">Resumen de financiamiento</h2>
          <p className="mt-1 text-xs text-brand-500">Ventas del período seleccionado · importes calculados con saldos vigentes.</p>
        </div>
        <span className="rounded-full border border-brand-100 bg-white px-3 py-1.5 text-xs font-semibold text-brand-700 shadow-sm">
          {nombrePeriodo} · {etiquetaPeriodo}
        </span>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {kpis.map(kpi=><KpiCard key={kpi.id} kpi={kpi}/>)}
      </div>
      {cargando&&<p className="mt-2 text-[11px] text-brand-400" role="status">Actualizando indicadores del período…</p>}
    </section>

    <Card className="overflow-hidden">
      <CardHeader
        title={vista==='ALERTAS'?'Alertas de cuotas Vencidas':'Planes y saldos'}
        description={vista==='ALERTAS'
          ? 'Cuotas por vencer, vencidas y revisión de mora de toda la cartera autorizada.'
          : 'Ventas financiadas registradas en el período.'}
        actions={vista==='PLANES'?
          <Button icon={RefreshCwIcon} variant="secondary" onClick={()=>setRevision(v=>v+1)} disabled={cargando}>Actualizar</Button>
          :null}
      />
      <div className="border-b border-brand-100 px-4 pt-2 sm:px-5">
        <Tabs active={vista} onChange={cambiarVista}
          items={[{id:'PLANES',label:'Planes y saldos',count:resumen?.planes??null},
            {id:'ALERTAS',label:'Alertas de cuotas Vencidas'}]}/>
        {vista==='PLANES'&&<div className="w-full py-3">
          <FiltrosCarteraFinanciera filtros={filtrosTabla}
            proyectos={catalogos.proyectos} lotes={catalogos.lotes}
            onBusqueda={busqueda=>cambiarFiltroTabla({busqueda})}
            onProyecto={proyecto=>cambiarFiltroTabla({proyecto,lote:''})}
            onLote={lote=>cambiarFiltroTabla({lote})}
            onEstado={estado=>cambiarFiltroTabla({estado})}
            onFechaDesde={fechaDesde=>cambiarFiltroTabla({fechaDesde})}
            onFechaHasta={fechaHasta=>cambiarFiltroTabla({fechaHasta})}
            onLimpiar={limpiarFiltrosTabla}/>
          {datos&&<p className="pb-2 text-[11px] text-brand-500">
            Fecha de corte: {fechaCorta(datos.fechaCorte)} · {datos.total} registros filtrados
          </p>}
        </div>}
      </div>

      {vista==='ALERTAS'&&<div className="space-y-4 p-3 sm:p-4">
        <p className="text-xs text-brand-500">
          Las alertas son actuales y abarcan toda tu cartera autorizada, sin depender del período de ventas seleccionado.
        </p>
        <AlertasCuotasPanel/>
        <RevisionClausulaPanel/>
      </div>}

      {vista==='PLANES'&&<>
        {error&&<div className="m-4"><Alert title="No se pudo consultar la cartera" tone="danger">{error}</Alert></div>}
        {cargando&&<p className="p-5 text-sm text-brand-500">Consultando planes y pagos aplicados…</p>}
        {!cargando&&!error&&datos?.total===0&&
          <EmptyState title="No hay ventas financiadas en este período"
            description="Selecciona otro mes, año o rango. Las alertas activas permanecen disponibles en su pestaña."/>}
        {!cargando&&!error&&datos&&datos.total>0&&<>
          <p className="px-4 pt-3 text-[11px] text-brand-500 sm:hidden">
            Desliza horizontalmente la tabla para ver todas las columnas y acciones.
          </p>
          <Table head={<>
            <TH>Venta y comprador</TH><TH>Lote</TH>
            <TH align="right">Precio base</TH><TH align="right">Inicial</TH>
            <TH align="right">Capital financiado</TH><TH align="right">Interés</TH>
            <TH align="right">Saldo</TH><TH>Estado</TH><TH>Acciones</TH>
          </>}>
            {planes.map(p=>{
              const estado=estadoPlan(p);
              return <TR key={p.idPlanPago} className="hover:bg-brand-50/60">
                <TD><div className="min-w-[170px]">
                    <span className="font-semibold text-brand-900">{p.codigoVenta}</span>
                    <span className="mt-1 block text-xs font-medium text-brand-700">{p.comprador}</span>
                    <span className="mt-0.5 block text-[11px] text-brand-400">Venta: {fechaCorta(p.fechaVenta)}</span>
                  </div></TD>
                <TD><span className="whitespace-nowrap font-medium text-brand-700">{p.lote}</span></TD>
                <TD align="right">{formatSoles(p.precioVenta)}</TD>
                <TD align="right">{formatSoles(p.inicialAdicional+p.reservaAplicada)}</TD>
                <TD align="right" className="font-semibold text-brand-800">{formatSoles(p.capitalFinanciado)}</TD>
                <TD align="right" className="text-amber-800">{formatSoles(p.interesTotal)}</TD>
                <TD align="right" className="font-bold text-brand-900">
                  {p.cuotasExigibles?formatSoles(p.saldoFinanciamiento):'No exigible'}
                </TD>
                <TD><span className={`inline-flex whitespace-nowrap rounded-full border px-2.5 py-1 text-[11px] font-semibold ${estado.clases}`}>
                  {estado.etiqueta}</span></TD>
                <TD><button type="button" onClick={()=>setSeleccionado(p)}
                    className="inline-flex min-h-9 items-center gap-1.5 whitespace-nowrap rounded-lg border border-brand-200 bg-white px-3 py-1.5 text-xs font-semibold text-brand-800 transition-colors hover:border-amber-300 hover:bg-amber-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-500">
                  <EyeIcon className="h-4 w-4 text-amber-600" aria-hidden="true"/>
                  Ver cronograma
                </button></TD>
              </TR>;
            })}
          </Table>
        </>}
        {!cargando&&!error&&datos&&
          <Pagination page={pagina} pageSize={20} total={datos.total}
            onPageChange={setPagina}/>}

      </>}
    </Card>

    {seleccionado&&<PlanFinanciamientoDetalleModal
      key={seleccionado.idVenta} plan={seleccionado} onClose={()=>setSeleccionado(null)}/>}
  </section>;
}
