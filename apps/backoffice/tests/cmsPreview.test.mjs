import test from 'node:test';
import assert from 'node:assert/strict';
import { proyectarBorradorPagina } from '../src/services/cmsPreview.ts';

const seccion = { idSeccion: 1, idPagina: 1, codigo: 'HERO_PRINCIPAL', titulo: 'Título CMS', subtitulo: 'Subtítulo CMS', contenido: 'Texto CMS', activo: true, visible: true };
function borrador(secciones = [{ id_seccion: 1, titulo: 'Título de campaña' }]) {
  return { idPagina: 1, tipoObjetivo: 'PAGINA', estado: 'EN_EDICION', contenidoPendiente: { secciones } };
}

test('superpone solo los campos guardados en la sección solicitada', () => {
  const vista = proyectarBorradorPagina(seccion, borrador());
  assert.equal(vista.titulo.borrador, 'Título de campaña');
  assert.equal(vista.titulo.actual, 'Título CMS');
  assert.equal(vista.titulo.modificado, true);
  assert.equal(vista.subtitulo.borrador, 'Subtítulo CMS');
  assert.equal(vista.subtitulo.modificado, false);
});

test('ignora cambios de otras secciones e identificadores incorrectos', () => {
  assert.equal(proyectarBorradorPagina(seccion, borrador([{ id_seccion: 2, titulo: 'Otro' }])), null);
  assert.equal(proyectarBorradorPagina(seccion, { ...borrador(), idPagina: 2 }), null);
});

test('no previsualiza borradores descartados, de visibilidad ni secciones inactivas', () => {
  assert.equal(proyectarBorradorPagina(seccion, { ...borrador(), estado: 'DESCARTADO' }), null);
  assert.equal(proyectarBorradorPagina(seccion, { ...borrador(), tipoObjetivo: 'VISIBILIDAD_PROYECTO' }), null);
  assert.equal(proyectarBorradorPagina({ ...seccion, activo: false }, borrador()), null);
});

test('preserva cadena vacía intencional y nunca interpreta campos no textuales', () => {
  const vista = proyectarBorradorPagina(seccion, borrador([{ id_seccion: 1, titulo: '', subtitulo: { html: '<script>' } }]));
  assert.equal(vista.titulo.borrador, '');
  assert.equal(vista.subtitulo.borrador, 'Subtítulo CMS');
});

test('no muta el contenido publicado', () => {
  const original = structuredClone(seccion);
  proyectarBorradorPagina(seccion, borrador());
  assert.deepEqual(seccion, original);
});
