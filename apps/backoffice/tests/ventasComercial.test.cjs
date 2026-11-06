const test=require('node:test');
const assert=require('node:assert/strict');
const {
  crearPeriodoComercial,filtrarVentas,limitarPorPeriodo,
  periodoValido,resumenMensualComercial,FILTROS_VENTAS_INICIALES
}=require('../src/utils/ventasComercial.ts');

const ventas=[
  {id:'VENTA-1',type:'Venta',buyer:'María Núñez',document:'00123456',code:'VTA-1',
    lot:'MZ-A-L01',project:'Los Cocos',advisor:'Asesor Uno',modality:'Contado',
    status:'PENDIENTE',amount:30000,dateIso:'2026-11-01T04:30:00Z'}, // Oct 31 en Lima
  {id:'VENTA-2',type:'Venta',buyer:'Pedro Torres',document:'12345678',code:'VTA-2',
    lot:'MZ-C-L03',project:'Los Cocos',advisor:'',modality:'Financiado',
    status:'CONTRATADA',amount:50000,dateIso:'2026-11-05T14:10:00Z'},
  {id:'SEPARACION-1',type:'Separación',buyer:'María Núñez',document:'00123456',
    code:'RES-1',lot:'MZ-A-L02',project:'Los Cocos',advisor:'Asesor Uno',
    status:'VIGENTE',amount:500,dateIso:'2026-11-05T15:15:00Z'}
];
test('período de tres meses toma meses calendario con huso Lima',()=>{
  const p=crearPeriodoComercial('tres_meses',new Date('2026-11-06T16:00:00Z'));
  assert.deepEqual({desde:p.desde,hasta:p.hasta},{desde:'2026-09-01',hasta:'2026-11-06'});
});
test('fecha cruzando medianoche UTC es octubre en Lima',()=>{
  const p={modo:'rango',desde:'2026-11-01',hasta:'2026-11-06'};
  assert.deepEqual(limitarPorPeriodo(ventas,p).map(v=>v.id),['VENTA-2','SEPARACION-1']);
});
test('filtros de ventas combinan nombre, modalidad, asesor, proyecto, estado y fechas',()=>{
  const f={...FILTROS_VENTAS_INICIALES,busqueda:'MARIA',modalidad:'Contado',
    asesor:'Asesor Uno',proyecto:'Los Cocos',estado:'PENDIENTE',
    desde:'2026-10-31',hasta:'2026-10-31'};
  assert.deepEqual(filtrarVentas(ventas,f).map(v=>v.id),['VENTA-1']);
});
test('filtra asesor sin asignar y conserva identificación inicial 0 en búsqueda',()=>{
  const f={...FILTROS_VENTAS_INICIALES,asesor:'__sin_asesor__'};
  assert.deepEqual(filtrarVentas(ventas,f).map(v=>v.id),['VENTA-2']);
  assert.deepEqual(filtrarVentas(ventas,{...f,asesor:'all',busqueda:'00123456'}).map(v=>v.id),['VENTA-1']);
});
test('periodo global no modifica tabla y gráfico distribuye por mes',()=>{
  const p={modo:'rango',desde:'2026-10-01',hasta:'2026-11-30'};
  assert.deepEqual(resumenMensualComercial(ventas,p),[
    {mes:'oct 26',separaciones:0,ventas:1},
    {mes:'nov 26',separaciones:1,ventas:1}
  ]);
  assert.equal(filtrarVentas(ventas,FILTROS_VENTAS_INICIALES).length,2);
});
test('rango invertido se rechaza y no muestra resultados equivocados',()=>{
  const p={modo:'rango',desde:'2026-12-01',hasta:'2026-11-01'};
  assert.equal(periodoValido(p),false);
  assert.equal(limitarPorPeriodo(ventas,p).length,0);
});
