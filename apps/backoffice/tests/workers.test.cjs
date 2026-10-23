const assert = require('node:assert/strict');
const test = require('node:test');
const {
  buildWorkerUpdatePayload,
  changedWorkerFields,
  createInitialWorkerForm,
  formatWorkerDate,
  getManualWorkerStates,
  validateCorrectionRequest
} = require('../src/components/Workers/workerForm.ts');

const catalogs = {
  tiposDocumento: [
    { idTipoDocumento: 11, codigo: 'DNI', nombre: 'DNI', longitudMinima: 8, longitudMaxima: 8, soloNumerico: true },
    { idTipoDocumento: 12, codigo: 'CE', nombre: 'Carné de extranjería', longitudMinima: 9, longitudMaxima: 12, soloNumerico: false }
  ],
  estadosTrabajador: [
    { idEstadoTrabajador: 21, codigo: 'ACTIVO', nombre: 'Activo' },
    { idEstadoTrabajador: 22, codigo: 'INACTIVO', nombre: 'Inactivo' },
    { idEstadoTrabajador: 23, codigo: 'SUSPENDIDO', nombre: 'Suspendido' },
    { idEstadoTrabajador: 24, codigo: 'CESADO', nombre: 'Cesado' },
    { idEstadoTrabajador: 25, codigo: 'EN_VERIFICACION', nombre: 'En verificación' },
    { idEstadoTrabajador: 26, codigo: 'OTRO', nombre: 'Otro' }
  ],
  cargos: [{ idCargo: 40, idArea: 30, codigo: 'AN', nombre: 'Analista' }]
};

test('la tabla formatea fechas reales sin sustituir fechas ausentes', () => {
  assert.equal(formatWorkerDate('2026-03-07'), '07/03/2026');
  assert.equal(formatWorkerDate(null), '—');
});

test('los estados manuales se filtran por código y no por identificador', () => {
  const states = getManualWorkerStates(catalogs.estadosTrabajador);
  assert.deepEqual(states.map((item) => item.codigo), ['ACTIVO', 'INACTIVO', 'SUSPENDIDO', 'CESADO']);
});

test('la solicitud de corrección exige documento distinto, motivo y evidencia admitida', () => {
  const current = { idTipoDocumento: 11, numeroDocumento: '00123456' };
  const validDraft = {
    idTipoDocumento: '12',
    numeroDocumento: '123456789',
    motivo: 'El documento fue actualizado por la autoridad.',
    archivo: { type: 'image/webp', size: 1024 }
  };
  assert.equal(validateCorrectionRequest(validDraft, current, catalogs), null);
  assert.match(validateCorrectionRequest({ ...validDraft, archivo: null }, current, catalogs), /evidencia/i);
  assert.match(validateCorrectionRequest({ ...validDraft, archivo: { type: 'application/pdf', size: 100 } }, current, catalogs), /JPG, PNG o WebP/);
  assert.match(validateCorrectionRequest({ ...validDraft, archivo: { type: 'image/jpeg', size: 5 * 1024 * 1024 + 1 } }, current, catalogs), /5 MB/);
  assert.match(validateCorrectionRequest({ ...validDraft, idTipoDocumento: '11', numeroDocumento: '00123456' }, current, catalogs), /diferir/);
});

test('la actualización ordinaria solo incluye campos modificados y excluye correo y documento', () => {
  const form = {
    ...createInitialWorkerForm(),
    idEstadoTrabajador: '21',
    fechaCese: '',
    motivoCambioEstado: '',
    nombres: 'Ana',
    correoElectronico: 'ana@example.test',
    idTipoDocumento: '11',
    numeroDocumento: '00123456'
  };
  const changed = changedWorkerFields(form, {
    ...form,
    nombres: 'Ana anterior',
    correoElectronico: 'otro@example.test'
  });
  assert.equal(changed.has('correoElectronico'), true);
  const payload = buildWorkerUpdatePayload(form, changed, catalogs);
  assert.deepEqual(payload, { informacionPersonal: { nombres: 'Ana' } });
});

test('el cambio de estado usa el identificador del catálogo y registra fecha y motivo de cese', () => {
  const initial = {
    ...createInitialWorkerForm(),
    idEstadoTrabajador: '21',
    fechaCese: '',
    motivoCambioEstado: ''
  };
  const form = {
    ...initial,
    idEstadoTrabajador: '24',
    fechaCese: '2026-03-07',
    motivoCambioEstado: 'Fin de la relación laboral'
  };
  const payload = buildWorkerUpdatePayload(form, changedWorkerFields(form, initial), catalogs);
  assert.deepEqual(payload, {
    informacionLaboral: {
      idEstadoTrabajador: 24,
      motivoCambioEstado: 'Fin de la relación laboral',
      fechaCese: '2026-03-07'
    }
  });
});

const {
  toPeruISOString,
  isSuspensionProgramada,
  calcularFechaFinSuspension
} = require('../src/components/Workers/workerDateUtils.ts');

test('las fechas se convierten a formato ISO con zona horaria de Peru (-05:00)', () => {
  assert.equal(toPeruISOString('2026-10-23T14:30'), '2026-10-23T14:30:00-05:00');
});

test('distingue correctamente entre suspension inmediata y programada', () => {
  const pasada = '2020-01-01T10:00:00-05:00';
  assert.equal(isSuspensionProgramada(pasada), false);

  const futura = '2030-01-01T10:00:00-05:00';
  assert.equal(isSuspensionProgramada(futura), true);
});

test('calcula fecha de fin de suspension segun modalidad (horas, dias, semanas)', () => {
  const inicio = '2026-05-10T10:00';
  const finHoras = calcularFechaFinSuspension(inicio, 'horas', 8, '');
  assert.equal(finHoras, '2026-05-10T18:00');

  const finDias = calcularFechaFinSuspension(inicio, 'dias', 5, '');
  assert.equal(finDias, '2026-05-15T10:00');

  const finSemanas = calcularFechaFinSuspension(inicio, 'semanas', 2, '');
  assert.equal(finSemanas, '2026-05-24T10:00');

  const finRango = calcularFechaFinSuspension(inicio, 'rango', 0, '2026-05-20T12:00');
  assert.equal(finRango, '2026-05-20T12:00');
});
