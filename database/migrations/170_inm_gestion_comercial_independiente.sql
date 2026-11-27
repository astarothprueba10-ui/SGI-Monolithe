-- Gestión comercial posterior a la configuración inicial. Aplicar en entorno de pruebas antes del nuevo Core.
BEGIN;
CREATE TABLE public.inm_gestion_comercial_eventos (
    id_evento bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    id_proyecto bigint NOT NULL REFERENCES public.inm_proyectos(id_proyecto),
    version_publicada integer,
    tipo varchar(24) NOT NULL CHECK (tipo IN ('IMPORTACION','INICIAL','DISPONIBILIDAD','TARIFAS')),
    id_usuario bigint NOT NULL REFERENCES public.seg_usuarios(id_usuario),
    fecha timestamptz NOT NULL DEFAULT now(),
    anterior jsonb NOT NULL DEFAULT '{}'::jsonb,
    nuevo jsonb NOT NULL,
    FOREIGN KEY (id_proyecto,version_publicada) REFERENCES public.inm_politicas_comerciales_publicadas(id_proyecto,version),
    CHECK ((tipo='IMPORTACION' AND version_publicada IS NULL) OR (tipo<>'IMPORTACION' AND version_publicada IS NOT NULL))
);
CREATE UNIQUE INDEX ux_inm_importacion_unica ON public.inm_gestion_comercial_eventos(id_proyecto) WHERE tipo='IMPORTACION';
CREATE INDEX ix_inm_gestion_eventos_proyecto ON public.inm_gestion_comercial_eventos(id_proyecto,id_evento DESC);
ALTER TABLE public.inm_gestion_comercial_eventos ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.inm_gestion_comercial_eventos FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON SEQUENCE public.inm_gestion_comercial_eventos_id_evento_seq FROM PUBLIC, anon, authenticated, service_role;
GRANT SELECT,INSERT ON public.inm_gestion_comercial_eventos TO sigi_app_user;
GRANT USAGE ON SEQUENCE public.inm_gestion_comercial_eventos_id_evento_seq TO sigi_app_user;
-- Los lotes cerrados pueden conservar un precio preparado, sin autorizar operaciones.
-- Las funciones CRM y ventas existentes siguen exigiendo situacion='HABILITADA'.
ALTER TABLE public.inm_politicas_comerciales_lotes DROP CONSTRAINT inm_politicas_comerciales_lotes_check;
ALTER TABLE public.inm_politicas_comerciales_lotes ADD CONSTRAINT inm_politicas_comerciales_lotes_check CHECK (
 (situacion IN ('HABILITADA','BLOQUEADA') AND codigo_etapa IS NOT NULL AND id_lote_precio IS NOT NULL
   AND precio_lista IS NOT NULL AND descuento IS NOT NULL AND precio_final IS NOT NULL
   AND descuento>=0 AND precio_final>0 AND precio_lista-descuento=precio_final)
 OR (situacion IN ('BLOQUEADA','PROTEGIDA') AND id_lote_precio IS NULL AND precio_lista IS NULL AND descuento IS NULL AND precio_final IS NULL)
);
GRANT UPDATE (situacion,id_lote_precio,precio_lista,descuento,precio_final,vigente_hasta) ON public.inm_politicas_comerciales_lotes TO sigi_app_user;
COMMIT;
