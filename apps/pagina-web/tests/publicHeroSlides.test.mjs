import test from 'node:test';
import assert from 'node:assert/strict';
import { extraerSlidesCmsPublicados, aplicarSlidesCmsPublicados,
  obtenerSlidesCmsPublicados, resolverSlidesCmsVisibles, heroPublicadoHabilitado, promocionesCmsHabilitadas
} from '../src/services/publicHero.ts';

const originales = [
  { image: '/1.jpg', eyebrow: 'Principal', title: 'Inicio', text: 'Inicio actual' },
  { image: '/2.jpg', eyebrow: 'Proyecto', title: '450 m²', text: 'Datos de ubicación' },
  { image: '/3.jpg', eyebrow: 'Finanzas', title: 'Desde S/ 8,000', text: '36 meses' }
];
const seccion = (codigo, campos = {}) => ({ codigo, titulo: 'Cambiar datos oficiales',
  subtitulo: 'Campaña visible', contenido: 'Cambiar precio/plazo', multimedia: [], ...campos });
const publica = (secciones) => ({ codigo: 'INICIO', secciones });
const completa = () => publica([
  seccion('HERO_PRINCIPAL', { titulo: 'Nuevo inicio' }),
  seccion('HERO_SLIDE_2_PROMO', { subtitulo: 'Verano 2026' }),
  seccion('HERO_SLIDE_3_PROMO', { subtitulo: 'Visítanos' })
]);

test('solo interpreta secciones conocidas de la página INICIO', () => {
  assert.equal(extraerSlidesCmsPublicados({ ...completa(), codigo: 'OTRA' }), null);
  const cms = extraerSlidesCmsPublicados(publica([seccion('OTRA'), seccion('HERO_SLIDE_2_PROMO')]));
  assert.equal(cms.principal, null);
  assert.equal(cms.proyecto.subtitulo, 'Campaña visible');
  assert.equal(cms.financiamiento, null);
});

test('secciones explícitamente ocultas o inactivas no se integran', () => {
  const cms = extraerSlidesCmsPublicados(publica([
    seccion('HERO_SLIDE_2_PROMO', { visible: false }),
    seccion('HERO_SLIDE_3_PROMO', { activo: false })
  ]));
  assert.equal(cms.proyecto, null);
  assert.equal(cms.financiamiento, null);
});

test('con migración 35 actual: ambos slides promocionales permanecen intactos', () => {
  const cms = extraerSlidesCmsPublicados(publica([
    seccion('HERO_PRINCIPAL', { titulo: 'Nuevo inicio' }),
    seccion('HERO_SLIDE_2_PROMO', { visible: false, titulo: null }),
    seccion('HERO_SLIDE_3_PROMO', { visible: false, titulo: null })
  ]));
  const resultado = aplicarSlidesCmsPublicados(originales, cms, true);
  assert.equal(resultado[0].title, 'Nuevo inicio');
  assert.deepEqual(resultado.slice(1), originales.slice(1));
});

test('slides 2 y 3 publicados se muestran sin modificar datos oficiales', () => {
  const cms = extraerSlidesCmsPublicados(publica([
    seccion('HERO_SLIDE_2_PROMO', { visible: true, subtitulo: 'Nueva promoción 2',
      multimedia: [{ usoMultimediaCodigo: 'FONDO', urlPublica: 'https://example.com/slide2.jpg' }] }),
    seccion('HERO_SLIDE_3_PROMO', { visible: true, subtitulo: 'Nueva promoción 3',
      multimedia: [{ usoMultimediaCodigo: 'FONDO', urlPublica: 'https://example.com/slide3.jpg' }] })
  ]));
  const resultado = aplicarSlidesCmsPublicados(originales, cms, true);
  assert.equal(resultado[1].image, 'https://example.com/slide2.jpg');
  assert.equal(resultado[2].image, 'https://example.com/slide3.jpg');
  assert.equal(resultado[1].eyebrow, 'Nueva promoción 2');
  assert.equal(resultado[2].eyebrow, 'Nueva promoción 3');
  assert.deepEqual(resultado.map(s => [s.title, s.text]),
    originales.map(s => [s.title, s.text]));
});

test('un flag separado deja intactos los slides comerciales', () => {
  const cms = extraerSlidesCmsPublicados(completa());
  const resultado = aplicarSlidesCmsPublicados(originales, cms, false);
  assert.equal(resultado[0].title, 'Nuevo inicio');
  assert.deepEqual(resultado.slice(1), originales.slice(1));
  assert.equal(heroPublicadoHabilitado(undefined), false);
});

