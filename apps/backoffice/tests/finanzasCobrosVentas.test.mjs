import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const page=readFileSync(new URL('../src/pages/Finance.tsx',import.meta.url),'utf8');
const panel=readFileSync(new URL('../src/components/finance/CobrosVentasPendientesPanel.tsx',import.meta.url),'utf8');
const api=readFileSync(new URL('../src/services/crmBackend.ts',import.meta.url),'utf8');
const backend=readFileSync(new URL('../../../services/core-service/src/main/java/monolithe/core_service/controller/CrmVentaController.java',import.meta.url),'utf8');
const db=readFileSync(new URL('../../../database/migrations/135_fin_cobros_pendientes_alias_paginacion.sql',import.meta.url),'utf8');

test('Finanzas muestra bandeja protegida de cobros pendientes',()=>{
  assert.match(page,/id:'cobros_ventas'/);
  assert.match(page,/Gate permission="finance.view"><CobrosVentasPendientesPanel/);
  assert.match(panel,/Aprobar soporte/);
  assert.match(panel,/Conciliar/);
  assert.match(panel,/Soporte aprobado/);
  assert.match(api,/listarCobrosVentasPendientes/);
  assert.match(api,/\/crm\/finanzas\/ventas\/cobros-pendientes/);
  assert.match(backend,/hasAuthority\('finance.view'\)/);
});
test('la consulta no confirma ni aplica dinero y no se expone al navegador',()=>{
  assert.match(db,/sp_fin_ventas_cobros_pendientes_v1/);
  assert.match(db,/m.estado_revision='PENDIENTE'/);
  assert.match(db,/FROM pagina pg/);
  assert.match(db,/REVOKE ALL ON FUNCTION/);
  assert.doesNotMatch(db,/INSERT INTO public.pag_pagos/);
  assert.doesNotMatch(db,/UPDATE public.ven_ventas_medios_pago/);
});
