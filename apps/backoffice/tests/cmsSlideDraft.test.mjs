import assert from 'node:assert/strict';
import test from 'node:test';
import { cargarCamposPromo, extraerCambiosCms, fusionarCambioSlide, prepararCambioSoloImagen, validarCamposPromo, seccionGuardada, identificarSlidesBorrador, existenCambiosReales, elegirSlideInicialBorrador, validarCambioSlideBorrador } from '../src/services/cmsSlideDraft.ts';

const datos = { titulo: 'Campaña B', subtitulo: 'Lanzamiento', contenido: 'Un espacio distinto' };
const pendiente = {
  secciones: [
    { id_seccion: 1, titulo: 'Campaña A', contenido: 'Descripción A' },
    { id_seccion: 2, titulo: 'Promoción B' }
  ]
};

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

test('normaliza espacios externos al guardar los textos', () => {
  const cambios = fusionarCambioSlide(null, 1, {
    titulo: '  Título  ',
    subtitulo: '  Subtítulo  ',
    contenido: '  Descripción  '
  });

  assert.deepEqual(cambios[0], {
    idSeccion: 1,
    titulo: 'Título',
    subtitulo: 'Subtítulo',
    contenido: 'Descripción'
  });
});

test('permite limpiar campos opcionales con espacios', () => {
  const cambios = fusionarCambioSlide(pendiente, 1, {
    titulo: 'Título',
    subtitulo: '   ',
    contenido: '   '
  });

  assert.equal(cambios[0].subtitulo, '');
  assert.equal(cambios[0].contenido, '');
});


const inventarioReal = [
  { numero: 1, idSeccionCms: 9 },
  { numero: 2, idSeccionCms: 73 },
  { numero: 3, idSeccionCms: 44 }
];

function borradorSecciones(idBorrador, idsSeccion) {
  return {
    idBorrador, tipoObjetivo: 'PAGINA', idPagina: 1,
    contenidoPendiente: { secciones: idsSeccion.map(id => ({ id_seccion: id })) }
  };
}

test('identifica el slide por ID de sección, nunca por número de borrador', () => {
  assert.deepEqual(identificarSlidesBorrador(borradorSecciones(11, [44]), inventarioReal, 1), [3]);
  assert.deepEqual(identificarSlidesBorrador(borradorSecciones(12, [73]), inventarioReal, 1), [2]);
});

test('identifica cambios simultáneos sin confundir secciones ni IDs', () => {
  assert.deepEqual(identificarSlidesBorrador(borradorSecciones(13, [73, 9]), inventarioReal, 1), [1, 2]);
});

test('rechaza borradores de otra página o con datos CMS corruptos', () => {
  const paginaAjena = { ...borradorSecciones(11, [44]), idPagina: 2 };
  const estructuraMala = { ...borradorSecciones(11, [44]), contenidoPendiente: { secciones: 'erróneo' } };
  assert.deepEqual(identificarSlidesBorrador(paginaAjena, inventarioReal, 1), []);
  assert.deepEqual(identificarSlidesBorrador(estructuraMala, inventarioReal, 1), []);
});

test('considera cambios solo en campos editables y omite espacios exteriores', () => {
  const actual = { titulo: ' Título ', subtitulo: ' Nuevo ', contenido: 'Texto' };
  const guardado = { titulo: 'Título', subtitulo: 'Antes', contenido: 'Texto' };
  assert.equal(existenCambiosReales(actual, guardado, ['subtitulo']), true);
  assert.equal(existenCambiosReales(actual, guardado, ['titulo', 'contenido']), false);
});


test('borradores 11/12 con portada y promoción abren primero su diapositiva promocional', () => {
  assert.equal(elegirSlideInicialBorrador([1, 3], 1), 3);
  assert.equal(elegirSlideInicialBorrador([1, 2], 1), 2);
  assert.equal(elegirSlideInicialBorrador([1], 3), 1);
  assert.equal(elegirSlideInicialBorrador([], 1), null);
  assert.equal(elegirSlideInicialBorrador([2, 3], 3), 3);
});

test('permite cambiar entre slides del mismo borrador y bloquea otros', () => {
  assert.equal(validarCambioSlideBorrador(1, [1, 2], false), null);
  assert.equal(validarCambioSlideBorrador(2, [1, 2], false), null);
  assert.match(validarCambioSlideBorrador(3, [1, 2], false), /no está asociada/);
  assert.equal(validarCambioSlideBorrador(3, null, false), null);
});

test('cambio de slide protegido cuando hay modificaciones sin guardar', () => {
  assert.match(validarCambioSlideBorrador(2, [1, 2], true), /Guarda primero/);
  assert.match(validarCambioSlideBorrador(1, null, true), /Guarda primero/);
});

test('navegación de un borrador múltiple conserva contenidos de otros slides', () => {
  const dosSlides = {
    secciones: [
      { id_seccion: 9, titulo: 'Portada guardada' },
      { id_seccion: 73, subtitulo: 'Promoción guardada' }
    ]
  };
  const seccionUno = { idSeccion: 9, titulo: 'Publicada', subtitulo: 'A', contenido: 'B' };
  const seccionDos = { idSeccion: 73, titulo: 'Título oficial', subtitulo: 'Subtítulo público', contenido: 'Descripción oficial' };

  assert.deepEqual(cargarCamposPromo(seccionUno, dosSlides), {
    titulo: 'Portada guardada', subtitulo: 'A', contenido: 'B'
  });
  assert.deepEqual(cargarCamposPromo(seccionDos, dosSlides), {
    titulo: 'Título oficial', subtitulo: 'Promoción guardada', contenido: 'Descripción oficial'
  });

  const guardado = fusionarCambioSlide(dosSlides, 73, {
    titulo: 'Título oficial', subtitulo: 'Nuevo subtítulo', contenido: 'Descripción oficial'
  }, true);
  assert.deepEqual(guardado[0], { idSeccion: 9, titulo: 'Portada guardada' });
  assert.equal(guardado[1].subtitulo, 'Nuevo subtítulo');
});
