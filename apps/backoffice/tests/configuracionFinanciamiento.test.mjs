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
  assert.match(parent, /const puedeConfigurar = user\.roles\.includes\('Gerencia'\)/);
  assert.match(parent, /const permisoConfiguracionVigente = can\('financing\.configure'\)/);
  assert.match(parent, /Actualiza tu sesión de Gerencia/);
  assert.match(parent, /tabUrl === 'configuracion' && puedeConfigurar/);
  assert.match(parent, /tab === 'CONFIGURACION' && !puedeConfigurar/);
  assert.match(parent, /Configuración de planes de financiamiento/);
  assert.match(parent, /vista === 'CONFIGURACION' && puedeConfigurar/);
  assert.match(panel, /financingConfigService\.obtenerPoliticaActual\(\)/);
  assert.match(panel, /Versión actual/);
  assert.match(panel, /Versión vigente|Vigente/);
  assert.match(panel, /HistorialPoliticasFinancierasPanel/);
  assert.match(panel, /SeguridadFinancieraTotpPanel/);
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


test('bloque 2 congela política por separación, venta y plan sin reescribir históricos', () => {
  const sql = read('../../../database/migrations/107_financiamiento_snapshots_operaciones_v1.sql');
  for (const table of ['ven_reservas', 'ven_ventas', 'pag_planes_pago']) {
    assert.match(sql, new RegExp('ALTER TABLE public\\.' + table));
    assert.match(sql, new RegExp('trg_fin_' + (
      table === 'ven_reservas' ? 'reserva' : table === 'ven_ventas' ? 'venta' : 'plan'
    ) + '_condiciones'));
  }
  assert.match(sql, /politica_financiera_snapshot jsonb/);
  assert.match(sql, /POLITICA_INMUTABLE/);
  assert.match(sql, /fn_fin_politica_para_venta_v1/);
  assert.match(sql, /version=1/);
  assert.match(sql, /fn_fin_politica_activa_v1/);
  assert.match(sql, /sp_fin_terminos_operacion_v1/);
  assert.match(sql, /fn_crm_puede_consultar_prospecto/);
  assert.match(sql, /GRANT EXECUTE ON FUNCTION public\.sp_fin_terminos_operacion_v1/);
});

test('simulación parametrizada respeta la tasa nominal, inicial y última cuota', () => {
  const sql = read('../../../database/migrations/108_financiamiento_simulacion_politica_v1.sql');
  const precision = read('../../../database/migrations/109_financiamiento_precision_interes_v1.sql');
  assert.match(sql, /fn_fin_simular_frances_politica_v1/);
  assert.match(sql, /modo_inicial/);
  assert.match(sql, /tasa_nominal_anual_pct/);
  assert.match(sql, /IF v_tasa=0 THEN/);
  assert.match(sql, /v_i=p_cuotas THEN/);
  assert.match(sql, /fechaVencimiento/);
  assert.match(precision, /v_saldo\*p\.tasa_nominal_anual_pct\/1200/);
});

test('registro, firma y confirmación exigen la versión de la operación, no la política nueva', () => {
  const integration = read('../../../database/migrations/110_financiamiento_integracion_transaccional_v1.sql');
  const acceptance = read('../../../database/migrations/111_financiamiento_confirmar_version_aceptada_v1.sql');
  assert.match(integration, /sp_crm_registrar_separacion_v2/);
  assert.match(integration, /dias_vencimiento_separacion/);
  assert.match(integration, /sp_crm_validar_formalizacion_v10/);
  assert.match(integration, /fn_fin_simular_frances_politica_v1/);
  assert.match(integration, /sp_crm_registrar_venta_pendiente_v10/);
  assert.match(integration, /FRANCES_POLITICA_V/);
  assert.match(integration, /sp_crm_aprobar_firma_contrato_v8/);
  assert.match(integration, /id_politica_financiera/);
  assert.match(acceptance, /idPoliticaEsperada/);
  assert.match(acceptance, /POLITICA_CAMBIO/);
  assert.match(acceptance, /FOR SHARE/);
});

