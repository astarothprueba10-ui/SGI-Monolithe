-- 152: Cambio explícito de interés de un potencial desde separaciones/ventas.
-- Conserva la fila anterior inactiva, registra seguimiento CRM y auditoría en la misma transacción.
BEGIN;
CREATE FUNCTION public.sp_crm_cambiar_interes_operacion_v1(
 p_actor bigint,p_prospecto bigint,p_anterior bigint,p_nuevo bigint,p_motivo text)
RETURNS jsonb LANGUAGE plpgsql VOLATILE SECURITY DEFINER
SET search_path TO 'pg_catalog','public','pg_temp'
AS $$
DECLARE v_persona bigint; v_estado text; v_anterior text; v_nuevo text;
 v_id bigint; v_seguimiento bigint; v_auditoria bigint; v_tipo integer;
 v_actor_nombre text; v_ids jsonb;
BEGIN
 IF NOT coalesce(public.fn_usuario_tiene_permiso_seguridad(p_actor,'sales.create'::varchar),false)
 OR NOT coalesce(public.fn_usuario_tiene_permiso_seguridad(p_actor,'crm.view'::varchar),false)
 OR NOT coalesce(public.fn_usuario_tiene_permiso_seguridad(p_actor,'crm.edit'::varchar),false)
 OR NOT coalesce(public.fn_crm_puede_consultar_prospecto(p_actor,p_prospecto),false)
 THEN RAISE EXCEPTION 'DENEGADO|No puede cambiar el interés de este cliente.'; END IF;
 IF p_anterior IS NULL OR p_nuevo IS NULL OR p_anterior<=0 OR p_nuevo<=0 OR p_anterior=p_nuevo
 OR p_motivo IS NULL OR length(btrim(p_motivo)) NOT BETWEEN 5 AND 500
 THEN RAISE EXCEPTION 'DATOS_INVALIDOS|Proyectos o motivo inválidos.'; END IF;
 SELECT p.id_persona,e.codigo INTO v_persona,v_estado
 FROM public.crm_prospectos p JOIN public.cfg_estados_prospecto e USING(id_estado_prospecto)
 JOIN public.core_personas pe USING(id_persona)
 WHERE p.id_prospecto=p_prospecto AND p.activo AND pe.activo FOR UPDATE OF p;
 IF NOT FOUND THEN RAISE EXCEPTION 'PROSPECTO_NO_EXISTE|Cliente no encontrado.'; END IF;
 IF v_estado NOT IN ('INTERESADO','NEGOCIACION','CON_RESERVA')
 THEN RAISE EXCEPTION 'PROSPECTO_NO_ELEGIBLE|Solo se cambia el interés de un cliente potencial.'; END IF;
 -- El mismo bloqueo de prospecto serializa el cambio con las escrituras CRM.
 IF EXISTS(SELECT 1 FROM public.ven_reservas r JOIN public.cfg_estados_reserva er USING(id_estado_reserva)
 JOIN public.inm_lotes l USING(id_lote)
 WHERE r.id_persona=v_persona AND l.id_proyecto=p_anterior AND er.codigo IN ('PENDIENTE','VIGENTE'))
 OR EXISTS(SELECT 1 FROM public.crm_clientes c JOIN public.ven_ventas_clientes vc USING(id_cliente)
 JOIN public.ven_ventas v USING(id_venta) JOIN public.cfg_estados_venta ev USING(id_estado_venta)
 JOIN public.inm_lotes l USING(id_lote)
 WHERE c.id_persona=v_persona AND l.id_proyecto=p_anterior AND ev.codigo IN ('PENDIENTE','CONFIRMADA','CONTRATADA','COMPLETADA'))
 THEN RAISE EXCEPTION 'INTERES_COMPROMETIDO|Existe una operación que debe gestionarse por separado.'; END IF;
 SELECT nombre INTO v_anterior FROM public.inm_proyectos WHERE id_proyecto=p_anterior;
 SELECT nombre INTO v_nuevo FROM public.inm_proyectos WHERE id_proyecto=p_nuevo AND activo;
 IF v_anterior IS NULL OR v_nuevo IS NULL THEN RAISE EXCEPTION 'PROYECTO_INVALIDO|Proyecto inválido.'; END IF;
 IF EXISTS(SELECT 1 FROM public.crm_prospectos_intereses WHERE id_prospecto=p_prospecto AND id_proyecto=p_nuevo AND activo)
 THEN RAISE EXCEPTION 'INTERES_CAMBIO|El nuevo interés ya está activo.'; END IF;
 WITH cerrados AS (
 UPDATE public.crm_prospectos_intereses SET activo=false,fecha_actualizacion=now()
 WHERE id_prospecto=p_prospecto AND id_proyecto=p_anterior AND activo
 RETURNING id_prospecto_interes)
 SELECT jsonb_agg(id_prospecto_interes) INTO v_ids FROM cerrados;
 IF v_ids IS NULL THEN RAISE EXCEPTION 'INTERES_CAMBIO|El interés anterior ya no está activo.'; END IF;
 INSERT INTO public.crm_prospectos_intereses(id_prospecto,id_proyecto,comentario,activo)
 VALUES(p_prospecto,p_nuevo,btrim(p_motivo),true) RETURNING id_prospecto_interes INTO v_id;
 SELECT id_tipo_seguimiento INTO STRICT v_tipo FROM public.cfg_tipos_seguimiento WHERE codigo='OTRO' AND activo;
 SELECT concat_ws(' ',pe.nombres,pe.apellido_paterno,pe.apellido_materno) INTO v_actor_nombre
 FROM public.seg_usuarios u JOIN public.core_personas pe USING(id_persona) WHERE u.id_usuario=p_actor;
 INSERT INTO public.crm_seguimientos(id_prospecto,id_tipo_seguimiento,asunto,detalle,resultado,requiere_seguimiento,id_usuario_registro)
 VALUES(p_prospecto,v_tipo,'Cambio de proyecto de interés',
 'Proyecto anterior: '||v_anterior||' | Nuevo proyecto: '||v_nuevo||' | Motivo: '||btrim(p_motivo)||
 ' | Responsable: '||coalesce(nullif(btrim(v_actor_nombre),''),'Usuario #'||p_actor::text)||
 ' | Origen: Separaciones y ventas','Interés actualizado',false,p_actor)
 RETURNING id_seguimiento INTO v_seguimiento;
 UPDATE public.crm_prospectos SET fecha_actualizacion=now() WHERE id_prospecto=p_prospecto;
 SELECT public.sp_registrar_auditoria(p_actor,'CRM'::varchar,'CAMBIO_INTERES'::varchar,
 'PROSPECTO_INTERES'::varchar,v_id::varchar,'EXITOSO'::varchar,'Cambio de proyecto desde Separaciones y ventas'::varchar,
 jsonb_build_object('idProspecto',p_prospecto,'idProyectoAnterior',p_anterior,'idProyectoNuevo',p_nuevo,
 'interesesAnteriores',v_ids,'idInteresNuevo',v_id,'idSeguimiento',v_seguimiento,'motivo',btrim(p_motivo))) INTO v_auditoria;
 IF v_auditoria IS NULL THEN RAISE EXCEPTION 'AUDITORIA_FALLIDA|No se registró la auditoría.'; END IF;
 RETURN jsonb_build_object('idInteres',v_id,'idSeguimiento',v_seguimiento);
END;
$$;
REVOKE ALL ON FUNCTION public.sp_crm_cambiar_interes_operacion_v1(bigint,bigint,bigint,bigint,text) FROM PUBLIC,anon,authenticated,service_role,sigi_app_user;
GRANT EXECUTE ON FUNCTION public.sp_crm_cambiar_interes_operacion_v1(bigint,bigint,bigint,bigint,text) TO sigi_app_user;
COMMIT;
