import assert from 'node:assert/strict';
import test from 'node:test';
import { validarImagenLocal, LIMITE_IMAGEN_LOCAL } from '../src/services/cmsImagePreview.ts';

const imagen = (name, type, size = 2048) => ({ name, type, size });

test('acepta JPG, PNG y WebP dentro del límite', () => {
  assert.equal(validarImagenLocal(imagen('foto.JPG', 'image/jpeg')), null);
  assert.equal(validarImagenLocal(imagen('portada.png', 'image/png')), null);
  assert.equal(validarImagenLocal(imagen('portada.webp', 'image/webp', LIMITE_IMAGEN_LOCAL)), null);
});

test('rechaza SVG y GIF, aunque sean imágenes', () => {
  assert.match(validarImagenLocal(imagen('vector.svg', 'image/svg+xml')), /Solo se permiten/);
  assert.match(validarImagenLocal(imagen('animacion.gif', 'image/gif')), /Solo se permiten/);
});

test('rechaza discordancia entre MIME y extensión', () => {
  assert.match(validarImagenLocal(imagen('foto.jpg', 'image/png')), /extensión/);
  assert.match(validarImagenLocal(imagen('vector.svg', 'image/jpeg')), /extensión/);
});

test('rechaza imágenes vacías o con tamaños inválidos', () => {
  assert.match(validarImagenLocal(imagen('vacia.png', 'image/png', 0)), /vacía/);
  assert.match(validarImagenLocal(imagen('invalida.webp', 'image/webp', Number.NaN)), /tamaño/);
});

test('rechaza imágenes mayores de 5 MB', () => {
  assert.match(validarImagenLocal(imagen('grande.png', 'image/png', LIMITE_IMAGEN_LOCAL + 1)), /5 MB/);
});

test('no acepta una selección vacía ni nombres demasiado largos', () => {
  assert.match(validarImagenLocal(null), /Selecciona/);
  assert.match(validarImagenLocal(imagen('a'.repeat(260) + '.png', 'image/png')), /nombre/);
});
