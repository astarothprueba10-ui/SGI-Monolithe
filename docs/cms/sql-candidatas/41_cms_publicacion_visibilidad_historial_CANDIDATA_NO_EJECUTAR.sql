-- SGI-Monolithe / Publicación de visibilidad de proyectos.
-- CANDIDATA: NO EJECUTAR EN SUPABASE NI AÑADIR A AUTODESCUBRIMIENTO DE MIGRACIONES.
-- Requiere migraciones CMS 31-36 y migración 37 de identidad sigi_cms_user
-- ya auditadas; aún pendiente de integración completa y numeración acordada.
-- No altera inm_proyectos ni el historial de páginas de la migración 36.
BEGIN;

DO $guard$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='sigi_cms_user'
                   AND rolcanlogin AND NOT rolbypassrls) THEN
        RAISE EXCEPTION 'No existe una identidad CMS LOGIN sin BYPASSRLS';
    END IF;
    IF to_regclass('public.cms_proyectos_visibilidad') IS NULL OR
       to_regclass('public.cms_borradores') IS NULL OR
       to_regclass('public.cms_publicacion_versiones') IS NULL THEN
        RAISE EXCEPTION 'Faltan tablas CMS de visibilidad, borradores o versiones';
    END IF;
END $guard$;

CREATE TABLE public.cms_visibilidad_historial (
    id_historial BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    id_borrador BIGINT NOT NULL UNIQUE REFERENCES public.cms_borradores(id_borrador) ON DELETE RESTRICT,
    id_proyecto BIGINT NOT NULL REFERENCES public.inm_proyectos(id_proyecto) ON DELETE RESTRICT,
    id_usuario_publicacion BIGINT NOT NULL REFERENCES public.seg_usuarios(id_usuario) ON DELETE RESTRICT,
    revision_anterior BIGINT NOT NULL,
    revision_nueva BIGINT NOT NULL,
    visible_anterior BOOLEAN NOT NULL,
    visible_nuevo BOOLEAN NOT NULL,
    fecha_publicacion TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
    CONSTRAINT chk_cms_visibilidad_historial_revisiones
        CHECK (revision_anterior >= 0 AND revision_nueva = revision_anterior + 1),
    CONSTRAINT chk_cms_visibilidad_historial_cambio
        CHECK (visible_anterior <> visible_nuevo)
);
CREATE INDEX ix_cms_visibilidad_historial_proyecto_fecha
    ON public.cms_visibilidad_historial(id_proyecto, fecha_publicacion DESC);

CREATE FUNCTION public.cms_visibilidad_historial_bloquear_mutacion()
RETURNS trigger
LANGUAGE plpgsql
AS $func$
BEGIN
    RAISE EXCEPTION 'El historial de visibilidad es de solo anexado';
END
$func$;

CREATE TRIGGER tr_cms_visibilidad_historial_no_editar
BEFORE UPDATE OR DELETE ON public.cms_visibilidad_historial
FOR EACH ROW EXECUTE FUNCTION public.cms_visibilidad_historial_bloquear_mutacion();

CREATE TRIGGER tr_cms_visibilidad_historial_no_vaciar
BEFORE TRUNCATE ON public.cms_visibilidad_historial
FOR EACH STATEMENT EXECUTE FUNCTION public.cms_visibilidad_historial_bloquear_mutacion();

ALTER TABLE public.cms_visibilidad_historial ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.cms_visibilidad_historial FROM PUBLIC;
REVOKE ALL ON SEQUENCE public.cms_visibilidad_historial_id_historial_seq FROM PUBLIC;

-- Los privilegios públicos adicionales pueden proceder de ALTER DEFAULT PRIVILEGES.
DO $priv$
DECLARE rol text;
BEGIN
    FOREACH rol IN ARRAY ARRAY['anon','authenticated'] LOOP
        IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname=rol) THEN
            EXECUTE format('REVOKE ALL ON public.cms_visibilidad_historial FROM %I',rol);
            EXECUTE format('REVOKE ALL ON SEQUENCE public.cms_visibilidad_historial_id_historial_seq FROM %I',rol);
        END IF;
    END LOOP;
END
$priv$;

-- Extensión mínima de la candidata 37: solamente la tabla de control publicada.
GRANT SELECT, INSERT, UPDATE ON public.cms_proyectos_visibilidad TO sigi_cms_user;
CREATE POLICY cms_backend_ins ON public.cms_proyectos_visibilidad
FOR INSERT TO sigi_cms_user WITH CHECK (true);
CREATE POLICY cms_backend_upd ON public.cms_proyectos_visibilidad
FOR UPDATE TO sigi_cms_user USING (true) WITH CHECK (true);
-- Conservamos cms_backend_sel establecido por la candidata 37.

GRANT SELECT, INSERT ON public.cms_visibilidad_historial TO sigi_cms_user;
GRANT USAGE ON SEQUENCE public.cms_visibilidad_historial_id_historial_seq TO sigi_cms_user;
CREATE POLICY cms_backend_sel ON public.cms_visibilidad_historial
FOR SELECT TO sigi_cms_user USING (true);
CREATE POLICY cms_backend_ins ON public.cms_visibilidad_historial
FOR INSERT TO sigi_cms_user WITH CHECK (true);
-- Nunca conceder UPDATE/DELETE/TRUNCATE a la identidad CMS.

COMMIT;
