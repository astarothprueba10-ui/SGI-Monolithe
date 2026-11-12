const test = require('node:test');
const assert = require('node:assert/strict');
const { formatPersonName } = require('../src/lib/personName.ts');
const { createInitialWorkerForm, buildWorkerUpdatePayload, filtrarCaracteresNombre } = require('../src/components/Workers/workerForm.ts');
const { canLookupWorker, workerDocumentKey, automaticWorkerNames, clearAutomaticWorkerIdentity, validateWorkerIdentity } = require('../src/lib/workerIdentity.ts');
const dni = { idTipoDocumento: 17, codigo: 'DNI', nombre: 'DNI', longitudMinima: 8, longitudMaxima: 8, soloNumerico: true };
const ce = { ...dni, idTipoDocumento: 19, codigo: 'CE', longitudMinima: 9, longitudMaxima: 12 };
const form = () => ({ ...createInitialWorkerForm(), idTipoDocumento: '17', numeroDocumento: '00000001' });
const response = () => ({ idTipoDocumento: 17, numeroDocumento: '00000001', estado: 'ENCONTRADO', fuente: 'DNI', personaRegistrada: null,
  persona: { nombres: 'CESAR JAVIER', apellidoPaterno: 'ROJAS', apellidoMaterno: 'YAIPEN' }, mensaje: 'Encontrado' });

test('normaliza mayúsculas, minúsculas, tildes, espacios y nombres compuestos', () => {
  for (const [input, output] of [['CESAR JAVIER ROJAS', 'Cesar Javier Rojas'], ['cesar javier', 'Cesar Javier'], ['cEsAr jAvIeR', 'Cesar Javier'],
    ['  MARÍA   ÁNGELA ÑAUPA  ', 'María Ángela Ñaupa'], ['JUAN-CARLOS', 'Juan-Carlos'], ["O’NEILL", "O’Neill"], ['de la cruz', 'De La Cruz'], ['MARI\u0301A', 'María']]) {
    assert.equal(formatPersonName(input), output); assert.equal(formatPersonName(output), output);
  }
});

test('no inventa datos ausentes ni elimina números para evadir validaciones', () => {
  for (const value of [null, undefined, '', '  ']) assert.equal(formatPersonName(value), '');
  assert.equal(formatPersonName('JUAN123'), 'Juan123');
  assert.equal(filtrarCaracteresNombre('MARI\u0301A'), 'MARÍA');
});

test('espera DNI completo y conserva ceros iniciales', () => {
  assert.equal(canLookupWorker(form(), dni), true); assert.equal(workerDocumentKey(form()), '17:00000001');
  for (const value of ['', '1234567', '123456789', 'ABCDEFGH', '1234 678']) assert.equal(canLookupWorker({ ...form(), numeroDocumento: value }, dni), false);
});

test('admite solo tipos personales permitidos aunque otro tipo esté en el catálogo', () => {
  assert.equal(canLookupWorker({ ...form(), idTipoDocumento: '19', numeroDocumento: '000000001' }, ce), true);
  assert.equal(canLookupWorker({ ...form(), numeroDocumento: '10000000001' }, { ...dni, codigo: 'RUC', longitudMinima: 11, longitudMaxima: 11 }), false);
  assert.equal(canLookupWorker(form(), undefined), false);
});

test('los alias DNI y CE conservan sus reglas de longitud', () => {
  for (const codigo of ['DNI', '01', '1']) assert.equal(canLookupWorker(form(), { ...dni, codigo }), true);
  for (const codigo of ['CE', '04', '4']) assert.equal(canLookupWorker({ ...form(), numeroDocumento: '000000001' }, { ...ce, codigo }), true);
});

test('completa solo nombres normalizados sin inventar idPersona ni datos de contacto', () => {
  const patch = automaticWorkerNames(form(), {}, response());
  assert.deepEqual(patch, { nombres: 'Cesar Javier', apellidoPaterno: 'Rojas', apellidoMaterno: 'Yaipen' });
  for (const field of ['idPersona', 'correoElectronico', 'telefono', 'fechaNacimiento', 'direccion']) assert.equal(field in patch, false);
});

test('conserva correcciones manuales escritas mientras llega la consulta', () => {
  const patch = automaticWorkerNames({ ...form(), nombres: 'Nombre manual' }, {}, response());
  assert.deepEqual(patch, { apellidoPaterno: 'Rojas', apellidoMaterno: 'Yaipen' });
});

test('las personas locales deben confirmarse y no se completan automáticamente', () => {
  assert.deepEqual(automaticWorkerNames(form(), {}, { ...response(), fuente: 'MONOLITHE', personaRegistrada: { idPersona: 77 } }), {});
});

test('el documento anterior no completa el formulario nuevo', () => {
  assert.deepEqual(automaticWorkerNames({ ...form(), numeroDocumento: '00000002' }, {}, response()), {});
  assert.throws(() => validateWorkerIdentity(form(), { ...response(), numeroDocumento: '00000002' }));
});

test('al cambiar documento limpia datos automáticos y conserva los manuales', () => {
  const automatic = automaticWorkerNames(form(), {}, response());
  const current = { ...form(), ...automatic, apellidoMaterno: 'Corrección manual', telefono: '987654321' };
  const cleared = clearAutomaticWorkerIdentity(current, automatic);
  assert.equal(cleared.nombres, ''); assert.equal(cleared.apellidoPaterno, '');
  assert.equal(cleared.apellidoMaterno, 'Corrección manual'); assert.equal(cleared.telefono, '987654321');
});

test('sin resultados o API no disponible no altera nombres manuales', () => {
  for (const estado of ['NO_ENCONTRADO', 'NO_DISPONIBLE']) assert.deepEqual(automaticWorkerNames(form(), {}, { ...response(), estado, persona: null }), {});
});

test('rechaza respuestas con nombres inválidos o identificadores ficticios', () => {
  assert.throws(() => validateWorkerIdentity(form(), { ...response(), persona: null }));
  assert.throws(() => validateWorkerIdentity(form(), { ...response(), persona: { ...response().persona, nombres: 'JUAN123' } }));
  assert.throws(() => validateWorkerIdentity(form(), { ...response(), personaRegistrada: { idPersona: -1 } }));
});

test('la edición envía nombres normalizados y solo los campos modificados', () => {
  const payload = buildWorkerUpdatePayload({ ...form(), nombres: 'cEsAr jAvIeR', apellidoPaterno: 'ROJAS' }, new Set(['nombres', 'apellidoPaterno']), {});
  assert.deepEqual(payload, { informacionPersonal: { nombres: 'Cesar Javier', apellidoPaterno: 'Rojas' } });
});
