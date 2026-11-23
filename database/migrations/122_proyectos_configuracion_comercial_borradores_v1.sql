-- Configuracion comercial por proyecto. Solo borradores: no cambia la operacion vigente.
BEGIN;
CREATE TABLE public.inm_configuracion_comercial_borradores (
  id_proyecto bigint NOT NULL REFERENCES public.inm_proyectos(id_proyecto),
  version integer NOT NULL CHECK (version > 0),
  configuracion jsonb NOT NULL CHECK (jsonb_typeof(configuracion) = 'object'),
  id_usuario bigint NOT NULL REFERENCES public.seg_usuarios(id_usuario),
  fecha_creacion timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (id_proyecto, version)
);
COMMENT ON TABLE public.inm_configuracion_comercial_borradores IS
  'Versiones de borradores comerciales por proyecto; no autorizan ventas ni modifican precios vigentes.';
ALTER TABLE public.inm_configuracion_comercial_borradores ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.inm_configuracion_comercial_borradores FROM PUBLIC, anon, authenticated, service_role, sgi_backend_user, sigi_app_user;
GRANT SELECT, INSERT ON public.inm_configuracion_comercial_borradores TO sgi_backend_user, sigi_app_user;
CREATE POLICY config_borrador_backend_select ON public.inm_configuracion_comercial_borradores
  FOR SELECT TO sgi_backend_user USING (true);
CREATE POLICY config_borrador_backend_insert ON public.inm_configuracion_comercial_borradores
  FOR INSERT TO sgi_backend_user WITH CHECK (true);
COMMIT;
