const assert = require('node:assert/strict');
const test = require('node:test');
const { getSessionRoles, getSessionPermissions } = require('../src/lib/authSession.ts');

test('Supervisor comercial puede entrar y conserva su nombre de rol', () => {
  assert.deepEqual(
    getSessionRoles(['ROLE_SUPERVISOR_COMERCIAL', 'sales.view', 'sales.export']),
    ['Supervisor comercial']
  );
});

test('Solo CLIENTE es rechazado en el Backoffice', () => {
  assert.deepEqual(getSessionRoles(['ROLE_CLIENTE', 'crm.view']), []);
  assert.deepEqual(
    getSessionRoles(['ROLE_CLIENTE', 'ROLE_ASESOR', 'sales.view']),
    ['Asesor']
  );
});

test('Nuevos roles internos no requieren agregar otra lista de acceso', () => {
  assert.deepEqual(getSessionRoles(['ROLE_COORDINADOR_POSTVENTA']),
    ['Coordinador Postventa']);
  assert.deepEqual(getSessionRoles(['ROLE_ASESORIA_LEGAL']),
    ['Asesoría Legal']);
  assert.deepEqual(getSessionRoles(['ROLE_CLIENTE', 'ROLE_CLIENTE', 'sales.view']), []);
});

test('El nombre de un nuevo rol no inventa permisos', () => {
  assert.deepEqual(Array.from(getSessionPermissions(['ROLE_COORDINADOR_POSTVENTA'])), []);
  assert.deepEqual(Array.from(getSessionPermissions(['ROLE_SUPERVISOR_COMERCIAL', 'sales.view'])),
    ['sales.view']);
});
