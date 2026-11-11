import {useEffect,useState} from 'react';
import {useNavigate} from 'react-router-dom';
import {
  CalendarClockIcon,ClipboardListIcon,FileCheck2Icon,FileLock2Icon,
  LandPlotIcon,MapPinnedIcon,RefreshCwIcon,RulerIcon,ShieldCheckIcon
} from 'lucide-react';
import {PageHeader} from '../../components/portal/PageHeader';
import {Card,CardHeader} from '../../components/ui/Card';
import {portalCoreGet} from '../../lib/portalCoreApi';
import {ApiError} from '../../lib/apiClient';
import type {
  PortalLotesContratosResponse,PortalLoteDetalle,
  PortalProyectoDetalle,PortalContratoDetalle
} from '../../types/portal-lotes-contratos';
import {formatArea,formatCurrency,formatDate} from '../../utils/format';

function TextoFecha({fecha}: {fecha:string|null}) {
  return <>{fecha?formatDate(fecha):'No registrada'}</>;
}
function Item({nombre,valor}: {nombre:string;valor:React.ReactNode}) {
  return <div className="flex flex-col gap-1 border-b border-slateux-100 py-2.5 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
    <dt className="text-[13px] text-slateux-500">{nombre}</dt>
    <dd className="text-[13.5px] font-medium text-ink-800 sm:text-right">{valor}</dd>
  </div>;
}
function FichaLote({lote}: {lote:PortalLoteDetalle}) {
  const metros=(n:number|null)=>n===null?'No registrado':`${n.toLocaleString('es-PE',{maximumFractionDigits:2})} m`;
  return <Card as="section">
    <CardHeader
      title={`${lote.manzana??lote.codigoManzana??'Manzana sin registrar'} · Lote ${lote.numero}`}
      description={`${lote.codigo} · Estado registrado: ${lote.estado}`}
      icon={<LandPlotIcon className="h-5 w-5"/>}
    />
    <dl className="px-5 py-2">
      <Item nombre="Etapa del proyecto" valor={lote.etapa??'No registrada'}/>
      <Item nombre="Área oficial del lote" valor={formatArea(lote.areaM2)}/>
      <Item nombre="Tipo de lote" valor={lote.tipo??'No registrado'}/>
      <Item nombre="Frente" valor={metros(lote.frenteM)}/>
      <Item nombre="Fondo" valor={metros(lote.fondoM)}/>
      <Item nombre="Lateral derecho" valor={metros(lote.lateralDerechoM)}/>
      <Item nombre="Lateral izquierdo" valor={metros(lote.lateralIzquierdoM)}/>
    </dl>
    <p className="px-5 pb-4 text-xs leading-relaxed text-slateux-500">
      Estas son las dimensiones registradas en el expediente. No se
      deduce un plano rectangular ni se calcula un área diferente a la oficial.
    </p>
  </Card>;
}
function FichaProyecto({proyecto}: {proyecto:PortalProyectoDetalle}) {
  const ubicacion=[proyecto.distrito,proyecto.provincia,proyecto.departamento,proyecto.pais]
    .filter(Boolean).join(', ');
  return <Card as="section">
    <CardHeader
      title={proyecto.nombre}
      description={proyecto.codigo}
      icon={<MapPinnedIcon className="h-5 w-5"/>}
    />
    <dl className="px-5 py-2">
      <Item nombre="Ubicación" valor={ubicacion||'No registrada'}/>
      {proyecto.direccion&&<Item nombre="Dirección registrada" valor={proyecto.direccion}/>}
      {proyecto.referencia&&<Item nombre="Referencia" valor={proyecto.referencia}/>}
      <Item nombre="Área total del proyecto"
        valor={proyecto.areaTotalM2===null?'No registrada':formatArea(proyecto.areaTotalM2)}/>
      <Item nombre="Inicio programado" valor={<TextoFecha fecha={proyecto.fechaInicio}/>}/>
      <Item nombre="Fin estimado" valor={<TextoFecha fecha={proyecto.fechaFinEstimada}/>}/>
    </dl>
    <p className="px-5 pb-4 text-xs leading-relaxed text-slateux-500">
      Las fechas del proyecto son estimaciones registradas, no certifican
      avance de obra ni fecha de entrega individual del lote.
    </p>
  </Card>;
}
function Contrato({c}: {c:PortalContratoDetalle}) {
  const tieneFirma=c.fechaFirma!==null;
  const firmadoVigente=tieneFirma&&c.estado==='VIGENTE';
  const disponibles=c.documentosPublicados+c.anexosPublicados;
  return <li className="rounded-field border border-slateux-200 p-4">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div className="min-w-0">
        <p className="text-sm font-semibold text-ink-800">
          {c.tipo??'Contrato'} · {c.codigo}
        </p>
        <p className="mt-1 text-xs text-slateux-600">Número: {c.numero??'No asignado'}</p>
      </div>
      <span className={`rounded-full px-3 py-1 text-xs font-semibold ${firmadoVigente?
        'bg-success-50 text-success-700':'bg-warn-50 text-warn-700'}`}>
        {firmadoVigente?'Vigente y firmado':c.estado.replaceAll('_',' ')}
      </span>
    </div>
    <dl className="mt-3 grid gap-3 sm:grid-cols-2">
      <div><dt className="text-xs text-slateux-500">Fecha de emisión</dt>
        <dd className="text-sm font-medium"><TextoFecha fecha={c.fechaEmision}/></dd>
      </div>
      <div><dt className="text-xs text-slateux-500">Fecha de firma</dt>
        <dd className="text-sm font-medium"><TextoFecha fecha={c.fechaFirma}/></dd>
      </div>
      <div><dt className="text-xs text-slateux-500">Inicio de vigencia</dt>
        <dd className="text-sm font-medium"><TextoFecha fecha={c.fechaInicioVigencia}/></dd>
      </div>
      <div><dt className="text-xs text-slateux-500">Fin de vigencia</dt>
        <dd className="text-sm font-medium">
          {c.fechaFinVigencia?<TextoFecha fecha={c.fechaFinVigencia}/>: 'No definido'}
        </dd>
      </div>
    </dl>
    <div className="mt-4 flex items-start gap-2 rounded-field bg-slateux-50 p-3">
      {disponibles>0?
        <FileCheck2Icon className="mt-0.5 h-4 w-4 shrink-0 text-ink-700"/>:
        <FileLock2Icon className="mt-0.5 h-4 w-4 shrink-0 text-slateux-500"/>}
      <p className="text-xs leading-relaxed text-slateux-600">
        {disponibles===0?
          'Todavía no hay documentos o anexos autorizados para publicación en el Portal Cliente.':
          `Documentos publicados: ${c.documentosPublicados}. Anexos publicados: ${c.anexosPublicados}. La lectura privada se habilitará en la sección Documentos.`}
      </p>
    </div>
    {!tieneFirma&&<p className="mt-3 text-xs text-warn-700">
      La firma no figura registrada. Este contrato no debe presentarse como firmado.
    </p>}
  </li>;
}
export function MiLote() {
  const navigate=useNavigate();
  const [respuesta,setRespuesta]=useState<PortalLotesContratosResponse|null>(null);
  const [elegida,setElegida]=useState<number|null>(null);
  const [error,setError]=useState<string|null>(null);
  const [cargando,setCargando]=useState(true);
  const [version,setVersion]=useState(0);
  useEffect(()=>{
    const controller=new AbortController();
    setCargando(true);setError(null);
    void portalCoreGet<PortalLotesContratosResponse>(
      '/portal-cliente/lotes-contratos',controller.signal
    ).then(x=>{
      if(!controller.signal.aborted)setRespuesta(x);
    }).catch((e:unknown)=>{
      if(controller.signal.aborted)return;
      setRespuesta(null);
      if(e instanceof ApiError && e.status===401){
        navigate('/login',{replace:true});
        return;
      }
      setError(e instanceof Error?e.message:'No se pudo cargar su expediente.');
    }).finally(()=>{if(!controller.signal.aborted)setCargando(false);});
    return()=>controller.abort();
  },[navigate,version]);
  const operaciones=respuesta?.items??[];
  const actual=operaciones.find(v=>v.idVenta===elegida)??operaciones[0]??null;
  return <div className="space-y-6">
    <PageHeader eyebrow="Expediente inmobiliario"
      title="Mi lote y contratos"
      description="Detalles reales de las operaciones vinculadas a su identidad de cliente."
    />
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-field border border-slateux-200 bg-white px-4 py-3">
      <p className="flex items-center gap-2 text-xs text-slateux-600">
        <ShieldCheckIcon className="h-4 w-4"/>
        Acceso privado. Los contratos y documentos pertenecen exclusivamente a su expediente.
      </p>
      <button type="button" onClick={()=>setVersion(n=>n+1)} disabled={cargando}
        className="inline-flex items-center gap-2 rounded-field border border-slateux-200 px-3 py-2 text-xs font-semibold text-ink-700 disabled:opacity-50">
        <RefreshCwIcon className="h-4 w-4"/>Actualizar
      </button>
    </div>
    {cargando&&<Card as="section" className="p-8">
      <p role="status" className="text-sm text-slateux-600">Consultando su expediente…</p>
    </Card>}
    {error&&<Card as="section" className="border-danger-200 p-6">
      <h2 className="text-sm font-semibold text-danger-700">No se pudo consultar su lote</h2>
      <p role="alert" className="mt-2 text-sm text-danger-700">{error}</p>
      <p className="mt-2 text-xs text-slateux-500">
        Por seguridad no se mostrarán datos de demostración ni expedientes ajenos.
      </p>
    </Card>}
    {!cargando&&!error&&respuesta&&operaciones.length===0&&
      <Card as="section" className="p-7">
        <h2 className="text-base font-semibold text-ink-800">Sin lotes vinculados</h2>
        <p className="mt-2 text-sm leading-relaxed text-slateux-600">
          No encontramos compras asociadas a su cuenta actual. Si ya realizó
          una compra, solicite a MONOLITHE verificar la asociación de su identidad.
        </p>
      </Card>
    }
    {!cargando&&!error&&actual&&<>
      {operaciones.length>1&&<div className="space-y-2">
        <p className="text-xs font-semibold text-ink-700">
          Seleccione una de sus {operaciones.length} operaciones
        </p>
        <div role="group" aria-label="Mis operaciones inmobiliarias"
          className="flex flex-wrap gap-2">
          {operaciones.map(x=><button type="button" key={x.idVenta}
            aria-pressed={x.idVenta===actual.idVenta}
            onClick={()=>setElegida(x.idVenta)}
            className={`rounded-field border px-4 py-2 text-xs font-semibold ${
              x.idVenta===actual.idVenta?
              'border-ink-800 bg-ink-800 text-white':
              'border-slateux-200 bg-white text-ink-700'}`}>
            {x.codigoVenta} · {x.lote.codigo}
          </button>)}
        </div>
      </div>}
      <Card as="section" className="p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slateux-500">
              Operación inmobiliaria
            </p>
            <h2 className="mt-1 text-lg font-semibold text-ink-800">{actual.codigoVenta}</h2>
            <p className="mt-1 text-xs text-slateux-600">
              Estado de venta: {actual.estadoVenta.replaceAll('_',' ')}
              {' · '}{actual.esTitular?'Titular registrado':'Participante de la compra'}
            </p>
          </div>
          <div className="text-left sm:text-right">
            <p className="text-xs text-slateux-500">Precio de venta pactado</p>
            <p className="text-lg font-semibold text-ink-800 tabular-nums">
              {formatCurrency(actual.precioVentaPactado)}
            </p>
          </div>
        </div>
      </Card>
      <div className="grid gap-5 lg:grid-cols-2">
        <FichaLote lote={actual.lote}/>
        <FichaProyecto proyecto={actual.proyecto}/>
      </div>
      <Card as="section">
        <CardHeader title="Situación contractual"
          description="Estado y fechas del expediente; no se muestran borradores como contratos firmados."
          icon={<ClipboardListIcon className="h-5 w-5"/>}/>
        {actual.contratos.length===0?
          <p className="px-5 py-6 text-sm text-slateux-600">
            Esta operación todavía no tiene contratos registrados.
          </p>:
          <ul className="space-y-3 p-5">
            {actual.contratos.map(c=><Contrato key={c.idContrato} c={c}/>)}
          </ul>}
      </Card>
      <Card as="section" className="p-5">
        <div className="flex items-start gap-3">
          <RulerIcon className="mt-1 h-5 w-5 shrink-0 text-slateux-500"/>
          <div>
            <h3 className="text-sm font-semibold text-ink-800">
              Plano oficial y avance de obra
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-slateux-600">
              El expediente contiene datos registrales y dimensiones del lote,
              pero no se ha publicado un plano oficial verificado para
              visualizar aquí. Tampoco existe un avance de obra certificado
              por hitos que pueda mostrarse en este módulo.
            </p>
            <p className="mt-2 flex items-center gap-2 text-xs text-slateux-500">
              <CalendarClockIcon className="h-4 w-4"/>
              La fecha estimada del proyecto no equivale a una promesa
              individual de entrega.
            </p>
          </div>
        </div>
      </Card>
    </>}
  </div>;
}
