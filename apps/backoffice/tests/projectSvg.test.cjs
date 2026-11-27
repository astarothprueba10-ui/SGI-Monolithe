const { test } = require('node:test');
const assert = require('node:assert/strict');
const { codigoLoteVinculado, vincularFigura, totalVinculados, asociacionesLote, figuraVinculable, motivoFiguraNoVinculable } = require('../src/lib/projectSvg.ts');
const lotes = [{codigo:'ALM-L001'}, {codigo:'ALM-L002'}];
function plano() {
  return { nombreArchivo:'alameda.svg', viewBox:[0,0,1000,600], elementos:[
    { tipo:'rect', atributos:{x:'1',y:'1',width:'10',height:'10'}, texto:null, codigoLote:'ALM-L001' },
    { tipo:'path', atributos:{d:'M0 0L10 0L10 10Z',fill:'#c4f1dc'}, texto:null, codigoLote:null }
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

test('el fondo de Los Cocos conserva su color y nunca cuenta como lote asociado',()=>{
  const doc={nombreArchivo:'cocos.svg',viewBox:[0,0,951.15,2343.45],elementos:[
    {tipo:'rect',atributos:{x:'0',y:'0',width:'951.15',height:'2343.45',fill:'#f4f8fb'},texto:null,codigoLote:'ALM-L001'},
    {tipo:'polygon',atributos:{points:'534.63,290.17 537.08,252 613.37,257.69 610.92,295.86',fill:'#c4f1dc'},texto:null,codigoLote:null}
  ]};
  assert.equal(motivoFiguraNoVinculable(doc.elementos[0],doc.viewBox),'Fondo general del plano');
  assert.equal(totalVinculados(doc,lotes),0);
  assert.throws(()=>vincularFigura(doc,0,'ALM-L002',lotes),/Fondo general/);
  assert.equal(figuraVinculable(doc.elementos[1],doc.viewBox),true);
  const reparado=vincularFigura(doc,1,'ALM-L001',lotes,true);
  assert.equal(reparado.elementos[0].codigoLote,null);
  assert.equal(reparado.elementos[0].atributos.fill,'#f4f8fb');
  assert.equal(totalVinculados(reparado,lotes),1);
  assert.equal(doc.elementos[0].codigoLote,'ALM-L001');
});
test('descarta trazos abiertos, círculos decorativos y polígonos de fondo',()=>{
  const box=[0,0,100,100];
  const figura=(tipo,atributos)=>({tipo,atributos,codigoLote:null,texto:null});
  assert.equal(figuraVinculable(figura('path',{d:'M0 0L10 10',fill:'#ffffff'}),box),false);
  assert.equal(figuraVinculable(figura('circle',{r:'3',fill:'#43b174'}),box),false);
  assert.equal(figuraVinculable(figura('polygon',{points:'0,0 100,0 100,100 0,100'}),box),false);
  assert.equal(figuraVinculable(figura('polygon',{points:'10,10 20,10 20,20 10,20',fill:'#c4f1dc'}),box),true);
});

test('guardar asociaciones usa cambios mínimos y los símbolos zoom no se duplican',()=>{
  const fs=require('node:fs'),path=require('node:path');
  const leer=p=>fs.readFileSync(path.resolve(__dirname,'../src',p),'utf8');
  const panel=leer('components/projects/detail/ProjectSvgPanel.tsx');
  const servicio=leer('services/projectSvgService.ts');
  assert.match(panel,/projectSvgService\.guardarAsociaciones\(proyecto,revision,cambios\)/);
  assert.match(panel,/e\.codigoLote!==documento\.elementos\[indice\]\?\.codigoLote/);
  assert.match(servicio,/svg\/asociaciones/);
  assert.doesNotMatch(panel,/icon=\{MinusIcon\}[^\n]*>−<\/Button>/);
  assert.doesNotMatch(panel,/icon=\{PlusIcon\}[^\n]*>\+<\/Button>/);
  assert.ok(panel.indexOf('Guardar vista SVG')>panel.indexOf('Salir de asociaciones'));
});
