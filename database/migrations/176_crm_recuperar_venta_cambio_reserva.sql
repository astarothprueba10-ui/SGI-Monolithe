BEGIN;
ALTER TABLE public.crm_solicitudes_cambio_reserva_v1 ADD COLUMN IF NOT EXISTS preparacion_venta jsonb;
-- Solo preferencias de preparación: no precios, créditos, documentos ni números de operación.
CREATE FUNCTION public.sp_crm_solicitar_cambio_reserva_v2(p_actor bigint,p_prospecto bigint,p_reserva bigint,p_lote bigint,p_motivo text,p_preparacion jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'pg_catalog','public','pg_temp' AS $fn$
DECLARE v_resultado jsonb; v_fila jsonb;
BEGIN
 IF p_preparacion IS NOT NULL AND p_preparacion<>'null'::jsonb THEN
  IF jsonb_typeof(p_preparacion)<>'object' OR length(p_preparacion::text)>16000
   OR p_preparacion - ARRAY['lotes','observaciones'] <> '{}'::jsonb
   OR jsonb_typeof(p_preparacion->'lotes') IS DISTINCT FROM 'array'
   OR length(coalesce(p_preparacion->>'observaciones',''))>500
  THEN RAISE EXCEPTION 'DATOS_INVALIDOS|Preparación de venta inválida.'; END IF;
  IF jsonb_array_length(p_preparacion->'lotes')>20 THEN RAISE EXCEPTION 'DATOS_INVALIDOS|Máximo 20 lotes.'; END IF;
  FOR v_fila IN SELECT value FROM jsonb_array_elements(p_preparacion->'lotes') LOOP
   IF jsonb_typeof(v_fila)<>'object' OR v_fila - ARRAY['idLote','idProyecto','idReserva','incluir','modalidad','inicial','cuotas','metodo'] <> '{}'::jsonb
    OR coalesce(v_fila->>'idLote','') !~ '^[1-9][0-9]{0,14}$'
    OR coalesce(v_fila->>'idProyecto','') !~ '^[1-9][0-9]{0,14}$'
    OR (v_fila->>'idReserva' IS NOT NULL AND v_fila->>'idReserva' !~ '^[1-9][0-9]{0,14}$')
    OR jsonb_typeof(v_fila->'incluir') IS DISTINCT FROM 'boolean'
    OR coalesce(v_fila->>'modalidad','') NOT IN ('CONTADO','FINANCIADA')
    OR coalesce(v_fila->>'metodo','') NOT IN ('TRANSFERENCIA','DEPOSITO','YAPE_PLIN','EFECTIVO','OTRO')
    OR coalesce(v_fila->>'inicial','') !~ '^[0-9]{0,12}([.][0-9]{0,2})?$'
    OR coalesce(v_fila->>'cuotas','') !~ '^[0-9]{0,3}$'
   THEN RAISE EXCEPTION 'DATOS_INVALIDOS|Preferencias de lote inválidas.'; END IF;
  END LOOP;
 END IF;
 v_resultado:=public.sp_crm_solicitar_cambio_reserva_v1(p_actor,p_prospecto,p_reserva,p_lote,p_motivo);
 UPDATE public.crm_solicitudes_cambio_reserva_v1 SET preparacion_venta=nullif(p_preparacion,'null'::jsonb)
 WHERE id_solicitud=(v_resultado->>'idSolicitud')::bigint AND id_solicitante=p_actor;
 RETURN v_resultado;
END $fn$;
CREATE FUNCTION public.sp_crm_listar_cambios_reserva_v2(p_actor bigint,p_prospecto bigint DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'pg_catalog','public','pg_temp' AS $fn$
DECLARE v_lista jsonb;
BEGIN
 v_lista:=public.sp_crm_listar_cambios_reserva_v1(p_actor,p_prospecto);
 RETURN jsonb_build_object('items',coalesce((
 SELECT jsonb_agg(i.value||jsonb_build_object('puedeRecuperar',v.permitido,
   'preparacionVenta',CASE WHEN v.permitido THEN c.preparacion_venta ELSE NULL END) ORDER BY i.ord)
 FROM jsonb_array_elements(v_lista->'items') WITH ORDINALITY i(value,ord)
 JOIN public.crm_solicitudes_cambio_reserva_v1 c ON c.id_solicitud=(i.value->>'idSolicitud')::bigint
 JOIN public.ven_reservas r ON r.id_reserva=c.id_reserva
 JOIN public.cfg_estados_reserva e ON e.id_estado_reserva=r.id_estado_reserva
 CROSS JOIN LATERAL (SELECT coalesce(
   c.estado='APROBADA' AND r.id_lote=c.id_lote_nuevo AND e.codigo IN ('PENDIENTE','VIGENTE') AND r.fecha_vencimiento>now()
   AND public.fn_usuario_tiene_permiso_seguridad(p_actor,'sales.create'::varchar)
   AND public.fn_crm_puede_consultar_prospecto(p_actor,c.id_prospecto)
   AND NOT EXISTS(SELECT 1 FROM public.ven_ventas vv WHERE vv.id_reserva=r.id_reserva)
   AND NOT EXISTS(SELECT 1 FROM public.crm_solicitudes_cambio_reserva_v1 cc WHERE cc.id_prospecto=c.id_prospecto AND cc.estado IN ('PENDIENTE','APLICANDO'))
   AND NOT EXISTS(SELECT 1 FROM public.crm_solicitudes_cambio_reserva_v1 cc WHERE cc.id_reserva=c.id_reserva AND cc.id_solicitud>c.id_solicitud AND cc.estado='APROBADA')
   ,false) permitido) v
 ),'[]'::jsonb));
END $fn$;
REVOKE ALL ON FUNCTION public.sp_crm_solicitar_cambio_reserva_v2(bigint,bigint,bigint,bigint,text,jsonb) FROM PUBLIC,anon,authenticated,service_role;
REVOKE ALL ON FUNCTION public.sp_crm_listar_cambios_reserva_v2(bigint,bigint) FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.sp_crm_solicitar_cambio_reserva_v2(bigint,bigint,bigint,bigint,text,jsonb) TO sigi_app_user,sgi_backend_user;
GRANT EXECUTE ON FUNCTION public.sp_crm_listar_cambios_reserva_v2(bigint,bigint) TO sigi_app_user,sgi_backend_user;
COMMIT;
