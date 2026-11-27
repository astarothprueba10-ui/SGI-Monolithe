\set ON_ERROR_STOP on
BEGIN;
DO $$
BEGIN
  IF NOT (SELECT relrowsecurity FROM pg_class WHERE oid='public.seg_mfa_comercial'::regclass) THEN RAISE EXCEPTION 'RLS deshabilitado'; END IF;
  IF has_table_privilege('anon','public.seg_mfa_comercial','SELECT,INSERT,UPDATE,DELETE') OR has_table_privilege('authenticated','public.seg_mfa_comercial','SELECT,INSERT,UPDATE,DELETE') OR has_table_privilege('service_role','public.seg_mfa_comercial','SELECT,INSERT,UPDATE,DELETE') THEN RAISE EXCEPTION 'Acceso externo no permitido'; END IF;
  IF NOT has_table_privilege('sigi_app_user','public.seg_mfa_comercial','SELECT') OR NOT has_table_privilege('sigi_app_user','public.seg_mfa_comercial','INSERT') OR NOT has_table_privilege('sigi_app_user','public.seg_mfa_comercial','UPDATE') THEN RAISE EXCEPTION 'Permisos internos insuficientes'; END IF;
END $$;
ROLLBACK;
