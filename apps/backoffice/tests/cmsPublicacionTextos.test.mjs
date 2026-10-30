import assert from 'node:assert/strict';
import test from 'node:test';
import { evaluarBorradorPublicable, solicitudPublicacion } from '../src/services/cmsPublicacionTextos.ts';
import { fusionarCambioSlide, validarSubtituloPromo } from '../src/services/cmsSlideDraft.ts';

const catalogo = [
  { idSeccion: 1, idPagina: 1, codigo: 'HERO_PRINCIPAL', titulo: 'Actual', subtitulo: 'Antes', contenido: 'Texto', activo: true, visible: true },
  { idSeccion: 2, idPagina: 1, codigo: 'HERO_SLIDE_2_PROMO', titulo: 'Precio oficial', subtitulo: 'Antes 2', contenido: 'Contrato', activo: true, visible: false },
  { idSeccion: 3, idPagina: 1, codigo: 'HERO_SLIDE_3_PROMO', titulo: 'Financiamiento', subtitulo: 'Antes 3', contenido: 'Contrato', activo: true, visible: false }
];
const borrador = (secciones, cambios = {}) => ({
  idBorrador: 15, idPagina: 1, idProyecto: null, tipoObjetivo: 'PAGINA', estado: 'EN_EDICION',
  revisionBase: 0, revisionEdicion: 5, contenidoPendiente: { secciones }, ...cambios
});
const evaluar = (b) => evaluarBorradorPublicable(b, catalogo, 1);

test('admite únicamente textos del slide principal y proyecta actual/nuevo', () => {
  const evaluacion = evaluar(borrador([{ id_seccion: 1, titulo: 'Nuevo', subtitulo: '', contenido: 'Otra descripción' }]));
  assert.equal(evaluacion.valido, true);
  assert.deepEqual(evaluacion.secciones[0].textos, [
    { campo: 'titulo', actual: 'Actual', nuevo: 'Nuevo' },
    { campo: 'subtitulo', actual: 'Antes', nuevo: '' },
    { campo: 'contenido', actual: 'Texto', nuevo: 'Otra descripción' }
  ]);
});

test('admite los subtítulos de slides 2 y 3 sin alterar campos comerciales', () => {
  const cambio = fusionarCambioSlide(null, 2,
    { titulo: 'Nuevo precio', subtitulo: 'Promo', contenido: 'Contrato nuevo' }, true);
  assert.deepEqual(cambio, [{ idSeccion: 2, subtitulo: 'Promo' }]);
  const res = evaluar(borrador([
    { id_seccion: 2, subtitulo: 'Promo' },
    { id_seccion: 3, subtitulo: 'Promoción 3' }
  ]));
  assert.equal(res.valido, true);
  assert.equal(res.secciones.length, 2);
  assert.deepEqual(res.secciones[0].textos, [{ campo: 'subtitulo', actual: 'Antes 2', nuevo: 'Promo' }]);
});

test('rechaza título o contenido comercial de slides 2 y 3 sin eliminarlo silenciosamente', () => {
  for (const campo of ['titulo', 'contenido']) {
    const res = evaluar(borrador([{ id_seccion: 2, subtitulo: 'Promo', [campo]: 'No permitido' }]));
    assert.equal(res.valido, false);
    assert.match(res.motivo, /slides 2 y 3/i);
  }
});

test('rechaza borradores ajenos a INICIO, finalizados, sin cambios o sin catálogo', () => {
  assert.equal(evaluar(borrador([{ id_seccion: 1, titulo: 'X' }], { idPagina: 3 })).valido, false);
  assert.equal(evaluar(borrador([{ id_seccion: 1, titulo: 'X' }], { estado: 'PUBLICADO' })).valido, false);
  assert.equal(evaluar(borrador([])).valido, false);
  assert.equal(evaluarBorradorPublicable(borrador([{ id_seccion: 1, titulo: 'X' }]), null, 1).valido, false);
});

test('rechaza revisión editorial o pública inválida', () => {
  assert.equal(evaluar(borrador([{ id_seccion: 1, titulo: 'X' }], { revisionEdicion: 0 })).valido, false);
  assert.equal(evaluar(borrador([{ id_seccion: 1, titulo: 'X' }], { revisionBase: -1 })).valido, false);
});

test('rechaza secciones repetidas, no confiables o inactivas', () => {
  assert.equal(evaluar(borrador([{ id_seccion: 1, titulo: 'A' }, { id_seccion: 1, titulo: 'B' }])).valido, false);
  assert.equal(evaluar(borrador([{ id_seccion: 99, titulo: 'A' }])).valido, false);
  assert.equal(evaluar(borrador([{ id_seccion: '1', titulo: 'A' }])).valido, false);
  assert.equal(evaluarBorradorPublicable(borrador([{ id_seccion: 1, titulo: 'A' }]),
    [{ ...catalogo[0], activo: false }], 1).valido, false);
});

test('rechaza campos extra, HTML, texto inválido y sección sin cambios', () => {
  for (const contenido of [
    { secciones: [{ id_seccion: 1, titulo: '<script>' }] },
    { secciones: [{ id_seccion: 1, titulo: 'a'.repeat(181) }] },
    { secciones: [{ id_seccion: 1, titulo: null }] },
    { secciones: [{ id_seccion: 1 }] },
    { secciones: [{ id_seccion: 1, precio: 200 }] },
    { secciones: [{ id_seccion: 1, titulo: 'A' }], idProyecto: 8 }
  ]) assert.equal(evaluar(borrador(contenido.secciones, { contenidoPendiente: contenido })).valido, false);
});

test('solo subtítulo promocional valida su longitud y caracteres, no obliga a título', () => {
  assert.equal(validarSubtituloPromo(''), null);
  assert.equal(validarSubtituloPromo('a'.repeat(255)), null);
  assert.notEqual(validarSubtituloPromo('a'.repeat(256)), null);
  assert.notEqual(validarSubtituloPromo('X < Y'), null);
});

test('el POST solo necesita revisiones y no envía el identificador del publicador', () => {
  assert.deepEqual(solicitudPublicacion(borrador([{ id_seccion: 1, titulo: 'X' }])), {
    revisionEditorialEsperada: 5, revisionPublicadaEsperada: 0
  });
});

test('solo imagen se habilita únicamente tras verificar imagen del mismo slide', () => {
  const soloImagen = borrador([{ id_seccion: 2 }]);
  assert.equal(evaluar(soloImagen).valido, false);
  assert.equal(evaluarBorradorPublicable(soloImagen, catalogo, 1, new Set([1])).valido, false);
  const valido = evaluarBorradorPublicable(soloImagen, catalogo, 1, new Set([2]));
  assert.equal(valido.valido, true);
  assert.deepEqual(valido.secciones[0].textos, []);
});
