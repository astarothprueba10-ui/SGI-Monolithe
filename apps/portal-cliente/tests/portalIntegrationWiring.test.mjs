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
  assert.doesNotMatch(client, /'Cache-Control':\s*'no-store'/);
  // La cabecera Cache-Control no se permite en el preflight del Core;
  // fetch(cache) y CacheControl.noStore() bastan para no persistir datos.
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


test('Temporary CLIENTE credentials require password change before any portal page', () => {
  const login = read('../src/components/LoginForm.tsx');
  const routes = read('../src/App.tsx');
  const screen = read('../src/pages/ChangePassword.tsx');
  const session = read('../src/lib/portalSession.ts');
  const coreGuard = read('../../../services/core-service/src/main/java/monolithe/core_service/config/SecurityConfig.java');
  const authGuard = read('../../../services/auth-service/src/main/java/monolithe/auth_service/config/SecurityConfig.java');
  assert.match(login, /data\.requiereCambioPassword \? '\/cambiar-contrasena' : '\/portal'/);
  assert.match(login, /data\.autoridades\.includes\('ROLE_CLIENTE'\)/);
  assert.match(routes, /path="\/cambiar-contrasena"/);
  assert.match(routes, /RequirePasswordChange/);
  assert.match(routes, /estado === 'password-change-required'/);
  assert.match(routes, /<RequireAuth>/);
  assert.match(session, /user\.autoridades\.includes\('ROLE_CLIENTE'\)/);
  assert.match(session, /user\.requiereCambioPassword \? 'password-change-required' : 'authenticated'/);
  assert.match(screen, /authApi\.post<void>\('\/change-password'/);
  assert.match(screen, /Authorization: `Bearer \$\{accessToken\}`/);
  assert.match(screen, /clearPortalSession\(\)/);
  assert.match(coreGuard, /password_change_required/);
  assert.match(authGuard, /password_change_required/);
});

test('Portal recovery uses client document, private registered email and OTP', () => {
  const forgot = read('../src/pages/ForgotPassword.tsx');
  const reset = read('../src/pages/ResetPassword.tsx');
  const authController = read('../../../services/auth-service/src/main/java/monolithe/auth_service/controller/AuthController.java');
  const recovery = read('../../../services/auth-service/src/main/java/monolithe/auth_service/service/PasswordResetService.java');
  assert.match(forgot, /PORTAL_DOCUMENTO_REGEX\[tipoDocumento\]/);
  assert.match(forgot, /origen: 'PORTAL_CLIENTE'/);
  assert.doesNotMatch(forgot, /correoDestino|emailDestino|destinatario|setCorreoEnmascarado/);
  assert.match(forgot, /correo principal.*registrado|correo principal.*figura/s);
  assert.match(authController, /"PORTAL_CLIENTE"\.equals\(solicitud\.getOrigen\(\)\)/);
  assert.match(recovery, /passwordRecoveryProcedureRepository\s*\.solicitarRecuperacion\(/);
  assert.match(reset, /'\/reset-password\/confirm'/);
  assert.match(reset, /clearPortalSession\(\)/);
});
