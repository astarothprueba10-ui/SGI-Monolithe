-- SOLO CANDIDATA PARA REVISIÓN. No ejecutar en Supabase ni activar flags.
-- Depende de la migración 37 y de los catálogos/buckets verificados en 2026-10-30.
-- No modifica datos oficiales ni claves de Storage.
BEGIN;
DO $validar$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='sigi_cms_user'
                 AND rolcanlogin AND NOT rolbypassrls) THEN
    RAISE EXCEPTION 'sigi_cms_user debe existir sin BYPASSRLS';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.cfg_tipos_multimedia WHERE codigo='IMAGEN' AND activo)
     OR NOT EXISTS (SELECT 1 FROM public.cfg_usos_multimedia WHERE codigo='FONDO' AND activo) THEN
    RAISE EXCEPTION 'Faltan los catálogos IMAGEN/FONDO';
  END IF;
END $validar$;

GRANT SELECT, INSERT ON public.cms_multimedia TO sigi_cms_user;
GRANT SELECT, INSERT, UPDATE ON public.cms_multimedia_asignaciones TO sigi_cms_user;

DO $secuencias$
DECLARE sec text;
BEGIN
  sec := pg_get_serial_sequence('public.cms_multimedia', 'id_multimedia');
  IF sec IS NULL THEN RAISE EXCEPTION 'Falta secuencia multimedia'; END IF;
  EXECUTE format('GRANT USAGE ON SEQUENCE %s TO sigi_cms_user', sec);
  sec := pg_get_serial_sequence('public.cms_multimedia_asignaciones', 'id_multimedia_asignacion');
  IF sec IS NULL THEN RAISE EXCEPTION 'Falta secuencia de asignaciones'; END IF;
  EXECUTE format('GRANT USAGE ON SEQUENCE %s TO sigi_cms_user', sec);
END $secuencias$;

-- cms_backend_sel para ambas tablas fue creada por la candidata 37.
CREATE POLICY cms_backend_ins ON public.cms_multimedia
  FOR INSERT TO sigi_cms_user WITH CHECK (
    codigo LIKE 'CMS-WEB-%' AND activo IS TRUE AND url_externa IS NULL
    AND clave_archivo LIKE 'contenido-web/inicio/%'
    AND id_tipo_multimedia IN (
      SELECT id_tipo_multimedia FROM public.cfg_tipos_multimedia
      WHERE codigo = 'IMAGEN' AND activo
    )
  );
CREATE POLICY cms_backend_ins ON public.cms_multimedia_asignaciones
  FOR INSERT TO sigi_cms_user WITH CHECK (
    id_pagina IS NULL AND id_seccion_item IS NULL AND activo IS TRUE AND visible IS TRUE
    AND id_uso_multimedia IN (
      SELECT id_uso_multimedia FROM public.cfg_usos_multimedia
      WHERE codigo = 'FONDO' AND activo
    )
    AND id_seccion IN (
      SELECT id_seccion FROM public.cms_secciones
      WHERE codigo IN ('HERO_PRINCIPAL', 'HERO_SLIDE_2_PROMO', 'HERO_SLIDE_3_PROMO')
        AND activo IS TRUE AND id_pagina IN (
          SELECT id_pagina FROM public.cms_paginas WHERE codigo = 'INICIO' AND activo IS TRUE
        )
    )
  );
-- Se permiten desactivar los fondos anteriores, no asignaciones de otros módulos.
CREATE POLICY cms_backend_upd ON public.cms_multimedia_asignaciones
  FOR UPDATE TO sigi_cms_user USING (
    id_uso_multimedia IN (
      SELECT id_uso_multimedia FROM public.cfg_usos_multimedia WHERE codigo='FONDO'
    ) AND id_seccion IN (
      SELECT id_seccion FROM public.cms_secciones
      WHERE codigo IN ('HERO_PRINCIPAL','HERO_SLIDE_2_PROMO','HERO_SLIDE_3_PROMO')
        AND id_pagina IN (SELECT id_pagina FROM public.cms_paginas WHERE codigo='INICIO')
    )
  ) WITH CHECK (
    id_uso_multimedia IN (
      SELECT id_uso_multimedia FROM public.cfg_usos_multimedia WHERE codigo='FONDO'
    ) AND id_seccion IN (
      SELECT id_seccion FROM public.cms_secciones
      WHERE codigo IN ('HERO_PRINCIPAL','HERO_SLIDE_2_PROMO','HERO_SLIDE_3_PROMO')
        AND id_pagina IN (SELECT id_pagina FROM public.cms_paginas WHERE codigo='INICIO')
    )
  );

-- No se otorga DELETE ni TRUNCATE.
COMMIT;
