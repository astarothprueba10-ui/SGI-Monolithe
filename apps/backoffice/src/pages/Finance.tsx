import { useEffect, useState } from 'react';
import { RefreshCwIcon } from 'lucide-react';
import { PageHeader } from '../components/ui/PageHeader';
import { Card, CardHeader } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Table, TD, TH, TR } from '../components/ui/Table';
import { SearchInput } from '../components/ui/Field';
import { Alert, EmptyState } from '../components/ui/Feedback';
import { Tabs } from '../components/ui/Tabs';
import { Gate } from '../components/auth/PermissionRoute';
import { useAuth } from '../contexts/AuthContext';
import { TrendChart } from '../components/dashboard/TrendChart';
import { currency } from '../utils/format';
import { crmBackend, type CrmMovimientosFinanzasReal } from '../services/crmBackend';
import { SeparacionVouchersPanel } from '../components/finance/SeparacionVouchersPanel';
import { VouchersCuotasPanel } from '../components/finance/VouchersCuotasPanel';
import { AplicacionesPagosPanel } from '../components/finance/AplicacionesPagosPanel';
import { ConciliacionIntegralPanel } from '../components/finance/ConciliacionIntegralPanel';
import { ConciliacionesSeparacionPanel } from '../components/finance/ConciliacionesSeparacionPanel';

const money=(n:number|undefined|null)=>currency(Number(n??0));
const estadoLabel=(estado:string)=>({
  CONFIRMADO:'Confirmado',REGISTRADO:'En revisión',ANULADO:'Anulado'
}[estado]??estado);
const tipoLabel=(tipo:string)=>({
  SEPARACION:'Separación',FINANCIAMIENTO:'Financiamiento',VENTA:'Venta'
}[tipo]??tipo);
const fecha=(value:string|null)=>value?
  new Date(value).toLocaleDateString('es-PE',{timeZone:'America/Lima'}):'—';

