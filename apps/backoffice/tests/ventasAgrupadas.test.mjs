import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const src=(p)=>readFileSync(new URL(p,import.meta.url),'utf8');

const panel=src('../src/components/sales/OperacionesAgrupadasPanel.tsx');
const sales=src('../src/pages/Sales.tsx');
const api=src('../src/services/crmBackend.ts');
const ctl=src('../../../services/core-service/src/main/java/monolithe/core_service/controller/CrmVentaController.java');
const db143=src('../../../database/migrations/143_ventas_operaciones_agrupadas_v1.sql');
const db144=src('../../../database/migrations/144_ventas_negociaciones_detalle_etapa_v1.sql');

test('Ventas expone expediente agrupado con varios lotes y modalidades por lote',()=>{
 assert.match(sales,/id: 'Agrupadas'/);
 assert.match(sales,/<OperacionesAgrupadasPanel/);
 assert.match(panel,/Planificar compra de varios lotes/);
 assert.match(panel,/idLote:lot\.idLote/);
 assert.match(panel,/modalidad,?/);
 assert.match(panel,/items\.length<2/);
 assert.match(panel,/coreService\.getCommercializableLots/);
 assert.match(panel,/setOrigenPlano|onPrepararVenta/);
 assert.match(api,/crearOperacionAgrupada:/);
 assert.match(api,/listarOperacionesAgrupadas:/);
 assert.match(api,/vincularVentaAgrupada:/);
 assert.match(ctl,/@PostMapping\("\/ventas\/operaciones-agrupadas"\)/);
});

test('Backend preserva identidad, cartera, contrato y financiamiento individual',()=>{
 assert.match(db143,/id_persona BIGINT NOT NULL REFERENCES public\.core_personas/);
 assert.match(db143,/CONSTRAINT ux_ven_operaciones_lote_grupo UNIQUE/);
 assert.match(db143,/id_venta BIGINT UNIQUE REFERENCES public\.ven_ventas/);
 assert.match(db143,/public\.fn_crm_puede_consultar_prospecto/);
 assert.match(db143,/CLIENTE_NO_COINCIDE/);
 assert.match(db143,/LOTE_NO_COINCIDE/);
 assert.match(db143,/VENTA_EXISTENTE/);
 assert.match(db143,/RESERVA_AJENA/);
 assert.match(db143,/ENABLE ROW LEVEL SECURITY/);
 assert.match(db143,/REVOKE ALL ON FUNCTION/);
 assert.match(db144,/idEtapa',mz\.id_etapa/);
 assert.doesNotMatch(db143,/INSERT INTO public\.pag_pagos/);
 assert.doesNotMatch(db143,/INSERT INTO public\.ven_ventas\b/);
});
