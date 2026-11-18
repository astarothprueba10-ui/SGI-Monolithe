import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const read = p => readFileSync(new URL(p,import.meta.url),'utf8');

test('ensayo con JWT de Gerencia, versión y hash canónico se limita a TOTP y auditoría', () => {
  const service=read('../../../services/auth-service/src/main/java/monolithe/auth_service/service/FinancingTotpService.java');
  const controller=read('../../../services/auth-service/src/main/java/monolithe/auth_service/controller/FinancingTotpController.java');
  const start=service.indexOf('public Map<String,Object> ensayarAutorizacion');
  const end=service.indexOf('/** Recibo TOTP ligado',start);
  assert.ok(start>0 && end>start,'Debe existir método aislado de ensayo');
  const ensayo=service.slice(start,end);
  assert.match(ensayo,/long id=actor\(jwt\)/);
  assert.match(ensayo,/publicacion\.previsualizar\(jwt,version,borrador\)/);
  assert.match(ensayo,/if \(vista\.path\("publicacionHabilitada"\)\.asBoolean\(\)\)/);
  assert.match(ensayo,/vista\.path\("hashPropuesta"\)\.asText\(\)/);
  assert.match(ensayo,/Cuenta c=fila\(id,true\)/);
  assert.match(ensayo,/validarTotp\(c,id,codigo\)/);
  assert.match(ensayo,/MFA_FIN_ENSAYO_AUTORIZACION/);
  assert.match(ensayo,/'publicacion_realizada',false/);
  assert.match(ensayo,/"publicacionRealizada",false/);
  assert.doesNotMatch(ensayo,/INSERT INTO public\.seg_fin_totp_autorizaciones/);
  assert.doesNotMatch(ensayo,/sp_fin_publicar_politica_v1|cfg_fin_politica_activa|INSERT INTO public\.cfg_fin_politicas_versiones/);
  assert.match(controller,/@PostMapping\("\/rehearse"\)/);
  assert.match(controller,/@PreAuthorize\("hasAuthority\('financing\.configure'\)"\)/);
  assert.match(controller,/CacheControl\.noStore\(\)/);
  assert.match(service,/@Transactional\(noRollbackFor=ResponseStatusException.class\)\s+public Map<String,Object> ensayarAutorizacion/);
});

test('Backoffice muestra prueba sin publicar solo con preview protegido y nunca expone código',()=>{
  const ui=read('../src/components/financing/PublicarPoliticaFinancieraPanel.tsx');
  const api=read('../src/services/financingPolicyPublicationService.ts');
  assert.match(ui,/!vista\.publicacionHabilitada \? <div/);
  assert.match(ui,/ensayarTotp\(\)/);
  assert.match(ui,/Verificar firma TOTP/);
  assert.match(ui,/setCodigo\(''\)/);
  assert.match(ui,/resultado\.hashPropuesta!==vista\.hashPropuesta/);
  assert.match(ui,/resultado\.publicacionRealizada!==false/);
  assert.match(ui,/ensayoValidado/);
  assert.match(api,/authSecuredApi\.post<ResultadoEnsayoTotp>\('\/financing-mfa\/rehearse'/);
  assert.doesNotMatch(ui,/localStorage|sessionStorage/);
  assert.doesNotMatch(api,/\/rehearse.*\/publish/);
});
