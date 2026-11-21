const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { resolve } = require('node:path');
const root = resolve(__dirname, '../src');
function archivo(path) { return readFileSync(resolve(root,path), 'utf8'); }

test('el panel monta una única sección de simulación y no apila todos los bloques', () => {
  const ui = archivo('components/projects/detail/ProjectConfigurationTab.tsx');
  assert.equal((ui.match(/<CommercialSimulationPanel\b/g) || []).length,1);
  assert.match(ui,/seccion === 'simulador' && <CommercialSimulationPanel/);
  assert.match(ui,/seccion === 'tarifas' && <fieldset/);
  assert.match(ui,/seccion === 'excel' && <ProjectImportPreparation/);
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
  assert.match(simulador,/onChange=\{e => setId\(e\.target\.value\)\}/);
  assert.match(matriz,/datos\.etapas\.map/);
  assert.match(matriz,/catalogos\.zonas\.map/);
  assert.doesNotMatch(matriz, /tarifas\.map\(\(tarifa, i\) => <FilaTarifa/);
});
