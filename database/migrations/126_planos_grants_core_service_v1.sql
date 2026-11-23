-- Corrige el acceso de Core Service a las tablas de planos 124 y 125.
-- La conexión JDBC real usa sigi_app_user; las migraciones anteriores
-- solo concedían permisos a sgi_backend_user. Mantener RLS y sin acceso web.
BEGIN;
GRANT SELECT, INSERT, UPDATE ON public.inm_planos_svg_proyecto TO sigi_app_user;
GRANT SELECT, INSERT ON public.inm_planos_cad_archivos TO sigi_app_user;
-- No otorgar DELETE ni UPDATE de archivos CAD: los originales son inmutables.
-- No otorgar acceso a anon, authenticated o PUBLIC.
COMMIT;
