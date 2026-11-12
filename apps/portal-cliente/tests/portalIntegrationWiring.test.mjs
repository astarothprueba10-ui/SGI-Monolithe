// Sprint 4 · 5.4.6. Contract smoke checks; no external services or credentials.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (file) => readFileSync(new URL(file, import.meta.url), 'utf8');

test('Portal routes resolve real payment and document pages', () => {
  const routes = read('../src/App.tsx');
  assert.match(routes, /path="pagos" element={<Pagos \/>}/);
  assert.match(routes, /path="documentos" element={<Documentos \/>}/);
  assert.doesNotMatch(routes, /path="pagos" element={<PortalFeaturePending/);
  assert.doesNotMatch(routes, /path="documentos" element={<PortalFeaturePending/);
});

test('Core API is proxied to the private Docker service, not browser localhost', () => {
  const client = read('../src/lib/portalCoreApi.ts');
  const vite = read('../vite.config.ts');
  const compose = read('../../../docker-compose.yml');
  assert.match(client, /VITE_CORE_API_URL \?\? '\/api\/core'/);
  assert.match(vite, /'\/api\/core': \{/);
  assert.match(vite, /CORE_PROXY_TARGET/);
  assert.match(vite, /'import\.meta\.env\.VITE_CORE_API_URL'/);
  const portal = compose.split('  portal-cliente:')[1].split('  backoffice:')[0];
  assert.match(portal, /VITE_CORE_API_URL:\s*\/api\/core/);
  assert.match(portal, /CORE_PROXY_TARGET:\s*http:\/\/core-service:8083/);
  assert.match(portal, /depends_on:[\s\S]*- core-service/);
});

test('Client requests use JWT and no caching; no service_role key in browser', () => {
  const client = read('../src/lib/portalCoreApi.ts');
  const upload = read('../src/components/portal/RegistrarPagoForm.tsx');
  const docs = read('../src/pages/portal/Documentos.tsx');
  assert.match(client, /Authorization: `Bearer \$\{token\}`/);
  assert.match(client, /cache: 'no-store'/);
  assert.match(upload, /uploadToSignedUrl/);
  assert.match(docs, /url-firmada/);
  for (const s of [client,upload,docs]) {
    assert.doesNotMatch(s, /SUPABASE_SECRET_KEY|SERVICE_ROLE_KEY|service_role/);
  }
});

test('Portal pages do not import the legacy demo dataset', () => {
  for (const p of ['Inicio','MiLote','Cronograma','Pagos','Documentos']) {
    assert.doesNotMatch(read(`../src/pages/portal/${p}.tsx`),
      /from ['"][^'"]*data\/portal['"]/);
  }
  assert.doesNotMatch(read('../src/components/portal/AlertasPanel.tsx'),
    /from ['"][^'"]*data\/portal['"]/);
});

test('Backend limits portal endpoints by role and private signed PDFs', () => {
  const controller=read('../../../services/core-service/src/main/java/monolithe/core_service/controller/PortalClienteController.java');
  const signing=read('../../../services/core-service/src/main/java/monolithe/core_service/service/PortalDocumentoStorageService.java');
  assert.match(controller, /hasAuthority\('ROLE_CLIENTE'\)/);
  assert.match(controller, /CacheControl\.noStore\(\)/);
  assert.match(signing, /TTL_SECONDS = 120/);
  assert.match(signing, /contratos-firmados-private/);
});
