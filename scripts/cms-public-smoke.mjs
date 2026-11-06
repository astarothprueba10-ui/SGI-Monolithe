#!/usr/bin/env node
/** Solo lectura: valida contenido publicado sin credenciales ni escritura. */
const args = process.argv.slice(2);
const base = (args.find(a => !a.startsWith('--')) || process.env.CMS_PUBLIC_BASE_URL || '').replace(/\/+$/, '');
const exigirOcultos = args.includes('--expect-hidden-promos');
const prohibidos = /contenidoPendiente|revisionEdicion|cms-drafts-private|sb_secret_|service_role|objectKey/i;

function exigir(ok, detalle) {
  if (!ok) throw new Error(detalle);
}
async function solicitar(ruta) {
  const respuesta = await fetch(base + ruta, {
    method: 'GET', headers: { Accept: 'application/json' }, cache: 'no-store'
  });
  exigir(respuesta.ok, 'GET ' + ruta + ': HTTP ' + respuesta.status);
  return respuesta.json();
}
async function verificar() {
  exigir(/^https?:\/\/[^/]+/i.test(base), 'Uso: node scripts/cms-public-smoke.mjs http://localhost:8082 [--expect-hidden-promos]');
  const pagina = await solicitar('/api/public/paginas/contenido/codigo/INICIO');
  exigir(pagina?.codigo === 'INICIO', 'La API devolvio otra pagina');
  exigir(Array.isArray(pagina.secciones), 'Falta el arreglo de secciones');
  exigir(!prohibidos.test(JSON.stringify(pagina)), 'La respuesta contiene datos privados o credenciales');
  const codigos = pagina.secciones.map(seccion => seccion?.codigo);
  exigir(codigos.includes('HERO_PRINCIPAL'), 'No se recibio HERO_PRINCIPAL');
  if (exigirOcultos) {
    exigir(!codigos.includes('HERO_SLIDE_2_PROMO') && !codigos.includes('HERO_SLIDE_3_PROMO'),
      'Se expuso un slide promocional oculto');
  }
  for (const seccion of pagina.secciones) {
    for (const media of seccion.multimedia ?? []) {
      if (!media.urlPublica) continue;
      const url = new URL(media.urlPublica);
      exigir(url.protocol === 'https:' && !prohibidos.test(url.href),
        'Multimedia insegura en seccion ' + seccion.codigo);
    }
  }
  const proyectos = await solicitar('/api/public/proyectos');
  exigir(Array.isArray(proyectos), 'El catalogo publico no es un arreglo');
  exigir(!prohibidos.test(JSON.stringify(proyectos)), 'El catalogo expuso datos privados');
  console.log('PASS: INICIO (' + pagina.secciones.length + ' secciones), proyectos (' + proyectos.length + ')');
  console.log('PASS: endpoints GET publicos; sin token, sin borradores ni escritura');
}
verificar().catch(error => { console.error('FAIL:', error.message); process.exitCode = 1; });
