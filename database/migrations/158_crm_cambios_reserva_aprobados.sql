-- 158: solicitudes y aprobación de traslado de reserva, sin duplicar ni modificar pagos.
BEGIN;
CREATE TABLE public.crm_solicitudes_cambio_reserva_v1(
 id_solicitud bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 id_prospecto bigint NOT NULL REFERENCES public.crm_prospectos(id_prospecto),
 id_reserva bigint NOT NULL REFERENCES public.ven_reservas(id_reserva),
 id_lote_anterior bigint NOT NULL REFERENCES public.inm_lotes(id_lote),
 id_lote_nuevo bigint NOT NULL REFERENCES public.inm_lotes(id_lote),
 id_solicitante bigint NOT NULL REFERENCES public.seg_usuarios(id_usuario),
 motivo text NOT NULL CHECK(length(btrim(motivo)) BETWEEN 5 AND 500),
 estado text NOT NULL DEFAULT 'PENDIENTE' CHECK(estado IN ('PENDIENTE','APLICANDO','APROBADA','RECHAZADA')),
 antes jsonb NOT NULL, destino jsonb NOT NULL,
 id_decisor bigint REFERENCES public.seg_usuarios(id_usuario), decision text,
 fecha_solicitud timestamptz NOT NULL DEFAULT now(), fecha_decision timestamptz,
 CHECK(id_lote_anterior<>id_lote_nuevo),
 CHECK((estado='PENDIENTE' AND id_decisor IS NULL AND fecha_decision IS NULL) OR (estado<>'PENDIENTE' AND id_decisor IS NOT NULL AND fecha_decision IS NOT NULL))
);
ALTER TABLE public.crm_solicitudes_cambio_reserva_v1 ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.crm_solicitudes_cambio_reserva_v1 FROM PUBLIC,anon,authenticated,service_role,sigi_app_user;
CREATE UNIQUE INDEX uq_crm_cambio_reserva_pendiente_v1 ON public.crm_solicitudes_cambio_reserva_v1(id_reserva) WHERE estado IN ('PENDIENTE','APLICANDO');
CREATE FUNCTION public.fn_crm_cambio_reserva_autorizado_v1(p_reserva bigint,p_origen bigint,p_destino bigint,p_moneda integer,p_monto numeric,p_politica bigint,p_fin jsonb,p_com jsonb)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'pg_catalog','public','pg_temp' AS $fn$
 SELECT EXISTS(SELECT 1 FROM public.crm_solicitudes_cambio_reserva_v1 s WHERE s.id_reserva=p_reserva AND s.id_lote_anterior=p_origen AND s.id_lote_nuevo=p_destino AND s.estado='APLICANDO'
 AND (s.antes->>'idMoneda')::integer=p_moneda AND (s.antes->>'monto')::numeric=p_monto
 AND (s.destino->'fin'->>'idPolitica')::bigint=p_politica AND s.destino->'fin' IS NOT DISTINCT FROM p_fin
 AND nullif(s.destino->'com','null'::jsonb) IS NOT DISTINCT FROM p_com);
$fn$;
REVOKE ALL ON FUNCTION public.fn_crm_cambio_reserva_autorizado_v1(bigint,bigint,bigint,integer,numeric,bigint,jsonb,jsonb) FROM PUBLIC,anon,authenticated,service_role,sigi_app_user;
GRANT EXECUTE ON FUNCTION public.fn_crm_cambio_reserva_autorizado_v1(bigint,bigint,bigint,integer,numeric,bigint,jsonb,jsonb) TO sigi_app_user;
CREATE FUNCTION public.fn_crm_destino_cambio_reserva_v1(p_lote bigint,p_moneda integer)
RETURNS jsonb LANGUAGE plpgsql SET search_path TO 'pg_catalog','public','pg_temp' AS $fn$
DECLARE v_proyecto bigint; v_precio numeric; v_fin jsonb; v_com jsonb;
BEGIN
 SELECT l.id_proyecto INTO v_proyecto FROM public.inm_lotes l JOIN public.cfg_estados_lote e USING(id_estado_lote)
 JOIN public.inm_proyectos pr USING(id_proyecto) JOIN public.inm_manzanas m USING(id_manzana) JOIN public.inm_etapas et ON et.id_etapa=m.id_etapa
 WHERE l.id_lote=p_lote AND l.activo AND pr.activo AND m.activo AND et.activo AND e.activo AND e.codigo='DISPONIBLE';
 IF NOT FOUND OR EXISTS(SELECT 1 FROM public.ven_reservas r JOIN public.cfg_estados_reserva er USING(id_estado_reserva) WHERE r.id_lote=p_lote AND er.codigo IN ('PENDIENTE','VIGENTE'))
 OR EXISTS(SELECT 1 FROM public.ven_ventas v JOIN public.cfg_estados_venta ev USING(id_estado_venta) WHERE v.id_lote=p_lote AND ev.codigo<>'ANULADA')
 THEN RAISE EXCEPTION 'LOTE_NO_DISPONIBLE|El lote de destino no está disponible.'; END IF;
 SELECT p.precio INTO STRICT v_precio FROM public.inm_lotes_precios p JOIN public.cfg_monedas m USING(id_moneda)
 WHERE p.id_lote=p_lote AND p.id_moneda=p_moneda AND p.activo AND m.activo AND m.codigo='PEN' AND p.precio>0 AND p.fecha_desde<=now() AND (p.fecha_hasta IS NULL OR p.fecha_hasta>now());
 v_fin:=public.fn_fin_politica_lote_v2(p_lote);
 IF v_fin IS NULL THEN RAISE EXCEPTION 'POLITICA_NO_DISPONIBLE|El destino no tiene política financiera.'; END IF;
 v_com:=public.fn_inm_comercial_snapshot_v1(p_lote,p_moneda);
 RETURN jsonb_build_object('idProyecto',v_proyecto,'precio',v_precio,'fin',v_fin,'com',v_com);
END; $fn$;
REVOKE ALL ON FUNCTION public.fn_crm_destino_cambio_reserva_v1(bigint,integer) FROM PUBLIC,anon,authenticated,service_role,sigi_app_user;
CREATE FUNCTION public.fn_crm_avisar_cambio_reserva_v1(p_solicitud bigint,p_decision boolean)
RETURNS void LANGUAGE plpgsql SET search_path TO 'pg_catalog','public','pg_temp' AS $fn$
DECLARE s record; v_tipo integer; v_titulo text; v_msg text;
BEGIN
 SELECT c.*,a.codigo lote_anterior,b.codigo lote_nuevo,pr.nombre proyecto_nuevo INTO s FROM public.crm_solicitudes_cambio_reserva_v1 c
 JOIN public.inm_lotes a ON a.id_lote=c.id_lote_anterior JOIN public.inm_lotes b ON b.id_lote=c.id_lote_nuevo JOIN public.inm_proyectos pr ON pr.id_proyecto=b.id_proyecto WHERE c.id_solicitud=p_solicitud;
 IF NOT FOUND THEN RETURN; END IF;
 SELECT id_tipo_notificacion INTO STRICT v_tipo FROM public.cfg_tipos_notificacion WHERE codigo='GENERAL' AND activo;
 v_titulo:=CASE WHEN p_decision THEN 'Cambio de reserva '||lower(s.estado) ELSE 'Solicitud de cambio de reserva' END;
 v_msg:='Lote '||s.lote_anterior||' → '||s.lote_nuevo||' ('||s.proyecto_nuevo||'). '||CASE WHEN p_decision THEN 'Decisión: '||s.estado ELSE 'Pendiente de revisión de Gerencia o Supervisión.' END;
 INSERT INTO public.not_notificaciones(id_persona,id_tipo_notificacion,titulo,mensaje,url_destino,referencia_modulo,referencia_entidad,referencia_id,clave_deduplicacion)
 SELECT DISTINCT u.id_persona,v_tipo,v_titulo,v_msg,'/ventas?tab=cambios-reserva','CRM','CAMBIO_RESERVA',s.id_solicitud::text,
 'crm:cambio:'||s.id_solicitud||':'||s.estado||':'||u.id_persona
 FROM public.seg_usuarios u JOIN public.cfg_estados_usuario eu USING(id_estado_usuario) JOIN public.seg_usuarios_roles ur USING(id_usuario) JOIN public.seg_roles ro USING(id_rol)
 WHERE eu.codigo='ACTIVO' AND ur.activo AND ur.fecha_revocacion IS NULL AND ro.activo AND public.fn_usuario_tiene_permiso_seguridad(u.id_usuario,'sales.view'::varchar)
 AND ((NOT p_decision AND ro.codigo IN ('GERENCIA','SUPERVISOR_COMERCIAL')) OR (p_decision AND u.id_usuario=s.id_solicitante))
 ON CONFLICT(clave_deduplicacion) DO NOTHING;
END; $fn$;
REVOKE ALL ON FUNCTION public.fn_crm_avisar_cambio_reserva_v1(bigint,boolean) FROM PUBLIC,anon,authenticated,service_role,sigi_app_user;

