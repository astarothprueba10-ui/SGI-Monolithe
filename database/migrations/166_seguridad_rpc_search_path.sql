-- 166: limitar las RPC internas al backend y fijar la resolución de nombres.
BEGIN;
ALTER FUNCTION public.cms_visibilidad_historial_bloquear_mutacion() SET search_path TO pg_catalog, public, pg_temp;
ALTER FUNCTION public.fn_login_corporativo_valido(p_usuario_login character varying) SET search_path TO pg_catalog, public, pg_temp;
ALTER FUNCTION public.fn_rrhh_fecha_actualizacion() SET search_path TO pg_catalog, public, pg_temp;
ALTER FUNCTION public.set_updated_at() SET search_path TO pg_catalog, public, pg_temp;
ALTER FUNCTION public.sp_agendar_visita(p_id_prospecto bigint, p_id_asesor bigint, p_id_proyecto bigint, p_fecha_visita timestamp with time zone, p_turno character varying, p_punto_encuentro character varying, p_observaciones text) SET search_path TO pg_catalog, public, pg_temp;
ALTER FUNCTION public.sp_asignar_prospecto_asesor(p_id_prospecto bigint, p_id_asesor bigint, p_motivo character varying) SET search_path TO pg_catalog, public, pg_temp;
ALTER FUNCTION public.sp_cambiar_etapa_prospecto(p_id_prospecto bigint, p_id_estado integer, p_observacion text) SET search_path TO pg_catalog, public, pg_temp;
ALTER FUNCTION public.sp_cancelar_visita(p_id_visita bigint, p_motivo text) SET search_path TO pg_catalog, public, pg_temp;
ALTER FUNCTION public.sp_confirmar_visita(p_id_visita bigint) SET search_path TO pg_catalog, public, pg_temp;
ALTER FUNCTION public.sp_evaluar_clausula_resolutoria() SET search_path TO pg_catalog, public, pg_temp;
ALTER FUNCTION public.sp_formalizar_venta_contado(p_id_lote bigint, p_id_persona bigint, p_id_asesor bigint, p_monto_total numeric, p_id_usuario bigint, p_observaciones text) SET search_path TO pg_catalog, public, pg_temp;
ALTER FUNCTION public.sp_formalizar_venta_financiada(p_id_lote bigint, p_id_persona bigint, p_id_asesor bigint, p_monto_total numeric, p_monto_inicial numeric, p_numero_cuotas integer, p_id_usuario bigint, p_observaciones text) SET search_path TO pg_catalog, public, pg_temp;
ALTER FUNCTION public.sp_listar_cronograma_venta(p_id_venta bigint) SET search_path TO pg_catalog, public, pg_temp;
ALTER FUNCTION public.sp_listar_liquidaciones_asesores() SET search_path TO pg_catalog, public, pg_temp;
ALTER FUNCTION public.sp_listar_ventas() SET search_path TO pg_catalog, public, pg_temp;
ALTER FUNCTION public.sp_listar_visitas() SET search_path TO pg_catalog, public, pg_temp;
ALTER FUNCTION public.sp_listar_vouchers_tesoreria() SET search_path TO pg_catalog, public, pg_temp;
ALTER FUNCTION public.sp_obtener_kpis_gerenciales() SET search_path TO pg_catalog, public, pg_temp;
ALTER FUNCTION public.sp_registrar_auditoria(p_id_usuario bigint, p_modulo character varying, p_accion character varying, p_entidad character varying, p_id_entidad character varying, p_resultado character varying, p_descripcion character varying, p_datos_contexto jsonb) SET search_path TO pg_catalog, public, pg_temp;
ALTER FUNCTION public.sp_obtener_dashboard_resumen() SET search_path TO pg_catalog, public, pg_temp;
ALTER PROCEDURE public.sp_registrar_acceso_exitoso(bigint) SET search_path TO pg_catalog, public, pg_temp;
REVOKE EXECUTE ON FUNCTION public.rls_auto_enable() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.sp_obtener_dashboard_resumen() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON PROCEDURE public.sp_obtener_identidad_visual_usuario(bigint) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.sp_obtener_kpis_gerenciales() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON PROCEDURE public.sp_registrar_acceso_exitoso(bigint) FROM PUBLIC, anon, authenticated;
-- Los tres helpers booleanos cms_m33_* se conservan: los usan políticas RLS de lectura pública.
-- No se crean políticas permisivas para tablas privadas sin políticas: RLS deniega por defecto.
DO $verify$
DECLARE r record;
BEGIN
 FOR r IN SELECT oid,proname FROM pg_proc WHERE pronamespace='public'::regnamespace
 AND proname IN ('rls_auto_enable','sp_obtener_dashboard_resumen','sp_obtener_identidad_visual_usuario','sp_obtener_kpis_gerenciales','sp_registrar_acceso_exitoso')
 LOOP
  IF has_function_privilege('anon',r.oid,'EXECUTE') OR has_function_privilege('authenticated',r.oid,'EXECUTE')
  OR NOT has_function_privilege('sgi_backend_user',r.oid,'EXECUTE') THEN
   RAISE EXCEPTION 'ACL inesperada para %',r.proname;
  END IF;
 END LOOP;
 IF EXISTS (SELECT 1 FROM pg_proc WHERE pronamespace='public'::regnamespace AND prokind IN ('p','f')
 AND NOT EXISTS(SELECT 1 FROM unnest(proconfig) c WHERE c LIKE 'search_path=%')) THEN
  RAISE EXCEPTION 'Rutinas sin search_path explícito';
 END IF;
 IF EXISTS(SELECT 1 FROM pg_class WHERE relnamespace='public'::regnamespace AND relkind IN ('r','p') AND NOT relrowsecurity) THEN
  RAISE EXCEPTION 'Tabla pública sin RLS';
 END IF;
END $verify$;
COMMIT;
