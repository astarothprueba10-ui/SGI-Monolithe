const { test } = require('node:test');
const assert = require('node:assert/strict');
const { codigoLoteVinculado, vincularFigura, totalVinculados, asociacionesLote, figuraVinculable } = require('../src/lib/projectSvg.ts');
const lotes = [{codigo:'ALM-L001'}, {codigo:'ALM-L002'}];
function plano() {
  return { nombreArchivo:'alameda.svg', viewBox:[0,0,1000,600], elementos:[
    { tipo:'rect', atributos:{x:'1',y:'1',width:'10',height:'10'}, texto:null, codigoLote:'ALM-L001' },
    { tipo:'path', atributos:{d:'M0 0L10 10'}, texto:null, codigoLote:null }
  ] };
}
test('identifica lotes reales por codigo sin crear inventario duplicado',()=>{
  assert.equal(codigoLoteVinculado('  alm-l002 ',lotes),'ALM-L002');
  assert.equal(codigoLoteVinculado('INVENTADO',lotes),null);
  assert.equal(totalVinculados(plano(),lotes),1);
});
test('vincula figuras por codigo validado y protege unicidad',()=>{
  const a=vincularFigura(plano(),1,'ALM-L002',lotes);
  assert.equal(a.elementos[1].codigoLote,'ALM-L002');
  assert.equal(totalVinculados(a,lotes),2);
  assert.throws(()=>vincularFigura(plano(),1,'ALM-L001',lotes),/otra figura/);
  assert.throws(()=>vincularFigura(plano(),1,'OTRO',lotes),/no pertenece/);
});

test('repara asociaciones antiguas a textos sin duplicar ni borrar lotes',()=>{
  const original=plano();
  original.elementos.push({tipo:'text',atributos:{x:'10',y:'20'},texto:'450.00 m2',codigoLote:'ALM-L002'});
  assert.equal(figuraVinculable(original.elementos[2]),false);
  assert.deepEqual(asociacionesLote(original,'ALM-L002'),[2]);
  assert.throws(()=>vincularFigura(original,2,'ALM-L002',lotes),/superficie/);
  assert.throws(()=>vincularFigura(original,1,'ALM-L002',lotes),/otra figura/);
  const corregido=vincularFigura(original,1,'ALM-L002',lotes,true);
  assert.deepEqual(asociacionesLote(corregido,'ALM-L002'),[1]);
  assert.equal(corregido.elementos[2].codigoLote,null);
  assert.equal(corregido.elementos[2].texto,'450.00 m2');
  assert.equal(original.elementos[2].codigoLote,'ALM-L002');
  assert.equal(corregido.elementos[0].codigoLote,'ALM-L001');
  const libre=vincularFigura(original,2,null,lotes);
  assert.equal(libre.elementos[2].codigoLote,null);
});
test('el visor separa arrastre de clic y configura asociaciones explícitamente',()=>{
  const fs=require('node:fs'),path=require('node:path');
  const leer=p=>fs.readFileSync(path.resolve(__dirname,'../src/components/projects/detail',p),'utf8');
  const panel=leer('ProjectSvgPanel.tsx'),svg=leer('PlanSvgShapes.tsx');
  assert.match(panel,/cambiarZoom\(1\.5\)/);
  assert.match(panel,/cambiarZoom\(1\/1\.5\)/);
  assert.match(panel,/setVista\(null\)/);
  assert.match(panel,/Reemplazar asociación anterior/);
  assert.match(panel,/Desvincular/);
  assert.match(panel,/puedeConfigurar && editando && !guardando/);
  assert.match(svg,/setPointerCapture/);
  assert.match(svg,/onClickCapture/);
  assert.match(svg,/pointerEvents=\{interactivo\?'visiblePainted':'none'\}/);
});
