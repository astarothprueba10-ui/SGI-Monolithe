-- Prueba con la conexión JDBC real en PostgreSQL 17 aislado.
DO $$
BEGIN
  IF NOT has_table_privilege('sigi_app_user','public.inm_planos_svg_proyecto','SELECT')
    OR NOT has_table_privilege('sigi_app_user','public.inm_planos_svg_proyecto','INSERT')
    OR NOT has_table_privilege('sigi_app_user','public.inm_planos_svg_proyecto','UPDATE')
    OR NOT has_table_privilege('sigi_app_user','public.inm_planos_cad_archivos','SELECT')
    OR NOT has_table_privilege('sigi_app_user','public.inm_planos_cad_archivos','INSERT')
    THEN RAISE EXCEPTION 'Core Service no tiene permisos para planos';
  END IF;
  IF has_table_privilege('sigi_app_user','public.inm_planos_cad_archivos','DELETE')
    OR has_table_privilege('sigi_app_user','public.inm_planos_cad_archivos','UPDATE')
    OR has_table_privilege('anon','public.inm_planos_svg_proyecto','SELECT')
    OR has_table_privilege('authenticated','public.inm_planos_cad_archivos','SELECT')
    THEN RAISE EXCEPTION 'Privilegios excesivos o acceso publico a planos';
  END IF;
END $$;
BEGIN;
SET LOCAL ROLE sigi_app_user;
SELECT 1 FROM public.inm_planos_svg_proyecto LIMIT 1;
SELECT 1 FROM public.inm_planos_cad_archivos LIMIT 1;
ROLLBACK;
