-- SGI Monolithe: proteger el CMS público con defensa adicional de RLS.
-- Conservar las políticas m33 de visibilidad de proyectos.
-- Validado con SET LOCAL ROLE anon y ROLLBACK en Supabase (2026-11-05).
BEGIN;

DO $guard$
DECLARE
    id_publicado integer;
BEGIN
    SELECT id_estado_publicacion INTO id_publicado
    FROM public.cfg_estados_publicacion
    WHERE codigo = 'PUBLICADO' AND activo IS TRUE AND visible_publico IS TRUE;

    IF id_publicado IS NULL THEN
        RAISE EXCEPTION 'Falta el estado PUBLICADO válido en cfg_estados_publicacion';
    END IF;
    IF to_regclass('public.cms_paginas') IS NULL OR
       to_regclass('public.cms_secciones') IS NULL OR
       to_regclass('public.cms_seccion_items') IS NULL THEN
        RAISE EXCEPTION 'Faltan tablas CMS';
    END IF;
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='cms_paginas'
        AND policyname='m33_visibilidad_lectura' AND permissive='RESTRICTIVE'
    ) THEN
        RAISE EXCEPTION 'No se encontró la política restrictiva m33 de visibilidad';
    END IF;

    -- No depender de un ID fijo del catálogo de estados.
    EXECUTE format(
      'CREATE POLICY cms43_pagina_publicada ON public.cms_paginas AS RESTRICTIVE FOR SELECT TO anon, authenticated
       USING (activo IS TRUE AND id_estado_publicacion = %s AND fecha_publicacion IS NOT NULL
         AND fecha_publicacion <= now())', id_publicado
    );
END
$guard$;

-- Solo secciones visibles, activas y vigentes de páginas realmente publicadas.
CREATE POLICY cms43_seccion_publicada ON public.cms_secciones
AS RESTRICTIVE FOR SELECT TO anon, authenticated
USING (
    activo IS TRUE AND visible IS TRUE
    AND (fecha_desde IS NULL OR fecha_desde <= now())
    AND (fecha_hasta IS NULL OR fecha_hasta >= now())
    AND EXISTS (SELECT 1 FROM public.cms_paginas AS pagina
                WHERE pagina.id_pagina = cms_secciones.id_pagina)
);

-- Un item no puede revelar una sección oculta, vencida o no publicada.
CREATE POLICY cms43_item_publicado ON public.cms_seccion_items
AS RESTRICTIVE FOR SELECT TO anon, authenticated
USING (
    activo IS TRUE AND visible IS TRUE
    AND (fecha_desde IS NULL OR fecha_desde <= now())
    AND (fecha_hasta IS NULL OR fecha_hasta >= now())
    AND EXISTS (SELECT 1 FROM public.cms_secciones AS seccion
                WHERE seccion.id_seccion = cms_seccion_items.id_seccion)
);
COMMIT;
