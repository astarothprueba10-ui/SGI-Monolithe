// Sprint 4 - Backoffice Finance/Financing wiring regression.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const read=(p)=>readFileSync(new URL(p,import.meta.url),'utf8');

test('Finanzas removes demo financial data and uses real movements',()=>{
  const finance=read('../src/pages/Finance.tsx');
  for(const symbol of ['FINANCE_ENTRIES','CASHFLOW','RECEIVABLES','data/finance','data/financing'])
    assert.ok(!finance.includes(symbol),symbol);
  assert.match(finance,/listarMovimientosFinanzasReal/);
  assert.match(finance,/VouchersCuotasPanel/);
  assert.match(finance,/AplicacionesPagosPanel/);
  assert.match(finance,/ConciliacionIntegralPanel/);
  assert.doesNotMatch(finance,/Nuevo movimiento|Ingresos vs\. egresos/);
});

test('Financiamiento lists real plans, balances and installments with no duplicate voucher section',()=>{
  const financing=read('../src/pages/Financing.tsx');
  const cartera=read('../src/components/financing/CarteraFinanciamientoPanel.tsx');
  assert.match(financing,/CarteraFinanciamientoPanel/);
  assert.match(financing,/AlertasCuotasPanel/);
  assert.match(financing,/RevisionClausulaPanel/);
  for(const symbol of ['FINANCING_PLANS','INSTALLMENTS','financingService','VouchersCuotasPanel','demo'])
    assert.ok(!financing.includes(symbol),symbol);
  assert.match(cartera,/listarCarteraFinancieraReal/);
  assert.match(cartera,/saldoFinanciamiento/);
  assert.match(cartera,/inicialPorConciliar/);
  assert.match(cartera,/cuotasExigibles/);
});

test('API endpoints enforce JWT permissions, SQL actor guards and no public EXECUTE',()=>{
  const controller=read('../../../services/core-service/src/main/java/monolithe/core_service/controller/CrmVentaController.java');
  const service=read('../../../services/core-service/src/main/java/monolithe/core_service/service/CrmVentaService.java');
  const migration=read('../../../database/migrations/102_finanzas_cartera_movimientos_reales_v1.sql');
  const fix=read('../../../database/migrations/103_finanzas_busqueda_movimientos_consistente_v1.sql');
  assert.match(controller,/GetMapping\("\/financiamiento\/cartera"\)[\s\S]*?hasAuthority\('financing\.view'\) and hasAuthority\('sales\.view'\)/);
  assert.match(controller,/GetMapping\("\/finanzas\/movimientos"\)[\s\S]*?hasAuthority\('finance\.view'\)/);
  assert.match(controller,/carteraFinancieraReal\(obtenerActor\(jwt\)/);
  assert.match(controller,/movimientosFinancierosReales\(obtenerActor\(jwt\)/);
  assert.match(service,/sp_fin_cartera_backoffice_v1/);
  assert.match(service,/sp_fin_movimientos_backoffice_v1/);
  assert.match(migration,/sp_crm_saldo_venta_v1\(p_actor,v_fila\.id_venta\)/);
  assert.match(migration,/sp_crm_cronograma_venta_v4\(p_actor,v_fila\.id_venta\)/);
  assert.match(migration,/fn_crm_puede_consultar_venta_v1\(p_actor,v\.id_venta\)/);
  assert.match(migration,/FROM PUBLIC,anon,authenticated/);
  assert.match(migration,/TO sigi_app_user/);
  assert.match(fix,/LEFT JOIN public\.ven_ventas v ON v\.id_venta=p\.id_venta/);
});

test('Backend financial data is reached through Core API only',()=>{
  const api=read('../src/services/crmBackend.ts');
  assert.match(api,/\/crm\/financiamiento\/cartera/);
  assert.match(api,/\/crm\/finanzas\/movimientos/);
  const panel=read('../src/components/financing/CarteraFinanciamientoPanel.tsx');
  for(const symbol of ['supabase.rpc','service_role','getInstallments(2)'])
    assert.ok(!panel.includes(symbol),symbol);
});
