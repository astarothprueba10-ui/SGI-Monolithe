const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const {selectedVisualLot,focusBox,hasSvgLot,fitVisualBox,clampVisualBox,zoomVisualBox,matrixFocusBox,visualLotAction,interpolateVisualBox,sameVisualBox}=require('../src/lib/lotVisualFocus.ts');
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
test('el visor no escribe datos por sí mismo y permanece fuera del formulario de registro',()=>{
  const read=p=>fs.readFileSync(path.resolve(__dirname,'../src',p),'utf8');
  const sales=read('pages/Sales.tsx'),panel=read('components/sales/LotVisualPickerPanel.tsx');
  assert.match(sales,/mostrarVisorSeparacion=opType==='Separacion' && can\('lots.view'\)/);
  assert.match(sales,/<\/fieldset><\/form>\s*\{mostrarVisorOperacion&&<aside/);
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

test('seleccionar desde el plano respeta el flujo de confirmación y el límite de adicionales',()=>{
  const base={operation:'Separacion',principal:0,adicionales:[],editorPrincipal:false,editorAdicional:false,
    puedeAgregar:false,bloqueado:false,reservasBloqueadas:false,reservas:[]};
  const action=(id,options={})=>visualLotAction(id,2,lots,{...base,...options});
  assert.equal(action(1),'principal');
  assert.equal(action(2,{principal:1,editorPrincipal:true}),'principal');
  assert.equal(action(2,{principal:1,puedeAgregar:true}),'adicional');
  assert.equal(action(2,{principal:1,editorAdicional:true}),'ninguna');
  assert.equal(action(2,{principal:1,adicionales:[2]}),'consultar');
  assert.equal(action(3),'ninguna');
  assert.equal(action(4),'ninguna');
  assert.equal(action(1,{bloqueado:true}),'ninguna');
});
test('ventas solo selecciona lotes del listado autorizado y nunca sustituye una reserva vigente',()=>{
  const base={operation:'Venta',principal:1,adicionales:[],editorPrincipal:false,editorAdicional:false,
    puedeAgregar:false,bloqueado:false,reservasBloqueadas:false,reservas:[]};
  const action=(id,options={})=>visualLotAction(id,2,lots,{...base,...options});
  assert.equal(action(2),'venta');
  assert.equal(action(1),'consultar');
  assert.equal(action(2,{reservasBloqueadas:true,reservas:[1]}),'ninguna');
  assert.equal(action(1,{reservasBloqueadas:true,reservas:[1]}),'consultar');
  assert.equal(visualLotAction(2,2,[lots[0]],base),'ninguna');
  assert.equal(action(3),'ninguna');
});
test('la interacción compartida conserva permisos, selección por teclado y separación de arrastre',()=>{
  const read=p=>fs.readFileSync(path.resolve(__dirname,'../src',p),'utf8');
  const sales=read('pages/Sales.tsx'),panel=read('components/sales/LotVisualPickerPanel.tsx');
  const viewport=read('components/sales/LotVisualViewport.tsx'),svg=read('components/projects/detail/PlanSvgShapes.tsx');
  assert.match(sales,/mostrarVisorOperacion=can\('lots.view'\)/);
  assert.match(sales,/lotesVisorOperacion=opType==='Venta'\?\(asociacionAgrupadaPendiente\?availableLots:lotesVentaProyecto\):lotesDisponiblesProyecto/);
  assert.match(sales,/reservasBloqueadas:tieneReservasVenta\|\|!!asociacionAgrupadaPendiente/);
  assert.match(sales,/onPick=\{seleccionarDesdePlano\}/);
  assert.match(panel,/selectable.has\(lot.idLote\)/);
  assert.match(panel,/lotesSeleccionables=\{selectable\}/);
  assert.match(svg,/lotesSeleccionables\?\.has\(lote.idLote\)/);
  assert.match(viewport,/Math.hypot\(e.clientX-d.x,e.clientY-d.y\)<5/);
  assert.match(viewport,/onClickCapture/);
});

test('transición de cámara conserva extremos, proporciones y encuadre dentro del plano',()=>{
  const full=fitVisualBox([0,0,1000,800],1.5);
  const target=zoomVisualBox(full,full,3);
  assert.ok(sameVisualBox(interpolateVisualBox(full,target,0),full));
  assert.ok(sameVisualBox(interpolateVisualBox(full,target,1),target));
  assert.ok(sameVisualBox(interpolateVisualBox(full,target,-1),full));
  assert.ok(sameVisualBox(interpolateVisualBox(full,target,2),target));
  let last=full;
  for(let i=1;i<=20;i++){
    const box=interpolateVisualBox(full,target,i/20);
    assert.ok(Math.abs(box[2]/box[3]-1.5)<1e-6);
    assert.ok(box[2]<=last[2]+1e-6);
    assert.ok(sameVisualBox(box,clampVisualBox(full,box)));
    last=box;
  }
});
test('el visor conserva las figuras durante el zoom y respeta movimiento reducido',()=>{
  const read=p=>fs.readFileSync(path.resolve(__dirname,'../src',p),'utf8');
  const panel=read('components/sales/LotVisualPickerPanel.tsx');
  const viewport=read('components/sales/LotVisualViewport.tsx');
  const svg=read('components/projects/detail/PlanSvgShapes.tsx');
  const sales=read('pages/Sales.tsx');
  assert.match(viewport,/prefers-reduced-motion: reduce/);
  assert.match(viewport,/interpolateVisualBox\(previous,next,t\)/);
  assert.match(viewport,/dragFrame.current===null/);
  assert.match(viewport,/cancelAnimationFrame/);
  assert.match(viewport,/manual\?\.key===resetKey/);
  assert.match(svg,/const figuras=useMemo/);
  assert.match(panel,/const shapes=<>/);
  assert.match(panel,/measurements.current=\{document,lots,boxes\}/);
  assert.doesNotMatch(panel,/key=\{\x60(?:svg|matriz)-\$\{selected/);
  assert.match(panel,/resetKey=\{resetKey\}/);
  assert.match(sales,/operacion-lotes-formulario/);
  assert.match(sales,/operacion-lotes-visor/);
  assert.match(sales,/lg:overflow-y-auto/);
  assert.match(sales,/Volver a lotes seleccionados/);
});

test('venta mixta consulta reservas y permite añadir lotes disponibles sin sustituirlas',()=>{
 const base={operation:'Venta',principal:1,adicionales:[],editorPrincipal:false,editorAdicional:false,
   puedeAgregar:true,bloqueado:false,reservasBloqueadas:true,reservas:[1],ventaMultiple:true};
 const action=(id,opts={})=>visualLotAction(id,2,lots,{...base,...opts});
 assert.equal(action(1),'consultar');
 assert.equal(action(2),'adicional');
 assert.equal(action(2,{adicionales:[2]}),'consultar');
 assert.equal(action(2,{puedeAgregar:false}),'ninguna');
 assert.equal(action(3),'ninguna');
 assert.equal(action(4),'ninguna');
 assert.equal(action(2,{principal:0,reservas:[],reservasBloqueadas:false}),'venta');
 assert.equal(action(2,{ventaMultiple:false}),'ninguna');
 assert.equal(action(2,{bloqueado:true}),'ninguna');
});

test('formalización conserva crédito y contrato por lote sin inventar reservas',()=>{
 const read=p=>fs.readFileSync(path.resolve(__dirname,'../src',p),'utf8');
 const panel=read('components/sales/FormalizacionMultiplePanel.tsx');
 const sales=read('pages/Sales.tsx');
 assert.match(panel,/reserva:CrmReservaVigenteVenta\|null/);
 assert.match(panel,/l\.reserva\?\.montoReservaAplicable\?\?0/);
 assert.match(panel,/idProyecto:Number\(l.idProyecto\),reserva:null/);
 assert.match(panel,/creditoEsperado:credito\(d\),pagoEsperado:importe/);
 assert.match(panel,/crmBackend\.registrarVentasMultiples\(ventas\)/);
 assert.match(panel,/!habilitado\(d.lote\)/);
 assert.match(sales,/directos=\{ventaDirectos\}/);
 assert.match(sales,/onQuitarDirecto=/);
 assert.match(sales,/await crmBackend\.registrarVentaPendiente/);
});

test('cambio de reserva pendiente bloquea preparación, permite consultar y no afecta separaciones',()=>{
 const read=p=>fs.readFileSync(path.resolve(__dirname,'../src',p),'utf8');
 const sales=read('pages/Sales.tsx'),panel=read('components/sales/CambiosReservaPanel.tsx');
 assert.match(sales,/opType==='Venta'\?crmBackend\.listarCambiosReserva\(id\)/);
 assert.match(sales,/consultaCambios\.items\.filter\(c=>c.estado==='PENDIENTE'\)/);
 assert.match(sales,/if\(pendientes.length\)return/);
 assert.match(sales,/ventaBloqueadaPorCambio=opType==='Venta'/);
 assert.match(sales,/!ventaBloqueadaPorCambio&&<\s*>/);
 assert.match(sales,/!ventaBloqueadaPorCambio&&!formalizacionMultiple/);
 assert.match(sales,/mostrarVisorOperacion=can\('lots.view'\)&&!ventaBloqueadaPorCambio/);
 assert.match(sales,/cerrarModalOperacion\(\);setTab\('CambiosReserva'\)/);
 assert.match(sales,/Actualizar estado/);
 assert.match(sales,/onSolicitudPendiente=\{c=>/);
 assert.match(panel,/const respuesta=await crmBackend.solicitarCambioReserva/);
 assert.match(panel,/onSolicitudPendiente\(\{idSolicitud:respuesta.idSolicitud/);
});

test('solicitud aprobada recupera la reserva exacta y las preferencias sin reutilizar pagos',()=>{
 const read=p=>fs.readFileSync(path.resolve(__dirname,'../src',p),'utf8');
 const sales=read('pages/Sales.tsx'),panel=read('components/sales/CambiosReservaPanel.tsx'),multi=read('components/sales/FormalizacionMultiplePanel.tsx');
 assert.match(panel,/s.estado==='APROBADA'&&s.puedeRecuperar&&onRecuperar/);
 assert.match(panel,/Recuperar proceso de venta/);
 assert.match(panel,/preparacionVenta:obtenerPreparacion\(\)/);
 assert.match(sales,/handleSelectProspect\(solicitud.idProspecto,solicitud\)/);
 assert.match(sales,/c.idSolicitud===recuperar.idSolicitud&&c.estado==='APROBADA'&&c.puedeRecuperar/);
 assert.match(sales,/r.idReserva===vigente\?\.idReserva&&r.idLote===vigente\?\.idLoteNuevo/);
 assert.match(sales,/l.codigoEstadoLote==='DISPONIBLE'&&permitidos.has\(l.idLote\)/);
 assert.match(sales,/setPreferenciasRecuperadas\(preparacion\?\.lotes\?\?\[\]\)/);
 assert.match(sales,/setFormObservations\(preparacion\?\.observaciones\?\?''\)/);
 assert.match(multi,/a.idReserva===lote.reserva.idReserva/);
 assert.match(multi,/metodo:guardada\?\.metodo\?\?'TRANSFERENCIA',referencia:'',archivo:null/);
 assert.match(multi,/politica.modoInicial==='FIJA'\?String\(inicial\):guardada\?\.inicial/);
});