test('solo subtítulos promocionales pueden cambiar en slides 2 y 3', () => {
  const antes = structuredClone(originales);
  const cms = extraerSlidesCmsPublicados(completa());
  const resultado = aplicarSlidesCmsPublicados(originales, cms, true);
  assert.equal(resultado[1].eyebrow, 'Verano 2026');
  assert.equal(resultado[2].eyebrow, 'Visítanos');
  for (let i = 1; i <= 2; i++) {
    assert.equal(resultado[i].title, originales[i].title);
    assert.equal(resultado[i].text, originales[i].text);
  }
  assert.deepEqual(originales, antes);
});

test('solo imágenes HTTPS válidas pueden reemplazar fondos promocionales', () => {
  const cms = extraerSlidesCmsPublicados(publica([
    seccion('HERO_SLIDE_2_PROMO', { multimedia: [{ urlPublica: 'https://example.com/publico.jpg' }] }),
    seccion('HERO_SLIDE_3_PROMO', { multimedia: [{ urlPublica: 'https://example.com/cms-drafts-private/privado.jpg' }] })
  ]));
  const resultado = aplicarSlidesCmsPublicados(originales, cms, true);
  assert.equal(resultado[1].image, 'https://example.com/publico.jpg');
  assert.equal(resultado[2].image, '/3.jpg');
});

test('sin sección o contenido promocional usa la imagen y el subtítulo anterior', () => {
  const cms = extraerSlidesCmsPublicados(publica([seccion('HERO_SLIDE_2_PROMO', {
    subtitulo: '', multimedia: [], titulo: 'No se usa', contenido: 'Tampoco'
  })]));
  assert.deepEqual(aplicarSlidesCmsPublicados(originales, cms, true), originales);
  assert.deepEqual(aplicarSlidesCmsPublicados(originales, null, true), originales);
});

test('proyecto oculto nunca muestra promociones CMS', () => {
  const alternativo = { image: '/generico.jpg', eyebrow: 'Empresa', title: 'Oculto', text: 'General' };
  assert.deepEqual(resolverSlidesCmsVisibles(originales,
    extraerSlidesCmsPublicados(completa()), false, alternativo, true), [alternativo]);
});

test('la lectura CMS nueva usa una sola ruta pública sin autenticación', async () => {
  const llamadas = [];
  const cliente = async (url, options) => {
    llamadas.push({ url, options });
    return { ok: true, json: async () => completa() };
  };
  const cms = await obtenerSlidesCmsPublicados('http://localhost:8082/', undefined, cliente);
  assert.equal(cms.proyecto.subtitulo, 'Verano 2026');
  assert.equal(llamadas.length, 1);
  assert.equal(llamadas[0].url, 'http://localhost:8082/api/public/paginas/contenido/codigo/INICIO');
  assert.deepEqual(llamadas[0].options.headers, { Accept: 'application/json' });
  assert.equal(llamadas[0].options.headers.Authorization, undefined);
  assert.equal(llamadas[0].options.cache, 'no-store');
});

test('ante un error HTTP no inventa información ni consulta endpoints alternativos', async () => {
  let llamadas = 0;
  await assert.rejects(() => obtenerSlidesCmsPublicados('http://localhost:8082', undefined,
    async () => { llamadas++; return { ok: false, status: 503 }; }));
  assert.equal(llamadas, 1);
});


test('la activación promocional requiere ambos flags explícitos', () => {
  assert.equal(promocionesCmsHabilitadas(undefined, undefined), false);
  assert.equal(promocionesCmsHabilitadas('true', undefined), false);
  assert.equal(promocionesCmsHabilitadas(undefined, 'true'), false);
  assert.equal(promocionesCmsHabilitadas('TRUE', 'true'), false);
  assert.equal(promocionesCmsHabilitadas('true', 'true'), true);
});

test('no utiliza contenidos anidados de borradores ni códigos falsos', () => {
  const cms = extraerSlidesCmsPublicados({
    codigo: 'INICIO', borradores: [seccion('HERO_SLIDE_2_PROMO')],
    secciones: [seccion('HERO_SLIDE_2_PROMO_BORRADOR')]
  });
  assert.deepEqual(aplicarSlidesCmsPublicados(originales, cms, true), originales);
});

test('da prioridad a FONDO en promociones frente a otras asignaciones', () => {
  const cms = extraerSlidesCmsPublicados(publica([seccion('HERO_SLIDE_2_PROMO', {
    multimedia: [
      { usoMultimediaCodigo: 'PRINCIPAL', urlPublica: 'https://example.com/otra.jpg' },
      { usoMultimediaCodigo: 'FONDO', urlPublica: 'https://example.com/fondo.jpg' }
    ]
  })]));
  assert.equal(cms.proyecto.imagen, 'https://example.com/fondo.jpg');
});
