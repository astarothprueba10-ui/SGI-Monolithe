-- Test sobre el PostgreSQL desechable de CI, nunca sobre datos reales.
BEGIN;
DO $$
BEGIN
  IF (SELECT public FROM storage.buckets WHERE id='planos-cad-private') IS DISTINCT FROM false
    THEN RAISE EXCEPTION 'El bucket CAD debe ser privado'; END IF;
  IF has_table_privilege('anon','public.inm_planos_cad_archivos','SELECT')
    OR has_table_privilege('authenticated','public.inm_planos_cad_archivos','INSERT')
    THEN RAISE EXCEPTION 'Los metadatos CAD no deben ser publicos'; END IF;
  IF NOT has_table_privilege('sgi_backend_user','public.inm_planos_cad_archivos','SELECT')
    THEN RAISE EXCEPTION 'El Core no puede leer versiones'; END IF;
  IF (SELECT relrowsecurity FROM pg_class WHERE oid='public.inm_planos_cad_archivos'::regclass) IS NOT TRUE
    THEN RAISE EXCEPTION 'RLS CAD debe estar activo'; END IF;
END $$;
INSERT INTO public.inm_planos_cad_archivos(id_proyecto,version,formato,nombre_original,
 ruta_archivo,mime,bytes,sha256,id_usuario) VALUES (
 1,1,'DWG','Planta General - LOTIZACIÓN final.dwg',
 'proyectos/1/originales/123e4567-e89b-12d3-a456-426614174000.dwg',
 'application/octet-stream',2526578,repeat('a',64),1);
INSERT INTO public.inm_planos_cad_archivos(id_proyecto,version,formato,nombre_original,
 ruta_archivo,mime,bytes,sha256,id_usuario) VALUES (
 1,2,'SVG','Planta General.svg',
 'proyectos/1/originales/123e4567-e89b-12d3-a456-426614174001.svg',
 'application/octet-stream',36000,repeat('b',64),1);
DO $$
BEGIN
  IF (SELECT COUNT(*) FROM public.inm_planos_cad_archivos WHERE id_proyecto=1) <> 2
    THEN RAISE EXCEPTION 'No se conservaron las dos versiones'; END IF;
END $$;
ROLLBACK;
