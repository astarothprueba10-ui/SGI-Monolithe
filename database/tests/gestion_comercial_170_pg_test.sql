\set ON_ERROR_STOP on
BEGIN;
DO $test$
BEGIN
 IF NOT (SELECT relrowsecurity FROM pg_class WHERE oid='public.inm_gestion_comercial_eventos'::regclass) THEN RAISE EXCEPTION 'RLS ausente'; END IF;
 IF has_table_privilege('anon','public.inm_gestion_comercial_eventos','SELECT')
 OR has_table_privilege('authenticated','public.inm_gestion_comercial_eventos','INSERT')
 OR has_table_privilege('service_role','public.inm_gestion_comercial_eventos','SELECT')
 OR has_table_privilege('sigi_app_user','public.inm_gestion_comercial_eventos','UPDATE')
 OR has_table_privilege('sigi_app_user','public.inm_gestion_comercial_eventos','DELETE')
 THEN RAISE EXCEPTION 'Auditoria expuesta o mutable'; END IF;
END $test$;
SET LOCAL ROLE sigi_app_user;
INSERT INTO public.inm_gestion_comercial_eventos(id_proyecto,tipo,id_usuario,nuevo)
 VALUES(2,'IMPORTACION',7,'{"filas":4}'),(3,'IMPORTACION',7,'{"filas":1}');
DO $test$
BEGIN
 BEGIN
  INSERT INTO public.inm_gestion_comercial_eventos(id_proyecto,tipo,id_usuario,nuevo) VALUES(2,'IMPORTACION',7,'{}');
  RAISE EXCEPTION 'Se admitio segunda importacion';
 EXCEPTION WHEN unique_violation THEN NULL; END;
 BEGIN
  UPDATE public.inm_gestion_comercial_eventos SET nuevo='{}';
  RAISE EXCEPTION 'Se permitio editar auditoria';
 EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END $test$;
-- El precio preparado puede conservarse en un cierre y reapertura.
UPDATE public.inm_politicas_comerciales_lotes SET situacion='BLOQUEADA' WHERE id_lote=11;
UPDATE public.inm_politicas_comerciales_lotes SET id_lote_precio=102,precio_lista=27000,descuento=0,precio_final=27000 WHERE id_lote=12;
UPDATE public.inm_politicas_comerciales_lotes SET situacion='HABILITADA' WHERE id_lote=12;
INSERT INTO public.inm_gestion_comercial_eventos(id_proyecto,version_publicada,tipo,id_usuario,anterior,nuevo)
 VALUES(1,1,'DISPONIBILIDAD',7,'{"estado":{"etapasHabilitadas":["E1"]}}','{"estado":{"etapasHabilitadas":["E2"]}}');
DO $test$
BEGIN
 IF NOT EXISTS(SELECT 1 FROM public.inm_politicas_comerciales_lotes WHERE id_lote=11 AND situacion='BLOQUEADA' AND id_lote_precio=101 AND precio_final=25000) THEN RAISE EXCEPTION 'Precio perdido al cerrar'; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.inm_politicas_comerciales_lotes WHERE id_lote=12 AND situacion='HABILITADA' AND id_lote_precio=102) THEN RAISE EXCEPTION 'No se reabrio'; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.inm_politicas_comerciales_lotes WHERE id_lote=13 AND situacion='PROTEGIDA' AND id_lote_precio IS NULL) THEN RAISE EXCEPTION 'Operacion alterada'; END IF;
 BEGIN
  UPDATE public.inm_politicas_comerciales_lotes SET precio_final=100 WHERE id_lote=13;
  RAISE EXCEPTION 'Se admitio precio para fila protegida';
 EXCEPTION WHEN check_violation THEN NULL; END;
 BEGIN
  UPDATE public.inm_politicas_comerciales_lotes SET id_lote_precio=NULL WHERE id_lote=12;
  RAISE EXCEPTION 'Se habilito sin precio';
 EXCEPTION WHEN check_violation THEN NULL; END;
END $test$;
RESET ROLE;
ROLLBACK;
SELECT 'Gestion comercial: pruebas SQL aprobadas' resultado;
