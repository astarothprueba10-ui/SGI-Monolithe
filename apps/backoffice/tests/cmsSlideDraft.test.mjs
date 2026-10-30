import assert from 'node:assert/strict';
import test from 'node:test';
import { cargarCamposPromo, extraerCambiosCms, fusionarCambioSlide, prepararCambioSoloImagen, validarCamposPromo, seccionGuardada } from '../src/services/cmsSlideDraft.ts';

const datos = { titulo: 'Campaña B', subtitulo: 'Lanzamiento', contenido: 'Un espacio distinto' };
const pendiente = { secciones: [
  { id_seccion: 1, titulo: 'Campaña A', contenido: 'Descripción A' },
  { id_seccion: 2, titulo: 'Promoción B' }
] };

test('guardar slide 2 conserva intactos los cambios del slide 1', () => {
  const antes = structuredClone(pendiente);
  const cambios = fusionarCambioSlide(pendiente, 2, datos);
  assert.deepEqual(cambios[0], { idSeccion: 1, titulo: 'Campaña A', contenido: 'Descripción A' });
  assert.deepEqual(cambios[1], { idSeccion: 2, ...datos });
  assert.deepEqual(pendiente, antes);
});

test('guardar un slide nuevo conserva los existentes en el orden original', () => {
  const cambios = fusionarCambioSlide(pendiente, 3, datos);
  assert.deepEqual(cambios.map(s => s.idSeccion), [1, 2, 3]);
  assert.deepEqual(cambios[1], { idSeccion: 2, titulo: 'Promoción B' });
});

test('crear permite empezar con cualquiera de los tres slides', () => {
  assert.deepEqual(fusionarCambioSlide(null, 3, datos), [{ idSeccion: 3, ...datos }]);
});

test('al cambiar de slide lee los textos propios guardados y no los del primero', () => {
  const seccion2 = { idSeccion: 2, titulo: null, subtitulo: null, contenido: null };
  assert.deepEqual(cargarCamposPromo(seccion2, pendiente),
    { titulo: 'Promoción B', subtitulo: '', contenido: '' });
  const seccion3 = { idSeccion: 3, titulo: null, subtitulo: null, contenido: null };
  assert.deepEqual(cargarCamposPromo(seccion3, pendiente),
    { titulo: '', subtitulo: '', contenido: '' });
});

test('admite borrar intencionalmente subtítulo y descripción', () => {
  const cambios = fusionarCambioSlide(pendiente, 1, { titulo: 'A', subtitulo: '', contenido: '' });
  assert.equal(cambios[0].subtitulo, '');
  assert.equal(cambios[0].contenido, '');
});

test('rechaza IDs duplicados o de tipos incorrectos para no perder datos silenciosamente', () => {
  for (const secciones of [
    [{ id_seccion: 1, titulo: 'A' }, { id_seccion: 1, titulo: 'B' }],
    [{ id_seccion: '2', titulo: 'B' }],
    [{ id_seccion: 2, titulo: false }]
  ]) {
    assert.throws(() => fusionarCambioSlide({ secciones }, 3, datos));
  }
});

test('rechaza textos inválidos y no admite insertar HTML', () => {
  assert.ok(validarCamposPromo({ ...datos, titulo: '   ' }));
  assert.ok(validarCamposPromo({ ...datos, contenido: '<script>' }));
  assert.ok(validarCamposPromo({ ...datos, subtitulo: 'a'.repeat(256) }));
  assert.throws(() => fusionarCambioSlide(null, 0, datos));
});

test('la previsualización solo habilita slides realmente guardados', () => {
  assert.equal(seccionGuardada(pendiente, 1), true);
  assert.equal(seccionGuardada(pendiente, 2), true);
  assert.equal(seccionGuardada(pendiente, 3), false);
});

test('error de estructura no se interpreta como un borrador vacío', () => {
  assert.throws(() => extraerCambiosCms({ secciones: 'incorrecto' }));
});

test('permite preparar solo imagen sin modificar textos de otros slides', () => {
  const antes = structuredClone(pendiente);
  const nuevos = prepararCambioSoloImagen(pendiente, 3);
  assert.deepEqual(nuevos.at(-1), { idSeccion: 3 });
  assert.deepEqual(nuevos[0], { idSeccion: 1, titulo: 'Campaña A', contenido: 'Descripción A' });
  assert.deepEqual(pendiente, antes);
  assert.deepEqual(prepararCambioSoloImagen(null, 2), [{ idSeccion: 2 }]);
  assert.equal(seccionGuardada({ secciones: [{ id_seccion: 2 }] }, 2), true);
});
