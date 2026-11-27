BEGIN;
CREATE TABLE IF NOT EXISTS public.inm_manzanas_zonas (
 id_manzana bigint NOT NULL,
 id_zona bigint NOT NULL,
 id_proyecto bigint NOT NULL,
 PRIMARY KEY(id_manzana,id_zona),
 FOREIGN KEY(id_manzana,id_proyecto) REFERENCES public.inm_manzanas(id_manzana,id_proyecto),
 FOREIGN KEY(id_zona,id_proyecto) REFERENCES public.inm_zonas(id_zona,id_proyecto)
);
CREATE INDEX IF NOT EXISTS ix_inm_manzanas_zonas_zona ON public.inm_manzanas_zonas(id_zona,id_proyecto);
ALTER TABLE public.inm_manzanas_zonas ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.inm_manzanas_zonas FROM PUBLIC,anon,authenticated,service_role;
GRANT SELECT,INSERT,DELETE ON public.inm_manzanas_zonas TO sigi_app_user;
-- Guarda la etapa de una manzana inactiva sin contaminar las asignaciones de borrador.
ALTER TABLE public.inm_manzanas ADD COLUMN IF NOT EXISTS codigo_etapa_comercial_inactiva varchar(30);
GRANT SELECT (codigo_etapa_comercial_inactiva),UPDATE (codigo_etapa_comercial_inactiva) ON public.inm_manzanas TO sigi_app_user;
ALTER TABLE public.seg_mfa_comercial DROP CONSTRAINT seg_mfa_comercial_accion_check;
ALTER TABLE public.seg_mfa_comercial ADD CONSTRAINT seg_mfa_comercial_accion_check CHECK (accion IN ('MATRIZ','TARIFA','DISPONIBILIDAD','IMPORTACION','PUBLICACION','ETAPAS','ASIGNACION','MANZANA'));
COMMIT;
