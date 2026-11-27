const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { resolve } = require('node:path');
const root = resolve(__dirname, '../src');
function archivo(path) { return readFileSync(resolve(root,path), 'utf8'); }

test('el panel elimina el simulador y conserva la navegación por secciones', () => {
  const ui = archivo('components/projects/detail/ProjectConfigurationTab.tsx');
  assert.doesNotMatch(ui,/CommercialSimulationPanel|CalculatorIcon|Ir al simulador/);
  assert.match(ui,/paso === 3 && <fieldset/);
  assert.match(ui,/importacionPermitida \? <ProjectImportPreparation/);
});

test('tras confirmar importación el formulario recarga catálogos automáticamente', () => {
  const ui = archivo('components/projects/detail/ProjectConfigurationTab.tsx');
  const hook = archivo('hooks/useProjectImport.ts');
  assert.match(ui,/function importado\(\)\s*\{\s*model\.recargar\(\)/);
  assert.match(ui,/onImportCompleted=\{importado\}/);
  assert.match(hook,/onImportCompleted\?\.\(\)/);
});

test('el simulador calcula al cambiar de lote y la matriz agrupa por etapa', () => {
  const simulador = archivo('components/projects/detail/CommercialSimulationPanel.tsx');
  const matriz = archivo('components/projects/detail/CommercialTariffEditor.tsx');
  assert.match(simulador,/useEffect\(\(\) => \{[\s\S]*?projectConfigurationService\.simular/);
  assert.match(simulador,/<LotSearchCombobox lotes=\{config\.lotes\} value=\{id\} onChange=\{setId\}/);
  assert.match(matriz,/datos\.etapas\.map/);
  assert.match(matriz,/catalogos\.zonas\.map/);
  assert.doesNotMatch(matriz, /tarifas\.map\(\(tarifa, i\) => <FilaTarifa/);
});

test('el selector integra búsqueda, navegación de teclado y selección', () => {
  const buscador = archivo('components/projects/detail/LotSearchCombobox.tsx');
  assert.match(buscador,/role="combobox"/);
  assert.match(buscador,/role="listbox"/);
  assert.match(buscador,/role="option"/);
  assert.match(buscador,/event.key === 'ArrowDown'/);
  assert.match(buscador,/event.key === 'Enter'/);
  assert.match(buscador,/event.key === 'Escape'/);
});

test('la publicación utiliza liberación por etapa y muestra el cambio de inventario', () => {
  const ui = archivo('components/projects/detail/CommercialPublicationPanel.tsx');
  const selector = archivo('components/projects/detail/CommercialStageReleaseSelector.tsx');
  const service = archivo('services/projectConfigurationService.ts');
  assert.match(archivo('components/projects/detail/ProjectConfigurationTab.tsx'),/<CommercialStageReleaseSelector/);
  assert.match(ui,/etapasHabilitar/);
  assert.match(ui,/Lotes que se habilitarán/);
  assert.doesNotMatch(ui,/Preparar nueva versión de publicación/);
  assert.match(ui,/config.version > 0/);
  assert.match(selector,/Ninguna etapa se libera automáticamente/);
  assert.match(service,/\{ version, etapasHabilitar \}/);
  assert.doesNotMatch(service,/habilitarNoDisponibles/);
});

test('la configuración publicada oculta importación y no permite guardar otro borrador', () => {
  const ui = archivo('components/projects/detail/ProjectConfigurationTab.tsx');
  const hook = archivo('hooks/useProjectConfiguration.ts');
  assert.match(ui, /publicada > 0\) return <CommercialManagementPanel/);
  const gestion = archivo('components/projects/detail/CommercialManagementPanel.tsx');
  assert.match(gestion,/Importar Excel.*Etapas iniciales.*Asignaciones iniciales/);
  assert.doesNotMatch(gestion,/ProjectImportPreparation|CommercialPublicationPanel/);
  assert.match(hook, /projectConfigurationService\.versionPublicada\(idProyecto\)/);
  assert.match(hook, /guardando \|\| publicada !== 0/);
});

test('la pestaña Etapas usa el mismo catálogo comercial del borrador y un modal comercial', () => {
  const detalle = archivo('pages/ProjectDetail.tsx');
  const tab = archivo('components/projects/detail/ProjectStagesTab.tsx');
  const editor = archivo('components/projects/detail/CommercialStageEditor.tsx');
  const config = archivo('components/projects/detail/ProjectConfigurationTab.tsx');
  assert.match(detalle,/label: 'Etapas comerciales'/);
  assert.doesNotMatch(tab,/StageFormModal|getStagesByProject/);
  assert.match(tab,/useProjectConfiguration\(project.idProyecto\)/);
  assert.match(tab,/model.guardar\(next,true\)/);
  assert.match(tab,/projectConfigurationService.guardarEtapas/);
  assert.doesNotMatch(tab,/readOnly=\{[^}]*guardando/);
  assert.match(config,/<CommercialStageEditor/);
  assert.match(editor,/<Modal/);
  assert.match(editor,/Condición del precio/);
  assert.match(editor,/Tipo de descuento/);
  assert.doesNotMatch(editor,/Planificada|Finalizada|Fecha fin estimada/);
  assert.match(tab,/publicada > 0/);
});

test('el alta comercial separa precio de liberación y conserva bloqueos históricos', () => {
  const editor = archivo('components/projects/detail/CommercialStageEditor.tsx');
  const plantilla = archivo('utils/projectConfigurationExcel.ts');
  const { nuevaEtapa, condicionPrecio } = require('../src/lib/projectConfiguration.ts');
  assert.equal(nuevaEtapa([]).disponibilidad,'REGULAR');
  assert.equal(condicionPrecio('ANTICIPADA'),'REGULAR');
  assert.equal(condicionPrecio('PROMOCION'),'PROMOCION');
  assert.doesNotMatch(editor,/Venta anticipada|\['BLOQUEADA', 'Bloqueada'\]/);
  assert.match(editor,/Bloqueo histórico conservado/);
  assert.match(editor,/disabled=\{!published && etapa.disponibilidad === 'BLOQUEADA'\}/);
  assert.match(plantilla,/\['PROMOCION', 'REGULAR'\]/);
});

test('la carga masiva se bloquea desde diez lotes registrados', () => {
 const ui = archivo('components/projects/detail/ProjectConfigurationTab.tsx');
 assert.match(ui,/lotesRegistrados < 10 && !importadoSesion && importacionRealizada === 0/);
});

test('mantiene la configuración inicial cerrada y permite consultar matriz publicada', () => {
 const ui = archivo('components/projects/detail/ProjectConfigurationTab.tsx');
 const matriz = archivo('components/projects/detail/CommercialTariffEditor.tsx');
 const pub = archivo('components/projects/detail/CommercialPublicationPanel.tsx');
 assert.match(ui,/publicada > 0\) return <CommercialManagementPanel/);
 assert.match(archivo('components/projects/detail/CommercialManagementPanel.tsx'),/guardarTarifa/);
 assert.match(matriz,/if \(readOnly\) return/);
 assert.match(pub,/Ver detalle por lote \(opcional\)/);
 assert.match(pub,/Revisar matriz de tarifas/);
});

test('el asistente no permite saltar pasos y valida precios en el servidor antes de disponibilidad', () => {
  const ui = archivo('components/projects/detail/ProjectConfigurationTab.tsx');
  assert.match(ui,/disabled=\{ocupado \|\| i >= paso\}/);
  assert.match(ui,/validarPasoInicial\(paso, config\)/);
  assert.match(ui,/await model\.guardarYObtener\(\)/);
  assert.match(ui,/revisarPublicacion\(project.idProyecto, guardada.version, \[\]\)/);
  assert.match(ui,/if \(grupos.length\) \{[\s\S]*?return;/);
  assert.match(ui,/etapasSeleccionadas=\{etapasHabilitar\}/);
});
test('los pasos detectan lotes sin asignación y agrupan incidencias sin duplicarlas por fila', () => {
  const { validarPasoInicial, agruparIncidencias, filtrarSeleccion } = require('../src/lib/projectSetupWizard.ts');
  const config = { datos: { etapas:[{codigo:'E1',nombre:'Etapa 1',disponibilidad:'REGULAR',tipoDescuento:'NINGUNO',descuento:0}], manzanas:[{id:10,codigoEtapa:'E1'}], lotes:[], tarifas:[] },
    lotes:[{id:1,idManzana:10,codigo:'L1',estadoInventario:'DISPONIBLE'},{id:2,idManzana:20,codigo:'L2',estadoInventario:'DISPONIBLE'},{id:3,idManzana:20,codigo:'L3',estadoInventario:'VENDIDO'}] };
  assert.equal(validarPasoInicial(1,config),null);
  assert.match(validarPasoInicial(2,config),/1 lote.*L2/);
  config.datos.lotes.push({id:2,codigoEtapa:'E1'});
  assert.equal(validarPasoInicial(2,config),null);
  assert.deepEqual(filtrarSeleccion(['E1','E1','NO'],config),['E1']);
  assert.deepEqual(agruparIncidencias([{situacion:'ERROR',mensaje:'Falta tarifa',codigo:'L1'},{situacion:'ERROR',mensaje:'Falta tarifa',codigo:'L2'},{situacion:'PROTEGIDA',mensaje:'Venta',codigo:'L3'}]),[{mensaje:'Falta tarifa',lotes:['L1','L2']}]);
});

test('gestión permanente usa operaciones independientes y muestra checks persistidos e historial', () => {
  const gestion=archivo('components/projects/detail/CommercialManagementPanel.tsx');
  const api=archivo('services/projectConfigurationService.ts');
  assert.match(gestion,/setSeleccion\(g.estado.etapasHabilitadas\)/);
  assert.match(gestion,/projectConfigurationService.guardarDisponibilidad\(id,actual.revision,seleccion\)/);
  assert.match(gestion,/projectConfigurationService.guardarTarifa\(id,actual.revision,t\)/);
  assert.match(gestion,/projectConfigurationService.historial\(id\)/);
  assert.match(api,/gestion\/disponibilidad/);
  assert.match(api,/gestion\/tarifa/);
  assert.doesNotMatch(gestion,/projectConfigurationService.publicar\(/);
});

test('estructura importada solo se consulta en asistente y las matrices muestran leyenda real',()=>{
 const ui=archivo('components/projects/detail/ProjectConfigurationTab.tsx');
 assert.match(ui,/const estructuraCerrada = !importacionPermitida/);
 assert.match(ui,/readOnly=\{bloqueado \|\| estructuraCerrada\}/);
 assert.match(ui,/readOnly=\{estructuraCerrada\}/);
 assert.match(ui,/<CommercialZoneLegend/);
 assert.match(archivo('components/projects/detail/CommercialManagementPanel.tsx'),/<CommercialZoneLegend/);
 assert.match(archivo('components/projects/detail/CommercialPublicationPanel.tsx'),/<CommercialZoneLegend/);
 assert.match(archivo('components/projects/detail/CommercialZoneLegend.tsx'),/coreService.getZonesByProject/);
 assert.match(archivo('components/projects/detail/ProjectBlocksTab.tsx'),/<CommercialAssignmentModal/);
 assert.match(archivo('components/projects/detail/ProjectLotsTab.tsx'),/<CommercialAssignmentModal/);
});
test('historial presenta cambios y nombre, no JSON técnico',()=>{
 const ui=archivo('components/projects/detail/CommercialManagementPanel.tsx');
 assert.doesNotMatch(ui,/formatearEvento|<pre/);
 const detalle=archivo('components/projects/detail/CommercialHistoryEntry.tsx');
 assert.match(detalle,/e.actorNombre/);
 const {resumirEvento}=require('../src/lib/commercialHistory.ts');
 const r=resumirEvento({anterior:JSON.stringify({estado:{etapasHabilitadas:['E1']},lotes:[{id_lote:1,estadoInventario:'DISPONIBLE',precio_final:26000}]}),nuevo:JSON.stringify({estado:{etapasHabilitadas:['E2']},lotes:[{id_lote:1,estadoInventario:'NO_DISPONIBLE',precio_final:26000}]})});
 assert.deepEqual(r.abrieron,['E2']);assert.deepEqual(r.cerraron,['E1']);assert.equal(r.lotes.length,1);
 assert.equal(resumirEvento({anterior:'?',nuevo:'{}'}),null);
});

test('las zonas utilizadas respetan excepciones individuales y los formularios confirman internamente',()=>{
 const {contarZonaEtapa}=require('../src/lib/commercialZoneUsage.ts');
 const config={datos:{manzanas:[{id:10,codigoEtapa:'E1'}],lotes:[{id:2,codigoEtapa:'E2'}]},lotes:[
 {id:1,idManzana:10,codigoZona:'AE'},{id:2,idManzana:10,codigoZona:'AE'},{id:3,idManzana:10,codigoZona:'E'},{id:4,idManzana:10,codigoZona:null}]};
 assert.deepEqual([...contarZonaEtapa(config,'E1')],[['AE',1],['E',1]]);
 assert.deepEqual([...contarZonaEtapa(config,'E2')],[['AE',1]]);
 for(const p of ['CommercialManagementPanel.tsx','CommercialTariffEditor.tsx']){
   const ui=archivo('components/projects/detail/'+p);
   assert.match(ui,/Lotes asociados/);
   assert.match(ui,/<Modal/);
   assert.doesNotMatch(ui,/window.confirm/);
 }
 const zona=archivo('components/projects/ZoneFormModal.tsx');
 assert.match(zona,/numeroOrden: null/);
 assert.doesNotMatch(zona,/id="zona-numero-orden"/);
 assert.match(zona,/disabled=\{isEditing\}/);
});

test('las asignaciones posteriores utilizan gestión sin crear otro borrador',()=>{
 const ui=archivo('components/projects/detail/CommercialAssignmentModal.tsx');
 assert.match(ui,/projectConfigurationService.guardarAsignacion/);
 assert.match(ui,/Las operaciones protegidas conservan su asignación y precio/);
 assert.doesNotMatch(archivo('components/projects/detail/ProjectConfigurationTab.tsx'),/window.confirm/);
});

test('sugiere siguiente código sin precargar el campo y conserva nomenclatura',()=>{
 const {nuevaEtapa,sugerirCodigoEtapa}=require('../src/lib/projectConfiguration.ts');
 const etapas=[{codigo:'COC-C01'},{codigo:'COC-C02'},{codigo:'COC-C05'}];
 assert.equal(nuevaEtapa(etapas).codigo,'');
 assert.equal(nuevaEtapa(etapas).nombre,'');
 assert.equal(sugerirCodigoEtapa(etapas),'COC-C06');
 assert.equal(sugerirCodigoEtapa([]),'COM-01');
 assert.equal(sugerirCodigoEtapa([{codigo:'ALM-C09'}]),'ALM-C10');
 const editor=archivo('components/projects/detail/CommercialStageEditor.tsx');
 assert.match(editor,/placeholder=\{sugerirCodigoEtapa\(datos.etapas\)\}/);
});
test('matriz de ubicación admite E y AE y rechaza componentes ausentes',()=>{
 const {componentesMatriz,totalZona}=require('../src/lib/commercialRecargos.ts');
 assert.deepEqual(componentesMatriz(['A','B','C','D','E','AB','ABC','AE']),['A','B','C','E']);
 assert.equal(componentesMatriz(['D','AE','A']),null);
 assert.equal(totalZona('AE',26000,{A:3000,E:2000}),31000);
 assert.equal(totalZona('ABC',26000,{A:3000,B:1000,C:2000}),32000);
 assert.equal(totalZona('D',26000,{}),26000);
 assert.match(archivo('components/projects/detail/ProjectZonesTab.tsx'),/Tarifa adicional por lote/);
 assert.match(archivo('components/projects/detail/CommercialManagementPanel.tsx'),/guardarMatriz/);
});
