import assert from 'node:assert/strict';
import test from 'node:test';
import { imagenNoRegistrada, revisionImagenConfirmada, rutaImagenBorrador } from '../src/services/cmsImageDraftContract.ts';

test('construye rutas privadas de CMS, sin URLs de Supabase', () => {
  assert.equal(rutaImagenBorrador(2, 1), '/cms/borradores/2/imagenes/1');
  assert.equal(rutaImagenBorrador(2, 1, 3), '/cms/borradores/2/imagenes/1?revisionEsperada=3');
});

test('rechaza identificadores y revisiones no válidas', () => {
  for (const id of [0, -1, NaN, 1.5, Number.MAX_SAFE_INTEGER + 1]) {
    assert.throws(() => rutaImagenBorrador(id, 1), /inválidos/);
    assert.throws(() => rutaImagenBorrador(1, id), /inválidos/);
  }
  assert.throws(() => rutaImagenBorrador(2, 1, 0), /inválida/);
});

test('solo trata como ausencia la imagen no registrada; no oculta 404 por acceso ajeno', () => {
  assert.equal(imagenNoRegistrada({ status: 404, message: 'Imagen de borrador no encontrada' }), true);
  assert.equal(imagenNoRegistrada({ status: 404, message: 'Borrador no encontrado' }), false);
  assert.equal(imagenNoRegistrada({ status: 403, message: 'Forbidden' }), false);
  assert.equal(imagenNoRegistrada({ status: 401, message: 'Unauthorized' }), false);
  assert.equal(imagenNoRegistrada(null), false);
});

test('acepta exclusivamente la revisión siguiente del mismo borrador y sección', () => {
  assert.equal(revisionImagenConfirmada({ idBorrador: 2, idSeccion: 1, revisionEdicion: 4 }, 2, 1, 3), 4);
  assert.throws(() => revisionImagenConfirmada({ idBorrador: 5, idSeccion: 1, revisionEdicion: 4 }, 2, 1, 3), /no coincide/);
  assert.throws(() => revisionImagenConfirmada({ idBorrador: 2, idSeccion: 3, revisionEdicion: 4 }, 2, 1, 3), /no coincide/);
  assert.throws(() => revisionImagenConfirmada({ idBorrador: 2, idSeccion: 1, revisionEdicion: 3 }, 2, 1, 3), /no coincide/);
  assert.throws(() => revisionImagenConfirmada({ idBorrador: 2, idSeccion: 1, revisionEdicion: 5 }, 2, 1, 3), /no coincide/);
});
