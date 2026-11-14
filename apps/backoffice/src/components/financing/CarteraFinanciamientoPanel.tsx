import { useEffect, useState } from 'react';
import { RefreshCwIcon } from 'lucide-react';
import { crmBackend, type CrmCarteraReal, type CrmPlanCarteraReal, type CrmCuotaCarteraReal } from '../../services/crmBackend';
import { Card, CardHeader } from '../ui/Card';
import { Tabs } from '../ui/Tabs';
import { Table, TD, TH, TR } from '../ui/Table';
import { SearchInput } from '../ui/Field';
import { Alert, EmptyState } from '../ui/Feedback';
import { Button } from '../ui/Button';
import { currency } from '../../utils/format';

const money = (v: number | null | undefined) => currency(Number(v ?? 0));
const planLabel = (code: string) => code === 'ACTIVO' ? 'Activo' :
  code === 'PENDIENTE' ? 'Pendiente de firma' : code === 'COMPLETADO' ? 'Completado' : code;
const dateLabel = (v: string | null) => v
  ? new Date(`${v}T12:00:00`).toLocaleDateString('es-PE') : '—';

export function CarteraFinanciamientoPanel() {
  const [vista,setVista] = useState<'PLANES'|'CUOTAS'>('PLANES');
  const [buscar,setBuscar] = useState('');
  const [consulta,setConsulta] = useState('');
  const [pagina,setPagina] = useState(1);
  const [revision,setRevision] = useState(0);
  const [datos,setDatos] = useState<CrmCarteraReal | null>(null);
  const [cargando,setCargando] = useState(true);
  const [error,setError] = useState<string | null>(null);

  useEffect(() => {
    const timer=window.setTimeout(() => {setPagina(1);setConsulta(buscar);},350);
    return () => window.clearTimeout(timer);
  },[buscar]);

  useEffect(() => {
    let vigente=true;
    setCargando(true);
    setError(null);
    void crmBackend.listarCarteraFinancieraReal({vista,busqueda:consulta,pagina,tamano:20})
      .then(r => {if(vigente) setDatos(r);})
      .catch(e => {if(vigente) {setDatos(null);setError(e instanceof Error?e.message:'No pudimos consultar la cartera.');}})
      .finally(() => {if(vigente)setCargando(false);});
    return () => {vigente=false;};
  },[vista,consulta,pagina,revision]);

  const resumen=datos?.resumen;
  const planes=vista==='PLANES' ? (datos?.items ?? []) as CrmPlanCarteraReal[] : [];
  const cuotas=vista==='CUOTAS' ? (datos?.items ?? []) as CrmCuotaCarteraReal[] : [];

  return <section className="space-y-4" aria-label="Cartera financiera de ventas reales">
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
      {[
        {nombre:'Planes financiados',valor:String(resumen?.planes??'—')},
        {nombre:'Capital financiado activo',valor:resumen?money(resumen.capitalFinanciadoActivo):'—'},
        {nombre:'Saldo de cuotas por cobrar',valor:resumen?money(resumen.saldoCuotas):'—'},
        {nombre:'Inicial por conciliar',valor:resumen?money(resumen.inicialPorConciliar):'—'},
        {nombre:'Cuotas vencidas con saldo',valor:resumen?money(resumen.montoVencido):'—'}
      ].map(k=><Card key={k.nombre} className="p-4">
        <p className="text-xs text-brand-500">{k.nombre}</p>
        <p className="mt-2 text-lg font-semibold tabular-nums text-brand-900">{k.valor}</p>
      </Card>)}
    </div>
    <Alert tone="info" title="Cartera real · saldos provenientes de pagos aplicados">
      Los contratos pendientes de firma no generan cuotas exigibles. La inicial adicional
      pendiente figura por conciliar y no equivale automáticamente a mora.
      La reserva acreditada no se descuenta dos veces.
    </Alert>
    <Card>
      <CardHeader title="Planes y cuentas por cobrar" description="Consulta de ventas financiadas autorizadas, sin registros de demostración."
        actions={<Button icon={RefreshCwIcon} variant="secondary" onClick={() => setRevision(v=>v+1)} disabled={cargando}>Actualizar</Button>}/>
      <div className="border-b border-brand-100 px-4 py-3">
        <Tabs active={vista} onChange={v => {setVista(v as 'PLANES'|'CUOTAS');setPagina(1);}}
          items={[{id:'PLANES',label:'Planes y saldos',count:resumen?.planes??null},
            {id:'CUOTAS',label:'Cronograma de cuotas',count:resumen?.cuotasExigibles??null}]} />
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
          <SearchInput value={buscar} onValueChange={setBuscar} className="w-full sm:w-80"
            label="Buscar venta o comprador" placeholder="Buscar comprador, lote o contrato…"/>
          {datos && <p className="text-xs text-brand-400">Consulta al {dateLabel(datos.fechaCorte)} · {datos.total} registros en filtro</p>}
        </div>
      </div>
      {error && <div className="m-4"><Alert title="No se pudo cargar la cartera" tone="danger">{error}</Alert></div>}
      {cargando && <p className="p-5 text-sm text-brand-500">Consultando saldos oficiales…</p>}
      {!cargando && !error && datos && datos.total===0 &&
        <EmptyState title="Sin registros en la cartera" description="Prueba otra búsqueda o verifica la formalización de la venta."/>}
      {!cargando && !error && datos && datos.total>0 && (vista==='PLANES' ?
        <div className="overflow-x-auto">
          <Table head={<>
            <TH>Venta / comprador</TH><TH>Plan</TH><TH>Lote</TH>
            <TH align="right">Capital</TH><TH align="right">Saldo cuotas</TH>
            <TH align="right">Inicial por conciliar</TH><TH>Estado</TH>
          </>}>
            {planes.map(p=><TR key={p.idPlanPago}>
              <TD><span className="font-semibold text-brand-900">{p.codigoVenta}</span>
                <span className="mt-0.5 block text-xs text-brand-500">{p.comprador}</span>
                <span className="block text-xs text-brand-400">{p.proyecto}</span></TD>
              <TD><span className="font-medium">{p.numeroCuotas} cuotas</span>
                <span className="block text-xs text-brand-500">{p.codigoPlan} · interés {money(p.interesTotal)}</span></TD>
              <TD>{p.lote}</TD>
              <TD align="right">{money(p.capitalFinanciado)}</TD>
              <TD align="right" className="font-semibold tabular-nums text-brand-900">{p.cuotasExigibles?money(p.saldoFinanciamiento):'No exigible'}</TD>
              <TD align="right">{p.cuotasExigibles?money(p.inicialPorConciliar):'—'}</TD>
              <TD><span className="text-xs font-medium">{planLabel(p.estadoPlan)}</span>
                {!p.cuotasExigibles && <span className="block text-xs text-amber-700">Sin cuotas exigibles</span>}</TD>
            </TR>)}
          </Table>
        </div>
      : <div className="overflow-x-auto">
          <Table head={<>
            <TH>Venta / comprador</TH><TH>Cuota</TH><TH>Vencimiento</TH>
            <TH align="right">Capital</TH><TH align="right">Interés</TH>
            <TH align="right">Importe</TH><TH align="right">Abonado</TH>
            <TH align="right">Saldo</TH><TH>Estado</TH>
          </>}>
            {cuotas.map(c=><TR key={`${c.idPlanPago}-${c.numero}`}>
              <TD><span className="font-semibold">{c.codigoVenta}</span><span className="block text-xs text-brand-500">{c.comprador}</span></TD>
              <TD className="tabular-nums">{c.numero}</TD>
              <TD>{dateLabel(c.fechaVencimiento)}</TD>
              <TD align="right">{money(c.capital)}</TD><TD align="right">{money(c.interes)}</TD>
              <TD align="right">{money(c.montoCuota)}</TD><TD align="right">{money(c.abonadoConfirmado)}</TD>
              <TD align="right" className="font-semibold">{money(c.saldoCuota)}</TD>
              <TD><span className="text-xs">{c.estado}</span>
                {c.cuotaAtrasada && <span className="block text-xs text-rose-600">Atrasada</span>}</TD>
            </TR>)}
          </Table>
        </div>
      )}
      {!cargando && datos && datos.paginas>1 && <div className="flex items-center justify-between border-t border-brand-100 px-5 py-4 text-xs text-brand-500">
        <span>Página {pagina} de {datos.paginas}</span>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="secondary" disabled={pagina<=1} onClick={()=>setPagina(p=>Math.max(1,p-1))}>Anterior</Button>
          <Button size="sm" variant="secondary" disabled={pagina>=datos.paginas} onClick={()=>setPagina(p=>p+1)}>Siguiente</Button>
        </div>
      </div>}
    </Card>
  </section>;
}
