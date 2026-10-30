const assert = require('node:assert/strict');
const test = require('node:test');
const {
  getWorkerRegistrationDate, isWorkerEmploymentProtected, validateEditedWorkerStartDate
} = require('../src/lib/editWorkerPolicy.ts');
const {
  filtrarTelefono, validarTelefono, createInitialWorkerForm,
  buildWorkerUpdatePayload, changedWorkerFields
} = require('../src/components/Workers/workerForm.ts');

test('el teléfono de edición limita escritura y pegado a nueve dígitos', () => {
  assert.equal(filtrarTelefono('98547622271424'), '985476222');
  assert.equal(filtrarTelefono('9a87 654-321'), '987654321');
  for (const phone of ['', ' ', '987654321', '900000000', ' 999999999 ']) {
    assert.equal(validarTelefono(phone), undefined, phone);
  }
  for (const phone of ['98765432', '9876543210', '887654321', '+51987654321', '98765a321']) {
    assert.match(validarTelefono(phone), /9 dígitos y comenzar con 9/, phone);
  }
});

test('el día de registro respeta Perú cuando el servidor devuelve UTC', () => {
  assert.equal(getWorkerRegistrationDate('2026-10-27T04:59:59Z'), '2026-10-26');
  assert.equal(getWorkerRegistrationDate('2026-10-27T05:00:00Z'), '2026-10-27');
  assert.equal(getWorkerRegistrationDate('2026-10-27T00:00:00-05:00'), '2026-10-27');
  assert.equal(getWorkerRegistrationDate('2026-10-27 08:30:00.123456'), '2026-10-27');
  assert.equal(getWorkerRegistrationDate('2026-10-27'), '2026-10-27');
});

test('una fecha de registro ausente o inválida no inventa una fecha mínima', () => {
  for (const value of [null, undefined, '', 'texto', '2026-02-30', '2026-10-27xxxx', '0000-01-01']) {
    assert.equal(getWorkerRegistrationDate(value), null, String(value));
  }
});

test('una nueva fecha de ingreso admite el día de registro y los días posteriores', () => {
  const original = '2026-10-23';
  for (const value of ['2026-10-27', '2026-10-28', '2027-01-01']) {
    assert.equal(validateEditedWorkerStartDate(value, original, '2026-10-27'), undefined);
  }
  assert.match(validateEditedWorkerStartDate('2026-10-26', original, '2026-10-27'), /día de registro/);
  for (const value of ['', '2026-02-30', '29/10/2026', '0000-01-01']) {
    assert.match(validateEditedWorkerStartDate(value, original, '2026-10-27'), /válida/);
  }
});

test('una fecha histórica sin modificar no impide corregir otros datos', () => {
  assert.equal(validateEditedWorkerStartDate('2026-10-23', '2026-10-23', '2026-10-27'), undefined);
  assert.equal(validateEditedWorkerStartDate('2026-10-23', '2026-10-23', null), undefined);
  assert.match(validateEditedWorkerStartDate('2026-10-28', '2026-10-23', null), /registro/);
});

test('RRHH con permiso de edición puede gestionar al Gerente General', () => {
  assert.equal(isWorkerEmploymentProtected(true, ['RRHH'], true), false);
  assert.equal(isWorkerEmploymentProtected(true, ['GERENCIA', 'RRHH'], true), false);
  assert.equal(isWorkerEmploymentProtected(true, ['RRHH'], false), true);
  assert.equal(isWorkerEmploymentProtected(true, ['MARKETING'], true), true);
  assert.equal(isWorkerEmploymentProtected(false, ['RRHH'], true), false);
});

test('un cambio de nombre no vuelve a enviar teléfono o fecha histórica sin modificar', () => {
  const original = { ...createInitialWorkerForm(), idEstadoTrabajador: '1', fechaCese: '',
    motivoCambioEstado: '', nombres: 'Ana', telefono: '98547622271424', fechaIngreso: '2026-10-23' };
  const form = { ...original, nombres: 'Ana Maria' };
  const payload = buildWorkerUpdatePayload(form, changedWorkerFields(form, original), { cargos: [], estadosTrabajador: [] });
  assert.deepEqual(payload, { informacionPersonal: { nombres: 'Ana Maria' } });
});
