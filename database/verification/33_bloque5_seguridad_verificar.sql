-- Auditoria Bloque 5. Solo lectura.
BEGIN TRANSACTION READ ONLY;
SELECT c.relname AS tabla,
  has_table_privilege('anon',c.oid,'TRUNCATE') anon_truncate,
  has_table_privilege('authenticated',c.oid,'TRUNCATE') auth_truncate,
  has_table_privilege('sigi_app_user',c.oid,'SELECT') backend_select
FROM pg_class c
WHERE c.relnamespace='public'::regnamespace AND c.relkind IN ('r','p')
AND (c.relname LIKE 'ven_%' OR c.relname LIKE 'pag_%'
  OR c.relname LIKE 'crm_%' OR c.relname='inm_lotes') ORDER BY tabla;

SELECT p.proname,
  has_function_privilege('anon',p.oid,'EXECUTE') anon_exec,
  has_function_privilege('authenticated',p.oid,'EXECUTE') auth_exec,
  has_function_privilege('sigi_app_user',p.oid,'EXECUTE') backend_exec
FROM pg_proc p WHERE p.pronamespace='public'::regnamespace
AND p.proname IN ('sp_crm_listar_operaciones_v1','sp_crm_registrar_separacion_v2',
  'sp_crm_registrar_venta_pendiente_v6','sp_crm_validar_formalizacion_v6') ORDER BY p.proname;

SELECT actor,
  (public.sp_crm_listar_operaciones_v1(actor,'','',1,20)->>'total')::integer operaciones_visibles
FROM (VALUES (5::bigint),(16::bigint),(19::bigint)) AS t(actor);
COMMIT;
