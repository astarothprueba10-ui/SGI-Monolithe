-- Corrección puntual de Los Cocos. No modifica precios, lotes, reservas, ventas ni el evento original.
-- Se ejecuta como migración técnica, nunca atribuye la reparación a un usuario.
BEGIN;
SET LOCAL lock_timeout='5s';
DO $repair$
DECLARE anterior jsonb; nuevo jsonb; tarifas jsonb; evento bigint;
BEGIN
 PERFORM pg_advisory_xact_lock(hashtextextended('inm_publicacion:2',0));
 IF NOT EXISTS(SELECT 1 FROM public.inm_proyectos WHERE id_proyecto=2 AND codigo='PROY-001')
 OR (SELECT max(version) FROM public.inm_politicas_comerciales_publicadas WHERE id_proyecto=2) IS DISTINCT FROM 7
 OR NOT EXISTS(SELECT 1 FROM public.inm_zonas WHERE id_proyecto=2 AND id_zona=2 AND codigo='E' AND activo)
 OR NOT EXISTS(SELECT 1 FROM public.inm_zonas WHERE id_proyecto=2 AND id_zona=3 AND codigo='AE' AND activo)
 OR EXISTS(SELECT 1 FROM public.inm_zonas WHERE id_proyecto=2 AND codigo IN ('ZONA-A','ZONA-B'))
 THEN RAISE EXCEPTION 'El catálogo cambió. Revisar antes de reparar'; END IF;
 SELECT id_evento,e.nuevo INTO STRICT evento,anterior FROM public.inm_gestion_comercial_eventos e WHERE id_proyecto=2 AND version_publicada=7 ORDER BY id_evento DESC LIMIT 1 FOR UPDATE;
 IF evento<>1 OR md5(anterior::text)<>'97ff486e0ac028dc70af2a0a08726c0d' THEN RAISE EXCEPTION 'La configuración vigente cambió. Revisar antes de reparar'; END IF;
 IF (SELECT count(*) FROM jsonb_array_elements(anterior->'estado'->'tarifas') t WHERE t->>'codigoZona' IN ('ZONA-A','ZONA-B'))<>10
 OR EXISTS(SELECT 1 FROM jsonb_array_elements(anterior->'estado'->'tarifas') t WHERE t->>'codigoZona' IN ('E','AE'))
 THEN RAISE EXCEPTION 'No se verificaron las diez referencias originales'; END IF;
 SELECT jsonb_agg(CASE t->>'codigoZona' WHEN 'ZONA-A' THEN jsonb_set(t,'{codigoZona}','"E"') WHEN 'ZONA-B' THEN jsonb_set(t,'{codigoZona}','"AE"') ELSE t END ORDER BY n)
 INTO tarifas FROM jsonb_array_elements(anterior->'estado'->'tarifas') WITH ORDINALITY a(t,n);
 nuevo:=jsonb_set(anterior,'{estado,tarifas}',tarifas);
 IF jsonb_array_length(tarifas)<>50 OR (SELECT count(*) FROM (SELECT DISTINCT t->>'codigoZona',t->>'codigoEtapa',t->>'moneda' FROM jsonb_array_elements(tarifas) t) q)<>50
 THEN RAISE EXCEPTION 'Tarifas duplicadas'; END IF;
 INSERT INTO public.inm_gestion_comercial_eventos(id_proyecto,version_publicada,tipo,id_usuario,anterior,nuevo)
 VALUES(2,7,'REPARACION',NULL,anterior,nuevo||jsonb_build_object('motivo','Sincronizar códigos de zona con identidad existente; no modificar precios'));
END $repair$;
COMMIT;
