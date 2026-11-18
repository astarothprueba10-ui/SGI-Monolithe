import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = path => readFileSync(new URL(path, import.meta.url), 'utf8');

test('staging lee política por Auth con permisos de Gerencia y conserva Core para producción', () => {
  const authService=read('../../../services/auth-service/src/main/java/monolithe/auth_service/service/FinancingPolicyPublicationService.java');
  const controller=read('../../../services/auth-service/src/main/java/monolithe/auth_service/controller/FinancingPolicyController.java');
  const frontend=read('../src/services/financingConfigService.ts');
  const panel=read('../src/components/financing/CarteraFinanciamientoPanel.tsx');
  assert.match(controller, /@GetMapping\("\/current"\)/);
  assert.match(controller, /@PreAuthorize\("hasAuthority\('financing\.configure'\)"\)/);
  assert.match(controller, /CacheControl\.noStore\(\)/);
  assert.match(authService, /public JsonNode consultarActual\(Jwt jwt\)/);
  assert.match(authService, /sp_fin_consultar_politicas_v1\(CAST\(\? AS bigint\)\)/);
  assert.match(frontend, /VITE_FINANCING_STAGING_AUTH_CURRENT === 'true'/);
  assert.match(frontend, /authSecuredApi\.get<PoliticaFinanciamientoActual>/);
  assert.match(frontend, /coreApi\.get<PoliticaFinanciamientoActual>/);
  assert.match(panel, /vista === 'CONFIGURACION'/);
  assert.match(panel, /VITE_FINANCING_STAGING_AUTH_CURRENT === 'true'/);
  assert.doesNotMatch(frontend, /coreApi\.post|coreApi\.put|coreApi\.patch|coreApi\.delete/);
});

test('la imagen de staging sirve build estático y no Vite dev', () => {
  const docker=read('../Dockerfile.staging');
  const nginx=read('../nginx.staging.conf');
  assert.match(docker, /RUN npm run build/);
  assert.match(docker, /FROM nginx:/);
  assert.match(docker, /COPY --from=builder \/app\/dist/);
  assert.doesNotMatch(docker,/npm run dev/);
  assert.match(nginx, /listen 5174/);
  assert.match(nginx, /location \^~ \/api\/auth\//);
  assert.match(nginx, /http:\/\/auth-service\.railway\.internal:8081/);
  assert.match(nginx, /location \^~ \/api\/core\/ \{ return 503; \}/);
  assert.match(nginx, /location \^~ \/cms-api\/ \{ return 503; \}/);
  assert.doesNotMatch(nginx,/production-|portal-administrativo-delta/);
});
