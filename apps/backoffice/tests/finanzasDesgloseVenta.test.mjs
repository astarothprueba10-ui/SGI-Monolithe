import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const src=(p)=>readFileSync(new URL(p,import.meta.url),'utf8');
const panel=src('../src/components/finance/CobrosVentasPendientesPanel.tsx');
const api=src('../src/services/crmBackend.ts');
const ctl=src('../../../services/core-service/src/main/java/monolithe/core_service/controller/CrmVentaController.java');
const sql145=src('../../../database/migrations/145_fin_desglose_comprobantes_venta_v1.sql');
const sql146=src('../../../database/migrations/146_fin_conciliar_comprobante_desglosado_v1.sql');
const sql147=src('../../../database/migrations/147_fin_saldo_por_comprobante_desglosado_v1.sql');

test('Finanzas permite identificar importes y referencias sin crear abonos en fase documental',()=>{
 assert.match(panel,/Guardar distribución de importes/);
 assert.match(panel,/configurarDesgloseVenta/);
 assert.match(panel,/revisarDesgloseVenta/);
 assert.match(panel,/conciliarDesgloseVenta/);
 assert.match(panel,/montoCentavos/);
 assert.match(panel,/revisadosDocumentos\.includes/);
 assert.match(api,/CrmDesgloseComprobanteVenta/);
 assert.match(api,/configurarDesgloseVenta:/);
 assert.match(ctl,/@PutMapping\("\/finanzas\/ventas\/desgloses\/\{idDesglose\}\/revision"\)/);
 assert.match(sql145,/v_total<>v_m\.monto_pendiente_revision/);
 assert.match(sql145,/CANTIDAD_INCORRECTA/);
 assert.match(sql145,/REEMPLAZAR_DESGLOSE/);
 assert.match(sql145,/AUTOAPROBACION_DENEGADA/);
 assert.match(sql145,/REVOKE ALL ON FUNCTION/);
 assert.doesNotMatch(sql145,/INSERT INTO public\.pag_pagos/);
});

test('Conciliación registra una sola operación por evidencia y aplica la inicial al lote',()=>{
 assert.match(sql146,/PAGO_PREEXISTENTE/);
 assert.match(sql146,/REFERENCIA_DUPLICADA/);
 assert.match(sql146,/v_cuenta\.codigo ILIKE 'DEMO-%'/);
 assert.match(sql146,/INSERT INTO public\.pag_pagos/);
 assert.match(sql146,/INSERT INTO public\.pag_vouchers/);
 assert.match(sql146,/INSERT INTO public\.fin_movimientos/);
 assert.match(sql146,/sp_fin_aplicar_pago_confirmado_v1/);
 assert.match(sql146,/UPDATE public\.fin_ventas_desglose_comprobantes_v1/);
 assert.match(sql147,/greatest\(0,m\.monto_pendiente_revision-COALESCE/);
 assert.match(sql147,/comprobantesConciliados/);
 assert.match(sql147,/idDesglose/);
 assert.match(sql147,/WHERE d\.id_venta=v\.id_venta AND d\.estado<>'CONCILIADO'/);
});

test('Gerencia puede reiniciar evidencias no conciliadas sin tocar pagos',()=>{
 const reset=src('../../../database/migrations/148_fin_reiniciar_desglose_auditado_v1.sql');
 assert.match(reset,/sp_fin_reiniciar_desglose_venta_v1/);
 assert.match(reset,/fn_fin_gerencia_configura_cuentas_v1/);
 assert.match(reset,/DINERO_CONFIRMADO/);
 assert.match(reset,/REVOCAR_REVISIONES_SIN_DINERO/);
 assert.match(panel,/Reiniciar revisión de comprobantes \(Gerencia\)/);
 assert.match(panel,/crmBackend\.reiniciarDesgloseVenta/);
 assert.doesNotMatch(reset,/DELETE FROM public\.pag_pagos/);
});
