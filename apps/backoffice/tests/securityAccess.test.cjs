const test = require('node:test');
const assert = require('node:assert/strict');
require('./register-types.cjs');

const { tieneRolAdministradorDeCuentas, puedeAdministrarCuentas } =
  require('../src/lib/securityAccess.ts');

test('RRHH con permiso users.create puede crear usuarios', () => {
  assert.equal(tieneRolAdministradorDeCuentas(['RRHH']), true);
  assert.equal(puedeAdministrarCuentas(
    ['RRHH'], new Set(['users.view', 'users.create']), 'users.create'), true);
});

test('RRHH sin el permiso requerido no puede editar ni gestionar roles', () => {
  assert.equal(puedeAdministrarCuentas(
    ['RRHH'], new Set(['users.view']), 'users.edit'), false);
  assert.equal(puedeAdministrarCuentas(
    ['RRHH'], new Set(['users.view']), 'roles.assign_permissions'), false);
});

test('Los permisos no habilitan usuarios sin rol administrativo autorizado', () => {
  assert.equal(puedeAdministrarCuentas(
    ['ASESOR'], new Set(['users.view', 'users.edit']), 'users.edit'), false);
});

test('La alta de usuario exige ambos permisos', () => {
  assert.equal(puedeAdministrarCuentas(
    ['RRHH'], new Set(['users.create']), ['users.create', 'users.assign_role']), false);
  assert.equal(puedeAdministrarCuentas(
    ['RRHH'], new Set(['users.create', 'users.assign_role']), ['users.create', 'users.assign_role']), true);
});
