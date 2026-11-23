import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const leer=(p)=>readFileSync(new URL(p,import.meta.url),'utf8');
const cuentas=leer('../src/components/finance/CuentasReceptorasPanel.tsx');
const cobros=leer('../src/components/finance/CobrosVentasPendientesPanel.tsx');
const finance=leer('../src/pages/Finance.tsx');
const api=leer('../src/services/crmBackend.ts');
const controller=leer('../../../services/core-service/src/main/java/monolithe/core_service/controller/CrmVentaController.java');
const storage=leer('../../../services/core-service/src/main/java/monolithe/core_service/service/CrmSeparacionStorageService.java');
const sql140=leer('../../../database/migrations/140_fin_alta_cuentas_receptoras_gerencia_v1.sql');
const sql141=leer('../../../database/migrations/141_fin_subsanar_venta_sin_comprobante_v1.sql');
const sql142=leer('../../../database/migrations/142_fin_listar_comprobantes_multiples_venta_v1.sql');

test('Cuentas receptoras solo Gerencia con finance.edit y datos protegidos',()=>{
  assert.match(finance,/id:'cuentas_receptoras'/);
  assert.match(finance,/<CuentasReceptorasPanel/);
  assert.match(cuentas,/datos\?\.puedeConfigurar/);
  assert.match(cuentas,/can\('finance.edit'\)/);
  assert.match(cuentas,/confirmacion/);
  assert.match(cuentas,/cuenta es real y está autorizada/);
  assert.match(api,/crearCuentaReceptora:/);
  assert.match(controller,/@PostMapping\("\/finanzas\/ventas\/cuentas-receptoras"\)/);
  assert.match(sql140,/r\.codigo='GERENCIA'/);
  assert.match(sql140,/fn_fin_gerencia_configura_cuentas_v1/);
  assert.match(sql140,/v_numero !~ '\^\[0-9\]\{8,30\}\$'/);
  assert.match(sql140,/CREATE TABLE IF NOT EXISTS public.fin_cuentas_receptoras_auditoria_v1/);
  assert.match(sql140,/ENABLE ROW LEVEL SECURITY/);
  assert.match(sql140,/terminaEn/);
  assert.doesNotMatch(sql140,/GRANT SELECT ON public.fin_cuentas_financieras TO anon/i);
});

test('Subsanación añade evidencia existente en Storage y no acredita dinero',()=>{
  assert.match(cobros,/Adjuntar evidencia faltante/);
  assert.match(cobros,/item.comprobantes===0/);
  assert.match(cobros,/subirComprobanteFaltanteVenta/);
  assert.match(api,/subirComprobanteFaltanteVenta/);
  assert.match(api,/uploadToSignedUrl/);
  assert.match(api,/\/crm\/finanzas\/ventas\/subsanacion\/confirmar/);
  assert.match(controller,/@PostMapping\("\/finanzas\/ventas\/subsanacion\/confirmar"\)/);
  assert.match(storage,/prepararCargaSubsanacionVenta/);
  assert.match(storage,/firma\.maxBytes\(\),900/);
  assert.match(sql141,/ven_ventas_comprobantes/);
  assert.match(sql141,/fin_cargas_subsanacion_venta_v1/);
  assert.match(sql141,/v_pre\.id_actor<>p_actor/);
  assert.match(sql141,/storage\.objects/);
  assert.match(sql141,/v_estado<>'PENDIENTE'/);
  assert.match(sql141,/dineroConfirmado',FALSE/);
  assert.match(sql141,/REVOKE ALL ON FUNCTION/);
  assert.doesNotMatch(sql141,/UPDATE public\.pag_pagos/);
});

test('Comprobantes múltiples se pueden ver pero no atribuir a un pago único',()=>{
  assert.match(cobros,/Gestionar \{item\.comprobantes\} comprobantes/);
  assert.match(cobros,/archivosAbiertos\?\.archivos\.map/);
  assert.match(cobros,/Requiere desglose por importe y transferencia/);
  assert.match(cobros,/No se permite atribuir el mismo abono bancario a varios contratos/);
  assert.match(sql142,/jsonb_agg\(jsonb_build_object/);
  assert.match(sql142,/idComprobante/);
  assert.match(sql142,/REVOKE ALL ON FUNCTION/);
  assert.doesNotMatch(sql142,/INSERT INTO public\.pag_pagos/);
});
