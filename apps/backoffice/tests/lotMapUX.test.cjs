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