CREATE FUNCTION public.sp_crm_solicitar_cambio_reserva_v1(p_actor bigint,p_prospecto bigint,p_reserva bigint,p_lote bigint,p_motivo text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'pg_catalog','public','pg_temp' AS $fn$
DECLARE r record; v_destino jsonb; v_id bigint; v_tipo integer;
BEGIN
 IF NOT coalesce(public.fn_usuario_tiene_permiso_seguridad(p_actor,'sales.create'::varchar),false) OR NOT coalesce(public.fn_crm_puede_consultar_prospecto(p_actor,p_prospecto),false)
 THEN RAISE EXCEPTION 'DENEGADO|No puede solicitar cambios para este cliente.'; END IF;
 IF p_lote IS NULL OR p_reserva IS NULL OR length(btrim(coalesce(p_motivo,''))) NOT BETWEEN 5 AND 500 THEN RAISE EXCEPTION 'DATOS_INVALIDOS|Seleccione el lote nuevo e indique un motivo.'; END IF;
 SELECT r0.*,e.codigo estado,l.id_proyecto INTO r FROM public.ven_reservas r0 JOIN public.cfg_estados_reserva e USING(id_estado_reserva)
 JOIN public.inm_lotes l USING(id_lote) JOIN public.crm_prospectos pr ON pr.id_persona=r0.id_persona
 WHERE r0.id_reserva=p_reserva AND pr.id_prospecto=p_prospecto AND pr.activo AND e.codigo IN ('PENDIENTE','VIGENTE') AND r0.fecha_vencimiento>now() FOR SHARE OF r0;
 IF NOT FOUND OR r.id_lote=p_lote OR EXISTS(SELECT 1 FROM public.ven_ventas WHERE id_reserva=p_reserva) THEN RAISE EXCEPTION 'OPERACION_INVALIDA|La reserva ya no admite un cambio de lote.'; END IF;
 v_destino:=public.fn_crm_destino_cambio_reserva_v1(p_lote,r.id_moneda);
 IF (v_destino->>'precio')::numeric<=r.monto_reserva THEN RAISE EXCEPTION 'DATOS_INVALIDOS|El precio del destino debe superar el crédito de la reserva.'; END IF;
 INSERT INTO public.crm_solicitudes_cambio_reserva_v1(id_prospecto,id_reserva,id_lote_anterior,id_lote_nuevo,id_solicitante,motivo,antes,destino)
 VALUES(p_prospecto,p_reserva,r.id_lote,p_lote,p_actor,btrim(p_motivo),
 jsonb_build_object('idProyecto',r.id_proyecto,'idMoneda',r.id_moneda,'monto',r.monto_reserva,'idPolitica',r.id_politica_financiera,'fin',r.politica_financiera_snapshot,'com',r.politica_comercial_snapshot,'vence',r.fecha_vencimiento),v_destino) RETURNING id_solicitud INTO v_id;
 SELECT id_tipo_seguimiento INTO STRICT v_tipo FROM public.cfg_tipos_seguimiento WHERE codigo='OTRO' AND activo;
 INSERT INTO public.crm_seguimientos(id_prospecto,id_tipo_seguimiento,asunto,detalle,resultado,requiere_seguimiento,id_usuario_registro)
 VALUES(p_prospecto,v_tipo,'Solicitud de cambio de reserva','Solicitud #'||v_id||': '||r.codigo||' → lote '||(SELECT codigo FROM public.inm_lotes WHERE id_lote=p_lote)||'. Motivo: '||btrim(p_motivo),'Pendiente de aprobación',true,p_actor);
 PERFORM public.fn_crm_avisar_cambio_reserva_v1(v_id,false);
 RETURN jsonb_build_object('idSolicitud',v_id,'estado','PENDIENTE');
END; $fn$;
REVOKE ALL ON FUNCTION public.sp_crm_solicitar_cambio_reserva_v1(bigint,bigint,bigint,bigint,text) FROM PUBLIC,anon,authenticated,service_role,sigi_app_user;
GRANT EXECUTE ON FUNCTION public.sp_crm_solicitar_cambio_reserva_v1(bigint,bigint,bigint,bigint,text) TO sigi_app_user;

CREATE FUNCTION public.sp_crm_decidir_cambio_reserva_v1(p_actor bigint,p_solicitud bigint,p_aprobar boolean,p_motivo text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'pg_catalog','public','pg_temp' AS $fn$
DECLARE s public.crm_solicitudes_cambio_reserva_v1%ROWTYPE; r record; v_grupo uuid; v_destino jsonb; v_disp integer; v_reservado integer; v_tipo integer; v_fin jsonb; v_com jsonb;
BEGIN
 IF NOT coalesce(public.fn_usuario_tiene_permiso_seguridad(p_actor,'sales.view'::varchar),false) OR NOT EXISTS(
 SELECT 1 FROM public.seg_usuarios_roles ur JOIN public.seg_roles ro USING(id_rol) WHERE ur.id_usuario=p_actor AND ur.activo AND ur.fecha_revocacion IS NULL AND ro.activo AND ro.codigo IN ('GERENCIA','SUPERVISOR_COMERCIAL'))
 THEN RAISE EXCEPTION 'DENEGADO|Solo Gerencia o Supervisor comercial puede decidir.'; END IF;
 IF p_aprobar IS NULL OR length(btrim(coalesce(p_motivo,''))) NOT BETWEEN 5 AND 500 THEN RAISE EXCEPTION 'DATOS_INVALIDOS|Indique el sustento de la decisión.'; END IF;
 SELECT * INTO s FROM public.crm_solicitudes_cambio_reserva_v1 WHERE id_solicitud=p_solicitud;
 IF NOT FOUND OR s.estado<>'PENDIENTE' THEN RAISE EXCEPTION 'OPERACION_INVALIDA|La solicitud ya fue resuelta.'; END IF;
 IF s.id_solicitante=p_actor THEN RAISE EXCEPTION 'DENEGADO|La aprobación debe realizarla otro usuario.'; END IF;
 IF p_aprobar THEN
   SELECT id_grupo INTO v_grupo FROM public.ven_separaciones_grupo_lotes_v1 WHERE id_reserva=s.id_reserva;
   -- Mismo orden de bloqueo que vencimiento y validación financiera de separaciones.
   PERFORM 1 FROM public.inm_lotes l WHERE l.id_lote IN (
    SELECT s.id_lote_anterior UNION SELECT s.id_lote_nuevo UNION
    SELECT r0.id_lote FROM public.ven_reservas r0 JOIN public.ven_separaciones_grupo_lotes_v1 g USING(id_reserva) WHERE g.id_grupo=v_grupo
   ) ORDER BY l.id_lote FOR UPDATE;
   IF v_grupo IS NOT NULL THEN PERFORM 1 FROM public.ven_separaciones_grupo_v1 WHERE id_grupo=v_grupo FOR UPDATE; END IF;
   SELECT r0.*,e.codigo estado,l.id_proyecto,el.codigo estado_lote INTO r FROM public.ven_reservas r0 JOIN public.cfg_estados_reserva e USING(id_estado_reserva)
   JOIN public.inm_lotes l USING(id_lote) JOIN public.cfg_estados_lote el USING(id_estado_lote)
   WHERE r0.id_reserva=s.id_reserva FOR UPDATE OF r0;
   IF NOT FOUND OR r.id_lote<>s.id_lote_anterior OR r.estado NOT IN ('PENDIENTE','VIGENTE') OR r.fecha_vencimiento<=now()
     OR r.estado_lote<>'RESERVADO' OR EXISTS(SELECT 1 FROM public.ven_ventas WHERE id_reserva=r.id_reserva)
     OR EXISTS(SELECT 1 FROM public.ven_ventas v JOIN public.cfg_estados_venta e USING(id_estado_venta) WHERE v.id_lote=r.id_lote AND e.codigo<>'ANULADA')
     OR EXISTS(SELECT 1 FROM public.ven_reservas z JOIN public.cfg_estados_reserva e USING(id_estado_reserva) WHERE z.id_lote=r.id_lote AND z.id_reserva<>r.id_reserva AND e.codigo IN ('PENDIENTE','VIGENTE'))
   THEN RAISE EXCEPTION 'OPERACION_INVALIDA|La reserva cambió o venció; no se puede trasladar.'; END IF;
   PERFORM 1 FROM public.crm_prospectos WHERE id_prospecto=s.id_prospecto AND id_persona=r.id_persona AND activo FOR UPDATE;
   IF NOT FOUND THEN RAISE EXCEPTION 'OPERACION_INVALIDA|Prospecto no disponible.'; END IF;
   v_destino:=public.fn_crm_destino_cambio_reserva_v1(s.id_lote_nuevo,r.id_moneda);
   IF v_destino IS DISTINCT FROM s.destino OR (v_destino->>'precio')::numeric<=r.monto_reserva THEN RAISE EXCEPTION 'OPERACION_INVALIDA|El precio o la política del destino cambió; rechace y solicite nuevamente.'; END IF;
   IF s.antes IS DISTINCT FROM jsonb_build_object('idProyecto',r.id_proyecto,'idMoneda',r.id_moneda,'monto',r.monto_reserva,'idPolitica',r.id_politica_financiera,'fin',r.politica_financiera_snapshot,'com',r.politica_comercial_snapshot,'vence',r.fecha_vencimiento)
   THEN RAISE EXCEPTION 'OPERACION_INVALIDA|Las condiciones de origen cambiaron; solicite nuevamente.'; END IF;
   SELECT id_estado_lote INTO STRICT v_disp FROM public.cfg_estados_lote WHERE codigo='DISPONIBLE' AND activo;
   SELECT id_estado_lote INTO STRICT v_reservado FROM public.cfg_estados_lote WHERE codigo='RESERVADO' AND activo;
 END IF;
 PERFORM 1 FROM public.crm_solicitudes_cambio_reserva_v1 WHERE id_solicitud=p_solicitud AND estado='PENDIENTE' FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'OPERACION_INVALIDA|La solicitud ya fue resuelta.'; END IF;
 IF p_aprobar THEN
   UPDATE public.crm_solicitudes_cambio_reserva_v1 SET estado='APLICANDO',id_decisor=p_actor,decision=btrim(p_motivo),fecha_decision=now() WHERE id_solicitud=p_solicitud;
   v_fin:=v_destino->'fin';v_com:=nullif(v_destino->'com','null'::jsonb);
   -- Se conserva id de reserva, abonos, distribuciones, monto y vencimiento originales.
   UPDATE public.ven_reservas SET id_lote=s.id_lote_nuevo,id_politica_financiera=(v_fin->>'idPolitica')::bigint,
    politica_financiera_snapshot=v_fin,politica_comercial_snapshot=v_com,fecha_actualizacion=now() WHERE id_reserva=r.id_reserva;
   UPDATE public.inm_lotes SET id_estado_lote=v_disp,fecha_actualizacion=now() WHERE id_lote=s.id_lote_anterior;
   UPDATE public.inm_lotes SET id_estado_lote=v_reservado,fecha_actualizacion=now() WHERE id_lote=s.id_lote_nuevo;
   INSERT INTO public.inm_lotes_historial_estado(id_lote,id_estado_anterior,id_estado_nuevo,motivo,id_usuario)
   VALUES(s.id_lote_anterior,v_reservado,v_disp,'Traslado de reserva aprobado #'||s.id_solicitud,p_actor),(s.id_lote_nuevo,v_disp,v_reservado,'Traslado de reserva aprobado #'||s.id_solicitud,p_actor);
   -- Conservar el interés histórico. Si el nuevo proyecto no era de interés, agregarlo.
   IF NOT EXISTS(SELECT 1 FROM public.crm_prospectos_intereses WHERE id_prospecto=s.id_prospecto AND id_proyecto=(v_destino->>'idProyecto')::bigint AND activo) THEN
     INSERT INTO public.crm_prospectos_intereses(id_prospecto,id_proyecto,id_lote_interes,comentario,activo)
     VALUES(s.id_prospecto,(v_destino->>'idProyecto')::bigint,s.id_lote_nuevo,'Traslado aprobado #'||s.id_solicitud,true);
   END IF;
   UPDATE public.crm_prospectos_intereses SET id_lote_interes=s.id_lote_nuevo,fecha_actualizacion=now()
   WHERE id_prospecto=s.id_prospecto AND id_proyecto=(v_destino->>'idProyecto')::bigint AND activo AND (id_lote_interes=s.id_lote_anterior OR id_lote_interes IS NULL);
   UPDATE public.crm_solicitudes_cambio_reserva_v1 SET estado='APROBADA' WHERE id_solicitud=p_solicitud;
 ELSE
   UPDATE public.crm_solicitudes_cambio_reserva_v1 SET estado='RECHAZADA',id_decisor=p_actor,decision=btrim(p_motivo),fecha_decision=now() WHERE id_solicitud=p_solicitud;
 END IF;
 SELECT id_tipo_seguimiento INTO STRICT v_tipo FROM public.cfg_tipos_seguimiento WHERE codigo='OTRO' AND activo;
 INSERT INTO public.crm_seguimientos(id_prospecto,id_tipo_seguimiento,asunto,detalle,resultado,requiere_seguimiento,id_usuario_registro)
 VALUES(s.id_prospecto,v_tipo,CASE WHEN p_aprobar THEN 'Cambio de reserva aprobado' ELSE 'Cambio de reserva rechazado' END,
 'Solicitud #'||s.id_solicitud||' · '||(SELECT codigo FROM public.inm_lotes WHERE id_lote=s.id_lote_anterior)||' → '||(SELECT codigo FROM public.inm_lotes WHERE id_lote=s.id_lote_nuevo)||'. '||btrim(p_motivo),CASE WHEN p_aprobar THEN 'Lote cambiado; abonos conservados' ELSE 'Reserva original conservada' END,false,p_actor);
 PERFORM public.fn_crm_avisar_cambio_reserva_v1(p_solicitud,true);
 RETURN jsonb_build_object('idSolicitud',p_solicitud,'estado',CASE WHEN p_aprobar THEN 'APROBADA' ELSE 'RECHAZADA' END);
END; $fn$;
REVOKE ALL ON FUNCTION public.sp_crm_decidir_cambio_reserva_v1(bigint,bigint,boolean,text) FROM PUBLIC,anon,authenticated,service_role,sigi_app_user;
GRANT EXECUTE ON FUNCTION public.sp_crm_decidir_cambio_reserva_v1(bigint,bigint,boolean,text) TO sigi_app_user;

CREATE FUNCTION public.sp_crm_listar_cambios_reserva_v1(p_actor bigint,p_prospecto bigint DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'pg_catalog','public','pg_temp' AS $fn$
DECLARE v_global boolean;
BEGIN
 IF NOT coalesce(public.fn_usuario_tiene_permiso_seguridad(p_actor,'sales.view'::varchar),false) THEN RAISE EXCEPTION 'DENEGADO|Se requiere sales.view.'; END IF;
 SELECT EXISTS(SELECT 1 FROM public.seg_usuarios_roles ur JOIN public.seg_roles ro USING(id_rol) WHERE ur.id_usuario=p_actor AND ur.activo AND ur.fecha_revocacion IS NULL AND ro.activo AND ro.codigo IN ('GERENCIA','SUPERVISOR_COMERCIAL')) INTO v_global;
 RETURN jsonb_build_object('items',coalesce((SELECT jsonb_agg(to_jsonb(x) ORDER BY x.fecha DESC) FROM (
 SELECT c.id_solicitud "idSolicitud",c.id_prospecto "idProspecto",c.id_reserva "idReserva",c.id_lote_anterior "idLoteAnterior",c.id_lote_nuevo "idLoteNuevo",
 a.codigo "loteAnterior",b.codigo "loteNuevo",pa.nombre "proyectoAnterior",pb.nombre "proyectoNuevo",r.codigo "codigoReserva",
 concat_ws(' ',per.nombres,per.apellido_paterno,per.apellido_materno) cliente,c.motivo,c.estado,c.decision,c.fecha_solicitud fecha,
 (v_global AND c.id_solicitante<>p_actor AND c.estado='PENDIENTE') "puedeDecidir",
 (c.antes->>'monto')::numeric credito,(c.destino->>'precio')::numeric "precioDestino",
 (c.destino->'fin'->>'montoSeparacion')::numeric "separacionDestino"
 FROM public.crm_solicitudes_cambio_reserva_v1 c JOIN public.crm_prospectos pro USING(id_prospecto) JOIN public.core_personas per USING(id_persona)
 JOIN public.ven_reservas r USING(id_reserva) JOIN public.inm_lotes a ON a.id_lote=c.id_lote_anterior JOIN public.inm_lotes b ON b.id_lote=c.id_lote_nuevo
 JOIN public.inm_proyectos pa ON pa.id_proyecto=a.id_proyecto JOIN public.inm_proyectos pb ON pb.id_proyecto=b.id_proyecto
 WHERE (p_prospecto IS NULL OR c.id_prospecto=p_prospecto) AND (v_global OR c.id_solicitante=p_actor OR public.fn_crm_puede_consultar_prospecto(p_actor,c.id_prospecto))
 ORDER BY (c.estado='PENDIENTE') DESC,c.fecha_solicitud DESC LIMIT 100
 ) x),'[]'::jsonb));
END; $fn$;
REVOKE ALL ON FUNCTION public.sp_crm_listar_cambios_reserva_v1(bigint,bigint) FROM PUBLIC,anon,authenticated,service_role,sigi_app_user;
GRANT EXECUTE ON FUNCTION public.sp_crm_listar_cambios_reserva_v1(bigint,bigint) TO sigi_app_user;
CREATE OR REPLACE FUNCTION public.fn_fin_congelar_condiciones_v1()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'pg_temp'
AS $function$
DECLARE v_id bigint; v_snap jsonb;
BEGIN
 IF TG_OP='INSERT' THEN
   IF NEW.id_politica_financiera IS NOT NULL OR NEW.politica_financiera_snapshot IS NOT NULL THEN
     RAISE EXCEPTION 'POLITICA_INVALIDA|El registro no puede suministrar condiciones financieras propias.';
   END IF;

   IF TG_TABLE_NAME='ven_reservas' THEN
     v_snap:=public.fn_fin_politica_lote_v2(NEW.id_lote);
   ELSIF TG_TABLE_NAME='ven_ventas' THEN
     IF NEW.id_reserva IS NOT NULL THEN
       SELECT id_politica_financiera,politica_financiera_snapshot INTO v_id,v_snap
       FROM public.ven_reservas WHERE id_reserva=NEW.id_reserva;
       IF NOT FOUND THEN RAISE EXCEPTION 'POLITICA_INVALIDA|La reserva no existe.'; END IF;
       IF v_snap IS NULL THEN
         -- Reserva legítima anterior a la configuración: no recibe condiciones nuevas.
         SELECT id_politica INTO v_id FROM public.cfg_fin_politicas_versiones
           WHERE codigo='GENERAL' AND version=1;
         v_snap:=public.fn_fin_snapshot_politica_v1(v_id);
       END IF;
     ELSE
       v_snap:=public.fn_fin_politica_lote_v2(NEW.id_lote);
     END IF;
   ELSIF TG_TABLE_NAME='pag_planes_pago' THEN
     SELECT id_politica_financiera,politica_financiera_snapshot INTO v_id,v_snap
       FROM public.ven_ventas WHERE id_venta=NEW.id_venta;
     IF NOT FOUND THEN RAISE EXCEPTION 'POLITICA_INVALIDA|La venta no existe.'; END IF;
     IF v_snap IS NULL THEN
       -- No imponer condiciones actuales a un plan que provenga de una venta histórica.
       RETURN NEW;
     END IF;
   END IF;

   IF v_snap IS NULL THEN RAISE EXCEPTION
      'POLITICA_NO_DISPONIBLE|Sin política vigente para el registro.'; END IF;
   NEW.id_politica_financiera:=(v_snap->>'idPolitica')::bigint;
   NEW.politica_financiera_snapshot:=v_snap;
   RETURN NEW;
 END IF;

 IF TG_TABLE_NAME='ven_reservas' THEN
   IF public.fn_crm_cambio_reserva_autorizado_v1(OLD.id_reserva,OLD.id_lote,NEW.id_lote,NEW.id_moneda,NEW.monto_reserva,NEW.id_politica_financiera,NEW.politica_financiera_snapshot,NEW.politica_comercial_snapshot) THEN RETURN NEW; END IF;
 END IF;
 IF NEW.id_politica_financiera IS DISTINCT FROM OLD.id_politica_financiera OR
    NEW.politica_financiera_snapshot IS DISTINCT FROM OLD.politica_financiera_snapshot THEN
   RAISE EXCEPTION
     'POLITICA_INMUTABLE|Las condiciones financieras aceptadas no pueden modificarse.';
 END IF;
 RETURN NEW;
END;
$function$;
CREATE OR REPLACE FUNCTION public.fn_inm_congelar_politica_comercial_v1()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
DECLARE
    v_snapshot jsonb;
    v_reserva_valida boolean;
BEGIN
    IF TG_OP='UPDATE' THEN
        IF TG_TABLE_NAME='ven_reservas' AND NEW.id_lote IS DISTINCT FROM OLD.id_lote THEN
            IF public.fn_crm_cambio_reserva_autorizado_v1(OLD.id_reserva,OLD.id_lote,NEW.id_lote,NEW.id_moneda,NEW.monto_reserva,NEW.id_politica_financiera,NEW.politica_financiera_snapshot,NEW.politica_comercial_snapshot) THEN RETURN NEW; END IF;
            RAISE EXCEPTION 'COMERCIAL_INMUTABLE|El cambio de lote requiere una solicitud aprobada.';
        END IF;
        IF NEW.politica_comercial_snapshot IS DISTINCT FROM OLD.politica_comercial_snapshot THEN
            RAISE EXCEPTION 'COMERCIAL_INMUTABLE|La politica comercial de la operacion no admite cambios.';
        END IF;
        IF OLD.politica_comercial_snapshot IS NOT NULL THEN
            IF NEW.id_lote IS DISTINCT FROM OLD.id_lote OR NEW.id_moneda IS DISTINCT FROM OLD.id_moneda THEN
                RAISE EXCEPTION 'COMERCIAL_INMUTABLE|No se puede cambiar el lote o moneda de la operacion.';
            END IF;
            IF TG_TABLE_NAME='ven_ventas' THEN
                IF NEW.precio_venta IS DISTINCT FROM OLD.precio_venta
                   OR NEW.precio_lista IS DISTINCT FROM OLD.precio_lista
                   OR NEW.descuento IS DISTINCT FROM OLD.descuento
                   OR NEW.id_reserva IS DISTINCT FROM OLD.id_reserva THEN
                    RAISE EXCEPTION 'COMERCIAL_INMUTABLE|No se puede modificar el precio pactado.';
                END IF;
            END IF;
        END IF;
        RETURN NEW;
    END IF;
    -- Mismo bloqueo de lote empleado por los procedimientos de CRM.
    PERFORM 1 FROM public.inm_lotes WHERE id_lote=NEW.id_lote FOR UPDATE;
    IF NOT EXISTS (
        SELECT 1 FROM public.inm_politicas_comerciales_publicadas p
        JOIN public.inm_lotes l ON l.id_proyecto=p.id_proyecto WHERE l.id_lote=NEW.id_lote
    ) THEN
        NEW.politica_comercial_snapshot := NULL;
        RETURN NEW;
    END IF;
    IF TG_TABLE_NAME='ven_ventas' THEN
        IF NEW.id_reserva IS NOT NULL THEN
            SELECT r.politica_comercial_snapshot, true INTO v_snapshot, v_reserva_valida
            FROM public.ven_reservas r JOIN public.cfg_estados_reserva er ON er.id_estado_reserva=r.id_estado_reserva
            WHERE r.id_reserva=NEW.id_reserva AND r.id_lote=NEW.id_lote AND r.id_moneda=NEW.id_moneda
              AND er.codigo IN ('PENDIENTE','VIGENTE') AND r.fecha_vencimiento>now();
            IF NOT coalesce(v_reserva_valida,false) THEN
                RAISE EXCEPTION 'COMERCIAL_NO_DISPONIBLE|La separacion no esta vigente o no corresponde al lote.';
            END IF;
            -- Una reserva anterior a la adopcion del motor conserva el flujo anterior.
        ELSE
            v_snapshot := public.fn_inm_comercial_snapshot_v1(NEW.id_lote, NEW.id_moneda);
        END IF;
        IF v_snapshot IS NOT NULL THEN
            IF NEW.precio_venta IS DISTINCT FROM (v_snapshot->>'precioFinal')::numeric THEN
                RAISE EXCEPTION 'COMERCIAL_PRECIO_CAMBIO|El importe no coincide con la politica comercial aceptada.';
            END IF;
            NEW.precio_lista := (v_snapshot->>'precioLista')::numeric;
            NEW.descuento := (v_snapshot->>'descuento')::numeric;
        END IF;
    ELSE
        v_snapshot := public.fn_inm_comercial_snapshot_v1(NEW.id_lote, NEW.id_moneda);
    END IF;
    -- Ignorar cualquier snapshot aportado por el cliente.
    NEW.politica_comercial_snapshot := v_snapshot;
    RETURN NEW;
END;
$function$;
CREATE OR REPLACE FUNCTION public.sp_crm_listar_lotes_reservados_prospecto_v1(p_actor bigint, p_prospecto bigint)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'pg_temp'
AS $function$
BEGIN
    IF p_actor IS NULL OR p_actor <= 0
       OR p_prospecto IS NULL OR p_prospecto <= 0 THEN
        RAISE EXCEPTION 'DATOS_INVALIDOS|Identificadores invalidos.';
    END IF;

    IF NOT COALESCE(
        public.fn_usuario_tiene_permiso_seguridad(
            p_actor, 'sales.create'::varchar
        ), FALSE
    ) THEN
        RAISE EXCEPTION 'DENEGADO|Se requiere sales.create.';
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM public.crm_prospectos p
        JOIN public.core_personas persona
          ON persona.id_persona = p.id_persona
         AND persona.activo = TRUE
        WHERE p.id_prospecto = p_prospecto
          AND p.activo = TRUE
    ) THEN
        RAISE EXCEPTION 'PROSPECTO_NO_EXISTE|El prospecto no existe o esta inactivo.';
    END IF;

    IF NOT COALESCE(
        public.fn_crm_puede_consultar_prospecto(
            p_actor, p_prospecto
        ), FALSE
    ) THEN
        RAISE EXCEPTION 'DENEGADO|Prospecto fuera de su cartera autorizada.';
    END IF;

    RETURN jsonb_build_object(
        'idLotes',
        COALESCE((
            SELECT jsonb_agg(reservados.id_lote ORDER BY reservados.id_lote)
            FROM (
                SELECT DISTINCT r.id_lote
                FROM public.crm_prospectos p
                JOIN public.ven_reservas r
                  ON r.id_persona = p.id_persona
                JOIN public.cfg_estados_reserva er
                  ON er.id_estado_reserva = r.id_estado_reserva
                JOIN public.inm_lotes l
                  ON l.id_lote = r.id_lote
                JOIN public.crm_prospectos_intereses interes
                  ON interes.id_prospecto = p.id_prospecto
                 AND interes.id_proyecto = l.id_proyecto
                 AND interes.activo = TRUE
                WHERE p.id_prospecto = p_prospecto
                  AND p.activo = TRUE
                  AND l.activo = TRUE
                  AND er.codigo IN ('PENDIENTE','VIGENTE')
                  AND r.fecha_vencimiento > now()
                  AND NOT EXISTS (
                      SELECT 1
                      FROM public.ven_ventas venta
                      JOIN public.cfg_estados_venta estado
                        ON estado.id_estado_venta = venta.id_estado_venta
                      WHERE venta.id_lote = r.id_lote
                        AND estado.codigo <> 'ANULADA'
                  )
            ) reservados
        ), '[]'::jsonb)
    );
END;
$function$;
CREATE OR REPLACE FUNCTION public.sp_crm_reservas_vigentes_para_venta_v2(p_actor bigint, p_prospecto bigint)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'pg_temp'
AS $function$
DECLARE
  v_autorizado jsonb;
  v_reservas jsonb;
BEGIN
  v_autorizado := public.sp_crm_listar_lotes_reservados_prospecto_v1(
      p_actor,p_prospecto);
  SELECT coalesce(jsonb_agg(jsonb_build_object(
      'idReserva',r.id_reserva,'codigoReserva',r.codigo,
      'idLote',l.id_lote,'codigoLote',l.codigo,'estado',e.codigo,'idProyecto',l.id_proyecto,'idEtapa',man.id_etapa,
      'montoReserva',round(r.monto_reserva,2),
      'montoReservaAplicable',public.fn_crm_reserva_acreditable_v1(r.id_reserva),
      'fechaVencimiento',r.fecha_vencimiento
  ) ORDER BY r.fecha_reserva DESC,r.id_reserva DESC),'[]'::jsonb)
  INTO v_reservas
  FROM public.ven_reservas r
  JOIN public.inm_lotes l ON l.id_lote=r.id_lote
  JOIN public.inm_manzanas man ON man.id_manzana=l.id_manzana
  JOIN public.crm_prospectos p ON p.id_persona=r.id_persona
  JOIN public.cfg_estados_reserva e ON e.id_estado_reserva=r.id_estado_reserva
  WHERE p.id_prospecto=p_prospecto
    AND e.codigo IN ('PENDIENTE','VIGENTE') AND r.fecha_vencimiento>now()
    AND l.id_lote IN (
      SELECT (x)::bigint
      FROM jsonb_array_elements_text(v_autorizado->'idLotes') x
    );
  RETURN jsonb_build_object('reservas',v_reservas,
                            'idLotes',v_autorizado->'idLotes');
END $function$;
CREATE OR REPLACE FUNCTION public.sp_crm_etapas_operacion_v1(p_actor bigint, p_prospecto bigint, p_proyecto bigint, p_incluir_reservas boolean)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'pg_temp'
AS $function$
DECLARE v_resultado jsonb; v_version integer; v_persona bigint;
BEGIN
 IF NOT coalesce(public.fn_usuario_tiene_permiso_seguridad(p_actor,'sales.create'::varchar),false)
    OR NOT coalesce(public.fn_usuario_tiene_permiso_seguridad(p_actor,'lots.view'::varchar),false)
    OR NOT coalesce(public.fn_crm_puede_consultar_prospecto(p_actor,p_prospecto),false)
 THEN RAISE EXCEPTION 'DENEGADO|No puede consultar estas etapas.'; END IF;
 SELECT p.id_persona INTO v_persona FROM public.crm_prospectos p
 JOIN public.core_personas pe USING(id_persona)
 WHERE p.id_prospecto=p_prospecto AND p.activo AND pe.activo;
 IF NOT FOUND OR NOT EXISTS(SELECT 1 FROM public.crm_prospectos_intereses i
   JOIN public.inm_proyectos p USING(id_proyecto)
   WHERE i.id_prospecto=p_prospecto AND i.id_proyecto=p_proyecto AND i.activo AND p.activo)
 THEN RAISE EXCEPTION 'PROYECTO_INVALIDO|Registre primero el interés comercial.'; END IF;
 SELECT max(version) INTO v_version FROM public.inm_politicas_comerciales_publicadas WHERE id_proyecto=p_proyecto;
 WITH inventario AS (
 SELECT l.id_lote,
   CASE WHEN el.codigo='RESERVADO' AND rv.id_reserva IS NOT NULL THEN
       coalesce(rv.politica_comercial_snapshot->>'codigoEtapa',pl.codigo_etapa,ec.codigo)
     WHEN v_version IS NOT NULL THEN pl.codigo_etapa ELSE ec.codigo END codigo_etapa,
   CASE WHEN v_version IS NOT NULL THEN 'PUBLICADA' ELSE 'LEGACY' END fuente
 FROM public.inm_lotes l
 JOIN public.cfg_estados_lote el USING(id_estado_lote)
 JOIN public.inm_manzanas m USING(id_manzana)
 JOIN public.inm_etapas ef ON ef.id_etapa=m.id_etapa
 LEFT JOIN public.inm_politicas_comerciales_lotes pl
   ON pl.id_proyecto=l.id_proyecto AND pl.id_lote=l.id_lote AND pl.version=v_version
 LEFT JOIN LATERAL (
   SELECT pr.id_lote_precio,pr.id_tarifa,pr.precio FROM public.inm_lotes_precios pr
   JOIN public.cfg_monedas mo USING(id_moneda)
   WHERE pr.id_lote=l.id_lote AND pr.activo AND mo.activo AND mo.codigo='PEN'
     AND pr.fecha_desde<=now() AND (pr.fecha_hasta IS NULL OR pr.fecha_hasta>now())
   ORDER BY pr.fecha_desde DESC,pr.id_lote_precio DESC LIMIT 1
 ) precio ON true
 LEFT JOIN public.inm_tarifas_zona_etapa t ON t.id_tarifa=precio.id_tarifa AND t.id_proyecto=l.id_proyecto
 LEFT JOIN public.inm_etapas_comerciales ec ON ec.id_etapa_comercial=t.id_etapa_comercial AND ec.id_proyecto=l.id_proyecto
 LEFT JOIN LATERAL (
   SELECT r.id_reserva,r.politica_comercial_snapshot FROM public.ven_reservas r
   JOIN public.cfg_estados_reserva er USING(id_estado_reserva)
   WHERE r.id_lote=l.id_lote AND r.id_persona=v_persona AND er.codigo IN ('PENDIENTE','VIGENTE') AND r.fecha_vencimiento>now()
   ORDER BY r.fecha_reserva DESC,r.id_reserva DESC LIMIT 1
 ) rv ON true
 WHERE l.id_proyecto=p_proyecto AND l.activo AND el.activo AND m.activo AND ef.activo
   AND ((el.codigo='DISPONIBLE' AND precio.precio>0 AND (v_version IS NULL OR
     (pl.situacion='HABILITADA' AND pl.id_lote_precio=precio.id_lote_precio AND pl.precio_final=precio.precio
     AND (pl.vigente_hasta IS NULL OR pl.vigente_hasta >= (now() AT TIME ZONE 'America/Lima')::date))))
     OR (coalesce(p_incluir_reservas,false) AND el.codigo='RESERVADO' AND rv.id_reserva IS NOT NULL))
 ), agrupados AS (
 SELECT coalesce(codigo_etapa,CASE WHEN fuente='PUBLICADA' THEN '__RESERVA_HISTORICA__' ELSE '__SIN_ETAPA__' END) codigo,
   coalesce(
      (SELECT e->>'nombre' FROM public.inm_configuracion_comercial_borradores b
       CROSS JOIN LATERAL jsonb_array_elements(coalesce(b.configuracion->'etapas','[]'::jsonb)) e
       WHERE b.id_proyecto=p_proyecto AND b.version=v_version AND e->>'codigo'=i.codigo_etapa LIMIT 1),
      (SELECT ec.nombre FROM public.inm_etapas_comerciales ec WHERE ec.id_proyecto=p_proyecto AND ec.codigo=i.codigo_etapa LIMIT 1),
      codigo_etapa,
      CASE WHEN fuente='PUBLICADA' THEN 'Reserva histórica sin etapa registrada' ELSE 'Sin etapa comercial asignada (precio vigente)' END
   ) nombre,
   jsonb_agg(id_lote ORDER BY id_lote) ids
 FROM inventario i GROUP BY codigo_etapa,fuente
 )
 SELECT coalesce(jsonb_agg(jsonb_build_object('codigo',codigo,'nombre',nombre,'idLotes',ids) ORDER BY nombre,codigo),'[]'::jsonb)
 INTO v_resultado FROM agrupados;
 RETURN v_resultado;
END;
$function$;
CREATE OR REPLACE FUNCTION public.sp_crm_validar_formalizacion_v6(p_actor bigint, p_prospecto bigint, p_lote bigint, p_modalidad character varying, p_monto_total numeric, p_monto_inicial numeric, p_numero_cuotas integer)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'pg_temp'
AS $function$
DECLARE
    v_persona BIGINT;
    v_codigo_prospecto VARCHAR;
    v_estado VARCHAR;
    v_asesor BIGINT;
    v_proyecto BIGINT;
    v_codigo_lote VARCHAR;
    v_estado_lote VARCHAR;
    v_precio NUMERIC;
    v_id_moneda INTEGER;
    v_reserva_persona BIGINT;
    v_monto_reserva NUMERIC;
BEGIN
    -- 1. Validar permiso para registrar ventas.
    IF p_actor IS NULL OR p_actor <= 0
       OR NOT COALESCE(
           public.fn_usuario_tiene_permiso_seguridad(
               p_actor, 'sales.create'
           ), FALSE
       )
    THEN
        RAISE EXCEPTION
            'DENEGADO|Se requiere sales.create.';
    END IF;

    -- 2. Validar datos comerciales recibidos.
    IF p_prospecto IS NULL OR p_prospecto <= 0
       OR p_lote IS NULL OR p_lote <= 0
       OR p_modalidad IS NULL
       OR p_modalidad NOT IN ('CONTADO','FINANCIADA')
       OR p_monto_total IS NULL
       OR p_monto_total <= 0
       OR p_monto_total <> ROUND(p_monto_total, 2)
    THEN
        RAISE EXCEPTION
            'DATOS_INVALIDOS|Prospecto, lote, modalidad o monto invalido.';
    END IF;

    -- 3. NUEVO CANDADO DE SEGURIDAD.
    -- Un asesor solo puede formalizar ventas
    -- de prospectos de su cartera vigente.
    -- Gerencia conserva su alcance global.
    IF NOT COALESCE(
        public.fn_crm_puede_consultar_prospecto(
            p_actor,
            p_prospecto
        ), FALSE
    )
    THEN
        RAISE EXCEPTION
            'DENEGADO|No tiene autorizacion comercial sobre este prospecto.';
    END IF;

    -- Si hay una reserva abierta, solo puede formalizar sus lotes actuales.
    IF EXISTS(SELECT 1 FROM public.ven_reservas r JOIN public.crm_prospectos p ON p.id_persona=r.id_persona
        JOIN public.cfg_estados_reserva e USING(id_estado_reserva)
        WHERE p.id_prospecto=p_prospecto AND p.activo AND e.codigo IN ('PENDIENTE','VIGENTE') AND r.fecha_vencimiento>now())
       AND NOT EXISTS(SELECT 1 FROM public.ven_reservas r JOIN public.crm_prospectos p ON p.id_persona=r.id_persona
        JOIN public.cfg_estados_reserva e USING(id_estado_reserva)
        WHERE p.id_prospecto=p_prospecto AND p.activo AND r.id_lote=p_lote AND e.codigo IN ('PENDIENTE','VIGENTE') AND r.fecha_vencimiento>now())
    THEN RAISE EXCEPTION 'OPERACION_INVALIDA|Solicite el cambio de reserva y espere la aprobación de Gerencia o Supervisor comercial.'; END IF;
    IF EXISTS(SELECT 1 FROM public.ven_reservas r JOIN public.crm_prospectos p ON p.id_persona=r.id_persona
        JOIN public.cfg_estados_reserva e USING(id_estado_reserva)
        WHERE p.id_prospecto=p_prospecto AND p.activo AND r.id_lote=p_lote AND e.codigo='PENDIENTE' AND r.fecha_vencimiento>now())
    THEN RAISE EXCEPTION 'RESERVA_PENDIENTE|Finanzas debe aprobar la separación antes de formalizar.'; END IF;
    IF EXISTS(SELECT 1 FROM public.crm_solicitudes_cambio_reserva_v1 c WHERE c.id_prospecto=p_prospecto AND c.id_lote_anterior=p_lote AND c.estado='PENDIENTE')
    THEN RAISE EXCEPTION 'OPERACION_INVALIDA|Existe una solicitud de cambio de este lote pendiente de resolución.'; END IF;

    -- 4. Validar modalidad y condiciones de pago.
    IF p_modalidad = 'FINANCIADA' THEN

        IF p_monto_inicial IS NULL
           OR p_monto_inicial <= 0
           OR p_monto_inicial >= p_monto_total
           OR p_monto_inicial <> ROUND(p_monto_inicial, 2)
           OR p_numero_cuotas IS NULL
           OR p_numero_cuotas NOT BETWEEN 1 AND 36
        THEN
            RAISE EXCEPTION
                'DATOS_INVALIDOS|Condiciones de financiamiento invalidas.';
        END IF;

    ELSIF COALESCE(p_monto_inicial, 0) <> 0
       OR p_numero_cuotas IS NOT NULL
    THEN
        RAISE EXCEPTION
            'DATOS_INVALIDOS|La venta al contado no debe incluir cuotas ni inicial.';
    END IF;

    -- 5. Validar prospecto y estado comercial.
    SELECT
        p.id_persona,
        p.codigo,
        e.codigo
    INTO
        v_persona,
        v_codigo_prospecto,
        v_estado

    FROM public.crm_prospectos p

    JOIN public.core_personas per
        ON per.id_persona = p.id_persona
       AND per.activo

    JOIN public.cfg_estados_prospecto e
        ON e.id_estado_prospecto = p.id_estado_prospecto

    WHERE p.id_prospecto = p_prospecto
      AND p.activo;

    IF NOT FOUND
       OR v_estado NOT IN ('INTERESADO','NEGOCIACION','CON_RESERVA','CONVERTIDO')
    THEN
        RAISE EXCEPTION
            'PROSPECTO_NO_ELEGIBLE|Se requiere un potencial activo.';
    END IF;

    -- 6. Una persona CONVERTIDA puede volver a comprar, pero solo si existe contrato formalizado. 
    --    Conserva el cliente y su identidad; no habilita un prospecto convertido por error.
    IF v_estado='CONVERTIDO' AND NOT EXISTS (
        SELECT 1
        FROM public.crm_clientes c

        JOIN public.ven_ventas_clientes vc
            ON vc.id_cliente = c.id_cliente

        JOIN public.ven_ventas v
            ON v.id_venta = vc.id_venta

        JOIN public.cfg_estados_venta ev
            ON ev.id_estado_venta = v.id_estado_venta

        JOIN public.ven_contratos ct
            ON ct.id_venta = v.id_venta

        JOIN public.cfg_estados_contrato ec
            ON ec.id_estado_contrato =
               ct.id_estado_contrato

        WHERE c.id_persona = v_persona
          AND c.activo

          AND ev.codigo IN (
              'CONFIRMADA',
              'CONTRATADA',
              'COMPLETADA'
          )

          AND ec.codigo IN (
              'VIGENTE',
              'FINALIZADO'
          )
    )
    THEN
        RAISE EXCEPTION
            'PROSPECTO_NO_ELEGIBLE|El comprador convertido no tiene una venta formalizada verificable.';
    END IF;

    -- 7. Obtener asesor comercial activo.
    SELECT a.id_asesor
    INTO v_asesor

    FROM public.com_asignaciones_prospecto a

    JOIN public.com_asesores ca
        ON ca.id_asesor = a.id_asesor

    JOIN public.cfg_estados_asesor ea
        ON ea.id_estado_asesor = ca.id_estado_asesor

    WHERE a.id_prospecto = p_prospecto
      AND a.fecha_fin IS NULL
      AND ea.codigo = 'ACTIVO'
      AND ca.fecha_inicio <= CURRENT_DATE
      AND (
          ca.fecha_fin IS NULL
          OR ca.fecha_fin >= CURRENT_DATE
      )

    ORDER BY
        a.fecha_asignacion DESC,
        a.id_asignacion_prospecto DESC

    LIMIT 1;

    IF v_asesor IS NULL THEN
        RAISE EXCEPTION
            'ASESOR_INVALIDO|Se requiere un asesor comercial activo asignado.';
    END IF;

    -- 8. Validar disponibilidad del lote.
    SELECT
        l.id_proyecto,
        l.codigo,
        el.codigo
    INTO
        v_proyecto,
        v_codigo_lote,
        v_estado_lote

    FROM public.inm_lotes l

    JOIN public.cfg_estados_lote el
        ON el.id_estado_lote = l.id_estado_lote

    WHERE l.id_lote = p_lote
      AND l.activo;

    IF NOT FOUND
       OR v_estado_lote NOT IN ('DISPONIBLE','RESERVADO')
    THEN
        RAISE EXCEPTION
            'LOTE_NO_DISPONIBLE|El lote no esta disponible para formalizar.';
    END IF;

    -- 9. Comprobar proyecto de interes.
    IF NOT EXISTS (
        SELECT 1
        FROM public.crm_prospectos_intereses i
        WHERE i.id_prospecto = p_prospecto
          AND i.id_proyecto = v_proyecto
          AND i.activo
    )
    AND v_estado <> 'CONVERTIDO'
    THEN
        RAISE EXCEPTION
            'PROYECTO_INVALIDO|El lote no pertenece al proyecto de interes.';
    END IF;

    -- 10. Comprobar ventas anteriores del lote.
    IF EXISTS (
        SELECT 1
        FROM public.ven_ventas v

        JOIN public.cfg_estados_venta ev
            ON ev.id_estado_venta = v.id_estado_venta

        WHERE v.id_lote = p_lote
          AND ev.codigo <> 'ANULADA'
    )
    THEN
        RAISE EXCEPTION
            'VENTA_EXISTENTE|El lote ya tiene una venta no anulada.';
    END IF;

    -- 11. Verificar reserva vigente.
    SELECT r.id_persona, r.monto_reserva
    INTO v_reserva_persona,v_monto_reserva

    FROM public.ven_reservas r

    JOIN public.cfg_estados_reserva er
        ON er.id_estado_reserva = r.id_estado_reserva

    WHERE r.id_lote = p_lote
      AND er.codigo = 'VIGENTE'
      AND r.fecha_vencimiento > NOW()

    ORDER BY r.fecha_reserva DESC

    LIMIT 1;

    IF v_estado_lote = 'RESERVADO' THEN

        IF v_reserva_persona IS NULL
           OR v_reserva_persona <> v_persona
        THEN
            RAISE EXCEPTION
                'RESERVA_INVALIDA|Se requiere reserva vigente del mismo comprador.';
        END IF;

        -- La separacion acreditada se descuenta de la inicial, no del capital.
        IF p_modalidad='FINANCIADA' AND p_monto_inicial<v_monto_reserva THEN
            RAISE EXCEPTION
                'INICIAL_INVALIDA|La inicial debe ser al menos el monto de separacion.';
        END IF;

    ELSIF v_reserva_persona IS NOT NULL THEN

        RAISE EXCEPTION
            'RESERVA_INVALIDA|El lote tiene una reserva vigente inconsistente.';
    END IF;

    -- 12. Obtener moneda.
    SELECT m.id_moneda
    INTO v_id_moneda
    FROM public.cfg_monedas m
    WHERE m.codigo = 'PEN'
      AND m.activo
    LIMIT 1;

    IF v_id_moneda IS NULL THEN
        RAISE EXCEPTION
            'CONFIGURACION_INVALIDA|Moneda PEN no configurada.';
    END IF;

    -- 13. Validar precio vigente.
    SELECT lp.precio
    INTO v_precio

    FROM public.inm_lotes_precios lp

    WHERE lp.id_lote = p_lote
      AND lp.activo
      AND lp.id_moneda = v_id_moneda
      AND lp.fecha_desde <= NOW()
      AND (
          lp.fecha_hasta IS NULL
          OR lp.fecha_hasta > NOW()
      )

    ORDER BY
        lp.fecha_desde DESC,
        lp.id_lote_precio DESC

    LIMIT 1;

    IF v_precio IS NULL OR v_precio <= 0 THEN
        RAISE EXCEPTION
            'PRECIO_NO_DISPONIBLE|El lote no tiene un precio vigente en PEN.';
    END IF;

    IF ROUND(v_precio, 2) <> p_monto_total THEN
        RAISE EXCEPTION
            'PRECIO_NO_COINCIDE|El monto debe coincidir con el precio vigente.';
    END IF;

    -- 14. Conservar contrato de respuesta JSON.
    RETURN JSONB_BUILD_OBJECT(
        'elegible', TRUE,
        'idProspecto', p_prospecto,
        'codigoProspecto', v_codigo_prospecto,
        'idPersona', v_persona,
        'idAsesor', v_asesor,
        'idLote', p_lote,
        'codigoLote', v_codigo_lote,
        'idProyecto', v_proyecto,
        'modalidad', p_modalidad,
        'precioVigente', ROUND(v_precio, 2),
        'idMoneda', v_id_moneda,
        'mensaje',
            'Validacion comercial preliminar satisfactoria.'
    );
END;
$function$;
CREATE OR REPLACE FUNCTION public.sp_crm_listar_operaciones_v1(p_actor bigint, p_tipo text, p_busqueda text, p_pagina integer, p_tamano integer)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO 'pg_catalog', 'public', 'pg_temp'
AS $function$
DECLARE v_resultado jsonb;
BEGIN
 IF p_actor IS NULL OR p_actor <= 0
 OR NOT COALESCE(public.fn_usuario_tiene_permiso_seguridad(p_actor, 'sales.view'::varchar),FALSE)
 THEN RAISE EXCEPTION 'DENEGADO|No autorizado para consultar operaciones comerciales.'; END IF;
 p_tipo := UPPER(BTRIM(COALESCE(p_tipo,'')));
 p_busqueda := LOWER(BTRIM(COALESCE(p_busqueda,'')));
 IF p_tipo NOT IN ('','VENTA','SEPARACION') THEN
  RAISE EXCEPTION 'DATOS_INVALIDOS|Tipo de operacion invalido.'; END IF;
 IF CHAR_LENGTH(p_busqueda)>120
 OR p_pagina IS NULL OR p_pagina<1 OR p_pagina>100000
 OR p_tamano IS NULL OR p_tamano<1 OR p_tamano>100 THEN
  RAISE EXCEPTION 'DATOS_INVALIDOS|Filtros de operaciones invalidos.'; END IF;
 WITH contexto AS (
                    SELECT p_actor AS actor,
                           p_tipo AS tipo,
                           p_busqueda AS busqueda
                ), autorizacion AS (
                    SELECT c.*,
                           EXISTS (
                               SELECT 1 FROM public.seg_usuarios_roles ur
                               JOIN public.seg_roles rol ON rol.id_rol=ur.id_rol
                               WHERE ur.id_usuario=c.actor AND ur.activo
                                 AND ur.fecha_revocacion IS NULL AND rol.activo
                                 AND rol.codigo IN ('ADMINISTRADOR','GERENCIA','SUPERVISOR_COMERCIAL','FINANZAS')
                           ) AS acceso_global
                    FROM contexto c
                ), operaciones AS (
                    SELECT v.id_venta AS id, 'VENTA'::text AS tipo,
                           v.codigo::text AS codigo, l.id_lote AS id_lote,
                           l.codigo::text AS lote, proyecto.nombre::text AS proyecto,
                           concat_ws(' ',per.nombres,per.apellido_paterno,
                                     per.apellido_materno)::text AS comprador,
                           doc.numero_documento::text AS documento,
                           modalidad.codigo::text AS modalidad,
                           v.precio_venta AS monto,
                           estado.codigo::text AS estado,
                           v.fecha_venta AS fecha,
                           NULL::timestamptz AS fecha_vencimiento,
                           contrato.codigo::text AS contrato,
                           estado_contrato.codigo::text AS estado_contrato,
                           NULLIF(concat_ws(' ',ad.nombres,ad.apellido_paterno,
                                          ad.apellido_materno),'')::text AS asesor,
                           NULL::text AS metodo_pago
                    FROM public.ven_ventas v
                    JOIN public.inm_lotes l ON l.id_lote=v.id_lote
                    JOIN public.inm_proyectos proyecto ON proyecto.id_proyecto=l.id_proyecto
                    JOIN public.cfg_modalidades_venta modalidad
                      ON modalidad.id_modalidad_venta=v.id_modalidad_venta
                    JOIN public.cfg_estados_venta estado
                      ON estado.id_estado_venta=v.id_estado_venta
                    LEFT JOIN public.ven_ventas_clientes vc
                      ON vc.id_venta=v.id_venta AND vc.titular
                    LEFT JOIN public.crm_clientes cl ON cl.id_cliente=vc.id_cliente
                    LEFT JOIN public.core_personas per ON per.id_persona=cl.id_persona
                    LEFT JOIN LATERAL (
                        SELECT d.numero_documento
                        FROM public.core_personas_documentos d
                        WHERE d.id_persona=per.id_persona AND d.principal AND d.activo
                        ORDER BY d.id_persona_documento DESC LIMIT 1
                    ) doc ON true
                    LEFT JOIN LATERAL (
                        SELECT c.codigo,c.id_estado_contrato
                        FROM public.ven_contratos c WHERE c.id_venta=v.id_venta
                        ORDER BY c.id_contrato DESC LIMIT 1
                    ) contrato ON true
                    LEFT JOIN public.cfg_estados_contrato estado_contrato
                      ON estado_contrato.id_estado_contrato=contrato.id_estado_contrato
                    LEFT JOIN LATERAL (
                        SELECT va.id_asesor
                        FROM public.com_ventas_asesores va
                        WHERE va.id_venta=v.id_venta
                        ORDER BY va.es_principal DESC,va.id_venta_asesor LIMIT 1
                    ) va ON true
                    LEFT JOIN public.com_asesores asesor ON asesor.id_asesor=va.id_asesor
                    LEFT JOIN public.core_personas ad ON ad.id_persona=asesor.id_persona
                    CROSS JOIN autorizacion a
                    WHERE public.fn_usuario_tiene_permiso_seguridad(
                        a.actor, 'sales.view'::varchar)
                      AND (a.acceso_global OR v.id_usuario_registro=a.actor
                           OR EXISTS (
                              SELECT 1 FROM public.com_ventas_asesores x
                              JOIN public.com_asesores ca ON ca.id_asesor=x.id_asesor
                              JOIN public.seg_usuarios u ON u.id_persona=ca.id_persona
                              WHERE x.id_venta=v.id_venta AND u.id_usuario=a.actor
                           ))
                    UNION ALL
                    SELECT r.id_reserva, 'SEPARACION'::text, r.codigo::text,
                           l.id_lote, l.codigo::text, proyecto.nombre::text,
                           concat_ws(' ',per.nombres,per.apellido_paterno,
                                     per.apellido_materno)::text,
                           doc.numero_documento::text,
                           COALESCE(
                               (SELECT mv.codigo::text
                                FROM public.ven_ventas vv
                                JOIN public.cfg_modalidades_venta mv
                                  ON mv.id_modalidad_venta=vv.id_modalidad_venta
                                WHERE vv.id_reserva=r.id_reserva
                                ORDER BY vv.fecha_venta DESC, vv.id_venta DESC
                                LIMIT 1),
                               r.modalidad_prevista::text
                           ) AS modalidad, r.monto_reserva, estado.codigo::text,
                           r.fecha_reserva, r.fecha_vencimiento,
                           NULL::text, NULL::text,
                           (
                               SELECT NULLIF(concat_ws(' ', ap.nombres, ap.apellido_paterno,
                                                      ap.apellido_materno), '')::text
                               FROM public.crm_prospectos pro
                               JOIN public.crm_prospectos_intereses pi
                                 ON pi.id_prospecto=pro.id_prospecto
                                AND pi.id_proyecto=l.id_proyecto
                               JOIN public.com_asignaciones_prospecto asep
                                 ON asep.id_prospecto=pro.id_prospecto
                               JOIN public.com_asesores ca
                                 ON ca.id_asesor=asep.id_asesor
                               JOIN public.core_personas ap
                                 ON ap.id_persona=ca.id_persona
                               WHERE pro.id_persona=r.id_persona
                                 AND asep.fecha_asignacion<=r.fecha_reserva
                                 AND (asep.fecha_fin IS NULL OR asep.fecha_fin>r.fecha_reserva)
                               ORDER BY asep.fecha_asignacion DESC, asep.id_asignacion_prospecto DESC
                               LIMIT 1
                           )::text AS asesor,
                           public.fn_crm_metodo_pago_reserva_v2(a.actor,r.id_reserva) AS metodo_pago
                    FROM public.ven_reservas r
                    JOIN public.inm_lotes l ON l.id_lote=r.id_lote
                    JOIN public.inm_proyectos proyecto ON proyecto.id_proyecto=l.id_proyecto
                    JOIN public.core_personas per ON per.id_persona=r.id_persona
                    JOIN public.cfg_estados_reserva estado
                      ON estado.id_estado_reserva=r.id_estado_reserva
                    LEFT JOIN LATERAL (
                        SELECT d.numero_documento
                        FROM public.core_personas_documentos d
                        WHERE d.id_persona=per.id_persona AND d.principal AND d.activo
                        ORDER BY d.id_persona_documento DESC LIMIT 1
                    ) doc ON true
                    CROSS JOIN autorizacion a
                    WHERE public.fn_usuario_tiene_permiso_seguridad(
                        a.actor, 'sales.view'::varchar)
                      AND (a.acceso_global
                           OR EXISTS (
                               SELECT 1 FROM public.crm_prospectos p
                               JOIN public.crm_prospectos_intereses i
                                 ON i.id_prospecto=p.id_prospecto
                                AND i.id_proyecto=l.id_proyecto AND i.activo
                               WHERE p.id_persona=r.id_persona
                                 AND public.fn_crm_puede_consultar_prospecto(
                                     a.actor,p.id_prospecto)
                           ))
                      
                ), con_grupo AS (
 SELECT op.*, CASE WHEN op.tipo='SEPARACION' THEN public.fn_crm_grupo_operacion_sep_v1(a.actor,op.id) END AS grupo
 FROM operaciones op CROSS JOIN autorizacion a
 ), grupos AS (
 SELECT grupo->>'idGrupo' AS id_grupo,min(id) AS representante,
 string_agg(lote, ', ' ORDER BY id) AS lotes,
 string_agg(DISTINCT proyecto, ' / ' ORDER BY proyecto) AS proyectos,
 string_agg(codigo, ', ' ORDER BY id) AS codigos,
 sum(monto) AS monto_total,min(fecha_vencimiento) FILTER(WHERE estado IN ('PENDIENTE','VIGENTE')) AS vencimiento_abierto,
 string_agg(DISTINCT metodo_pago,' / ' ORDER BY metodo_pago) AS metodos,
 CASE WHEN bool_or(grupo->>'estado'='REQUIERE_REVISION') AND bool_or(estado IN ('PENDIENTE','VIGENTE')) THEN 'REQUIERE_REVISION'
 WHEN count(DISTINCT estado)=1 THEN min(estado) ELSE 'ESTADOS_MIXTOS' END AS estado_grupo,
 jsonb_agg(jsonb_build_object('idReserva',id,'codigo',codigo,'lote',lote,'proyecto',proyecto,'monto',monto,'estado',estado,'fechaVencimiento',fecha_vencimiento) ORDER BY id) AS integrantes
 FROM con_grupo WHERE grupo IS NOT NULL GROUP BY grupo->>'idGrupo'
 ), agrupadas AS (
 SELECT op.id,op.fecha,op.tipo,op.codigo,coalesce(g.lotes,op.lote) AS lote,coalesce(g.proyectos,op.proyecto) AS proyecto,op.comprador,g.codigos,
 (to_jsonb(op)-'grupo') || CASE WHEN g.id_grupo IS NULL THEN '{}'::jsonb ELSE
 jsonb_build_object('id_grupo',g.id_grupo,'lotes_grupo',g.integrantes,'lote',g.lotes,'proyecto',g.proyectos,'monto',g.monto_total,
 'metodo_pago',g.metodos,'estado',g.estado_grupo,'fecha_vencimiento',g.vencimiento_abierto) END AS item
 FROM con_grupo op LEFT JOIN grupos g ON g.id_grupo=op.grupo->>'idGrupo'
 WHERE g.id_grupo IS NULL OR op.id=g.representante
 ), filtradas AS (
 SELECT op.* FROM agrupadas op CROSS JOIN autorizacion a
 WHERE (a.tipo='' OR op.tipo=a.tipo) AND (a.busqueda='' OR lower(op.codigo) LIKE '%'||a.busqueda||'%'
 OR lower(op.lote) LIKE '%'||a.busqueda||'%' OR lower(op.proyecto) LIKE '%'||a.busqueda||'%'
 OR lower(op.comprador) LIKE '%'||a.busqueda||'%' OR lower(coalesce(op.codigos,'')) LIKE '%'||a.busqueda||'%')
 )
 SELECT jsonb_build_object('items',coalesce((SELECT jsonb_agg(f.item ORDER BY f.fecha DESC,f.id DESC)
 FROM (SELECT * FROM filtradas ORDER BY fecha DESC,id DESC LIMIT p_tamano OFFSET ((p_pagina-1)*p_tamano)) f),'[]'::jsonb),
 'total',(SELECT count(*) FROM filtradas),'pagina',p_pagina,'tamano',p_tamano,
 'paginas',ceil((SELECT count(*) FROM filtradas)::numeric/p_tamano)::integer) INTO v_resultado;
 RETURN v_resultado;
END;
$function$;
CREATE OR REPLACE FUNCTION public.sp_crm_avisos_comerciales_v1(p_actor bigint)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'pg_temp'
AS $function$
BEGIN
 IF NOT coalesce(public.fn_usuario_tiene_permiso_seguridad(p_actor,'sales.view'::varchar),false) THEN
 RAISE EXCEPTION 'DENEGADO|Se requiere sales.view.'; END IF;
 RETURN jsonb_build_object('items',coalesce((SELECT jsonb_agg(to_jsonb(x) ORDER BY x.fecha DESC) FROM (
 SELECT 'reserva:'||n.id_notificacion id,n.titulo,n.mensaje,n.fecha_generacion fecha,n.url_destino ruta
 FROM public.not_notificaciones n JOIN public.cfg_tipos_notificacion t USING(id_tipo_notificacion)
 JOIN public.seg_usuarios u ON u.id_persona=n.id_persona
 JOIN public.cfg_estados_usuario e ON e.id_estado_usuario=u.id_estado_usuario
 WHERE u.id_usuario=p_actor AND e.codigo='ACTIVO' AND n.activo AND n.referencia_modulo='CRM' AND ((t.codigo='RESERVA_VENCIDA' AND n.referencia_entidad='RESERVA') OR (t.codigo='GENERAL' AND n.referencia_entidad='CAMBIO_RESERVA'))
 AND (n.fecha_expiracion IS NULL OR n.fecha_expiracion>now()) ORDER BY n.fecha_generacion DESC,n.id_notificacion DESC LIMIT 100
 ) x),'[]'::jsonb));
END; $function$;
COMMIT;
