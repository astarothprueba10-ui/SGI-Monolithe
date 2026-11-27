const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { resolve } = require('node:path');
const root = resolve(__dirname, '../src');
function archivo(path) { return readFileSync(resolve(root,path), 'utf8'); }

test('el panel elimina el simulador y conserva la navegación por secciones', () => {
  const ui = archivo('components/projects/detail/ProjectConfigurationTab.tsx');
  assert.doesNotMatch(ui,/CommercialSimulationPanel|CalculatorIcon|Ir al simulador/);
  assert.match(ui,/seccionVisible === 'tarifas' && <fieldset/);
  assert.match(ui,/seccionVisible === 'excel' && <ProjectImportPreparation/);
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
  assert.match(ui,/<CommercialStageReleaseSelector/);
  assert.match(ui,/etapasHabilitar/);
  assert.match(ui,/Se habilitarán ahora/);
  assert.doesNotMatch(ui,/Preparar nueva versión de publicación/);
  assert.match(ui,/publicada === 0 && config.version > 0/);
  assert.match(selector,/Ninguna etapa se libera automáticamente/);
  assert.match(service,/\{ version, etapasHabilitar \}/);
  assert.doesNotMatch(service,/habilitarNoDisponibles/);
});

test('la configuración publicada oculta importación y no permite guardar otro borrador', () => {
  const ui = archivo('components/projects/detail/ProjectConfigurationTab.tsx');
  const hook = archivo('hooks/useProjectConfiguration.ts');
  assert.match(ui, /const esPublicado = publicada > 0/);
  assert.match(ui, /SECCIONES\.filter\(s => !esPublicado \|\| s\.id !== 'excel'\)/);
  assert.match(ui, /const bloqueado = guardando \|\| !project\.activo \|\| esPublicado/);
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
  assert.match(tab,/onChange=\{next => model.guardar\(next, true\)\}/);
  assert.doesNotMatch(tab,/readOnly=\{[^}]*guardando/);
  assert.match(config,/<CommercialStageEditor/);
  assert.match(editor,/<Modal/);
  assert.match(editor,/Condición comercial/);
  assert.match(editor,/Tipo de descuento/);
  assert.doesNotMatch(editor,/Planificada|Finalizada|Fecha fin estimada/);
  assert.match(tab,/publicada > 0/);
});
