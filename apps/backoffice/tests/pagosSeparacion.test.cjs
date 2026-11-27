const test=require('node:test');
const assert=require('node:assert/strict');
const {crearPagoSeparacion,resolverPagosSeparacion,validarPagosSeparacion,centavosImporte,errorComprobanteSeparacion}=require('../src/utils/pagosSeparacion.ts');
const pago=(id,monto,opts={})=>({...crearPagoSeparacion(id,monto),referencia:'OP-'+id,archivo:{name:'voucher.pdf',size:100,type:'application/pdf'},hashSha256:String(id).padStart(64,'0'),...opts});
test('un pago cubre varios lotes; se calcula el importe sin asociarlo a un lote',()=>{
 const p=resolverPagosSeparacion([pago(1,null)],1000);
 assert.equal(p[0].monto,'1000.00');
 assert.equal(validarPagosSeparacion(p,1000).valido,true);
});
test('pagos parciales se suman exactamente en centavos, incluidos distintos métodos',()=>{
 const r=validarPagosSeparacion([pago(1,'700'),pago(2,'300',{metodo:'YAPE_PLIN'})],1000);
 assert.equal(r.valido,true);assert.equal(r.registrado,100000);
 assert.equal(validarPagosSeparacion([pago(1,'0.1'),pago(2,'0,20')],0.3).valido,true);
});
test('bloquea faltantes, exceso, decimales inválidos y montos no positivos',()=>{
 assert.equal(validarPagosSeparacion([pago(1,'999.99')],1000).diferencia,1);
 assert.equal(validarPagosSeparacion([pago(1,'1000.01')],1000).diferencia,-1);
 for(const v of ['0','-10','1.001','1e3','', 'Infinity'])assert.equal(centavosImporte(v),null);
 assert.equal(validarPagosSeparacion([pago(1,'1000.01')],1000).valido,false);
});
test('bloquea archivos ausentes, verificaciones pendientes, duplicados y referencias repetidas',()=>{
 for(const cambio of [{archivo:null},{verificandoArchivo:true},{hashSha256:null},{referencia:''}])
   assert.equal(validarPagosSeparacion([pago(1,'1000',cambio)],1000).valido,false);
 assert.equal(validarPagosSeparacion([pago(1,'500'),pago(2,'500',{hashSha256:'1'.padStart(64,'0')})],1000).valido,false);
 assert.equal(validarPagosSeparacion([pago(1,'500'),pago(2,'500',{referencia:' op-1 '})],1000).valido,false);
 assert.equal(validarPagosSeparacion([pago(1,'1000',{metodo:'EFECTIVO',referencia:''})],1000).valido,true);
});
test('valida límite de archivos y conserva importe declarado al cambiar el total',()=>{
 assert.ok(errorComprobanteSeparacion({name:'voucher.pdf',size:5242881,type:'application/pdf'}));
 assert.ok(errorComprobanteSeparacion({name:'voucher.exe',size:100,type:'application/octet-stream'}));
 assert.equal(validarPagosSeparacion(resolverPagosSeparacion([pago(1,'500')],1000),1000).diferencia,50000);
});

test('efectivo no exige adjuntar archivo y otros métodos conservan la validación',()=>{
 const sinArchivo={archivo:null,hashSha256:null,referencia:''};
 assert.equal(validarPagosSeparacion([pago(1,'500',{...sinArchivo,metodo:'EFECTIVO'})],500).valido,true);
 for(const metodo of ['TRANSFERENCIA','DEPOSITO','YAPE_PLIN','OTRO'])
   assert.equal(validarPagosSeparacion([pago(1,'500',{...sinArchivo,metodo})],500).valido,false);
 assert.equal(validarPagosSeparacion([pago(1,'250',{...sinArchivo,metodo:'EFECTIVO'}),pago(2,'250')],500).valido,true);
 assert.equal(validarPagosSeparacion([pago(1,'499',{...sinArchivo,metodo:'EFECTIVO'})],500).valido,false);
 assert.equal(validarPagosSeparacion([pago(1,'500',{metodo:'EFECTIVO',hashSha256:null})],500).valido,false);
});
