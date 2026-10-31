-- SGI-Monolithe / CMS - CANDIDATA PARA REVISIÓN, NO EJECUTAR EN SUPABASE TODAVÍA.
-- Basada en la auditoría de políticas RLS (CSV 15-22) y el CMS Java compartido.
-- DEPENDENCIAS A VALIDAR EN QA: rol de LOGIN provisionado de forma segura,
-- migraciones CMS 32-36 instaladas, backend con configuración DB_USERNAME,
-- pruebas con JDBC real y lector público sin exposición de contenido oculto.
-- No incluye ni pide contraseñas; no crea usuarios ni cambia conexiones.
-- NO se ejecuta automáticamente ni cambia los privilegios de anon/authenticated.

BEGIN;

DO $preflight$
DECLARE
    v_rol oid;
BEGIN
    SELECT oid INTO v_rol
    FROM pg_roles
    WHERE rolname = 'sigi_cms_user'
      AND rolcanlogin
      AND NOT rolsuper
      AND NOT rolbypassrls
      AND NOT rolcreaterole
      AND NOT rolcreatedb;

    IF v_rol IS NULL THEN
        RAISE EXCEPTION 'DETENIDO: crear/verificar antes el rol LOGIN sigi_cms_user SIN BYPASSRLS ni privilegios administrativos';
    END IF;

    IF EXISTS (SELECT 1 FROM pg_auth_members m WHERE m.member = v_rol) THEN
        RAISE EXCEPTION 'DETENIDO: sigi_cms_user no debe pertenecer a otros roles (anon, authenticated, service_role, etc.)';
    END IF;

    IF EXISTS (
        SELECT 1
        FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
        WHERE n.nspname='public' AND c.relkind IN ('r','p')
          AND c.relname LIKE 'cms_%' AND c.relowner=v_rol
    ) THEN
        RAISE EXCEPTION 'DETENIDO: el usuario CMS no debe ser propietario de tablas CMS que omitan RLS';
    END IF;

    IF EXISTS (
        SELECT 1
        FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
        WHERE n.nspname='public' AND c.relkind IN ('r','p')
          AND c.relname IN (
            'cms_borradores','cms_borrador_imagenes',
            'cms_publicacion_versiones','cms_publicacion_historial',
            'cms_paginas','cms_secciones','cms_seccion_items',
            'cms_multimedia','cms_multimedia_asignaciones',
            'cms_proyectos','cms_proyectos_visibilidad','cms_consultas_web'
          ) AND NOT c.relrowsecurity
    ) THEN
        RAISE EXCEPTION 'DETENIDO: hay una tabla CMS requerida sin RLS';
    END IF;
END
$preflight$;

-- Solamente se conceden privilegios al rol NUEVO. No tocar aún otros roles.
-- CONNECT al nombre real de la BD: verificar aparte en el aprovisionamiento
-- seguro del rol; no se conoce aquí su identificador ni su URI de conexión.
GRANT USAGE ON SCHEMA public TO sigi_cms_user;

-- Operaciones de la implementación Java actual (incluye FOR UPDATE).
GRANT SELECT, INSERT, UPDATE ON public.cms_borradores TO sigi_cms_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cms_borrador_imagenes TO sigi_cms_user;
GRANT SELECT, INSERT, UPDATE ON public.cms_publicacion_versiones TO sigi_cms_user;
GRANT SELECT, INSERT ON public.cms_publicacion_historial TO sigi_cms_user;
GRANT SELECT, UPDATE ON public.cms_paginas, public.cms_secciones TO sigi_cms_user;
GRANT SELECT ON
    public.cms_proyectos, public.cms_proyectos_visibilidad,
    public.cms_seccion_items, public.cms_multimedia,
    public.cms_multimedia_asignaciones
TO sigi_cms_user;

-- Consulta pública: se inserta un lead; restringimos lectura al ID para
-- INSERT ... RETURNING id_consulta_web, sin abrir datos personales completos.
GRANT INSERT ON public.cms_consultas_web TO sigi_cms_user;
GRANT SELECT (id_consulta_web) ON public.cms_consultas_web TO sigi_cms_user;

-- Dependencias leídas por los repositorios JPA; no conceder escritura.
GRANT SELECT ON
    public.cfg_estados_consulta_web,
    public.cfg_estados_proyecto,
    public.cfg_estados_publicacion,
    public.cfg_tipos_multimedia,
    public.cfg_tipos_seccion,
    public.cfg_usos_multimedia,
    public.inm_proyectos
TO sigi_cms_user;

-- Validador de versión de sesión incorporado por el equipo.
GRANT EXECUTE ON FUNCTION public.fn_seguridad_token_vigente(bigint,bigint)
TO sigi_cms_user;

