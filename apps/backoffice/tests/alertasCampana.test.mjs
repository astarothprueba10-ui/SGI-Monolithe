// QA estructural: alertas financieras visibles solo para usuarios autorizados.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=(path)=>readFileSync(new URL(path,import.meta.url),'utf8');

test('alertas mantienen su pestaña propia sin bloques independientes ni nota azul',()=>{
  const cartera=read('../src/components/financing/CarteraFinanciamientoPanel.tsx');
  const financing=read('../src/pages/Financing.tsx');
  assert.match(cartera,/id:\s*'ALERTAS'\s*,\s*label:\s*'Alertas de cuotas Vencidas'/);
  assert.match(cartera,/searchParams\.get\(\s*'tab'\s*\)\s*===\s*'alertas'/);
  assert.match(cartera,/<AlertasCuotasPanel\s*\/>/);
  assert.match(cartera,/<RevisionClausulaPanel\s*\/>/);
  assert.doesNotMatch(cartera,/Cartera real · saldos provenientes de pagos aplicados/);
  assert.doesNotMatch(financing,/\<AlertasCuotasPanel/);
  assert.doesNotMatch(financing,/\<RevisionClausulaPanel/);
});

test('campana muestra cuotas reales, no notificaciones de demostración',()=>{
  const data=read('../src/data/notifications.ts');
  const header=read('../src/components/layout/Header.tsx');
  const hook=read('../src/hooks/useFinanceAlertsBell.ts');
  assert.doesNotMatch(data,/export const NOTIFICATIONS|Las Palmeras|Vista Alegre|Hace 40 min|6 vouchers en revisión/);
  assert.match(data,/notificationFromFinancialAlert\(a: CrmAlertaCuota\)/);
  assert.match(data,/cuota:\$\{a\.idCuota\}:\$\{a\.tipoAlerta\}/);
  assert.match(header,/useFinanceAlertsBell\(\)/);
  assert.match(header,/unreadCount/);
  assert.match(header,/markSeen\(\[n\.id\]\)/);
  assert.match(header,/navigate\(n\.to\)/);
  assert.match(data,/financiamiento\?tab=alertas/);
  assert.match(hook,/crmBackend\.listarAlertasCuotas/);
  assert.match(hook,/tipo:'TODAS'/);
  assert.match(hook,/p_pagina|pagina:1|pagina,tamano:PAGINA_TAMANO/);
  assert.match(hook,/can\('financing\.view'\) && can\('sales\.view'\)/);
  assert.match(hook,/setInterval/);
  assert.match(hook,/visibilitychange/);
  assert.match(hook,/window\.addEventListener\('focus'/);
  assert.match(hook,/seenKey = \(userId: string\)/);
  assert.match(hook,/filter\(id=>valid\.has\(id\)\)/);
});

test('recarga manual sincroniza alerta visible con campana',()=>{
  const alertas=read('../src/components/financing/AlertasCuotasPanel.tsx');
  const bell=read('../src/hooks/useFinanceAlertsBell.ts');
  assert.match(alertas,/dispatchEvent\(new Event\('sgi:financiamiento-alertas-actualizadas'\)\)/);
  assert.match(bell,/addEventListener\('sgi:financiamiento-alertas-actualizadas'/);
});

test('servidor exige permisos y limita alertas a la cartera del JWT',()=>{
  const ctrl=read('../../../services/core-service/src/main/java/monolithe/core_service/controller/CrmVentaController.java');
  const svc=read('../../../services/core-service/src/main/java/monolithe/core_service/service/CrmVentaService.java');
  assert.match(ctrl,/GetMapping\("\/financiamiento\/alertas"\)/);
  assert.match(ctrl,/PreAuthorize\("hasAuthority\('sales\.view'\)"\)/);
  assert.match(ctrl,/service\.alertasCuotas\(obtenerActor\(jwt\)/);
  assert.match(svc,/sp_fin_alertas_cuotas_v1/);
});
