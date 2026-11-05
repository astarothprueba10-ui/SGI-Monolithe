import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const script = fileURLToPath(new URL('../cms-public-smoke.mjs', import.meta.url));
const pagina = secciones => ({ codigo: 'INICIO', secciones });
const principal = { codigo: 'HERO_PRINCIPAL', multimedia: [] };

async function comprobar(contenido, extra = []) {
  const server = createServer((req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify(req.url === '/api/public/proyectos' ? [] : contenido));
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const url = 'http://127.0.0.1:' + server.address().port;
  try {
    return await new Promise((resolve, reject) => {
      const child = spawn(process.execPath, [script, url, ...extra]);
      let stdout = '', stderr = '';
      child.stdout.on('data', chunk => { stdout += chunk; });
      child.stderr.on('data', chunk => { stderr += chunk; });
      child.on('error', reject);
      child.on('close', code => resolve({ code, stdout, stderr }));
    });
  } finally {
    await new Promise(resolve => server.close(resolve));
  }
}

test('solo INICIO publicado pasa el smoke', async () => {
  const r = await comprobar(pagina([principal]), ['--expect-hidden-promos']);
  assert.equal(r.code, 0, r.stderr);
  assert.match(r.stdout, /PASS: INICIO/);
});
test('rechaza slides ocultos expuestos', async () => {
  const r = await comprobar(pagina([principal, { codigo: 'HERO_SLIDE_2_PROMO' }]),
    ['--expect-hidden-promos']);
  assert.equal(r.code, 1);
  assert.match(r.stderr, /slide promocional oculto/);
});
test('rechaza datos de borrador en respuesta publica', async () => {
  const r = await comprobar({ ...pagina([principal]), contenidoPendiente: true });
  assert.equal(r.code, 1);
  assert.match(r.stderr, /datos privados/);
});
