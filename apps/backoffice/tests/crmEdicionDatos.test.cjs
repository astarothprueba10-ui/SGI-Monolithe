const test=require('node:test');
const assert=require('node:assert/strict');
const {validarDatosPersonales,normalizarDatoPersonal}=require('../src/utils/crmDatosPersonalesValidation.ts');
const valido={
 nombres:'Ana María',apellidoPaterno:'Pérez',apellidoMaterno:'Ñahui',
 telefono:'+51987654321',correo:'ana@example.com',tipoDocumento:'DNI',
 numeroDocumento:'12345678',direccion:'Av. Los Incas 123'
};
test('nombres, correo, teléfono, DNI y dirección correctos',()=>{
 assert.deepEqual(validarDatosPersonales(valido),{});
});
test('rechaza números en nombres y correo inválido',()=>{
 const errores=validarDatosPersonales({...valido,nombres:'Ana123',correo:'ana.@'});
 assert.ok(errores.nombres);
 assert.ok(errores.correo);
});
test('exige documento según formato y permite pasaporte alfanumérico',()=>{
 assert.ok(validarDatosPersonales({...valido,numeroDocumento:'1234567'}).numeroDocumento);
 assert.deepEqual(validarDatosPersonales({...valido,tipoDocumento:'PASAPORTE',
  numeroDocumento:'AB123456'}),{});
});
test('sanitiza letras, teléfono y documentos según selección',()=>{
 assert.equal(normalizarDatoPersonal('nombres','Ana2 María!','DNI'),'Ana María');
 assert.equal(normalizarDatoPersonal('telefono','+51 987 654 321','DNI'),'+51987654321');
 assert.equal(normalizarDatoPersonal('numeroDocumento','AB123#45','PASAPORTE'),'AB12345');
});
test('dirección opcional y limitada a 255 caracteres',()=>{
 assert.deepEqual(validarDatosPersonales({...valido,direccion:''}),{});
 assert.ok(validarDatosPersonales({...valido,direccion:'A'.repeat(256)}).direccion);
});
