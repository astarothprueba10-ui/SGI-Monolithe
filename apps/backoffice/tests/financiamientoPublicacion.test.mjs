import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const read=(path)=>readFileSync(new URL(path,import.meta.url),'utf8');

test('bloque 4 incorpora candado denegado por defecto y evita Data API',()=>{
  const sql=read('../../../database/migrations/113_financiamiento_borradores_canonicos_v1.sql');
  assert.match(sql,/CREATE TABLE public\.cfg_fin_publicacion_control/);
  assert.match(sql,/habilitado boolean NOT NULL DEFAULT false/);
  assert.match(sql,/INSERT INTO public\.cfg_fin_publicacion_control\(id,habilitado\) VALUES\(1,false\)/);
  assert.match(sql,/ENABLE ROW LEVEL SECURITY/);
  assert.match(sql,/FROM PUBLIC,anon,authenticated,service_role,sigi_app_user/);
  assert.doesNotMatch(sql,/GRANT (UPDATE|ALL) ON .*cfg_fin_publicacion_control TO sigi_app_user/);
  assert.match(sql,/fn_fin_normalizar_borrador_v1/);
  assert.match(sql,/sha256\(convert_to\(p_version::text\|\|':'\|\|p_normal::text/);
  assert.match(sql,/jsonb_object_keys\(p_json\)/);
  assert.match(sql,/BORRADOR_INVALIDO/);
  assert.match(sql,/POLITICA_SIN_CAMBIOS/);
  assert.match(sql,/sp_fin_previsualizar_borrador_v1/);
  assert.match(sql,/GRANT EXECUTE ON FUNCTION public\.sp_fin_previsualizar_borrador_v1/);
});

test('publicación es atómica y solo consume TOTP ligado a actor, jti, nonce, versión y hash',()=>{
  const sql=read('../../../database/migrations/114_financiamiento_publicacion_auditada_v1.sql');
  assert.match(sql,/LANGUAGE plpgsql VOLATILE SECURITY DEFINER/);
  assert.match(sql,/cfg_fin_publicacion_control[\s\S]*FOR UPDATE/);
  assert.match(sql,/PUBLICACION_BLOQUEADA/);
  assert.match(sql,/p_version_sesion/);
  assert.match(sql,/p_jti/);
  assert.match(sql,/fn_fin_gerencia_autorizada_v1\(p_actor\)/);
  assert.match(sql,/u\.version_sesiones/);
  assert.match(sql,/c\.verificado AND c\.activo/);
  assert.match(sql,/v_cuenta\.secreto_cifrado IS NULL/);
  assert.match(sql,/FOR UPDATE OF a/);
  assert.match(sql,/v_actual\.version IS DISTINCT FROM p_version_esperada/);
  assert.match(sql,/fn_fin_normalizar_borrador_v1\(p_borrador\)/);
  assert.match(sql,/fn_fin_hash_borrador_v1\(p_version_esperada,v_normal\)/);
  assert.match(sql,/id_autorizacion=p_autorizacion FOR UPDATE/);
  assert.match(sql,/v_aut\.id_usuario IS DISTINCT FROM p_actor/);
  assert.match(sql,/v_aut\.token_jti IS DISTINCT FROM p_jti/);
  assert.match(sql,/v_aut\.hash_propuesta IS DISTINCT FROM v_hash/);
  assert.match(sql,/v_aut\.nonce IS DISTINCT FROM p_nonce/);
  assert.match(sql,/v_aut\.consumido_en IS NOT NULL/);
  assert.match(sql,/v_aut\.expira_en<=clock_timestamp\(\)/);
  assert.match(sql,/SET consumido_en=clock_timestamp\(\)/);
  assert.match(sql,/INSERT INTO public\.cfg_fin_politicas_versiones/);
  assert.match(sql,/UPDATE public\.cfg_fin_politica_activa/);
  assert.match(sql,/public\.sp_registrar_auditoria/);
  assert.match(sql,/AUDITORIA_FALLIDA/);
  assert.match(sql,/REVOKE ALL ON FUNCTION public\.sp_fin_publicar_politica_v1/);
  assert.match(sql,/GRANT EXECUTE ON FUNCTION public\.sp_fin_publicar_politica_v1[\s\S]*TO sigi_app_user/);
  assert.doesNotMatch(sql,/UPDATE public\.(ven_ventas|ven_reservas|pag_planes_pago)/);
});

test('Auth Service calcula huella en servidor y publica desde JWT, sin parámetros de actor externo',()=>{
  const service=read('../../../services/auth-service/src/main/java/monolithe/auth_service/service/FinancingPolicyPublicationService.java');
  const totp=read('../../../services/auth-service/src/main/java/monolithe/auth_service/service/FinancingTotpService.java');
  const controller=read('../../../services/auth-service/src/main/java/monolithe/auth_service/controller/FinancingPolicyController.java');
  const mfa=read('../../../services/auth-service/src/main/java/monolithe/auth_service/controller/FinancingTotpController.java');
  assert.match(service,/sp_fin_previsualizar_borrador_v1/);
  assert.match(service,/sp_fin_publicar_politica_v1/);
  assert.match(service,/jwt\.getId\(\)/);
  assert.match(service,/session_version/);
  assert.match(service,/confirmacionExplicita/);
  assert.match(service,/afterCommit\(\)/);
  assert.match(service,/PUBLICACION_BLOQUEADA/);
  assert.match(totp,/publicacion\.previsualizar\(jwt,version,borrador\)/);
  assert.match(totp,/vista\.path\("hashPropuesta"\)\.asText\(\)/);
  assert.match(totp,/if\(!vista\.path\("publicacionHabilitada"\)\.asBoolean\(\)\)/);
  assert.doesNotMatch(mfa,/String hashPropuesta/);
  assert.match(controller,/PreAuthorize\("hasAuthority\('financing\.configure'\)"\)/);
  assert.match(controller,/CacheControl\.noStore\(\)/);
  assert.match(controller,/@PostMapping\("\/publish"\)/);
  assert.match(controller,/@PostMapping\("\/preview"\)/);
});

test('Backoffice obliga vista previa, doble confirmación y TOTP; no almacena códigos',()=>{
  const ui=read('../src/components/financing/PublicarPoliticaFinancieraPanel.tsx');
  const service=read('../src/services/financingPolicyPublicationService.ts');
  const parent=read('../src/components/financing/ConfiguracionPlanesFinanciamientoPanel.tsx');
  const estado=read('../../../database/migrations/115_financiamiento_consulta_estado_publicacion_v1.sql');
  assert.match(parent,/PublicarPoliticaFinancieraPanel politica=\{datos\}/);
  assert.match(estado,/cfg_fin_publicacion_control/);
  assert.match(ui,/!vista\.publicacionHabilitada/);
  assert.match(ui,/const \[confirmado, setConfirmado\]/);
  assert.match(ui,/frase!==\x27PUBLICAR V\x27\+vista\.versionNueva/);
  assert.match(ui,/crypto\.randomUUID\(\)/);
  assert.match(ui,/recibo\.hashPropuesta!==comprobacion\.hashPropuesta/);
  assert.match(ui,/resultado\.hashPropuesta!==comprobacion\.hashPropuesta/);
  assert.match(ui,/setCodigo\(''\)/);
  assert.doesNotMatch(ui,/localStorage\.|sessionStorage\./);
  assert.match(service,/authSecuredApi\.post/);
  assert.match(service,/confirmacionExplicita: true/);
  assert.doesNotMatch(service,/coreApi\.post/);
});


test('migración 116 acepta el correo principal ya registrado, sin quitar MFA ni candado',()=>{
  const sql=read('../../../database/migrations/116_financiamiento_correo_principal_verificado_v1.sql');
  const totp=read('../../../services/auth-service/src/main/java/monolithe/auth_service/service/FinancingTotpService.java');
  const publicar=read('../../../services/auth-service/src/main/java/monolithe/auth_service/service/FinancingPolicyPublicationService.java');
  const ui=read('../src/components/financing/SeguridadFinancieraTotpPanel.tsx');
  const api=read('../src/services/financingMfaService.ts');

  assert.match(sql,/CREATE OR REPLACE FUNCTION public\.sp_fin_publicar_politica_v1/);
  assert.match(sql,/c\.principal AND c\.verificado AND c\.activo/);
  assert.match(sql,/PUBLICACION_BLOQUEADA/);
  assert.match(sql,/v_aut\.token_jti IS DISTINCT FROM p_jti/);
  assert.match(sql,/v_aut\.nonce IS DISTINCT FROM p_nonce/);
  assert.match(sql,/v_aut\.hash_propuesta IS DISTINCT FROM v_hash/);
  assert.match(sql,/GRANT EXECUTE ON FUNCTION public\.sp_fin_publicar_politica_v1/);
  assert.match(totp,/c\.activo AND c\.verificado AND c\.principal/);
  assert.match(publicar,/c\.verificado AND c\.activo/);
  assert.match(api,/correoPrincipalVerificado: boolean/);
  assert.match(ui,/estado\.correoPrincipalVerificado/);
  for (const code of [sql,totp,publicar,ui,api]) {
    assert.doesNotMatch(code,/@monolithe\.pe/);
  }
});
