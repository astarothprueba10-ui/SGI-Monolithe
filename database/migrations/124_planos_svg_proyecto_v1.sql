-- Plano SVG vectorial asociado a cada proyecto. No modifica planos ni lotes preexistentes.
BEGIN;
CREATE TABLE public.inm_planos_svg_proyecto (
  id_proyecto bigint PRIMARY KEY REFERENCES public.inm_proyectos(id_proyecto) ON DELETE RESTRICT,
  nombre_archivo varchar(255) NOT NULL,
  documento jsonb NOT NULL,
  fecha_actualizacion timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT ck_svg_nombre CHECK (nombre_archivo ~* '^[^/\\]{1,250}\.svg$'),
  CONSTRAINT ck_svg_documento CHECK (jsonb_typeof(documento)='object' AND octet_length(documento::text) <= 3000000)
);
ALTER TABLE public.inm_planos_svg_proyecto ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.inm_planos_svg_proyecto FROM PUBLIC, anon, authenticated, service_role, sgi_app_user;
GRANT SELECT, INSERT, UPDATE ON public.inm_planos_svg_proyecto TO sgi_backend_user;
CREATE POLICY svg_backend_select ON public.inm_planos_svg_proyecto
 FOR SELECT TO sgi_backend_user USING (true);
CREATE POLICY svg_backend_insert ON public.inm_planos_svg_proyecto
 FOR INSERT TO sgi_backend_user WITH CHECK (true);
CREATE POLICY svg_backend_update ON public.inm_planos_svg_proyecto
 FOR UPDATE TO sgi_backend_user USING (true) WITH CHECK (true);
COMMIT;
