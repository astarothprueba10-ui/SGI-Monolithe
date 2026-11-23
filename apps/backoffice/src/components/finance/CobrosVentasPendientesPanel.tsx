import { useEffect, useState } from 'react';
import { RefreshCwIcon } from 'lucide-react';
import { Card, CardHeader } from '../ui/Card';
import { Button } from '../ui/Button';
import { SearchInput } from '../ui/Field';
import { Alert, EmptyState } from '../ui/Feedback';
import { Table, TD, TH, TR } from '../ui/Table';
import { crmBackend, type CrmCobrosVentasPendientesPage } from '../../services/crmBackend';
import { currency } from '../../utils/format';

const fecha = (value: string) =>
  new Date(value).toLocaleDateString('es-PE',{timeZone:'America/Lima'});

export function CobrosVentasPendientesPanel() {
  const [busqueda,setBusqueda] = useState('');
  const [consulta,setConsulta] = useState('');
  const [pagina,setPagina] = useState(1);
  const [revision,setRevision] = useState(0);
  const [datos,setDatos] = useState<CrmCobrosVentasPendientesPage|null>(null);
  const [cargando,setCargando] = useState(true);
  const [error,setError] = useState<string|null>(null);

  useEffect(()=>{
    const timer = window.setTimeout(()=>{setPagina(1);setConsulta(busqueda.trim());},350);
    return ()=>window.clearTimeout(timer);
  },[busqueda]);
  useEffect(()=>{
    let vigente=true;
    setCargando(true);
    setError(null);
    void crmBackend.listarCobrosVentasPendientes({busqueda:consulta,pagina,tamano:20})
      .then(res=>{if(vigente)setDatos(res);})
      .catch(err=>{
        if(vigente){setDatos(null);setError(err instanceof Error ? err.message : 'No se pudieron consultar los cobros de venta.');}
      })
      .finally(()=>{if(vigente)setCargando(false);});
    return ()=>{vigente=false;};
  },[consulta,pagina,revision]);

  return <div className="space-y-4">
    <Alert tone="warning" title="Cobros de ventas que requieren verificación">
      Los importes de esta bandeja no están confirmados ni imputados a cuotas.
      La firma del contrato y la carga de un comprobante no acreditan por sí solas
      la recepción del dinero. Esta vista es exclusivamente de consulta hasta
      implementar la aprobación segregada y su conciliación contable.
    </Alert>
    <Card>
      <CardHeader title="Pagos de ventas pendientes de revisión"
        description="Contado e iniciales adicionales, independientes de los vouchers de cuotas y separaciones."
        actions={<div className="flex flex-wrap items-center gap-2">
          <SearchInput className="w-full sm:w-64" label="Buscar cobro pendiente"
            placeholder="Venta, cliente, proyecto o lote..."
            value={busqueda} onValueChange={setBusqueda}/>
          <Button variant="secondary" icon={RefreshCwIcon} disabled={cargando}
            onClick={()=>setRevision(x=>x+1)}>Actualizar</Button>
        </div>}/>
      {datos && !error && <div className="flex flex-wrap items-center gap-6 border-b border-brand-100 px-5 py-3 text-xs text-brand-600">
        <span>Operaciones pendientes: <strong className="text-brand-900">{datos.total}</strong></span>
        <span>Importe por verificar: <strong className="text-brand-900">{currency(datos.montoPendiente)}</strong></span>
      </div>}
      {error && <div className="p-4"><Alert tone="danger" title="No se pudo consultar la bandeja">{error}</Alert></div>}
      {cargando && <p className="p-5 text-sm text-brand-500">Consultando pagos de ventas…</p>}
      {!cargando && !error && datos?.total===0 &&
        <EmptyState title="Sin cobros pendientes" description="No se encontraron cobros de ventas por revisar en esta búsqueda."/>}
      {!cargando && !error && Boolean(datos?.total) && <div className="overflow-x-auto">
        <Table head={<>
          <TH>Venta / contrato</TH><TH>Comprador</TH><TH>Proyecto / lote</TH>
          <TH>Modalidad de abono</TH><TH>Medio / comprobantes</TH>
          <TH align="right">Importe por verificar</TH><TH>Estado contractual</TH>
        </>}>
          {datos?.items.map(item=><TR key={item.idVenta}>
            <TD><span className="block font-semibold text-brand-900">{item.codigoVenta}</span>
              <span className="block text-xs text-brand-500">{item.codigoContrato??'Sin contrato'}</span>
              <span className="block text-xs text-brand-400">{fecha(item.fechaVenta)}</span></TD>
            <TD>{item.comprador??'Sin titular identificado'}</TD>
            <TD>{item.proyecto}<span className="block font-semibold text-brand-800">{item.codigoLote}</span></TD>
            <TD><span className="inline-flex rounded-md border border-brand-200 bg-brand-50 px-2 py-1 text-xs font-semibold text-brand-800">
              {item.tipoAbono==='INICIAL'?'Inicial financiada':'Pago al contado'}
            </span></TD>
            <TD>{item.metodoPago}<span className="block text-xs text-brand-500">
              {item.comprobantes} {item.comprobantes===1?'comprobante':'comprobantes'}
              {item.numeroOperacion ? ` · Ref. ${item.numeroOperacion}` : ''}
            </span></TD>
            <TD align="right" className="font-semibold tabular-nums">{currency(item.montoPendiente)}</TD>
            <TD><span className="block text-brand-800">{item.estadoVenta}</span>
              <span className="block text-xs text-brand-500">{item.estadoContrato??'Sin contrato'}</span>
              {item.estadoContrato==='VIGENTE' && <span className="mt-1 inline-block rounded-md border border-amber-200 bg-amber-50 px-2 py-1 text-[11px] font-semibold text-amber-800">
                Firmado · cobro sin validar
              </span>}</TD>
          </TR>)}
        </Table>
      </div>}
      {datos && datos.paginas>1 && !cargando && <div className="flex items-center justify-between border-t border-brand-100 px-5 py-4 text-xs text-brand-500">
        <span>Página {pagina} de {datos.paginas} · {datos.total} operaciones</span>
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" disabled={pagina<=1}
            onClick={()=>setPagina(p=>Math.max(1,p-1))}>Anterior</Button>
          <Button variant="secondary" size="sm" disabled={pagina>=datos.paginas}
            onClick={()=>setPagina(p=>p+1)}>Siguiente</Button>
        </div>
      </div>}
    </Card>
  </div>;
}
