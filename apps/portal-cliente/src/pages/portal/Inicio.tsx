import {useEffect,useState} from 'react';
import {Link, useNavigate} from 'react-router-dom';
import {
  Building2Icon,CalendarClockIcon,ChartNoAxesCombinedIcon,
  FileTextIcon,RefreshCwIcon,ShieldCheckIcon
} from 'lucide-react';
import {PageHeader} from '../../components/portal/PageHeader';
import {AlertasPanel} from '../../components/portal/AlertasPanel';
import {Card,CardHeader} from '../../components/ui/Card';
import {portalCoreGet} from '../../lib/portalCoreApi';
import {ApiError} from '../../lib/apiClient';
import type {PortalOperacionReal,PortalResumenReal} from '../../types/portal-resumen';
import {formatCurrency,formatDate,formatArea} from '../../utils/format';

const money=(value:number)=>formatCurrency(value);
function VistaOperacion({operacion}: {operacion:PortalOperacionReal}) {
  const fin=operacion.financiamiento;
  return <Card as="section">
    <CardHeader
      title={operacion.proyecto}
      description={`${operacion.codigo_venta} · ${operacion.estado_venta}`}
      icon={<Building2Icon className="h-5 w-5"/>}
    />
    <div className="grid gap-5 p-5 lg:grid-cols-2">
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-ink-800">Mi operación inmobiliaria</h3>
        <dl className="grid grid-cols-2 gap-x-3 gap-y-3 text-sm">
          <div><dt className="text-xs text-slateux-500">Manzana y lote</dt>
            <dd className="font-medium">{operacion.manzana??'—'} · {operacion.numero_lote}</dd>
          </div>
          <div><dt className="text-xs text-slateux-500">Etapa</dt>
            <dd className="font-medium">{operacion.etapa??'No registrada'}</dd>
          </div>
          <div><dt className="text-xs text-slateux-500">Área</dt>
            <dd className="font-medium">{formatArea(operacion.area_m2)}</dd>
          </div>
          <div><dt className="text-xs text-slateux-500">Precio pactado</dt>
            <dd className="font-medium">{money(operacion.precio_venta)}</dd>
          </div>
        </dl>
        <p className="text-xs text-slateux-500">
          {([operacion.distrito,operacion.provincia,operacion.departamento]
            .filter(Boolean)).join(', ')}
        </p>
      </div>
      {!fin?(
        <div className="rounded-field border border-warn-200 bg-warn-50 p-4">
          <p className="text-sm font-semibold text-warn-700">
            Sin cronograma financiero vigente disponible
          </p>
          <p className="mt-2 text-xs leading-relaxed text-warn-700">
            El cronograma solo aparece cuando el contrato está firmado,
            vigente y su plan de pagos está activo. No se mostrarán cuotas
            simuladas ni una deuda estimada.
          </p>
        </div>
      ):(
        <div className="rounded-field border border-slateux-200 bg-slateux-50 p-4">
          <div className="flex items-center gap-2 text-ink-800">
            <ChartNoAxesCombinedIcon className="h-4 w-4"/>
            <h3 className="text-sm font-semibold">Financiamiento vigente</h3>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-3">
            <Dato label="Capital financiado" value={money(fin.capitalFinanciado)}/>
            <Dato label="Interés total pactado" value={money(fin.interesTotalPactado)}/>
            <Dato label="Cuotas abonadas" value={`${fin.cuotasPagadas} de ${fin.numeroCuotas}`}/>
            <Dato label="Saldo de cuotas" value={money(fin.saldoCuotas)}/>
            <Dato label="Saldo de inicial adicional" value={money(fin.saldoInicial)}/>
            <Dato label="Saldo total pendiente" value={money(fin.saldoTotal)} destacado/>
          </div>
          <p className="mt-3 text-xs text-slateux-600">
            Reserva acreditada: {money(fin.reservaAcreditada)}.
            Se muestra por separado y no se descuenta por segunda vez.
          </p>
          <p className="mt-1 text-xs text-slateux-600">
            Tasa contractual mensual: {fin.tasaInteresMensualPct}%.
            Los importes provienen de aplicaciones confirmadas.
          </p>
        </div>
      )}
    </div>
    {fin?.proximaCuota&&(
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slateux-200 px-5 py-4">
        <div>
          <p className="flex items-center gap-2 text-sm font-semibold text-ink-800">
            <CalendarClockIcon className="h-4 w-4"/>
            Próxima cuota con saldo: n.º {fin.proximaCuota.numero}
          </p>
          <p className="mt-1 text-xs text-slateux-600">
            Vence el {formatDate(fin.proximaCuota.fechaVencimiento)} ·
            saldo {money(fin.proximaCuota.saldo)} ·
            estado {fin.proximaCuota.estado.toLowerCase()}
          </p>
        </div>
        <Link to="/portal/cronograma" className="text-sm font-semibold text-ink-700 underline-offset-4 hover:underline">
          Ver cronograma
        </Link>
      </div>
    )}
  </Card>;
}
function Dato({label,value,destacado=false}:{
 label:string;value:string;destacado?:boolean;
}) {
 return <div>
   <dt className="text-xs text-slateux-500">{label}</dt>
   <dd className={`mt-1 text-sm font-semibold tabular-nums ${destacado?'text-ink-900':'text-ink-700'}`}>{value}</dd>
 </div>;
}
export function Inicio() {
  const navigate=useNavigate();
  const [datos,setDatos]=useState<PortalResumenReal|null>(null);
  const [error,setError]=useState<string|null>(null);
  const [cargando,setCargando]=useState(true);
  const [version,setVersion]=useState(0);
  useEffect(()=>{
    const controller=new AbortController();
    setCargando(true);setError(null);
    void portalCoreGet<PortalResumenReal>('/portal-cliente/resumen',controller.signal)
      .then(x=>{if(!controller.signal.aborted)setDatos(x);})
      .catch((e:unknown)=>{
        if(controller.signal.aborted)return;
        if(e instanceof ApiError && e.status===401){
          navigate('/login',{replace:true});
          return;
        }
        setDatos(null);
        setError(e instanceof Error?e.message:'No fue posible consultar sus operaciones.');
      })
      .finally(()=>{if(!controller.signal.aborted)setCargando(false);});
    return()=>controller.abort();
  },[navigate,version]);
  return <div className="space-y-6">
    <PageHeader
      eyebrow="Portal Cliente"
      title="Estado real de mis compras"
      description="Información consultada directamente desde su expediente en SGI-MONOLITHE."
    />
    <div className="flex flex-wrap items-center justify-between gap-2 rounded-field border border-slateux-200 bg-white px-4 py-3">
      <span className="flex items-center gap-2 text-xs text-slateux-600">
        <ShieldCheckIcon className="h-4 w-4"/>
        Solo operaciones vinculadas a la cuenta autenticada.
        Los pagos pendientes de aprobación no reducen el saldo.
      </span>
      <button type="button" disabled={cargando} onClick={()=>setVersion(x=>x+1)}
        className="inline-flex items-center gap-2 rounded-field border border-slateux-200 px-3 py-2 text-xs font-semibold text-ink-700 disabled:opacity-50">
        <RefreshCwIcon className="h-4 w-4"/>Actualizar
      </button>
    </div>
    {cargando&&(
      <Card as="section" className="p-8">
        <p role="status" className="text-sm text-slateux-600">
          Consultando sus operaciones de forma segura…
        </p>
      </Card>
    )}
    {error&&(
      <Card as="section" className="border-danger-200 p-6">
        <h2 className="text-sm font-semibold text-danger-700">No se pudo cargar el resumen</h2>
        <p role="alert" className="mt-2 text-sm text-danger-700">{error}</p>
        <p className="mt-3 text-xs text-slateux-500">
          No se mostrarán importes de ejemplo mientras los datos reales no estén disponibles.
        </p>
      </Card>
    )}
    {!cargando&&!error&&datos&&(
      <>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-lg font-semibold text-ink-800">
              {datos.cliente.nombreMostrar}
            </h2>
            <p className="text-xs text-slateux-500">
              {datos.operaciones.length} operaciones asociadas · consulta {formatDate(datos.fechaConsulta)}
            </p>
          </div>
          <span className="flex items-center gap-2 text-xs text-slateux-500">
            <FileTextIcon className="h-4 w-4"/>Moneda: soles (PEN)
          </span>
        </div>
        {datos.operaciones.length===0?(
          <Card as="section" className="p-7">
            <h3 className="text-base font-semibold text-ink-800">
              Sin compras vinculadas a esta cuenta
            </h3>
            <p className="mt-2 text-sm text-slateux-600">
              Si ya formalizó una compra, comuníquese con MONOLITHE para
              verificar que su identidad esté vinculada al expediente de venta.
              No se puede consultar la operación de otra persona.
            </p>
          </Card>
        ):<>
          {datos.operaciones.map(op =>
            <VistaOperacion key={op.id_venta} operacion={op}/>
          )}
          <AlertasPanel />
        </>}
      </>
    )}
  </div>;
}
