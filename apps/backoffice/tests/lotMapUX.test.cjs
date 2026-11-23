const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { resolve } = require('node:path');
const base = resolve(__dirname, '../src');
function leer(p) {return readFileSync(resolve(base,p),'utf8');}
test('la mejora queda exclusivamente dentro de Plano interactivo, sin cambiar sidebar',()=>{
  const pagina=leer('pages/LotMap.tsx');
  assert.match(pagina,/Mapa de Lotes/);
  assert.match(pagina,/Plano SVG/);
  assert.match(pagina,/ProjectSvgPanel/);
  assert.match(pagina,/LotMapDetailCard/);
  assert.match(pagina,/handlePointerDown/);
  assert.match(pagina,/handleSavePlan/);
  assert.match(pagina,/buildDisplayGeometries/);
});
test('separar y vender requiere permiso, precio y validacion comercial real',()=>{
  const pagina=leer('pages/LotMap.tsx');
  const ficha=leer('components/projects/detail/LotMapDetailCard.tsx');
  assert.match(pagina,/can\('sales.create'\)/);
  assert.match(pagina,/commercializable\.has\(selectedLot\.idLote\)/);
  assert.match(pagina,/openCommercialFlow\('Separacion'\)/);
  assert.match(pagina,/openCommercialFlow\('Venta'\)/);
  assert.match(ficha,/disabled=\{!puedeOperar\}/);
  const ventas=leer('pages/Sales.tsx');
  assert.match(ventas,/origenPlano/);
  assert.match(ventas,/elegibles\.some\(p=>p\.idProyecto===origenPlano\.idProyecto\)/);
});

test('no consulta el detalle manual si un proyecto no tiene plano vigente; mantiene la matriz dinámica',()=>{
 const core = leer('services/coreService.ts');
 const pagina = leer('pages/LotMap.tsx');
 assert.match(core,/async getOptionalCurrentPlanDetail/);
 assert.match(core,/versiones\.some\(plano/);
 assert.match(core,/return vigente \? this\.getCurrentPlanDetail\(idProyecto, idEtapa\) : null/);
 assert.match(pagina,/coreService\.getOptionalCurrentPlanDetail\(projectId\)/);
 assert.match(pagina,/buildDisplayGeometries\(lots, planDetail, selectedProjectId\)/);
});
