\set ON_ERROR_STOP on
BEGIN;
INSERT INTO public.inm_manzanas_zonas(id_manzana,id_zona,id_proyecto) VALUES(1,1,1);
DO $$
BEGIN
 BEGIN
   INSERT INTO public.inm_manzanas_zonas(id_manzana,id_zona,id_proyecto) VALUES(1,2,1);
   RAISE EXCEPTION 'Se permitió zona de otro proyecto';
 EXCEPTION WHEN foreign_key_violation THEN NULL; END;
 IF NOT (SELECT relrowsecurity FROM pg_class WHERE oid='public.inm_manzanas_zonas'::regclass) THEN RAISE EXCEPTION 'RLS requerido'; END IF;
 IF has_table_privilege('anon','public.inm_manzanas_zonas','SELECT') OR has_table_privilege('authenticated','public.inm_manzanas_zonas','SELECT') THEN RAISE EXCEPTION 'Acceso externo indebido'; END IF;
END $$;
ROLLBACK;
