import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const sales = readFileSync(new URL('../src/pages/Sales.tsx', import.meta.url),'utf8');
const buyer = readFileSync(new URL('../src/components/sales/EditarDatosCompradorModal.tsx', import.meta.url),'utf8');
const migration = readFileSync(new URL('../../../database/migrations/133_ventas_recompra_comprador_existente_v1.sql',import.meta.url),'utf8');

test('un comprador convertido puede iniciar nuevas compras y ver proyectos activos', () => {
  assert.match(sales,/CON_RESERVA', 'CONVERTIDO'/);
  assert.match(sales,/compradorExistente \|\| intereses\.has\(p\.idProyecto\)/);
  assert.match(sales,/idProyectoVenta=\{Number\(formProjectId\)\}/);
});

test('el proyecto de la ficha está asociado al lote y no se cambia en el modal', () => {
  assert.match(buyer,/idProyecto: idProyectoVenta/);
  assert.match(buyer,/Proyecto del lote seleccionado/);
  assert.match(buyer,/disabled\s+aria-label="Proyecto del lote seleccionado/);
});

test('recompra conserva seguridad por asesor, lote y origen de captación', () => {
  assert.match(migration,/sp_crm_validar_formalizacion_v6/);
  assert.match(migration,/CONVERTIDO/);
  assert.match(migration,/PROSPECTO_NO_ELEGIBLE\|El comprador convertido no tiene una venta formalizada verificable/);
  assert.match(migration,/VENTA_EXISTENTE/);
  assert.match(migration,/La ficha contractual no coincide con el proyecto del lote/);
  assert.match(migration,/id_origen_prospecto=v_origen[\s\S]*?AND NOT EXISTS/);
  assert.doesNotMatch(migration,/YA_COMPRADOR/);
});


test('operación permite registrar interés y asignar asesor desde el formulario con permisos CRM', () => {
  assert.match(sales,/compradorExistente \|\| intereses\.has\(p\.idProyecto\) \|\| puedeEditarInteres/);
  assert.match(sales,/crmBackend\.actualizar\(idProspecto, \{ idProyectoInteres: idProyecto \}\)/);
  assert.match(sales,/crmBackend\.registrarInteresRecompra/);
  assert.match(sales,/crmBackend\.asesor\(id, asesor\.id_asesor/);
  assert.match(sales,/puedeAsignarAsesorOperacion = can\('crm\.edit'\)/);
  assert.match(sales,/const tieneAsesor = \(prospect\.id_asesor \?\? 0\) > 0/);
});


test('el cambio de interés del potencial es distinto de una recompra y conserva seguimiento CRM',()=>{
  const sql=readFileSync(new URL('../../../database/migrations/152_crm_cambio_interes_operacion_v1.sql',import.meta.url),'utf8');
  assert.match(sales,/crmBackend\.cambiarInteresProyecto\(idProspecto, idProyecto, origenCambioInteres, motivoCambioInteres\.trim\(\)\)/);
  assert.match(sales,/Confirmar cambio de interés/);
  assert.match(sql,/SET activo=false/);
  assert.match(sql,/INSERT INTO public\.crm_seguimientos/);
  assert.match(sql,/INTERES_COMPROMETIDO/);
  assert.match(sql,/fn_crm_puede_consultar_prospecto/);
  assert.match(sql,/sp_registrar_auditoria/);
});


test('proyecto registrado por defecto y selector de cambio separado del proyecto operativo',()=>{
  assert.match(sales,/const registrado = \[\.\.\.intereses\]\.find/);
  assert.match(sales,/setFormProjectId\(String\(registrado\)\)/);
  assert.match(sales,/proyectosConInteres\.length > 1/);
  assert.match(sales,/proyectosSinInteres\.map/);
  assert.match(sales,/!editorInteres &&/);
  assert.match(sales,/value=\{proyectoInteresNuevo\}/);
  const guardar=sales.slice(sales.indexOf('const registrarInteresOperacion'),sales.indexOf('const abrirEditorAsesorOperacion'));
  assert.ok(guardar.indexOf('await crmBackend.cambiarInteresProyecto') < guardar.indexOf('setFormProjectId(String(idProyecto))'));
  const cancelar=sales.slice(sales.indexOf('const cerrarEditorInteres'),sales.indexOf('const abrirEditorInteres'));
  assert.doesNotMatch(cancelar,/setFormProjectId|setFormLotId|crmBackend/);
});


test('separación oculta importes y pago hasta verificar política y precio del lote',()=>{
  assert.match(sales,/const separacionCondicionesVerificadas = Boolean/);
  assert.match(sales,/precioLote\?\.idLote === Number\(formLotId\)/);
  assert.match(sales,/separacionCondicionesVerificadas && condicionesVenta \? <>/);
  assert.match(sales,/<PagoSeparacionPanel pagos=\{pagosSeparacion\}/);
  assert.match(sales,/condicionesVenta\.diasVencimientoSeparacion\} días calendario/);
  assert.match(sales,/Reintentar consulta de condiciones/);
  assert.match(sales,/!separacionCondicionesVerificadas \|\| SEPARACION_ENVIO_DESHABILITADO/);
  assert.doesNotMatch(sales,/montoSeparacion\.toFixed\(2\) \?\? '—'/);
});


test('separaciones tienen lote de interés persistido y registro múltiple transaccional',()=>{
  const sql=readFileSync(new URL('../../../database/migrations/153_crm_lote_interes_v1.sql',import.meta.url),'utf8');
  const backend=readFileSync(new URL('../../../services/core-service/src/main/java/monolithe/core_service/service/CrmVentaService.java',import.meta.url),'utf8');
  assert.match(sql,/ADD COLUMN id_lote_interes bigint REFERENCES/);
  assert.match(sql,/INSERT INTO public\.crm_seguimientos/);
  assert.match(sales,/crmBackend\.cambiarLoteInteres/);
  assert.match(sales,/lotesDisponiblesProyecto\.filter/);
  assert.match(sales,/Agregar otro lote/);
  assert.doesNotMatch(sales,/crmBackend\.registrarSeparacionesMultiples\(entradas\)/);
  assert.match(sales,/const SEPARACION_ENVIO_DESHABILITADO = true/);
  assert.match(backend,/@Transactional\s+public JsonNode registrarSeparacionesMultiples/);
  assert.match(backend,/resultados\.add\(registrarSeparacion\(actor,req\)\)/);
});


test('fase 1: preferencia CRM sin dependencia de etapa y detalle de lotes separado de pagos',()=>{
  assert.match(sales,/const etapaConsulta = opType === 'Venta' \? formStageId : ''/);
  assert.match(sales,/const idElegible=idPreferido\?\?idDestino/);
  assert.match(sales,/lotesDisponiblesProyecto\.some\(l=>l\.idLote===idElegible\)/);
  assert.match(sales,/Lotes seleccionados/);
  const detalle=sales.slice(sales.indexOf('>Lotes seleccionados</h3>'),sales.indexOf('>Pago de la separación</h3>'));
  assert.match(detalle,/Agregar otro lote/);
  assert.match(detalle,/formatSoles\(l\.precio\)/);
  assert.doesNotMatch(detalle,/type="file"|Método de pago/);
  assert.match(sales,/Total a pagar/);
});


test('fase 2 separa el pago acumulado de los lotes y bloquea el contrato anterior',()=>{
  const panel=readFileSync(new URL('../src/components/sales/PagoSeparacionPanel.tsx',import.meta.url),'utf8');
  assert.match(sales,/validarPagosSeparacion\(pagosSeparacionResueltos,totalSeparacionSeleccion\)/);
  assert.match(sales,/SEPARACION_ENVIO_DESHABILITADO \|\| !validacionPagosSeparacion\.valido/);
  assert.doesNotMatch(sales,/Pago del lote principal|Comprobante propio|crmBackend\.registrarSeparacion\(/);
  assert.match(panel,/Agregar otro abono/);
  assert.match(panel,/crypto\.subtle\.digest/);
  assert.match(panel,/Total declarado en abonos/);
});


test('fase 3 prepara endpoint acumulado y evita la duplicación de ingresos',()=>{
  const sql=readFileSync(new URL('../../../database/migrations/154_separaciones_pago_acumulado_v1.sql',import.meta.url),'utf8');
  const backend=readFileSync(new URL('../../../services/core-service/src/main/java/monolithe/core_service/service/CrmVentaService.java',import.meta.url),'utf8');
  const storage=readFileSync(new URL('../../../services/core-service/src/main/java/monolithe/core_service/service/CrmSeparacionStorageService.java',import.meta.url),'utf8');
  assert.match(sql,/CREATE TABLE public\.pag_separaciones_grupo_distribucion_v1/);
  assert.match(sql,/IF v_pagado<>v_total/);
  assert.match(sql,/pg_advisory_xact_lock/);
  assert.match(sql,/ENABLE ROW LEVEL SECURITY/);
  assert.match(sql,/sp_fin_revisar_abono_separacion_grupo_v1/);
  assert.match(sales,/crmBackend\.registrarSeparacionAcumulada/);
  assert.match(backend,/sp_crm_registrar_separacion_acumulada_v1/);
  assert.match(storage,/MessageDigest\.getInstance\("SHA-256"\)/);
  assert.match(sales,/resultadoSeparacionIncierto/);
});