test('formulario usa términos autorizados por comprador y lote', () => {
  const controller = read('../../../services/core-service/src/main/java/monolithe/core_service/controller/CrmVentaController.java');
  const service = read('../../../services/core-service/src/main/java/monolithe/core_service/service/CrmVentaService.java');
  const api = read('../src/services/crmBackend.ts');
  const sales = read('../src/pages/Sales.tsx');
  const simulator = read('../src/utils/financiamientoFrances.ts');
  assert.match(controller, /GetMapping\("\/financiamiento\/condiciones-venta"\)/);
  assert.match(controller, /hasAuthority\('sales\.create'\)/);
  assert.match(service, /sp_fin_terminos_operacion_v1/);
  assert.match(api, /obtenerCondicionesVenta/);
  assert.match(sales, /crmBackend\.obtenerCondicionesVenta/);
  assert.match(sales, /idPoliticaEsperada: solicitud\.idPolitica/);
  assert.match(sales, /validacion\.idPolitica !== condicionesVenta\.idPolitica/);
  assert.match(sales, /condicionesVenta\.montoSeparacion/);
  assert.match(sales, /confirmacionVenta\.tasaAnualPct/);
  assert.doesNotMatch(sales, /monto: 500\.00/);
  assert.doesNotMatch(sales, /TASA_ANUAL_FIJA_PCT/);
  assert.match(simulator, /condiciones\.tasaNominalAnualPct/);
});

test('conflictos de version aceptada tienen HTTP 409 y mensajes coherentes con el Bloque 2', () => {
  const service = read('../../../services/core-service/src/main/java/monolithe/core_service/service/CrmVentaService.java');
  const panel = read('../src/components/financing/ConfiguracionPlanesFinanciamientoPanel.tsx');
  assert.match(service, /mensaje\.contains\("POLITICA_CAMBIO\|"\)\)\s*\{\s*return new ResponseStatusException\(HttpStatus\.CONFLICT/);
  assert.match(service, /mensaje\.contains\("POLITICA_REQUERIDA\|"\)/);
  assert.match(service, /mensaje\.contains\("FINANCIAMIENTO_INVALIDO\|"\)/);
  assert.match(service, /mensaje\.contains\("SEPARACION_MONTO_INVALIDO\|"\)/);
  assert.match(panel, /Las operaciones anteriores conservan las condiciones aceptadas/);
  assert.doesNotMatch(panel, /el motor de ventas continúa usando/i);
  assert.match(panel, /datos\.publicacionHabilitada/);
  assert.match(panel, /PublicarPoliticaFinancieraPanel/);
  const sales = read('../src/pages/Sales.tsx');
  assert.match(sales, /err instanceof ApiError && err\.status === 409/);
  assert.match(sales, /setRevisionPolitica\(revision => revision \+ 1\)/);
  assert.match(sales, /setDatosVentaValidados\(null\)/);
});


test('pantalla financiera organiza versiones en columnas, seguridad e historial por debajo', () => {
  const parent=read('../src/components/financing/ConfiguracionPlanesFinanciamientoPanel.tsx');
  const editor=read('../src/components/financing/PublicarPoliticaFinancieraPanel.tsx');
  const historial=read('../src/components/financing/HistorialPoliticasFinancierasPanel.tsx');
  const mfa=read('../src/components/financing/SeguridadFinancieraTotpPanel.tsx');

  assert.match(parent, /xl:grid-cols-2/);
  assert.match(parent, /grid-cols-1/);
  assert.match(parent, /Versión actual/);
  assert.match(editor, /Versión a actualizar/);
  assert.match(editor, /Propuesta · Versión/);
  assert.match(editor, /Vista previa validada/);
  assert.match(editor, /comparacion\.map/);
  assert.match(editor, /cambiosPendientes/);
  assert.match(editor, /sm:grid-cols-2/);
  assert.match(historial, /Historial de versiones/);
  assert.match(historial, /sm:grid-cols-\[/);
  assert.match(historial, /versiones\.map/);
  const twoColumns=parent.indexOf('xl:grid-cols-2');
  const security=parent.indexOf('<SeguridadFinancieraTotpPanel />');
  const history=parent.indexOf('<HistorialPoliticasFinancierasPanel politica={datos} />');
  assert.ok(twoColumns>0 && security>twoColumns && history>security,
    'Seguridad e historial deben quedar debajo de las columnas');
  assert.match(mfa, /Administrar autenticador/);
  assert.match(mfa, /mostrarGestion/);
  for(const code of [parent,editor,mfa,historial]) {
    assert.doesNotMatch(code, /bloqueada en TEST|del Bloque 3|modo consulta · protección activa/i);
  }
  assert.match(parent, /datos\.publicacionHabilitada/);
  assert.match(editor, /!vista\.publicacionHabilitada/);
  assert.match(editor, /confirmado/);
});
