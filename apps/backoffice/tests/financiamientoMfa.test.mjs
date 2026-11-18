import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = p => readFileSync(new URL(p, import.meta.url), 'utf8');

test('migración MFA niega accesos públicos y no habilita publicación', () => {
  const sql=read('../../../database/migrations/112_financiamiento_mfa_gerencia_v1.sql');
  for(const name of ['seg_fin_totp_cuentas','seg_fin_totp_recuperacion','seg_fin_totp_autorizaciones']) {
    assert.match(sql,new RegExp('CREATE TABLE public\\.'+name));
    assert.match(sql,new RegExp('ALTER TABLE public\\.'+name+' ENABLE ROW LEVEL SECURITY'));
  }
  assert.match(sql,/REVOKE ALL ON TABLE[\s\S]*FROM PUBLIC,anon,authenticated,service_role,sigi_app_user/);
  assert.match(sql,/GRANT SELECT,INSERT,UPDATE ON public\.seg_fin_totp_cuentas TO sigi_app_user/);
  assert.match(sql,/UNIQUE\(id_usuario,nonce\)/);
  assert.match(sql,/consumido_en timestamptz/);
  assert.doesNotMatch(sql,/UPDATE public\.cfg_fin_politica_activa/);
});

test('alta exige segundo canal verificado y contraseña sin exponer secreto antes', () => {
  const service=read('../../../services/auth-service/src/main/java/monolithe/auth_service/service/FinancingTotpService.java');
  const controller=read('../../../services/auth-service/src/main/java/monolithe/auth_service/controller/FinancingTotpController.java');
  assert.match(service,/r\.codigo='GERENCIA'/);
  assert.match(service,/financing\.configure/);
  assert.match(service,/u\.version_sesiones=\?/);
  assert.match(service,/passwords\.matches\(password,u\.getPasswordHash\(\)\)/);
  assert.match(service,/c\.verificado AND c\.principal/);
  assert.match(service,/correoCorporativoVerificado/);
  assert.match(service,/SELECT EXISTS\(/);
  assert.match(service,/@monolithe\.pe/);
  assert.match(service,/validarCorreo\(c,id,jwt,emailCodigo\)/);
  assert.match(service,/c\.emailIntentos\(\)/);
  assert.match(service,/interval '15 minutes'/);
  assert.match(service,/jwt\.getId\(\)/);
  assert.match(controller,/PreAuthorize\("hasAuthority\('financing\.configure'\)"\)/);
  assert.match(controller,/CacheControl\.noStore\(\)/);
});

test('factor de seis dígitos protege contra replay y mantiene recuperación un uso', () => {
  const service=read('../../../services/auth-service/src/main/java/monolithe/auth_service/service/FinancingTotpService.java');
  const crypto=read('../../../services/auth-service/src/main/java/monolithe/auth_service/service/FinancingTotpCrypto.java');
  assert.match(crypto,/new GCMParameterSpec\(128, iv\)/);
  assert.match(crypto,/updateAAD/);
  assert.match(crypto,/random\.nextBytes/);
  assert.match(crypto,/HmacSHA1/);
  assert.match(crypto,/codigo == null \|\| !codigo\.matches\("\[0-9\]\{6\}"\)/);
  assert.match(crypto,/paso > ultimoPaso/);
  assert.match(service,/usado_en IS NULL/);
  assert.match(service,/FinancingTotpCrypto\.hash\(recovery\)/);
  assert.match(service,/sesiones\.revocarTodasLasSesiones/);
  assert.match(service,/TransactionSynchronizationManager\.registerSynchronization/);
  assert.match(service,/publicacionHabilitada",Boolean\.TRUE\.equals\(habilitada\)/);
  assert.match(service,/publicacion\.previsualizar\(jwt,version,borrador\)/);
  assert.match(service,/hashPropuesta/);
  assert.match(service,/hash_propuesta,nonce,expira_en/);
  assert.match(service,/120 seconds/);
});

test('UI no persiste secretos ni publica políticas', () => {
  const ui=read('../src/components/financing/SeguridadFinancieraTotpPanel.tsx');
  const api=read('../src/services/financingMfaService.ts');
  const panel=read('../src/components/financing/ConfiguracionPlanesFinanciamientoPanel.tsx');
  assert.match(panel,/SeguridadFinancieraTotpPanel/);
  assert.match(ui,/setRespaldo\(\[\]\)/);
  assert.match(ui,/estado\.correoCorporativoVerificado/);
  assert.match(ui,/Correo corporativo pendiente de verificación/);
  assert.match(api,/correoCorporativoVerificado: boolean/);
  assert.match(ui,/setSecreto\(''\)/);
  assert.doesNotMatch(ui,/localStorage\.|sessionStorage\./);
  assert.match(api,/authSecuredApi\.post/);
  assert.doesNotMatch(api,/\/publish|\/publicar/);
  assert.match(panel,/La publicación de otra versión permanece bloqueada/);
});
