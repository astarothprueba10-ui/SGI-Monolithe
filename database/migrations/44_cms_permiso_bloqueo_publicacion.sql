-- CMS: corrección de permisos para el bloqueo de la página INICIO.
-- Incidente 2026-11-06 04:29/04:32 UTC:
-- SQLSTATE 42501 permission denied for table cms_paginas en SELECT ... FOR UPDATE.
-- PaginaRepository.findWithLockByIdPagina() usa PESSIMISTIC_WRITE para serializar publicaciones.
-- PostgreSQL exige un privilegio UPDATE sobre al menos una columna y una política UPDATE
-- aplicable a la fila bloqueada (además de SELECT).
-- No otorgar UPDATE sobre toda la tabla ni privilegios de modificación de datos comerciales.
BEGIN;

DO $preflight$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'sigi_cms_user' AND rolbypassrls IS FALSE) THEN
    RAISE EXCEPTION 'Falta el rol restringido sigi_cms_user (RLS obligatorio)';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.cms_paginas WHERE codigo = 'INICIO' AND activo IS TRUE) THEN
    RAISE EXCEPTION 'Falta la página INICIO activa';
  END IF;
  IF has_table_privilege('sigi_cms_user', 'public.cms_paginas', 'UPDATE') THEN
    RAISE EXCEPTION 'sigi_cms_user ya tiene UPDATE de tabla: revisar antes de continuar';
  END IF;
END
$preflight$;

-- El permiso de columna satisface SELECT ... FOR UPDATE; no autoriza editar
-- título, URL, estado de publicación, IDs, SEO ni datos de las páginas.
GRANT UPDATE (fecha_actualizacion) ON TABLE public.cms_paginas TO sigi_cms_user;

-- El bloqueo solo puede actuar sobre la página INICIO activa.
-- La política no permite UPDATE en otras páginas: el único campo con GRANT UPDATE
-- es el timestamp de auditoría, que el flujo de publicación no modifica.
CREATE POLICY cms44_bloqueo_pagina_inicio ON public.cms_paginas
  AS PERMISSIVE FOR UPDATE TO sigi_cms_user
  USING (codigo = 'INICIO' AND activo IS TRUE)
  WITH CHECK (codigo = 'INICIO' AND activo IS TRUE);

COMMIT;
