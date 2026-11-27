\set ON_ERROR_STOP on
BEGIN;
INSERT INTO public.inm_gestion_comercial_eventos(id_proyecto,version_publicada,tipo,id_usuario,nuevo) VALUES(1,1,'ETAPAS',7,'{"estado":{"etapas":[]}}'),(1,1,'REPARACION',NULL,'{"estado":{"tarifas":[]}}');
DO $$
BEGIN
 BEGIN
  INSERT INTO public.inm_gestion_comercial_eventos(id_proyecto,version_publicada,tipo,id_usuario,nuevo) VALUES(1,1,'ETAPAS',NULL,'{}');
  RAISE EXCEPTION 'Actor obligatorio';
 EXCEPTION WHEN check_violation THEN NULL; END;
 BEGIN
  INSERT INTO public.inm_gestion_comercial_eventos(id_proyecto,version_publicada,tipo,id_usuario,nuevo) VALUES(1,1,'REPARACION',7,'{}');
  RAISE EXCEPTION 'Reparacion tecnica no debe atribuirse al usuario';
 EXCEPTION WHEN check_violation THEN NULL; END;
END $$;
ROLLBACK;
