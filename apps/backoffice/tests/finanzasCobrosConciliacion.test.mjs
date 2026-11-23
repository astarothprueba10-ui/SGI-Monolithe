import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (p) => readFileSync(new URL(p,import.meta.url),'utf8');
const panel=read('../src/components/finance/CobrosVentasPendientesPanel.tsx');
const reservas=read('../src/components/finance/ReservasVencidasPanel.tsx');
const page=read('../src/pages/Finance.tsx');
const api=read('../src/services/crmBackend.ts');
const ctrl=read('../../../services/core-service/src/main/java/monolithe/core_service/controller/CrmVentaController.java');
const srv=read('../../../services/core-service/src/main/java/monolithe/core_service/service/CrmVentaService.java');
const fin136=read('../../../database/migrations/136_fin_revision_documental_cobros_venta_v1.sql');
const fin137=read('../../../database/migrations/137_fin_conciliacion_cobros_venta_v1.sql');
const fin138=read('../../../database/migrations/138_fin_bandejas_lectura_cobros_reservas_v1.sql');

test('Finanzas exige dos decisiones independientes y muestra evidencia segura',()=>{
  assert.match(page,/reservas_vencidas/);
  assert.match(panel,/revisados\.includes\(seleccion\.idVenta\)/);
  assert.match(panel,/crmBackend\.revisarComprobanteVenta/);
  assert.match(panel,/crmBackend\.conciliarCobroVenta/);
  assert.match(panel,/cuentas\.cuentas\.length===0/);
  assert.match(panel,/No existe una cuenta receptora real habilitada/);
  assert.match(panel,/window\.open\('about:blank','_blank'\)/);
  assert.match(api,/obtenerComprobanteVentaFinanzas/);
  assert.match(api,/\/crm\/finanzas\/ventas\/\$\{idVenta\}\/conciliar/);
  assert.match(ctrl,/hasAuthority\('finance.view'\) and hasAuthority\('finance.edit'\)/);
  assert.match(srv,/sp_fin_conciliar_cobro_venta_v1/);
});

test('SQL preserva auditoría, segregación de funciones y coherencia bancaria',()=>{
  assert.match(fin136,/fin_revisiones_comprobantes_venta_v1/);
  assert.match(fin136,/ENABLE ROW LEVEL SECURITY/);
  assert.match(fin136,/p_actor=v_m\.id_usuario_registro/);
  assert.match(fin136,/dineroConfirmado',FALSE/);
  assert.match(fin136,/comprobantes requieren desglose/);
  assert.match(fin137,/v_cta\.codigo_cuenta ILIKE 'DEMO-%'/);
  assert.match(fin137,/p_actor=v_m\.id_usuario_registro/);
  assert.match(fin137,/REFERENCIA_DUPLICADA/);
  assert.match(fin137,/INSERT INTO public\.pag_pagos/);
  assert.match(fin137,/INSERT INTO public\.pag_vouchers/);
  assert.match(fin137,/INSERT INTO public\.fin_movimientos/);
  assert.match(fin137,/sp_fin_aplicar_pago_confirmado_v1/);
  assert.match(fin138,/sp_fin_cuentas_venta_receptoras_v1/);
  assert.match(fin138,/sp_fin_reservas_vencidas_revision_v1/);
  assert.match(reservas,/no puede liberar/);
  assert.doesNotMatch(reservas,/sp_caducar_separaciones_vencidas\(/);
});
