const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const {selectedVisualLot,focusBox,hasSvgLot,fitVisualBox,clampVisualBox,zoomVisualBox,matrixFocusBox}=require('../src/lib/lotVisualFocus.ts');
const lot=(id,project=2,activo=true)=>({idLote:id,idProyecto:project,idManzana:1,codigo:'L'+id,activo});
const lots=[lot(1),lot(2),lot(3,3),lot(4,2,false)];
test('previsualiza candidatos antes de confirmar y limita al inventario autorizado del proyecto',()=>{
  assert.equal(selectedVisualLot(lots,2,'1',true,'2',false,'')?.idLote,2);
  assert.equal(selectedVisualLot(lots,2,'1',false,'',true,'2')?.idLote,2);
  assert.equal(selectedVisualLot(lots,2,'1',false,'2',false,'2')?.idLote,1);
  assert.equal(selectedVisualLot(lots,2,'1',true,'3',false,''),null);
  assert.equal(selectedVisualLot(lots,2,'4',false,'',false,''),null);
});
test('encuadre contiene el lote y los vecinos dentro del plano',()=>{
  const box=focusBox([0,0,1000,800],[400,300,60,50],[[470,300,60,50],[540,300,60,50]]);
  assert.ok(box[0]<=400&&box[1]<=300&&box[0]+box[2]>=600&&box[1]+box[3]>=350);
  assert.ok(box[2]<1000&&box[3]<800);
  const edge=focusBox([0,0,1000,800],[0,0,60,50],[]);
  assert.equal(edge[0],0);assert.equal(edge[1],0);
});
test('SVG incompleto o con asociaciones de texto no suplanta a matriz',()=>{
  const doc={viewBox:[0,0,100,100],elementos:[
    {tipo:'text',atributos:{x:'10',y:'20'},codigoLote:'L1',texto:'450 m2'},
    {tipo:'polygon',atributos:{points:'10,10 20,10 20,20 10,20',fill:'#ffffff'},codigoLote:'L2',texto:null}
  ]};
  assert.equal(hasSvgLot(doc,lots[0]),false);
  assert.equal(hasSvgLot(doc,lots[1]),true);
  assert.equal(hasSvgLot(null,lots[1]),false);
});
test('el visor es de solo lectura y permanece fuera del formulario de registro',()=>{
  const read=p=>fs.readFileSync(path.resolve(__dirname,'../src',p),'utf8');
  const sales=read('pages/Sales.tsx'),panel=read('components/sales/LotVisualPickerPanel.tsx');
  assert.match(sales,/mostrarVisorSeparacion=opType==='Separacion' && can\('lots.view'\)/);
  assert.match(sales,/<\/fieldset><\/form>\s*\{mostrarVisorSeparacion&&<aside/);
  assert.match(panel,/commercialLotService\.listarMapa\(project\)/);
  assert.match(panel,/coreService\.getCurrentMatrix\(project\)/);
  assert.match(panel,/projectSvgService\.obtener\(project\)/);
  assert.match(panel,/\},\[project,retry\]\)/);
  assert.match(panel,/miniatura vista=/);
  assert.doesNotMatch(panel,/crmBackend|guardarAsociaciones|saveLotMatrix|registrarSeparacion/);
});

test('las tarjetas permiten consultar principal o adicionales sin cambiar la selección comercial',()=>{
  assert.equal(selectedVisualLot(lots,2,'1',false,'',false,'',2,[2])?.idLote,2);
  assert.equal(selectedVisualLot(lots,2,'1',false,'',false,'',1,[2])?.idLote,1);
  assert.equal(selectedVisualLot(lots,2,'1',false,'',false,'',2,[])?.idLote,1);
  assert.equal(selectedVisualLot(lots,2,'1',false,'',false,'',3,[3]),null);
  const sales=fs.readFileSync(path.resolve(__dirname,'../src/pages/Sales.tsx'),'utf8');
  assert.match(sales,/onClick=\{\(\)=>consultarUbicacion\(lotePrincipal.idLote\)\}/);
  assert.match(sales,/onClick=\{\(\)=>consultarUbicacion\(l.idLote\)\}/);
  assert.match(sales,/consultarUbicacion\(lote.idLote\);/);
  assert.match(sales,/focusRevision=\{revisionEnfoque\}/);
});
test('la cámara conserva proporciones, acota el desplazamiento y permite ampliar ambas vistas',()=>{
  const full=fitVisualBox([0,0,1000,800],1.5);
  assert.equal(full[2]/full[3],1.5);
  const focus=clampVisualBox(full,fitVisualBox(matrixFocusBox([0,0,1000,800],[400,300,68,55]),1.5));
  assert.ok(focus[2]<full[2]&&focus[3]<full[3]);
  assert.ok(focus[0]<=400&&focus[0]+focus[2]>=468);
  const bigger=zoomVisualBox(full,focus,1.35);
  assert.ok(bigger[2]<focus[2]);
  const smaller=zoomVisualBox(full,bigger,1/1.35);
  assert.ok(Math.abs(smaller[2]-focus[2])<1e-6);
  const dragged=clampVisualBox(full,[-10000,10000,bigger[2],bigger[3]]);
  assert.ok(dragged[0]>=full[0]&&dragged[1]+dragged[3]<=full[1]+full[3]+1e-6);
  assert.deepEqual(zoomVisualBox(full,focus,.0001),full);
  assert.ok(Math.abs(zoomVisualBox(full,focus,1000)[2]-full[2]/24)<1e-6);
  const read=p=>fs.readFileSync(path.resolve(__dirname,'../src/components/sales',p),'utf8');
  assert.equal((read('LotVisualPickerPanel.tsx').match(/<LotVisualViewport /g)||[]).length,2);
  assert.match(read('LotVisualViewport.tsx'),/setPointerCapture/);
  assert.match(read('LotVisualViewport.tsx'),/getScreenCTM/);
});
