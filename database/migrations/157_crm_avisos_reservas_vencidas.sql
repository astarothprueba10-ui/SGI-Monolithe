-- 157: avisos comerciales por vencimiento y seguimiento específico.
BEGIN;
CREATE FUNCTION public.fn_crm_publicar_reserva_vencida_v1(p_historial bigint)
RETURNS void LANGUAGE plpgsql SET search_path TO 'pg_catalog','public','pg_temp' AS $fn$
DECLARE h record; v_prospecto bigint; v_tipo integer; v_seguimiento integer; v_detalle text;
BEGIN
 SELECT a.id_reserva,a.fecha_evento,r.codigo,r.id_persona,l.codigo lote,pr.nombre proyecto
 INTO h FROM public.crm_anulaciones_historial a JOIN public.ven_reservas r USING(id_reserva)
 JOIN public.inm_lotes l USING(id_lote) JOIN public.inm_proyectos pr USING(id_proyecto)
 WHERE a.id_historial=p_historial AND a.evento='ANULACION_PLAZO_VENCIDO' AND a.origen='SISTEMA';
 IF NOT FOUND THEN RETURN; END IF;
 SELECT id_prospecto INTO v_prospecto FROM public.crm_prospectos WHERE id_persona=h.id_persona AND activo;
 SELECT id_tipo_notificacion INTO STRICT v_tipo FROM public.cfg_tipos_notificacion WHERE codigo='RESERVA_VENCIDA' AND activo;
 SELECT id_tipo_seguimiento INTO STRICT v_seguimiento FROM public.cfg_tipos_seguimiento WHERE codigo='OTRO' AND activo;
 v_detalle:='Reserva '||h.codigo||' vencida. Lote '||h.lote||' del proyecto '||h.proyecto||' liberado automáticamente.';
 IF v_prospecto IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.crm_seguimientos WHERE id_prospecto=v_prospecto AND asunto='Reserva vencida' AND detalle=v_detalle) THEN
   INSERT INTO public.crm_seguimientos(id_prospecto,id_tipo_seguimiento,fecha_seguimiento,asunto,detalle,resultado,requiere_seguimiento,id_usuario_registro)
   VALUES(v_prospecto,v_seguimiento,h.fecha_evento,'Reserva vencida',v_detalle,'Separación anulada por plazo vencido; lote liberado',true,NULL);
 END IF;
 -- Gerencia y supervisión reciben todos los vencimientos; el asesor solo su cartera asignada.
 INSERT INTO public.not_notificaciones(id_persona,id_tipo_notificacion,titulo,mensaje,url_destino,referencia_modulo,referencia_entidad,referencia_id,datos_contexto,clave_deduplicacion,fecha_generacion)
 SELECT DISTINCT u.id_persona,v_tipo,'Reserva vencida',v_detalle,'/ventas','CRM','RESERVA',h.id_reserva::text,
 jsonb_build_object('idReserva',h.id_reserva,'lote',h.lote,'codigo',h.codigo),
 'crm:reserva_vencida:'||h.id_reserva||':'||u.id_persona,h.fecha_evento
 FROM public.seg_usuarios u JOIN public.cfg_estados_usuario eu USING(id_estado_usuario)
 JOIN public.seg_usuarios_roles ur USING(id_usuario) JOIN public.seg_roles ro USING(id_rol)
 WHERE eu.codigo='ACTIVO' AND ur.activo AND ur.fecha_revocacion IS NULL AND ro.activo
 AND public.fn_usuario_tiene_permiso_seguridad(u.id_usuario,'sales.view'::varchar)
 AND (ro.codigo IN ('GERENCIA','SUPERVISOR_COMERCIAL') OR EXISTS(
 SELECT 1 FROM public.com_asignaciones_prospecto ap JOIN public.com_asesores ca USING(id_asesor)
 WHERE ap.id_prospecto=v_prospecto AND ap.fecha_fin IS NULL AND ca.id_persona=u.id_persona))
 ON CONFLICT(clave_deduplicacion) DO NOTHING;
END; $fn$;
REVOKE ALL ON FUNCTION public.fn_crm_publicar_reserva_vencida_v1(bigint) FROM PUBLIC,anon,authenticated,service_role,sigi_app_user;
CREATE FUNCTION public.trg_crm_avisar_reserva_vencida_v1()
RETURNS trigger LANGUAGE plpgsql SET search_path TO 'pg_catalog','public','pg_temp' AS $fn$
BEGIN
 PERFORM public.fn_crm_publicar_reserva_vencida_v1(NEW.id_historial);
 RETURN NEW;
END; $fn$;
REVOKE ALL ON FUNCTION public.trg_crm_avisar_reserva_vencida_v1() FROM PUBLIC,anon,authenticated,service_role,sigi_app_user;
CREATE TRIGGER trg_crm_avisar_reserva_vencida_v1 AFTER INSERT ON public.crm_anulaciones_historial
 FOR EACH ROW WHEN (NEW.evento='ANULACION_PLAZO_VENCIDO' AND NEW.origen='SISTEMA') EXECUTE FUNCTION public.trg_crm_avisar_reserva_vencida_v1();
CREATE FUNCTION public.sp_crm_avisos_comerciales_v1(p_actor bigint)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'pg_catalog','public','pg_temp' AS $fn$
BEGIN
 IF NOT coalesce(public.fn_usuario_tiene_permiso_seguridad(p_actor,'sales.view'::varchar),false) THEN
 RAISE EXCEPTION 'DENEGADO|Se requiere sales.view.'; END IF;
 RETURN jsonb_build_object('items',coalesce((SELECT jsonb_agg(to_jsonb(x) ORDER BY x.fecha DESC) FROM (
 SELECT 'reserva:'||n.id_notificacion id,n.titulo,n.mensaje,n.fecha_generacion fecha
 FROM public.not_notificaciones n JOIN public.cfg_tipos_notificacion t USING(id_tipo_notificacion)
 JOIN public.seg_usuarios u ON u.id_persona=n.id_persona
 JOIN public.cfg_estados_usuario e ON e.id_estado_usuario=u.id_estado_usuario
 WHERE u.id_usuario=p_actor AND e.codigo='ACTIVO' AND n.activo AND t.codigo='RESERVA_VENCIDA' AND n.referencia_modulo='CRM'
 AND (n.fecha_expiracion IS NULL OR n.fecha_expiracion>now()) ORDER BY n.fecha_generacion DESC,n.id_notificacion DESC LIMIT 100
 ) x),'[]'::jsonb));
END; $fn$;
REVOKE ALL ON FUNCTION public.sp_crm_avisos_comerciales_v1(bigint) FROM PUBLIC,anon,authenticated,service_role,sigi_app_user;
GRANT EXECUTE ON FUNCTION public.sp_crm_avisos_comerciales_v1(bigint) TO sigi_app_user;
-- Regularizar los eventos automáticos ya ejecutados, sin repetir pagos ni anulaciones.
DO $backfill$ DECLARE r record; BEGIN
 FOR r IN SELECT id_historial FROM public.crm_anulaciones_historial WHERE evento='ANULACION_PLAZO_VENCIDO' AND origen='SISTEMA' LOOP
 PERFORM public.fn_crm_publicar_reserva_vencida_v1(r.id_historial); END LOOP;
END; $backfill$;
COMMIT;
