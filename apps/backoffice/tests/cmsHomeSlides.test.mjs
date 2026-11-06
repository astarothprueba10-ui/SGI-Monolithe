import assert from 'node:assert/strict';
import test from 'node:test';
import { inventariarSlidesInicio } from '../src/services/cmsHomeSlides.ts';

const secciones = [
  { codigo: 'HERO_PRINCIPAL', idSeccion: 1, activo: true, visible: true },
  { codigo: 'HERO_SLIDE_2_PROMO', idSeccion: 2, activo: true, visible: false },
  { codigo: 'HERO_SLIDE_3_PROMO', idSeccion: 3, activo: true, visible: false }
];

test('sin secciones verificadas no habilita ningún editor', () => {
  const slides = inventariarSlidesInicio(null);
  assert.deepEqual(slides.map(s => s.numero), [1, 2, 3]);
  assert.ok(slides.every(s => s.idSeccionCms === null));
});

test('reconoce las tres secciones creadas con la migración 35, sin asumir identificadores', () => {
  const slides = inventariarSlidesInicio(secciones);
  assert.deepEqual(slides.map(s => s.idSeccionCms), [1, 2, 3]);
  assert.ok(slides.every(s => s.estado === 'EDITOR_CMS'));
});

test('códigos inventados no habilitan edición', () => {
  const slides = inventariarSlidesInicio([
    { codigo: 'HERO_2', idSeccion: 2, activo: true, visible: false },
    { codigo: 'HERO_FINANCIAMIENTO', idSeccion: 3, activo: true, visible: false }
  ]);
  assert.ok(slides.every(s => s.estado === 'PENDIENTE_MODELO'));
});

test('un slide ya publicado sigue siendo editable, pero el inactivo no', () => {
  const slides = inventariarSlidesInicio([
    secciones[0],
    { ...secciones[1], visible: true },
    { ...secciones[2], activo: false }
  ]);
  assert.deepEqual(slides.map(s => s.estado), ['EDITOR_CMS', 'EDITOR_CMS', 'PENDIENTE_MODELO']);
});

test('ambos slides publicados siguen siendo editables y no se aceptan estados ambiguos', () => {
  const publicadas = inventariarSlidesInicio([
    secciones[0],
    { ...secciones[1], visible: true },
    { ...secciones[2], visible: true }
  ]);
  assert.deepEqual(publicadas.map(s => s.idSeccionCms), [1, 2, 3]);

  const incompletas = inventariarSlidesInicio([
    secciones[0],
    { ...secciones[1], visible: undefined },
    { ...secciones[2], visible: 'true' }
  ]);
  assert.deepEqual(incompletas.map(s => s.idSeccionCms), [1, null, null]);
});

test('no acepta IDs nulos, negativos o no enteros', () => {
  const slides = inventariarSlidesInicio([
    { ...secciones[0], idSeccion: -1 },
    { ...secciones[1], idSeccion: 2.5 },
    { ...secciones[2], idSeccion: Number.NaN }
  ]);
  assert.ok(slides.every(s => s.idSeccionCms === null));
});
