import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { createRequire } from 'node:module';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const output = mkdtempSync(join(tmpdir(), 'monolithe-project-tests-'));
const program = ts.createProgram([join(root, 'src/lib/projectForm.ts')], {
  outDir: output, rootDir: join(root, 'src'), module: ts.ModuleKind.CommonJS,
  target: ts.ScriptTarget.ES2020, strict: true, skipLibCheck: true
});
assert.deepEqual(ts.getPreEmitDiagnostics(program).map((diagnostic) =>
  ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n')), []);
program.emit();
const require = createRequire(import.meta.url);
const { initialProjectForm, projectRequest, changeProjectField } = require(join(output, 'lib/projectForm.js'));
const { validateProjectForm } = require(join(output, 'lib/projectFormValidation.js'));
const { validateProjectDates, isValidProjectDate, projectDateLimits } = require(join(output, 'lib/projectDateValidation.js'));
const { locationOptions, locationValue } = require(join(output, 'lib/ubigeo.js'));
const { canChangeProjectNumber, normalizeProjectNumber, validateProjectNumbers } = require(join(output, 'lib/projectNumberValidation.js'));
const catalogPath = resolve(root, '../../services/core-service/src/main/resources/catalogos/ubigeo-peru.tsv');
const rows = readFileSync(catalogPath, 'utf8').trim().split('\n').slice(1).map((line) => {
  const [codigo, departamento, provincia, distrito] = line.split('\t');
  return { codigo, departamento, provincia, distrito };
});
const validForm = () => ({ ...initialProjectForm(), codigo: 'PROJ-001', nombre: 'Proyecto', codigoEstadoProyecto: 'PLANIFICADO' });
after(() => rmSync(output, { recursive: true, force: true }));

test('admite fechas reales, años límite y bisiestos', () => {
  for (const value of ['0001-01-01', '2024-02-29', '2026-10-22', '9999-12-31'])
    assert.equal(isValidProjectDate(value), true, value);
});

test('rechaza días inexistentes y fechas fuera del formato y rango', () => {
  for (const value of ['0000-01-01', '2023-02-29', '2026-02-30', '2026-04-31', '2026-13-01',
    '2026-00-01', '2026-01-00', '10000-01-01', '2026-1-1', 'texto', ''])
    assert.equal(isValidProjectDate(value), false, value);
});

test('valida ambos sentidos y permite fechas iguales u opcionales', () => {
  const form = { ...validForm(), fechaInicio: '2026-05-02', fechaFinEstimada: '2026-05-01' };
  assert.deepEqual(Object.keys(validateProjectDates(form)), ['fechaInicio', 'fechaFinEstimada']);
  assert.deepEqual(validateProjectDates({ ...form, fechaFinEstimada: form.fechaInicio }), {});
  assert.deepEqual(validateProjectDates({ ...form, fechaInicio: '' }), {});
  assert.deepEqual(validateProjectDates(validForm()), {});
});

test('los calendarios usan límites recíprocos y descartan límites inválidos', () => {
  const form = { ...validForm(), fechaInicio: '2026-01-01', fechaFinEstimada: '2026-12-31' };
  assert.equal(projectDateLimits(form, 'fechaInicio').max, form.fechaFinEstimada);
  assert.equal(projectDateLimits(form, 'fechaFinEstimada').min, form.fechaInicio);
  assert.equal(projectDateLimits({ ...form, fechaInicio: '2023-02-29' }, 'fechaFinEstimada').min, '0001-01-01');
});

test('muestra todos los departamentos y filtra provincias y distritos', () => {
  const form = { ...validForm(), departamento: 'Lambayeque', provincia: 'Chiclayo' };
  assert.equal(locationOptions(rows, form, 'departamento').length, 25);
  assert.ok(locationOptions(rows, form, 'departamento').includes('Callao'));
  assert.deepEqual(locationOptions(rows, form, 'provincia'), ['Chiclayo', 'Ferreñafe', 'Lambayeque']);
  assert.ok(locationOptions(rows, form, 'distrito').includes('Eten'));
  assert.equal(locationOptions(rows, form, 'distrito').includes('Miraflores'), false);
});

test('cada distrito se puede resolver dentro de su jerarquía, conservando nombres oficiales', () => {
  for (const row of rows) {
    const form = { ...validForm(), ...row };
    assert.deepEqual(validateProjectForm(form, rows), {}, row.codigo);
    assert.equal(projectRequest(form, rows).distrito, row.distrito);
  }
});

test('acepta la escritura anterior sin tildes y devuelve la escritura oficial', () => {
  const form = { ...validForm(), departamento: 'la libertad', provincia: 'sanchez  carrion', distrito: 'huamachuco' };
  assert.deepEqual(validateProjectForm(form, rows), {});
  assert.equal(locationValue(locationOptions(rows, form, 'provincia'), form.provincia), 'Sánchez Carrión');
  assert.equal(projectRequest(form, rows).provincia, 'Sánchez Carrión');
});

test('rechaza jerarquías mezcladas o incompletas y conserva la ubicación opcional', () => {
  const form = { ...validForm(), departamento: 'Lambayeque', provincia: 'Lima', distrito: 'Miraflores' };
  assert.ok(validateProjectForm(form, rows).provincia);
  assert.ok(validateProjectForm(form, rows).distrito);
  assert.ok(validateProjectForm({ ...validForm(), departamento: 'Lambayeque' }, rows).provincia);
  assert.deepEqual(validateProjectForm(validForm(), rows), {});
});

test('limpia descendientes al cambiar un padre y conserva errores de otros campos', () => {
  const form = { ...validForm(), departamento: 'Lambayeque', provincia: 'Chiclayo', distrito: 'Eten' };
  const changed = changeProjectField(form, { codigo: 'Código inválido' }, 'departamento', 'Lima', rows);
  assert.equal(changed.form.provincia, '');
  assert.equal(changed.form.distrito, '');
  assert.equal(changed.errors.codigo, 'Código inválido');
  const province = changeProjectField(form, {}, 'provincia', 'Ferreñafe', rows);
  assert.equal(province.form.departamento, 'Lambayeque');
  assert.equal(province.form.distrito, '');
});

test('actualiza ambos errores de fechas y los elimina al corregir el rango', () => {
  const form = { ...validForm(), fechaInicio: '2026-05-01', fechaFinEstimada: '2026-05-02' };
  const changed = changeProjectField(form, { nombre: 'Nombre inválido' }, 'fechaInicio', '2026-06-01', rows);
  assert.ok(changed.errors.fechaInicio);
  assert.ok(changed.errors.fechaFinEstimada);
  assert.equal(changed.errors.nombre, 'Nombre inválido');
  const fixed = changeProjectField(changed.form, changed.errors, 'fechaFinEstimada', '2026-06-01', rows);
  assert.equal(fixed.errors.fechaInicio, undefined);
  assert.equal(fixed.errors.fechaFinEstimada, undefined);
});

test('inicializa edición, conserva ceros y restablece campos de un proyecto nuevo', () => {
  const form = initialProjectForm({ ...validForm(), idProyecto: 1, pais: null, latitud: 0, activo: false });
  assert.equal(form.pais, 'Perú');
  assert.equal(form.latitud, '0');
  assert.equal(form.activo, false);
  assert.equal(initialProjectForm().codigo, '');
});

test('envía país fijo, números o null y rechaza un país manipulado', () => {
  const form = { ...validForm(), pais: 'Chile', latitud: '0', areaTotalM2: '100.50' };
  assert.ok(validateProjectForm(form, rows).pais);
  const request = projectRequest(form, rows);
  assert.equal(request.pais, 'Perú');
  assert.equal(request.latitud, 0);
  assert.equal(request.longitud, null);
  assert.equal(request.areaTotalM2, 100.5);
  assert.equal(request.fechaInicio, null);
});

test('bloquea letras, símbolos y notación científica en los tres campos numéricos', () => {
  for (const field of ['areaTotalM2', 'latitud', 'longitud']) {
    const form = { ...validForm(), [field]: '12' };
    for (const value of ['12a', '12e3', '12E3', '+12', '1 2', '12%', '1/2', '12..3', '12@', '１２']) {
      const changed = changeProjectField(form, { codigo: 'Pendiente' }, field, value, rows);
      assert.equal(changed.form[field], '12', `${field}: ${value}`);
      assert.equal(changed.errors.codigo, 'Pendiente');
    }
  }
});

test('rechaza la undécima cifra también al pegar texto y cuenta los ceros iniciales', () => {
  for (const field of ['areaTotalM2', 'latitud', 'longitud']) {
    assert.equal(canChangeProjectNumber(field, '', '1234567890'), true);
    assert.equal(canChangeProjectNumber(field, '', '12345678901'), false);
    assert.equal(canChangeProjectNumber(field, '', '00000000001'), false);
    const form = { ...validForm(), [field]: '1234567890' };
    assert.equal(changeProjectField(form, {}, field, '12345678901', rows).form[field], '1234567890');
  }
});

test('permite decimales y signo negativo solo en coordenadas, sin contarlos como cifras', () => {
  assert.equal(canChangeProjectNumber('areaTotalM2', '', '12345678.90'), true);
  assert.equal(canChangeProjectNumber('longitud', '', '-123.1234567'), true);
  assert.equal(canChangeProjectNumber('longitud', '', '-123.12345678'), false);
  assert.equal(canChangeProjectNumber('longitud', '-123.1234567', '12345678901'), false);
  assert.equal(canChangeProjectNumber('latitud', '-12.12345678', '12345678901'), false);
  assert.equal(canChangeProjectNumber('latitud', '', '-'), true);
  assert.equal(canChangeProjectNumber('latitud', '', '-.'), true);
  assert.equal(canChangeProjectNumber('latitud', '', '12-3'), false);
  assert.equal(canChangeProjectNumber('areaTotalM2', '', '-1'), false);
});

test('normaliza una coma decimal sin convertir texto inválido en otro número', () => {
  assert.equal(normalizeProjectNumber('100,50'), '100.50');
  const form = validForm();
  assert.equal(changeProjectField(form, {}, 'areaTotalM2', '100,50', rows).form.areaTotalM2, '100.50');
  assert.equal(changeProjectField(form, {}, 'latitud', '-6,75', rows).form.latitud, '-6.75');
  assert.equal(changeProjectField(form, {}, 'areaTotalM2', '100a50', rows).form.areaTotalM2, '');
  assert.equal(changeProjectField(form, {}, 'areaTotalM2', '100,5,0', rows).form.areaTotalM2, '');
});

test('impide guardar números incompletos, manipulados o con más de diez cifras', () => {
  for (const value of ['-', '.', '-.', '1e3', '0x10', 'Infinity', 'abc', '12 3', '10000000000'])
    assert.ok(validateProjectNumbers({ ...validForm(), latitud: value }).latitud, value);
  assert.ok(validateProjectNumbers({ ...validForm(), areaTotalM2: '999999999.99' }).areaTotalM2);
  assert.deepEqual(validateProjectNumbers(validForm()), {});
});

test('conserva los rangos y la precisión admitida por la base de datos', () => {
  assert.deepEqual(validateProjectNumbers({ ...validForm(), areaTotalM2: '9999999999', latitud: '-90', longitud: '180' }), {});
  assert.deepEqual(validateProjectNumbers({ ...validForm(), areaTotalM2: '99999999.99', latitud: '-12.1234567', longitud: '-123.1234567' }), {});
  assert.match(validateProjectNumbers({ ...validForm(), areaTotalM2: '12.345' }).areaTotalM2, /2 decimales/);
  assert.match(validateProjectNumbers({ ...validForm(), latitud: '0.12345678' }).latitud, /7 decimales/);
  assert.ok(validateProjectNumbers({ ...validForm(), areaTotalM2: '0', latitud: '91', longitud: '-181' }).areaTotalM2);
  assert.ok(validateProjectNumbers({ ...validForm(), latitud: '91' }).latitud);
  assert.ok(validateProjectNumbers({ ...validForm(), longitud: '-181' }).longitud);
});

test('permite borrar y corregir valores anteriores excesivos sin truncarlos al abrir', () => {
  const form = { ...validForm(), areaTotalM2: '123456789012' };
  const changed = changeProjectField(form, {}, 'areaTotalM2', '12345678901', rows);
  assert.equal(changed.form.areaTotalM2, '12345678901');
  assert.ok(changed.errors.areaTotalM2);
  assert.equal(changeProjectField(changed.form, changed.errors, 'areaTotalM2', '1234567890', rows).errors.areaTotalM2, undefined);
  assert.equal(changeProjectField(form, {}, 'areaTotalM2', '', rows).form.areaTotalM2, '');
});
