import { useEffect, useState } from 'react';
import { RefreshCwIcon } from 'lucide-react';
import { Card, CardHeader } from '../ui/Card';
import { Alert, EmptyState } from '../ui/Feedback';
import { Button } from '../ui/Button';
import { Table,TD,TH,TR } from '../ui/Table';
import { crmBackend,type CrmReservasVencidasRevision } from '../../services/crmBackend';
import { currency } from '../../utils/format';

const fecha=(v:string)=>new Date(v).toLocaleDateString('es-PE',{timeZone:'America/Lima'});
export function ReservasVencidasPanel(){
  const [datos,setDatos]=useState<CrmReservasVencidasRevision|null>(null);
  const [error,setError]=useState('');
  const [loading,setLoading]=useState(true);
  const [revision,setRevision]=useState(0);
  useEffect(()=>{
    let active=true;setLoading(true);setError('');
    void crmBackend.reservasVencidasRevision()
      .then(x=>{if(active)setDatos(x);})
      .catch(e=>{if(active){setDatos(null);setError(e instanceof Error?e.message:'No fue posible consultar separaciones vencidas.');}})
      .finally(()=>{if(active)setLoading(false);});
    return ()=>{active=false;};
  },[revision]);
  return <div className="space-y-4">
    <Alert tone="warning" title="Protección de dinero y disponibilidad de lotes">
      Una separación vencida con pago confirmado o pendiente de revisión no puede liberar
      el lote ni anular dinero automáticamente. Debe resolverse formalmente por las áreas
      Comercial y Finanzas, con evidencia y trazabilidad.
    </Alert>
    <Card>
      <CardHeader title="Separaciones con plazo vencido"
        description="Diagnóstico de reservas aún registradas como Pendiente o Vigente, con evidencia de pagos."
        actions={<Button variant="secondary" icon={RefreshCwIcon}
          disabled={loading} onClick={()=>setRevision(n=>n+1)}>Actualizar</Button>}/>
      {error&&<div className="p-4"><Alert tone="danger" title="Error al consultar separaciones">{error}</Alert></div>}
      {loading&&<p className="p-5 text-sm text-brand-500">Consultando separaciones vencidas…</p>}
      {!loading&&!error&&datos?.items.length===0&&
        <EmptyState title="Sin reservas vencidas" description="No existen separaciones abiertas fuera de plazo."/>}
      {!loading&&!error&&Boolean(datos?.items.length)&&<div className="overflow-x-auto">
        <Table head={<>
          <TH>Reserva</TH><TH>Proyecto / lote</TH><TH>Venció</TH>
          <TH>Estado registrado</TH><TH align="right">Monto separación</TH>
          <TH align="right">Pago confirmado</TH><TH>Revisión</TH>
        </>}>
          {datos?.items.map(item=><TR key={item.idReserva}>
            <TD className="whitespace-nowrap font-semibold text-brand-900">{item.codigo}</TD>
            <TD className="min-w-[200px]">{item.proyecto}
              <span className="block font-mono text-xs font-semibold text-brand-700">{item.codigoLote}</span>
              <span className="block text-xs text-brand-500">Lote: {item.estadoLote}</span>
            </TD>
            <TD className="whitespace-nowrap text-red-700">{fecha(item.fechaVencimiento)}</TD>
            <TD>{item.estadoReserva}</TD>
            <TD align="right" className="whitespace-nowrap">{currency(item.montoReserva)}</TD>
            <TD align="right" className="whitespace-nowrap">{currency(item.montoConfirmado)}</TD>
            <TD>
              {item.requiereRevision?
                <span className="inline-flex rounded-md border border-amber-200 bg-amber-50 px-2 py-1 text-xs font-semibold text-amber-800">
                  Retenida · requiere revisión
                </span>:
                <span className="text-xs text-brand-600">Sin pagos activos; pendiente de regularización</span>}
              {item.pagosEnRevision>0&&<p className="mt-1 text-xs text-amber-800">
                {item.pagosEnRevision} pago(s) en revisión
              </p>}
            </TD>
          </TR>)}
        </Table>
      </div>}
    </Card>
  </div>;
}
