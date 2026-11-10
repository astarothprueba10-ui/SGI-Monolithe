const test = require('node:test');
const assert = require('node:assert/strict');
const { automaticLeadNames, canLookupLead, clearAutomaticLeadNames, leadDocumentKey } = require('../src/lib/leadIdentity.ts');

const form = () => ({ names: '', paternalSurname: '', maternalSurname: '', phone: '987654321', email: 'prueba@example.com',
  tipoDocumento: 'DNI', numeroDocumento: '00000001', idProyecto: 1, origenCodigo: 'WEB', motivoContacto: 'Consulta', mensaje: '', idAsesor: '', direccion: '' });
const response = () => ({ tipoDocumento: 'DNI', numeroDocumento: '00000001', estado: 'ENCONTRADO', fuente: 'DNI', mensaje: 'Encontrado',
  persona: { nombres: 'Lucía María', apellidoPaterno: 'Prueba', apellidoMaterno: 'Ejemplo' } });

test('consulta solo documentos completos, conservando ceros iniciales', () => {
  for (const [tipoDocumento, numeroDocumento] of [['DNI','00000001'],['RUC','10000000001'],['CE','000000001'],['CE','000000000001'],['PASAPORTE','A00001']])
    assert.equal(canLookupLead({ tipoDocumento, numeroDocumento }), true);
  for (const [tipoDocumento, numeroDocumento] of [['DNI','1234567'],['DNI','123456789'],['DNI','ABCDEFGH'],['RUC','123'],['CE','12345678'],['PASAPORTE','A1234'],['OTRO','12345678']])
    assert.equal(canLookupLead({ tipoDocumento, numeroDocumento }), false);
  assert.equal(leadDocumentKey(form()), 'DNI:00000001');
});

test('completa nombres y apellidos sin inventar datos de contacto', () => {
  const original = form();
  const patch = automaticLeadNames(original, response());
  assert.deepEqual(patch, { names: 'Lucía María', paternalSurname: 'Prueba', maternalSurname: 'Ejemplo' });
  assert.equal(original.names, ''); assert.equal(original.phone, '987654321');
});

test('conserva el nombre escrito por el usuario durante la consulta', () => {
  const patch = automaticLeadNames({ ...form(), names: 'Nombre manual' }, response());
  assert.deepEqual(patch, { paternalSurname: 'Prueba', maternalSurname: 'Ejemplo' });
});

test('rechaza respuestas de otro documento, tipo o sin persona', () => {
  for (const changed of [{ numeroDocumento: '00000002' }, { tipoDocumento: 'CE' }, { persona: null }, { estado: 'NO_ENCONTRADO' }])
    assert.deepEqual(automaticLeadNames(form(), { ...response(), ...changed }), {});
});

test('al cambiar de documento elimina solo los datos completados automáticamente', () => {
  const automatic = automaticLeadNames(form(), response());
  const corrected = { ...form(), ...automatic, names: 'Nombre corregido' };
  assert.deepEqual(clearAutomaticLeadNames(corrected, automatic), { ...form(), names: 'Nombre corregido' });
  assert.equal(corrected.paternalSurname, 'Prueba');
});

test('un apellido ausente en la fuente permanece vacío', () => {
  assert.deepEqual(automaticLeadNames(form(), { ...response(), persona: { ...response().persona, apellidoMaterno: null } }),
    { names: 'Lucía María', paternalSurname: 'Prueba' });
});
