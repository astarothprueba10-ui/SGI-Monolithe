// Funcionalidad de financiamiento por período y cronograma individual.
// Estas pruebas impiden volver a mezclar saldos históricos y registros ficticios.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=(name)=>readFileSync(new URL(name,import.meta.url),'utf8');

test('reutiliza el filtro global de CRM y comienza en MES',()=>{
  const panel=read('../src/components/financing/CarteraFinanciamientoPanel.tsx');
  const periodo=read('../src/components/crm/CrmPeriodoGlobal.tsx');
  const utility=read('../src/utils/crmPeriodo.ts');
  assert.match(panel,/CrmPeriodoGlobal/);
  assert.match(panel,/calcularRangoCrm/);
  assert.match(panel,/useState<PeriodoCrmModo>\('MES'\)/);
  assert.match(panel,/getPeruTodayDateString/);
  assert.match(periodo,/Hoy/);
  assert.match(periodo,/Semana/);
  assert.match(periodo,/Mes/);
  assert.match(periodo,/Año/);
  assert.match(periodo,/Rango/);
  assert.match(utility,/America|05:00/);
  assert.match(panel,/desde:rango\.desde,hastaExclusivo:rango\.hastaExclusivo/);
});

test('el periodo limita los planes y los KPI son de saldos vigentes de ventas del periodo',()=>{
  const sql=read('../../../database/migrations/104_financiamiento_cartera_filtro_periodo_v2.sql');
  const service=read('../../../services/core-service/src/main/java/monolithe/core_service/service/CrmVentaService.java');
  const ctr=read('../../../services/core-service/src/main/java/monolithe/core_service/controller/CrmVentaController.java');
  const api=read('../src/services/crmBackend.ts');
  assert.match(sql,/sp_fin_cartera_backoffice_v2/);
  assert.match(sql,/coalesce\(v\.fecha_venta,v\.fecha_creacion\) >= p_desde/);
  assert.match(sql,/coalesce\(v\.fecha_venta,v\.fecha_creacion\) < p_hasta_exclusivo/);
  assert.match(sql,/'saldoBase','SALDO_ACTUAL'/);
  assert.match(sql,/sp_crm_saldo_venta_v1/);
  assert.match(sql,/fn_crm_puede_consultar_venta_v1/);
  assert.match(sql,/REVOKE ALL.*FROM PUBLIC,anon,authenticated/);
  assert.match(sql,/GRANT EXECUTE.*TO sigi_app_user/);
  assert.match(ctr,/hasAuthority\('financing\.view'\) and hasAuthority\('sales\.view'\)/);
  assert.match(ctr,/RequestParam\(required = true\) String desde/);
  assert.match(service,/OffsetDateTime\.parse\(desde\)/);
  assert.match(service,/sp_fin_cartera_backoffice_v2/);
  assert.match(api,/hastaExclusivo:params\.hastaExclusivo/);
});

test('planes y cronograma se unifican: tabla con nueve columnas y detalle por venta',()=>{
  const panel=read('../src/components/financing/CarteraFinanciamientoPanel.tsx');
  const modal=read('../src/components/financing/PlanFinanciamientoDetalleModal.tsx');
  assert.match(panel,/id:'PLANES',label:'Planes y saldos'/);
  assert.match(panel,/id:'ALERTAS',label:'Alertas de cuotas Vencidas'/);
  assert.doesNotMatch(panel,/id:'CUOTAS'/);
  for(const h of ['Venta y comprador','Precio base','Inicial','Capital financiado','Interés','Saldo','Estado','Ver cronograma'])assert.ok(panel.includes(h),h);
  assert.match(panel,/Table head=/);
  assert.match(panel,/PlanFinanciamientoDetalleModal/);
  assert.match(modal,/crmBackend\.obtenerCronogramaVenta\(plan\.idVenta\)/);
  assert.match(modal,/crmBackend\.obtenerSaldoVenta\(plan\.idVenta\)/);
  assert.match(modal,/Con saldo pendiente/);
  assert.match(modal,/Todas/);
  assert.match(modal,/c\.estadoCalculado/);
  assert.match(modal,/c\.cuotaAtrasada/);
  assert.match(modal,/overflow-hidden/);
  assert.match(modal,/Table className=/);
  assert.match(modal,/cuotasVisibles\.map/);
});

test('las tablas y los KPI se adaptan y representan importes sin redondeo',()=>{
  const panel=read('../src/components/financing/CarteraFinanciamientoPanel.tsx');
  const modal=read('../src/components/financing/PlanFinanciamientoDetalleModal.tsx');
  const money=read('../src/utils/financeMoney.ts');
  const table=read('../src/components/ui/Table.tsx');
  assert.match(panel,/KpiCard/);
  assert.match(panel,/sm:grid-cols-2 xl:grid-cols-5/);
  assert.match(panel,/sm:hidden/);
  assert.match(table,/overflow-x-auto/);
  assert.match(modal,/max-w-6xl/);
  assert.match(money,/minimumFractionDigits: 2/);
  assert.match(money,/maximumFractionDigits: 2/);
});
