-- Formalización de reservas múltiples: una venta y un comprobante por lote.
CREATE OR REPLACE FUNCTION public.sp_crm_registrar_ventas_multiples_v1(p_actor bigint,p_ventas jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'pg_catalog','public','pg_temp'
AS $function$
DECLARE
 v_prospecto bigint; v_persona bigint; v_lote bigint; v_proyecto bigint;
 v_ids bigint[] := '{}'::bigint[]; v_refs text[] := '{}'::text[];
 v_item jsonb; v_validacion jsonb; v_pago jsonb; v_datos jsonb; v_comprador jsonb;
 v_agrupada jsonb; v_operacion bigint; v_resultado jsonb; v_ventas jsonb := '[]'::jsonb;
 v_debe numeric; v_total numeric := 0; v_ref text; v_cantidad integer;
BEGIN
 IF jsonb_typeof(p_ventas) IS DISTINCT FROM 'array' OR jsonb_array_length(p_ventas) NOT BETWEEN 1 AND 20
 THEN RAISE EXCEPTION 'DATOS_INVALIDOS|Incluya entre uno y veinte lotes.'; END IF;
 v_prospecto := (p_ventas->0->>'idProspecto')::bigint;
 IF NOT coalesce(public.fn_usuario_tiene_permiso_seguridad(p_actor,'sales.create'::varchar),false)
 OR NOT coalesce(public.fn_crm_puede_consultar_prospecto(p_actor,v_prospecto),false)
 THEN RAISE EXCEPTION 'DENEGADO|No puede formalizar las reservas de este comprador.'; END IF;
 SELECT id_persona INTO STRICT v_persona FROM public.crm_prospectos WHERE id_prospecto=v_prospecto AND activo;
 v_comprador := p_ventas->0->'datosComprador';
 IF jsonb_typeof(v_comprador) IS DISTINCT FROM 'object' OR v_comprador->'identidadVerificada' IS DISTINCT FROM 'true'::jsonb
 THEN RAISE EXCEPTION 'IDENTIDAD_NO_VERIFICADA|Revise la ficha contractual del comprador.'; END IF;
 FOR v_item IN SELECT value FROM jsonb_array_elements(p_ventas) LOOP
   IF jsonb_typeof(v_item) IS DISTINCT FROM 'object' OR (v_item->>'idProspecto')::bigint IS DISTINCT FROM v_prospecto
      OR coalesce(v_item->>'idLote','') !~ '^[1-9][0-9]{0,17}$'
      OR coalesce(v_item->>'modalidad','') NOT IN ('CONTADO','FINANCIADA')
      OR ((v_item->'datosComprador')-'idProyectoInteres'::text) IS DISTINCT FROM (v_comprador-'idProyectoInteres'::text)
   THEN RAISE EXCEPTION 'DATOS_INVALIDOS|Los lotes deben pertenecer al mismo comprador y ficha contractual.'; END IF;
   v_lote := (v_item->>'idLote')::bigint;
   IF v_lote=ANY(v_ids) THEN RAISE EXCEPTION 'LOTE_DUPLICADO|Un lote no puede formalizarse dos veces.'; END IF;
   v_ids := array_append(v_ids,v_lote);
 END LOOP;
 -- Igual orden de inventario que el cambio de reserva y la separación acumulada.
 PERFORM l.id_lote FROM public.inm_lotes l
 WHERE l.id_lote=ANY(v_ids) OR l.id_lote IN (
   SELECT r2.id_lote FROM public.ven_reservas r2
   JOIN public.ven_separaciones_grupo_lotes_v1 g2 ON g2.id_reserva=r2.id_reserva
   WHERE g2.id_grupo IN (
     SELECT g.id_grupo FROM public.ven_separaciones_grupo_lotes_v1 g
     JOIN public.ven_reservas r ON r.id_reserva=g.id_reserva
     JOIN public.cfg_estados_reserva e ON e.id_estado_reserva=r.id_estado_reserva
     WHERE r.id_lote=ANY(v_ids) AND r.id_persona=v_persona AND e.codigo='VIGENTE'
   )
 ) ORDER BY l.id_lote FOR UPDATE OF l;
 -- Verificar todos los montos, políticas, créditos y comprobantes antes de crear ventas.
 FOR v_item IN SELECT value FROM jsonb_array_elements(p_ventas) ORDER BY (value->>'idLote')::bigint LOOP
   v_lote := (v_item->>'idLote')::bigint;
   IF NOT EXISTS (SELECT 1 FROM public.ven_reservas r JOIN public.cfg_estados_reserva e USING(id_estado_reserva)
      WHERE r.id_lote=v_lote AND r.id_persona=v_persona AND e.codigo='VIGENTE' AND r.fecha_vencimiento>now())
   THEN RAISE EXCEPTION 'RESERVA_PENDIENTE|Cada lote requiere una separación vigente y confirmada por Finanzas.'; END IF;
   v_validacion:=public.sp_crm_validar_formalizacion_v10(p_actor,v_prospecto,v_lote,
     (v_item->>'modalidad')::varchar,(v_item->>'montoTotal')::numeric,(v_item->>'montoInicial')::numeric,
     (v_item->>'numeroCuotas')::integer,(v_item->>'tasaInteresMensualPct')::numeric);
   IF coalesce((v_validacion->>'elegible')::boolean,false)=false
   THEN RAISE EXCEPTION 'VENTA_NO_APTA|Revise las condiciones del lote.'; END IF;
   v_pago:=v_item->'datosPago';
   v_debe:=CASE WHEN v_item->>'modalidad'='FINANCIADA' THEN (v_validacion->>'montoInicialAdicional')::numeric ELSE (v_validacion->>'saldoContado')::numeric END;
   IF v_debe IS NULL OR v_debe<0 OR (v_pago->>'idPoliticaEsperada')::bigint IS DISTINCT FROM (v_validacion->>'idPolitica')::bigint
      OR (v_item->>'creditoEsperado')::numeric IS DISTINCT FROM (v_validacion->>'montoReservaAplicable')::numeric
      OR (v_item->>'pagoEsperado')::numeric IS DISTINCT FROM v_debe
   THEN RAISE EXCEPTION 'CONDICIONES_CAMBIO|El crédito, política o saldo cambió; vuelva a cotizar.'; END IF;
   IF jsonb_typeof(v_pago->'comprobantes') IS DISTINCT FROM 'array'
   THEN RAISE EXCEPTION 'VOUCHER_REQUERIDO|Revise los comprobantes por lote.'; END IF;
   v_cantidad:=jsonb_array_length(v_pago->'comprobantes');
   IF (v_debe>0 AND v_cantidad<>1) OR (v_debe=0 AND (v_cantidad<>0 OR v_pago->>'metodoPago'<>'EFECTIVO'))
   THEN RAISE EXCEPTION 'VOUCHER_REQUERIDO|Adjunte exactamente un comprobante por pago; si no hay saldo, no adjunte comprobante.'; END IF;
   v_ref:=upper(btrim(coalesce(v_pago->>'numeroOperacion','')));
   IF v_debe>0 AND v_ref<>'' THEN
     IF v_ref=ANY(v_refs) THEN RAISE EXCEPTION 'PAGO_DUPLICADO|Use una operación de pago distinta para cada lote.'; END IF;
     v_refs:=array_append(v_refs,v_ref);
   END IF;
   v_total:=v_total+v_debe;
 END LOOP;
 IF cardinality(v_ids)>1 THEN
   v_agrupada:=public.sp_crm_crear_operacion_agrupada_v1(p_actor,v_prospecto,
     (SELECT jsonb_agg(jsonb_build_object('idLote',(x->>'idLote')::bigint,'modalidad',x->>'modalidad')) FROM jsonb_array_elements(p_ventas) x),
     'Formalización conjunta de reservas'::varchar);
   v_operacion:=(v_agrupada->>'idOperacion')::bigint;
 END IF;
 FOR v_item IN SELECT value FROM jsonb_array_elements(p_ventas) ORDER BY (value->>'idLote')::bigint LOOP
   v_lote:=(v_item->>'idLote')::bigint;
   SELECT id_proyecto INTO STRICT v_proyecto FROM public.inm_lotes WHERE id_lote=v_lote;
   v_datos:=v_comprador||jsonb_build_object('idProyectoInteres',v_proyecto);
   v_resultado:=public.sp_crm_registrar_venta_pendiente_v14(p_actor,v_prospecto,v_lote,
     (v_item->>'modalidad')::varchar,(v_item->>'montoTotal')::numeric,(v_item->>'montoInicial')::numeric,
     (v_item->>'numeroCuotas')::integer,(v_item->>'tasaInteresMensualPct')::numeric,
     v_item->>'observaciones',v_datos,v_item->'datosPago');
   IF (v_resultado->>'idVenta')::bigint IS NULL THEN RAISE EXCEPTION 'VENTA_NO_REGISTRADA|No se registró el lote.'; END IF;
   IF v_operacion IS NOT NULL THEN
     PERFORM public.sp_crm_vincular_venta_operacion_agrupada_v1(p_actor,v_operacion,(v_resultado->>'idVenta')::bigint);
   END IF;
   v_ventas:=v_ventas||jsonb_build_array(v_resultado);
 END LOOP;
 RETURN jsonb_build_object('success',true,'idOperacion',v_operacion,'codigoOperacion',v_agrupada->>'codigo','ventas',v_ventas,'totalPago',v_total);
END $function$;
REVOKE ALL ON FUNCTION public.sp_crm_registrar_ventas_multiples_v1(bigint,jsonb) FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.sp_crm_registrar_ventas_multiples_v1(bigint,jsonb) TO sigi_app_user,sgi_backend_user;
