const assert = require('node:assert/strict');
const test = require('node:test');
const { normalizeEmailAddress } = require('../src/lib/emailAddress.ts');
const {
  filterNewWorkerPhone, getNewWorkerDocumentTypes, isNewWorkerDocumentAllowed,
  validateNewWorkerPhone, validateNewWorkerStartDate
} = require('../src/lib/newWorkerPolicy.ts');
const { validarCorreo } = require('../src/components/Workers/workerForm.ts');

test('el alta ofrece solo DNI y CE sin alterar el catálogo original', () => {
  const types = [
    { codigo: 'DNI', nombre: 'DNI' }, { codigo: 'CE', nombre: 'Carné de extranjería' },
    { codigo: 'PASAPORTE', nombre: 'Pasaporte' }, { codigo: 'RUC', nombre: 'RUC' },
    { codigo: '06', nombre: 'Registro Único de Contribuyentes' },
    { codigo: 'OTRO', nombre: 'RUC' }
  ];
  assert.deepEqual(getNewWorkerDocumentTypes(types).map((item) => item.codigo), ['DNI', 'CE']);
  assert.equal(types.length, 6);
});

test('los códigos oficiales de DNI y CE se reconocen sin depender de IDs fijos', () => {
  for (const codigo of ['DNI', 'dni', '01', '1', 'CE', 'ce', '04', '4']) {
    assert.equal(isNewWorkerDocumentAllowed({ codigo, nombre: '' }), true, codigo);
  }
  for (const codigo of ['PASAPORTE', 'RUC', '06', '6', 'OTRO', '']) {
    assert.equal(isNewWorkerDocumentAllowed({ codigo, nombre: 'Otro documento' }), false, codigo);
  }
});

test('el teléfono elimina caracteres no numéricos y limita escritura y pegado a nueve dígitos', () => {
  assert.equal(filterNewWorkerPhone('9855151651651'), '985515165');
  assert.equal(filterNewWorkerPhone('9a87 654-321'), '987654321');
  assert.equal(filterNewWorkerPhone('9876543210'), '987654321');
  assert.equal(filterNewWorkerPhone(''), '');
});

test('el teléfono opcional acepta nueve dígitos que empiezan por nueve', () => {
  for (const phone of ['', ' ', '987654321', '900000000', '999999999', ' 987654321 ']) {
    assert.equal(validateNewWorkerPhone(phone), undefined, phone);
  }
});

test('el teléfono rechaza prefijo incorrecto, longitud incorrecta y caracteres ajenos', () => {
  for (const phone of ['9', '98765432', '9876543210', '887654321', '012345678',
    '+51987654321', '987 654321', '98765a321', '９８７６５４３２１']) {
    assert.match(validateNewWorkerPhone(phone), /9 dígitos y comenzar con 9/, phone);
  }
});

test('la fecha de ingreso admite hoy y futuro, y rechaza ayer y fechas irreales', () => {
  const today = '2026-10-25';
  assert.equal(validateNewWorkerStartDate(today, today), undefined);
  assert.equal(validateNewWorkerStartDate('2026-10-26', today), undefined);
  assert.match(validateNewWorkerStartDate('2026-10-24', today), /hoy/);
  for (const date of ['', '2026-02-30', '25/10/2026', '0000-01-01', '2026-13-01']) {
    assert.ok(validateNewWorkerStartDate(date, today));
  }
  assert.equal(validateNewWorkerStartDate('2028-02-29', today), undefined);
});

test('la fecha de Perú no cambia a medianoche UTC y sí cambia a medianoche local', (context) => {
  context.mock.timers.enable({ apis: ['Date'], now: new Date('2026-10-26T04:59:59Z') });
  assert.equal(validateNewWorkerStartDate('2026-10-25'), undefined);
  context.mock.timers.tick(1000);
  assert.match(validateNewWorkerStartDate('2026-10-25'), /hoy/);
});

test('acepta proveedores diversos, dominios institucionales y alias sin lista cerrada', () => {
  const addresses = ['ana@gmail.com', 'ana@outlook.com', 'ana@hotmail.com', 'ana@yahoo.es',
    'ana@icloud.com', 'ana@utp.edu.pe', 'ana@empresa.com.pe', 'ana@area.mi-empresa.technology',
    'ana+ventas@empresa.pe', "o'connor@example.com", 'ana@empresa.museum',
    'ana@proton.me', 'ana@empresa.onmicrosoft.com', 'ana@empresa.co.uk', 'ana@empresa.solutions'];
  for (const address of addresses) {
    assert.equal(normalizeEmailAddress(address), address);
    assert.equal(validarCorreo(address), undefined);
  }
  assert.equal(normalizeEmailAddress(' Ana.Ventas@EMPRESA.COM.PE '), 'Ana.Ventas@empresa.com.pe');
  assert.equal(normalizeEmailAddress('ana@españa.es'), 'ana@xn--espaa-rta.es');
});

test('rechaza correos mal formados, listas de destinatarios e inyección de cabeceras', () => {
  for (const address of ['ana', 'a@@empresa.pe', 'a b@empresa.pe', '.ana@empresa.pe',
    'ana..ventas@empresa.pe', 'ana@-empresa.pe', 'ana@empresa..pe', 'ana@empresa.pe.',
    'ana@empresa.pe/otro', 'ana@empresa.pe:443', 'a@empresa.pe,b@otra.pe',
    'ana@empresa.pe\r\nBcc: otra@empresa.pe', `${'a'.repeat(65)}@empresa.pe`]) {
    assert.equal(normalizeEmailAddress(address), null, address);
    assert.ok(validarCorreo(address), address);
  }
  assert.equal(validarCorreo(''), undefined);
});
