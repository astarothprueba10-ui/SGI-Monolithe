const { test } = require('node:test');
const assert = require('node:assert/strict');
const { codigoLoteVinculado, vincularFigura, totalVinculados } = require('../src/lib/projectSvg.ts');
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
