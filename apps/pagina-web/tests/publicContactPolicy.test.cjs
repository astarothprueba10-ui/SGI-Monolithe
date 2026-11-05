const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const filename = path.join(__dirname, '../src/lib/publicContactPolicy.ts');
const compiled = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
  compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS }
}).outputText;
const sandbox = { exports: {} };
vm.runInNewContext(compiled, sandbox, { filename });
const p = sandbox.exports;

for (const value of ['María José', 'Muñoz Peña', 'ÁÉÍÓÚ Ü Ñ', 'Jose\u0301', '李 明']) {
  test(`acepta nombres con letras: ${value}`, () => assert.equal(p.esNombrePublicoValido(value), true));
}

for (const value of ['', '   ', '56564', 'María123', 'Ana@', 'Juan-Pérez', '\u0301']) {
  test(`rechaza nombres inválidos: ${JSON.stringify(value)}`, () => assert.equal(p.esNombrePublicoValido(value), false));
}

test('filtra caracteres y normaliza tildes y espacios pegados', () => {
  assert.equal(p.filtrarNombrePublico('Mari\u0301a123 @Peña!'), 'María Peña');
  assert.equal(p.filtrarNombrePublico('Juan\tPérez\u00a0Díaz'), 'Juan Pérez Díaz');
});

test('exige exactamente nueve dígitos y un nueve inicial', () => {
  assert.equal(p.esCelularPublicoValido('987654321'), true);
  for (const value of ['', '98765432', '9876543210', '887654321', '987 654 321', '+51987654321', '9abcdefgh']) {
    assert.equal(p.esCelularPublicoValido(value), false, value);
  }
});

test('impide iniciar el celular con otro dígito y permite borrar el campo', () => {
  assert.equal(p.filtrarCelularPublico('8'), '');
  assert.equal(p.filtrarCelularPublico('812345678', '987654321'), '987654321');
  assert.equal(p.filtrarCelularPublico('', '987654321'), '');
});

test('filtra letras y limita los celulares pegados a nueve dígitos', () => {
  assert.equal(p.filtrarCelularPublico('9abc876 543 21000'), '987654321');
  assert.equal(p.filtrarCelularPublico('+51 987654321'), '');
});

test('el DNI opcional exige ocho dígitos cuando se completa', () => {
  for (const value of ['', '12345678', '01234567']) assert.equal(p.esDniPublicoValido(value), true);
  for (const value of ['1', '1234567', '123456789', '1234abcd', '1234 5678', ' ']) {
    assert.equal(p.esDniPublicoValido(value), false, value);
  }
});

test('conserva los ceros iniciales del DNI y limita su longitud', () => {
  assert.equal(p.filtrarDniPublico('0a123456789'), '01234567');
});

test('aplica las mismas reglas a Inicio y Contacto sin modificar correos', () => {
  for (const field of ['name', 'nombres', 'apellidos']) assert.equal(p.normalizarCampoPublico(field, 'María123', ''), 'María');
  for (const field of ['phone', 'telefono']) assert.equal(p.normalizarCampoPublico(field, '9876543210', ''), '987654321');
  assert.equal(p.normalizarCampoPublico('dni', '012345678', ''), '01234567');
  assert.equal(p.normalizarCampoPublico('correo', 'persona+web@utp.edu.pe', ''), 'persona+web@utp.edu.pe');
});

test('procesa todo el texto pegado antes del límite nativo del campo', () => {
  const text = p.insertarTextoPublico('', '987 654 321', 0, 0);
  assert.equal(p.filtrarCelularPublico(text), '987654321');
  assert.equal(p.insertarTextoPublico('987654321', '000', 3, 6), '987000321');
  assert.equal(p.insertarTextoPublico('12', '34', null, null), '1234');
});
