-- Prueba de migración 77 en PostgreSQL 17 efímero.
DO $test$
DECLARE
 r name;
 t text;
BEGIN
 FOREACH r IN ARRAY ARRAY['anon'::name,'authenticated'::name] LOOP
   FOREACH t IN ARRAY ARRAY['public.pag_planes_pago','public.pag_cuotas'] LOOP
     IF has_table_privilege(r::text,t,'SELECT')
       OR has_table_privilege(r::text,t,'INSERT')
       OR has_table_privilege(r::text,t,'UPDATE')
       OR has_table_privilege(r::text,t,'DELETE')
     THEN RAISE EXCEPTION 'Rol % todavía puede acceder a %',r,t; END IF;
   END LOOP;
 END LOOP;
 IF EXISTS(
   SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename IN
   ('pag_planes_pago','pag_cuotas') AND policyname IN
   ('Cliente lee sus propios planes de pago','Cliente lee sus propias cuotas')
 ) THEN RAISE EXCEPTION 'La política basada en user_metadata sigue instalada'; END IF;
 IF NOT has_table_privilege('sigi_app_user','public.pag_planes_pago','SELECT')
 THEN RAISE EXCEPTION 'El backend perdió permiso SELECT del plan'; END IF;
 RAISE NOTICE 'SEGURIDAD FINANCIERA OK: anon/authenticated sin acceso directo y backend intacto';
END;
$test$;
