import assert from 'node:assert/strict';
import test from 'node:test';
import { proyectarHeroVisual } from '../src/services/cmsHeroVisual.ts';

const datos = {
  titulo: { actual: 'Título publicado', borrador: 'Título privado', modificado: true },
  subtitulo: { actual: 'Subtítulo público', borrador: 'Subtítulo borrador', modificado: true },
  contenido: { actual: 'Texto público', borrador: 'Texto privado', modificado: true }
};

test('la comparación actual solo usa textos públicos e ignora imágenes privadas', () => {
  const resultado = proyectarHeroVisual(datos, false, 'HERO_PRINCIPAL', 'blob:http://localhost/imagen-local', 'blob:http://localhost/imagen-guardada');
  assert.deepEqual(resultado, {
    titulo: 'Título publicado', subtitulo: 'Subtítulo público', descripcion: 'Texto público',
    imagenOriginal: '/8ef558bc-a786-446d-b292-c0f4b22520d4.jpg', imagenPrivada: null
  });
});

test('el borrador combina solo sus textos y la imagen local seleccionada', () => {
  const resultado = proyectarHeroVisual(datos, true, 'HERO_PRINCIPAL', 'blob:http://localhost/local', 'blob:http://localhost/guardada');
  assert.equal(resultado.titulo, 'Título privado');
  assert.equal(resultado.subtitulo, 'Subtítulo borrador');
  assert.equal(resultado.descripcion, 'Texto privado');
  assert.equal(resultado.imagenPrivada, 'blob:http://localhost/local');
});

test('usa imagen guardada si no hay imagen local', () => {
  assert.equal(proyectarHeroVisual(datos, true, 'HERO_PRINCIPAL', null, 'blob:http://localhost/guardada').imagenPrivada,
    'blob:http://localhost/guardada');
});

test('sin imagen de borrador conserva fondo estático y no inventa una URL', () => {
  assert.equal(proyectarHeroVisual(datos, true, 'HERO_PRINCIPAL').imagenPrivada, null);
});

test('nunca acepta URL pública o URL ajena como imagen de borrador', () => {
  for (const url of ['https://dominio.example/imagen.jpg', '/cms-drafts-private/a.jpg', 'data:image/png;base64,AAA']) {
    assert.equal(proyectarHeroVisual(datos, true, 'HERO_PRINCIPAL', url).imagenPrivada, null);
  }
});

test('aplica un respaldo visual a títulos vacíos sin alterar los datos originales', () => {
  const vacio = structuredClone(datos);
  vacio.titulo.borrador = '';
  const original = structuredClone(vacio);
  assert.equal(proyectarHeroVisual(vacio, true, 'HERO_PRINCIPAL').titulo,
    'Invierte hoy en el lugar donde construirás tu futuro');
  assert.deepEqual(vacio, original);
});

test('protege los datos oficiales de los slides 2 y 3', () => {
  for (const codigo of ['HERO_SLIDE_2_PROMO', 'HERO_SLIDE_3_PROMO']) {
    const actual = proyectarHeroVisual(datos, false, codigo);
    const borrador = proyectarHeroVisual(datos, true, codigo);
    assert.equal(borrador.titulo, actual.titulo);
    assert.equal(borrador.descripcion, actual.descripcion);
    assert.equal(borrador.subtitulo, 'Subtítulo borrador');
  }
});
