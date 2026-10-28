const assert = require('node:assert/strict');
const test = require('node:test');
const { changedUserEmail, editedUserEmailError, userEmailChanged } = require('../src/components/users/editUserPolicy.ts');

test('un cambio de correo se normaliza para enviarlo sin modificar el login', () => {
  assert.equal(userEmailChanged(' Ana@OUTLOOK.COM ', 'ana@gmail.com'), true);
  assert.equal(changedUserEmail(' Ana@OUTLOOK.COM ', 'ana@gmail.com'), 'Ana@outlook.com');
  assert.equal(changedUserEmail('ana@utp.edu.pe', 'ana@gmail.com'), 'ana@utp.edu.pe');
  assert.equal(changedUserEmail('ana+ventas@empresa.com.pe', null), 'ana+ventas@empresa.com.pe');
});

test('conserva el correo cuando solo se cambian otros datos o su presentación', () => {
  assert.equal(changedUserEmail(' ANA@GMAIL.COM ', 'ana@gmail.com'), undefined);
  assert.equal(changedUserEmail('', null), undefined);
  assert.equal(editedUserEmailError('', null), undefined);
});

test('rechaza quitar un correo existente o introducir una dirección inválida', () => {
  for (const address of ['', 'ana@@empresa.pe', 'ana@empresa', 'a@empresa.pe\r\nBcc:b@empresa.pe']) {
    assert.ok(editedUserEmailError(address, 'ana@gmail.com'));
    assert.throws(() => changedUserEmail(address, 'ana@gmail.com'));
  }
});

test('aplica el máximo del contacto y permite dominios internacionales normalizados', () => {
  const address = `${'a'.repeat(64)}@${'b'.repeat(60)}.${'c'.repeat(60)}.pe`;
  assert.match(editedUserEmailError(address, 'ana@gmail.com'), /180/);
  assert.equal(changedUserEmail('ana@españa.es', 'ana@gmail.com'), 'ana@xn--espaa-rta.es');
});
