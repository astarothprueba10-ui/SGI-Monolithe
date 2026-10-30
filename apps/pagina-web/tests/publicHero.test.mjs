import test from 'node:test';
import assert from 'node:assert/strict';
import { extraerHeroPublicado, aplicarHeroPublicado, obtenerHeroPublicado, heroPublicadoHabilitado, resolverSlidesVisibles } from '../src/services/publicHero.ts';

const originales = [
  { image: '/hero-uno.jpg', title: 'Original', eyebrow: 'Antes', text: 'Texto anterior' },
  { image: '/hero-dos.jpg', title: 'Segundo', eyebrow: 'Otro', text: 'Otro texto' }
];
const publicado = (campos = {}) => ({
  codigo: 'INICIO', secciones: [{ codigo: 'HERO_PRINCIPAL', titulo: 'Texto publicado',
    subtitulo: 'Subtítulo publicado', contenido: 'Descripción publicada', multimedia: [], ...campos }]
});

test('lee únicamente la sección HERO_PRINCIPAL de INICIO', () => {
  const hero = extraerHeroPublicado(publicado());
  assert.equal(hero.titulo, 'Texto publicado');
  assert.equal(extraerHeroPublicado({ ...publicado(), codigo: 'OTRA' }), null);
  assert.equal(extraerHeroPublicado({ codigo: 'INICIO', secciones: [{ codigo: 'OTRA' }] }), null);
});

test('no interpreta borradores ni imágenes privadas aunque estén en el payload', () => {
  const hero = extraerHeroPublicado({ ...publicado(), contenidoPendiente: { titulo: 'SECRETO' },
    secciones: [{ ...publicado().secciones[0], multimedia: [
      { urlPublica: 'https://example.supabase.co/storage/v1/object/public/cms-drafts-private/secreto.jpg' }
    ] }] });
  assert.equal(hero.titulo, 'Texto publicado');
  assert.equal(hero.imagen, undefined);
});

test('acepta únicamente URLs HTTPS de multimedia publicada', () => {
  for (const url of ['javascript:alert(1)', 'http://example.com/a.png', 'data:image/png;base64,AAA',
    'https://example.com/cms-drafts-private/archivo.jpg']) {
    assert.equal(extraerHeroPublicado(publicado({ multimedia: [{ urlPublica: url }] })).imagen, undefined);
  }
  assert.equal(extraerHeroPublicado(publicado({ multimedia: [
    { urlPublica: 'https://example.com/imagen.jpg' }
  ] })).imagen, 'https://example.com/imagen.jpg');
});

test('aplica el contenido solo al primer slide, sin mutar el original', () => {
  const antes = structuredClone(originales);
  const actualizado = aplicarHeroPublicado(originales, extraerHeroPublicado(publicado()));
  assert.equal(actualizado[0].title, 'Texto publicado');
  assert.equal(actualizado[1].title, 'Segundo');
  assert.deepEqual(originales, antes);
});

test('conserva los campos existentes cuando el CMS no tiene valores', () => {
  const actualizado = aplicarHeroPublicado(originales, extraerHeroPublicado(publicado({
    titulo: ' ', subtitulo: null, contenido: '', multimedia: []
  })));
  assert.deepEqual(actualizado, originales);
});

test('sin slides o sin contenido publicado mantiene el comportamiento anterior', () => {
  assert.deepEqual(aplicarHeroPublicado([], { titulo: 'X' }), []);
  assert.deepEqual(aplicarHeroPublicado(originales, null), originales);
});

test('consulta exclusivamente el endpoint público sin enviar credenciales', async () => {
  let ruta = '';
  let opciones;
  const cliente = async (url, opts) => {
    ruta = url;
    opciones = opts;
    return { ok: true, json: async () => publicado() };
  };
  const hero = await obtenerHeroPublicado('http://localhost:8082/', undefined, cliente);
  assert.equal(hero.titulo, 'Texto publicado');
  assert.equal(ruta, 'http://localhost:8082/api/public/paginas/contenido/codigo/INICIO');
  assert.deepEqual(opciones.headers, { Accept: 'application/json' });
  assert.equal(opciones.cache, 'no-store');
  assert.equal(opciones.headers.Authorization, undefined);
});

test('si falla el endpoint publicado no reutiliza otra ruta de datos', async () => {
  const cliente = async () => ({ ok: false, status: 404 });
  await assert.rejects(() => obtenerHeroPublicado('http://localhost:8082', undefined, cliente));
});


test('el carrusel CMS permanece desactivado salvo true explícito', () => {
  assert.equal(heroPublicadoHabilitado(undefined), false);
  assert.equal(heroPublicadoHabilitado('false'), false);
  assert.equal(heroPublicadoHabilitado('TRUE'), false);
  assert.equal(heroPublicadoHabilitado('true'), true);
});


test('nunca muestra promociones CMS cuando el proyecto está oculto', () => {
  const alternativo = { image: '/generico.jpg', title: 'Genérico', eyebrow: 'Empresa', text: 'Consulta' };
  const hero = { titulo: 'Promoción oculta', imagen: 'https://example.com/promo.jpg' };
  assert.deepEqual(resolverSlidesVisibles(originales, hero, false, alternativo), [alternativo]);
  assert.equal(resolverSlidesVisibles(originales, hero, true, alternativo)[0].title, 'Promoción oculta');
});

test('prefiere el FONDO publicado del CMS frente a otro recurso de sección', () => {
  const hero = extraerHeroPublicado(publicado({ multimedia: [
    { usoMultimediaCodigo: 'PRINCIPAL', urlPublica: 'https://example.com/anterior.jpg' },
    { usoMultimediaCodigo: 'FONDO', urlPublica: 'https://example.com/nuevo.jpg' }
  ] }));
  assert.equal(hero.imagen, 'https://example.com/nuevo.jpg');
});
