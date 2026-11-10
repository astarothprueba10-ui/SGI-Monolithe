const test = require('node:test');
const assert = require('node:assert/strict');
const { PHONE_COUNTRIES, phoneCountry, searchPhoneCountries, phoneCountryHint } = require('../src/lib/phoneCountries.ts');
const { leadPhoneError, serializeLeadPhone, pastedLeadPhone } = require('../src/lib/leadPhone.ts');
const { validarNuevoLead } = require('../src/utils/crmLeadValidation.ts');

const form = () => ({ names: 'Lucía', paternalSurname: 'Prueba', maternalSurname: 'Ejemplo', phone: '987654321', phoneCountry: 'PE',
  email: 'prueba@example.com', idProyecto: 1, origenCodigo: 'WEB', motivoContacto: 'Consulta de un lote', mensaje: '', idAsesor: '',
  tipoDocumento: 'DNI', numeroDocumento: '00000001', direccion: '' });

test('Perú exige nueve cifras y el primer dígito nueve', () => {
  for (const phone of ['987654321', '912345678', '999999999']) assert.equal(leadPhoneError(phone, 'PE'), undefined);
  for (const phone of ['', '98765432', '9876543210', '812345678', '+51987654321', '98765a321', '987 654321']) assert.ok(leadPhoneError(phone, 'PE'), phone);
  assert.equal(phoneCountry('PE').callingCode, '51'); assert.deepEqual(phoneCountry('PE').lengths, [9]);
});

test('cada plan móvil disponible acepta su ejemplo nacional', () => {
  const available = PHONE_COUNTRIES.filter(country => country.lengths.length);
  assert.equal(PHONE_COUNTRIES.length, 245); assert.equal(available.length, 244);
  for (const country of available) assert.equal(leadPhoneError(country.example, country.code), undefined, country.code);
  assert.ok(leadPhoneError('8999', 'TA')); assert.ok(leadPhoneError('987654321', 'ZZ'));
});

test('longitudes móviles exactas para países con formatos distintos', () => {
  for (const [country, lengths] of [['EC',[9]],['CO',[10]],['US',[10]],['ES',[9]],['DE',[10,11]],['BR',[10,11]],['CN',[11]]])
    assert.deepEqual(phoneCountry(country).lengths, lengths, country);
  for (const [country, value] of [['CO','321123456'],['US','201555012'],['ES','6123456780'],['DE','151234567890'],['CN','1312345678']])
    assert.ok(leadPhoneError(value, country), country);
});

test('rechaza prefijos que no pertenecen al plan móvil seleccionado', () => {
  for (const [country, value] of [['ES','912345678'],['CO','2211234567'],['EC','812345678'],['CA','2015550123'],['US','5062345678']])
    assert.ok(leadPhoneError(value, country), country);
});

test('los territorios que comparten prefijo aceptan sus reglas propias', () => {
  for (const country of ['VA','IM','CX','AX','CC','EH','BL','MF','SJ']) {
    const choice = phoneCountry(country);
    assert.equal(leadPhoneError(choice.example, country), undefined, country);
  }
});

test('busca por nombre español sin tildes, código ISO y prefijo', () => {
  assert.equal(searchPhoneCountries('peru')[0].code, 'PE'); assert.equal(searchPhoneCountries('PE')[0].code, 'PE');
  assert.equal(searchPhoneCountries('Mexico')[0].code, 'MX');
  assert.deepEqual(searchPhoneCountries('+51').map(country => country.code), ['PE']);
  assert.equal(searchPhoneCountries('593')[0].code, 'EC');
  assert.equal(searchPhoneCountries('sin coincidencias').length, 0);
});

test('guarda Perú como antes y los otros países con prefijo internacional', () => {
  assert.equal(serializeLeadPhone('987654321','PE'), '987654321');
  assert.equal(serializeLeadPhone('3211234567','CO'), '+573211234567');
  assert.equal(serializeLeadPhone('612345678','ES'), '+34612345678');
  assert.throws(() => serializeLeadPhone('812345678','PE'));
  assert.equal(leadPhoneError('+51987654321'), undefined);
});

test('normaliza el pegado completo y los separadores sin alterar los dígitos', () => {
  assert.deepEqual(pastedLeadPhone('+51 987 654 321','PE'), { value: '987654321' });
  assert.deepEqual(pastedLeadPhone('(987) 654-321','PE'), { value: '987654321' });
  assert.deepEqual(pastedLeadPhone('06 12 34 56 78','FR'), { value: '612345678' });
  assert.deepEqual(pastedLeadPhone('+57 321 123 4567','CO'), { value: '3211234567' });
});

test('rechaza el pegado excesivo, con otro prefijo o con letras', () => {
  for (const [value, country] of [['987654321000','PE'],['+34612345678','PE'],['+51 987654321999','PE'],['telefono 987654321','PE']])
    assert.ok(pastedLeadPhone(value, country).error, value);
});

test('el formulario bloquea un pegado rechazado aunque el valor anterior fuera válido', () => {
  assert.equal(validarNuevoLead(form()).phone, undefined);
  assert.match(validarNuevoLead({ ...form(), phoneInputError: 'Pegado demasiado largo' }).phone, /largo/);
  assert.ok(validarNuevoLead({ ...form(), phone: '812345678' }).phone);
  assert.equal(validarNuevoLead({ ...form(), phoneCountry: 'CO', phone: '3211234567' }).phone, undefined);
  assert.match(phoneCountryHint('PE'), /comenzar por 9/);
});
