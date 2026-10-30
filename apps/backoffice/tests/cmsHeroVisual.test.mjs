import assert from 'node:assert/strict';
import test from 'node:test';
import { proyectarHeroVisual } from '../src/services/cmsHeroVisual.ts';

const datos = {
  titulo: { actual: 'Título publicado', borrador: 'Título privado', modificado: true },
  subtitulo: { actual: 'Subtítulo público', borrador: 'Subtítulo borrador', modificado: true },
  contenido: { actual: 'Texto público', borrador: 'Texto privado', modificado: true }
};

test('la comparación actual solo usa textos públicos e ignora imágenes privadas', () => {
  const resultado = proyectarHeroVisual(datos, false, 'blob:http://localhost/imagen-local', 'blob:http://localhost/imagen-guardada');
  assert.deepEqual(resultado, {
    titulo: 'Título publicado', subtitulo: 'Subtítulo público', descripcion: 'Texto público', imagenPrivada: null
  });
});

test('el borrador combina solo sus textos y la imagen local seleccionada', () => {
  const resultado = proyectarHeroVisual(datos, true, 'blob:http://localhost/local', 'blob:http://localhost/guardada');
  assert.equal(resultado.titulo, 'Título privado');
  assert.equal(resultado.subtitulo, 'Subtítulo borrador');
  assert.equal(resultado.descripcion, 'Texto privado');
  assert.equal(resultado.imagenPrivada, 'blob:http://localhost/local');
});

test('usa imagen guardada si no hay imagen local', () => {
  assert.equal(proyectarHeroVisual(datos, true, null, 'blob:http://localhost/guardada').imagenPrivada,
    'blob:http://localhost/guardada');
});

test('sin imagen de borrador conserva fondo estático y no inventa una URL', () => {
  assert.equal(proyectarHeroVisual(datos, true).imagenPrivada, null);
});

test('nunca acepta URL pública o URL ajena como imagen de borrador', () => {
  for (const url of ['https://dominio.example/imagen.jpg', '/cms-drafts-private/a.jpg', 'data:image/png;base64,AAA']) {
    assert.equal(proyectarHeroVisual(datos, true, url).imagenPrivada, null);
  }
});

test('mantiene strings vacíos y no altera los datos originales', () => {
  const vacio = structuredClone(datos);
  vacio.titulo.borrador = '';
  const original = structuredClone(vacio);
  assert.equal(proyectarHeroVisual(vacio, true).titulo, '');
  assert.deepEqual(vacio, original);
});
