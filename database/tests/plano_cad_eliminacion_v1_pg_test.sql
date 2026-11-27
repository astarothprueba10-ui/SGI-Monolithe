BEGIN;
DO $$
DECLARE rol text;
BEGIN
  FOREACH rol IN ARRAY ARRAY['sigi_app_user','sgi_backend_user'] LOOP
    IF NOT has_table_privilege(rol,'public.inm_planos_cad_archivos','DELETE')
       OR NOT has_table_privilege(rol,'public.inm_planos_svg_proyecto','DELETE') THEN
      RAISE EXCEPTION 'Falta permiso interno de eliminación: %',rol;
    END IF;
    IF NOT has_table_privilege(rol,'public.inm_planos_cad_archivos','SELECT')
       OR NOT has_table_privilege(rol,'public.inm_planos_cad_archivos','INSERT')
       OR NOT has_table_privilege(rol,'public.inm_planos_svg_proyecto','SELECT')
       OR NOT has_table_privilege(rol,'public.inm_planos_svg_proyecto','INSERT')
       OR NOT has_table_privilege(rol,'public.inm_planos_svg_proyecto','UPDATE')
       OR has_table_privilege(rol,'public.inm_planos_cad_archivos','UPDATE') THEN
      RAISE EXCEPTION 'Permisos de planos incorrectos tras habilitar eliminación: %',rol;
    END IF;
  END LOOP;
  FOREACH rol IN ARRAY ARRAY['anon','authenticated','service_role'] LOOP
    IF has_table_privilege(rol,'public.inm_planos_cad_archivos','DELETE')
       OR has_table_privilege(rol,'public.inm_planos_svg_proyecto','DELETE')
       OR has_table_privilege(rol,'public.inm_planos_cad_archivos','SELECT')
       OR has_table_privilege(rol,'public.inm_planos_svg_proyecto','SELECT')
       OR has_table_privilege(rol,'public.inm_planos_cad_archivos','INSERT')
       OR has_table_privilege(rol,'public.inm_planos_svg_proyecto','INSERT')
       OR has_table_privilege(rol,'public.inm_planos_cad_archivos','UPDATE')
       OR has_table_privilege(rol,'public.inm_planos_svg_proyecto','UPDATE') THEN
      RAISE EXCEPTION 'Acceso a planos no autorizado: %',rol;
    END IF;
  END LOOP;
  IF (SELECT relrowsecurity FROM pg_class WHERE oid='public.inm_planos_cad_archivos'::regclass) IS NOT TRUE
     OR (SELECT relrowsecurity FROM pg_class WHERE oid='public.inm_planos_svg_proyecto'::regclass) IS NOT TRUE THEN
    RAISE EXCEPTION 'RLS debe permanecer activo';
  END IF;
END $$;
ROLLBACK;