-- USAGE de las secuencias únicamente en tablas que el código INSERTA.
-- pg_get_serial_sequence admite columnas SERIAL e IDENTITY.
DO $sequences$
DECLARE
    item record;
    seq text;
BEGIN
    FOR item IN
        SELECT * FROM (VALUES
            ('cms_borradores','id_borrador'),
            ('cms_borrador_imagenes','id_imagen_borrador'),
            ('cms_publicacion_versiones','id_version_publicacion'),
            ('cms_publicacion_historial','id_historial'),
            ('cms_consultas_web','id_consulta_web')
        ) t(tabla,columna)
    LOOP
        seq := pg_get_serial_sequence(format('public.%I',item.tabla),item.columna);
        IF seq IS NULL THEN
            RAISE EXCEPTION 'DETENIDO: sin secuencia asociada a %.%', item.tabla,item.columna;
        END IF;
        EXECUTE format('GRANT USAGE ON SEQUENCE %s TO sigi_cms_user',seq);
    END LOOP;
END
$sequences$;

-- RLS: políticas adicionales solo para el backend CMS. Nunca se reemplazan
-- las políticas públicas existentes (incluida m33_visibilidad_lectura).
CREATE POLICY cms_backend_sel ON public.cms_borradores FOR SELECT TO sigi_cms_user USING (true);
CREATE POLICY cms_backend_ins ON public.cms_borradores FOR INSERT TO sigi_cms_user WITH CHECK (true);
CREATE POLICY cms_backend_upd ON public.cms_borradores FOR UPDATE TO sigi_cms_user USING (true) WITH CHECK (true);

CREATE POLICY cms_backend_sel ON public.cms_borrador_imagenes FOR SELECT TO sigi_cms_user USING (true);
CREATE POLICY cms_backend_ins ON public.cms_borrador_imagenes FOR INSERT TO sigi_cms_user WITH CHECK (true);
CREATE POLICY cms_backend_upd ON public.cms_borrador_imagenes FOR UPDATE TO sigi_cms_user USING (true) WITH CHECK (true);
CREATE POLICY cms_backend_del ON public.cms_borrador_imagenes FOR DELETE TO sigi_cms_user USING (true);

CREATE POLICY cms_backend_sel ON public.cms_publicacion_versiones FOR SELECT TO sigi_cms_user USING (true);
CREATE POLICY cms_backend_ins ON public.cms_publicacion_versiones FOR INSERT TO sigi_cms_user WITH CHECK (true);
CREATE POLICY cms_backend_upd ON public.cms_publicacion_versiones FOR UPDATE TO sigi_cms_user USING (true) WITH CHECK (true);

CREATE POLICY cms_backend_sel ON public.cms_publicacion_historial FOR SELECT TO sigi_cms_user USING (true);
CREATE POLICY cms_backend_ins ON public.cms_publicacion_historial FOR INSERT TO sigi_cms_user WITH CHECK (true);
-- NO conceder UPDATE, DELETE ni TRUNCATE del historial. Triggers append-only.

CREATE POLICY cms_backend_sel ON public.cms_paginas FOR SELECT TO sigi_cms_user USING (true);
CREATE POLICY cms_backend_upd ON public.cms_paginas FOR UPDATE TO sigi_cms_user USING (true) WITH CHECK (true);
CREATE POLICY cms_backend_sel ON public.cms_secciones FOR SELECT TO sigi_cms_user USING (true);
CREATE POLICY cms_backend_upd ON public.cms_secciones FOR UPDATE TO sigi_cms_user USING (true) WITH CHECK (true);

CREATE POLICY cms_backend_sel ON public.cms_seccion_items FOR SELECT TO sigi_cms_user USING (true);
CREATE POLICY cms_backend_sel ON public.cms_multimedia FOR SELECT TO sigi_cms_user USING (true);
CREATE POLICY cms_backend_sel ON public.cms_multimedia_asignaciones FOR SELECT TO sigi_cms_user USING (true);
CREATE POLICY cms_backend_sel ON public.cms_proyectos FOR SELECT TO sigi_cms_user USING (true);
CREATE POLICY cms_backend_sel ON public.cms_proyectos_visibilidad FOR SELECT TO sigi_cms_user USING (true);

CREATE POLICY cms_backend_ins ON public.cms_consultas_web FOR INSERT TO sigi_cms_user WITH CHECK (true);
CREATE POLICY cms_backend_sel ON public.cms_consultas_web FOR SELECT TO sigi_cms_user USING (true);

-- Catálogos: su RLS SELECT PUBLIC true ya permite lectura.
-- inm_proyectos: su RLS SELECT PUBLIC activo=true ya permite lectura de activos.
-- La política RESTRICTIVE m33 solo afecta anon/authenticated: no modificarla.

-- Verificar en QA con SET LOCAL ROLE sigi_cms_user y pruebas Java/JDBC reales.
COMMIT;
