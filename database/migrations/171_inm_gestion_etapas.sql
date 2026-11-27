-- Evolución de la gestión comercial, sin cambiar la publicación inicial.
BEGIN;
ALTER TABLE public.inm_gestion_comercial_eventos DROP CONSTRAINT inm_gestion_comercial_eventos_tipo_check;
ALTER TABLE public.inm_gestion_comercial_eventos ADD CONSTRAINT inm_gestion_comercial_eventos_tipo_check CHECK (tipo IN ('IMPORTACION','INICIAL','DISPONIBILIDAD','TARIFAS','ETAPAS','REPARACION'));
ALTER TABLE public.inm_gestion_comercial_eventos ALTER COLUMN id_usuario DROP NOT NULL;
ALTER TABLE public.inm_gestion_comercial_eventos ADD CONSTRAINT inm_gestion_comercial_eventos_actor_check CHECK ((tipo='REPARACION' AND id_usuario IS NULL) OR (tipo<>'REPARACION' AND id_usuario IS NOT NULL));
COMMIT;
