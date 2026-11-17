import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const read = (path) => readFileSync(new URL(path, import.meta.url), 'utf8');

test('política de referencia versionada protege tablas y bloquea alteraciones históricas', () => {
  const sql = read('../../../database/migrations/106_financiamiento_politicas_versionadas_v1.sql');
  assert.match(sql, /CREATE TABLE public\.cfg_fin_politicas_versiones/);
  assert.match(sql, /CREATE TABLE public\.cfg_fin_politica_activa/);
  assert.match(sql, /BEFORE UPDATE OR DELETE ON public\.cfg_fin_politicas_versiones/);
  assert.match(sql, /POLITICA_INMUTABLE/);
  assert.match(sql, /ENABLE ROW LEVEL SECURITY/g);
  assert.match(sql, /REVOKE ALL ON TABLE[\s\S]*FROM PUBLIC,anon,authenticated,service_role,sigi_app_user/);
  assert.match(sql, /REVOKE ALL ON FUNCTION public\.sp_fin_consultar_politicas_v1\(bigint\)[\s\S]*FROM PUBLIC,anon,authenticated,service_role/);
  assert.match(sql, /GRANT EXECUTE ON FUNCTION public\.sp_fin_consultar_politicas_v1\(bigint\) TO sigi_app_user/);
  assert.match(sql, /'financing\.configure'/);
  assert.match(sql, /r\.codigo='GERENCIA'/);
  assert.match(sql, /fn_usuario_tiene_permiso_seguridad\(p_actor,'financing\.configure'/);
  assert.match(sql, /'publicacionHabilitada',false/);
  assert.match(sql, /'requiereTotp',true/);
});

test('la política inicial reproduce la operación de financiamiento actual', () => {
  const sql = read('../../../database/migrations/106_financiamiento_politicas_versionadas_v1.sql');
  assert.match(sql, /'GENERAL',1,500\.00,'MINIMA',5000\.00,NULL,NULL,/);
  assert.match(sql, /10\.0000,1,36,7,'FRANCES','PEN'/);
  assert.match(sql, /ck_fin_modalidad_inicial/);
  assert.match(sql, /ck_fin_rango_cuotas/);
  assert.match(sql, /CHECK \(tasa_nominal_anual_pct BETWEEN 0 AND 100\)/);
});

test('Core exige autoridad en JWT y revalida actor contra la política SQL', () => {
  const controller = read('../../../services/core-service/src/main/java/monolithe/core_service/controller/CrmVentaController.java');
  const service = read('../../../services/core-service/src/main/java/monolithe/core_service/service/CrmVentaService.java');
  assert.match(controller, /GetMapping\("\/financiamiento\/configuracion\/actual"\)/);
  assert.match(controller, /PreAuthorize\("hasAuthority\('financing\.configure'\)"\)/);
  assert.match(controller, /consultarPoliticasFinanciamiento\(obtenerActor\(jwt\)\)/);
  assert.match(service, /sp_fin_consultar_politicas_v1\(CAST\(\? AS bigint\)\)/);
  assert.doesNotMatch(controller, /@PostMapping\("\/financiamiento\/configuracion/);
  assert.doesNotMatch(controller, /@PatchMapping\("\/financiamiento\/configuracion/);
});

test('tercera pestaña solo visible para Gerencia con permiso y solo permite lectura', () => {
  const parent = read('../src/components/financing/CarteraFinanciamientoPanel.tsx');
  const panel = read('../src/components/financing/ConfiguracionPlanesFinanciamientoPanel.tsx');
  const api = read('../src/services/financingConfigService.ts');
  assert.match(parent, /can\('financing\.configure'\) && user\.roles\.includes\('Gerencia'\)/);
  assert.match(parent, /tabUrl === 'configuracion' && puedeConfigurar/);
  assert.match(parent, /tab === 'CONFIGURACION' && !puedeConfigurar/);
  assert.match(parent, /Configuración de planes de financiamiento/);
  assert.match(parent, /vista === 'CONFIGURACION' && puedeConfigurar/);
  assert.match(panel, /financingConfigService\.obtenerPoliticaActual\(\)/);
  assert.match(panel, /Configuración en modo consulta/);
  assert.match(panel, /Historial de versiones/);
  assert.match(panel, /TOTP/);
  assert.match(api, /coreApi\.get<PoliticaFinanciamientoActual>/);
  assert.doesNotMatch(api, /coreApi\.(post|put|patch|delete)/);
});

test('otras pestañas, exportación y filtros anteriores se conservan', () => {
  const panel = read('../src/components/financing/CarteraFinanciamientoPanel.tsx');
  assert.match(panel, /id: 'PLANES', label: 'Planes y saldos'/);
  assert.match(panel, /id: 'ALERTAS', label: 'Alertas de cuotas Vencidas'/);
  assert.match(panel, /consultarReporteFinanciero/);
  assert.match(panel, /PlanFinanciamientoDetalleModal/);
  assert.match(panel, /FiltrosCarteraFinanciera/);
  assert.match(panel, /Pagination/);
});
