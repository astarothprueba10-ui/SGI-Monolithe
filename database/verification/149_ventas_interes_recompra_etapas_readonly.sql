-- Verificación local de migración 149; no modifica datos.
SELECT p.proname,has_function_privilege('sigi_app_user',p.oid,'EXECUTE') backend,
       has_function_privilege('anon',p.oid,'EXECUTE') anon,
       has_function_privilege('authenticated',p.oid,'EXECUTE') authenticated
FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
WHERE n.nspname='public' AND p.proname IN ('sp_crm_registrar_interes_recompra_v1','sp_crm_etapas_operacion_v1');
-- Esperado: backend=true, anon=false, authenticated=false.
