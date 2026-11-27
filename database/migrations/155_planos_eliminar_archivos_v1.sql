-- Eliminación de archivos técnicos mediante Core Service autenticado.
BEGIN;
GRANT DELETE ON public.inm_planos_cad_archivos,public.inm_planos_svg_proyecto TO sigi_app_user,sgi_backend_user;
DROP POLICY IF EXISTS planos_cad_backend_delete ON public.inm_planos_cad_archivos;
CREATE POLICY planos_cad_backend_delete ON public.inm_planos_cad_archivos
 FOR DELETE TO sigi_app_user,sgi_backend_user USING (true);
DROP POLICY IF EXISTS svg_backend_delete ON public.inm_planos_svg_proyecto;
CREATE POLICY svg_backend_delete ON public.inm_planos_svg_proyecto
 FOR DELETE TO sigi_app_user,sgi_backend_user USING (true);
COMMIT;