export function Finance() {
  const {can}=useAuth();
  const [tab,setTab]=useState('movimientos');
  const [buscar,setBuscar]=useState('');
  const [consulta,setConsulta]=useState('');
  const [pagina,setPagina]=useState(1);
  const [revision,setRevision]=useState(0);
  const [datos,setDatos]=useState<CrmMovimientosFinanzasReal|null>(null);
  const [cargando,setCargando]=useState(true);
  const [error,setError]=useState<string|null>(null);

  useEffect(()=>{
    const timer=window.setTimeout(()=>{setPagina(1);setConsulta(buscar);},350);
    return ()=>window.clearTimeout(timer);
  },[buscar]);

  useEffect(()=>{
    if(tab!=='movimientos') return;
    let vigente=true;
    setCargando(true);setError(null);
    void crmBackend.listarMovimientosFinanzasReal({busqueda:consulta,pagina,tamano:20})
      .then(r=>{if(vigente)setDatos(r);})
      .catch(e=>{if(vigente){setDatos(null);setError(e instanceof Error?e.message:'No se pudo cargar Finanzas.');}})
      .finally(()=>{if(vigente)setCargando(false);});
    return ()=>{vigente=false;};
  },[tab,consulta,pagina,revision]);

  const resumen=datos?.resumen;
  const items=[
    {id:'movimientos',label:'Movimientos registrados',count:datos?.total??null},
    ...(can('finance.view')?[
      {id:'vouchers_cuotas',label:'Vouchers de cuotas e inicial'},
      {id:'vouchers_separaciones',label:'Vouchers de separaciones'},
      {id:'imputaciones',label:'Aplicación de pagos'},
      {id:'conciliacion_integral',label:'Conciliación integral'},
      {id:'conciliaciones_separaciones',label:'Conciliación de separaciones'}
    ]:[])
  ];
  return <div>
    <PageHeader title="Finanzas"
      description="Movimientos y comprobantes reales, revisión financiera, aplicación de pagos y conciliación. Los saldos por cobrar se consultan en Financiamiento y pagos."/>
    {tab==='movimientos' && <>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          {nombre:'Pagos confirmados',valor:resumen?money(resumen.confirmado):'—'},
          {nombre:'Pagos en revisión',valor:resumen?money(resumen.registrado):'—'},
          {nombre:'Pagos aplicados',valor:resumen?money(resumen.aplicado):'—'},
          {nombre:'Confirmado sin imputar (financiamientos)',valor:resumen?money(resumen.confirmadoSinImputarFinanciamiento):'—'}
        ].map(a=><Card key={a.nombre} className="p-4">
          <p className="text-xs text-brand-500">{a.nombre}</p>
          <p className="mt-2 text-xl font-semibold tabular-nums text-brand-900">{a.valor}</p>
        </Card>)}
      </div>
      <Card className="mt-4">
        <CardHeader title="Pagos confirmados por mes"
          description="Importes registrados y confirmados. No equivale al flujo de caja contable completo ni incluye egresos."
          actions={<Button icon={RefreshCwIcon} variant="secondary" onClick={()=>setRevision(v=>v+1)} disabled={cargando}>Actualizar</Button>}/>
        {datos?.meses?.length ? <div className="p-4">
          <TrendChart data={datos.meses} series={[
            {key:'confirmado',label:'Pagos confirmados',type:'bar',color:'#4cbb17'}
          ]} height={230} valuePrefix="S/ "/>
        </div> : <p className="p-5 text-sm text-brand-500">No hay datos mensuales disponibles.</p>}
      </Card>
      <Alert tone="info" title="Datos de pagos reales, no de contabilidad general" className="mt-4">
        Esta vista solo refleja pagos registrados en el sistema. No hay un libro de egresos
        ni métricas completas de utilidad integradas en este sprint. La aprobación de un
        voucher no reduce cuotas hasta que se impute el pago.
      </Alert>
    </>}
    <Tabs className="mb-5 mt-6" active={tab} onChange={setTab} items={items}/>
    {tab==='movimientos' && <Card>
      <CardHeader title="Movimientos de cobros reales"
        description="Pagos de separaciones, ventas y financiamientos; solo operaciones existentes en Supabase."
        actions={<SearchInput className="w-full sm:w-72" label="Buscar movimiento" value={buscar}
          onValueChange={setBuscar} placeholder="Código de pago, venta o referencia…"/>}/>
      {error && <div className="p-4"><Alert tone="danger" title="Error al consultar movimientos">{error}</Alert></div>}
      {cargando && <p className="p-5 text-sm text-brand-500">Consultando movimientos…</p>}
      {!cargando && !error && datos?.total===0 &&
        <EmptyState title="Sin movimientos" description="No hay pagos registrados para esta búsqueda."/>}
      {!cargando && !error && Boolean(datos?.total) && <div className="overflow-x-auto">
        <Table head={<>
          <TH>Pago / comprobante</TH><TH>Tipo / venta</TH><TH>Fecha</TH>
          <TH align="right">Importe</TH><TH align="right">Aplicado</TH>
          <TH>Estado del pago</TH><TH>Voucher</TH>
        </>}>
          {datos?.items.map(item=><TR key={item.idPago}>
            <TD><span className="font-semibold text-brand-900">{item.codigo}</span>
              <span className="block text-xs text-brand-400">{item.comprobante??'Sin voucher registrado'}</span></TD>
            <TD>{tipoLabel(item.tipo)}<span className="block text-xs text-brand-500">{item.venta??'—'}</span></TD>
            <TD>{fecha(item.fechaOperacion)}</TD>
            <TD align="right" className="font-medium tabular-nums">{money(item.monto)}</TD>
            <TD align="right" className="tabular-nums">{money(item.montoAplicado)}</TD>
            <TD>{estadoLabel(item.estado)}</TD>
            <TD>{item.estadoVoucher??'—'}</TD>
          </TR>)}
        </Table>
      </div>}
      {datos && datos.paginas>1 && !cargando && <div className="flex items-center justify-between border-t border-brand-100 px-5 py-4 text-xs text-brand-500">
        <span>Página {pagina} de {datos.paginas} · {datos.total} registros</span>
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" disabled={pagina<=1} onClick={()=>setPagina(p=>Math.max(1,p-1))}>Anterior</Button>
          <Button variant="secondary" size="sm" disabled={pagina>=datos.paginas} onClick={()=>setPagina(p=>p+1)}>Siguiente</Button>
        </div>
      </div>}
    </Card>}
    {tab==='vouchers_cuotas'&&<Gate permission="finance.view"><VouchersCuotasPanel /></Gate>}
    {tab==='vouchers_separaciones'&&<Gate permission="finance.view"><SeparacionVouchersPanel /></Gate>}
    {tab==='imputaciones'&&<Gate permission="finance.view"><AplicacionesPagosPanel /></Gate>}
    {tab==='conciliacion_integral'&&<Gate permission="finance.view"><ConciliacionIntegralPanel /></Gate>}
    {tab==='conciliaciones_separaciones'&&<Gate permission="finance.view"><ConciliacionesSeparacionPanel /></Gate>}
  </div>;
}
