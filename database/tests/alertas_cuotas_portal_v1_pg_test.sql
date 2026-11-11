-- SGI-MONOLITHE | 5.2.6 | CI PostgreSQL 17 aislado.
DO $test$
DECLARE
 v jsonb;
 v_r jsonb;
 v_count integer;
 v_corte date:=(now() AT TIME ZONE 'America/Lima')::date;
 v_bloqueado boolean:=false;
BEGIN
 v:=public.sp_fin_alertas_cuotas_v1(5,'TODAS',1,20);
 IF (v->>'total')::integer<>3 OR (v->>'proximas')::integer<>1
   OR (v->>'vencidas')::integer<>2
   OR (v->>'montoProximo')::numeric<>24900
   OR (v->>'montoVencido')::numeric<>4800
   OR jsonb_array_length(v->'items')<>3
   OR v->'items'->0->>'tipoAlerta'<>'CUOTA_VENCIDA'
   OR (v->'items'->0->>'diasMora')::integer<1
 THEN RAISE EXCEPTION 'Listado inicial incorrecto: %',v; END IF;

 -- Paginación consistente y filtros independientes.
 v:=public.sp_fin_alertas_cuotas_v1(5,'CUOTA_PROXIMA',1,20);
 IF (v->>'total')::integer<>1 OR (v->>'paginas')::integer<>1
   OR v->'items'->0->>'tipoAlerta'<>'CUOTA_PROXIMA'
 THEN RAISE EXCEPTION 'Filtro próxima incorrecto: %',v; END IF;
 v:=public.sp_fin_alertas_cuotas_v1(5,'CUOTA_VENCIDA',2,1);
 IF (v->>'total')::integer<>2 OR (v->>'paginas')::integer<>2
   OR jsonb_array_length(v->'items')<>1
 THEN RAISE EXCEPTION 'Paginación vencidas incorrecta: %',v; END IF;
 v_bloqueado:=false;
 BEGIN PERFORM public.sp_fin_alertas_cuotas_v1(5,'INVENTADO',1,20);
 EXCEPTION WHEN others THEN v_bloqueado:=true;
 END;
 IF NOT v_bloqueado THEN RAISE EXCEPTION 'Se aceptó filtro inválido'; END IF;
 v_bloqueado:=false;
 BEGIN PERFORM public.sp_fin_alertas_cuotas_v1(5,'TODAS',1,101);
 EXCEPTION WHEN others THEN v_bloqueado:=true;
 END;
 IF NOT v_bloqueado THEN RAISE EXCEPTION 'Se aceptó página demasiado grande'; END IF;
 v_bloqueado:=false;
 BEGIN PERFORM public.sp_fin_alertas_cuotas_v1(6,'TODAS',1,20);
 EXCEPTION WHEN others THEN v_bloqueado:=true;
 END;
 IF NOT v_bloqueado THEN RAISE EXCEPTION 'Actor sin cartera obtuvo alertas'; END IF;

 -- Generar avisos SOLO internos de portal, sin envíos externos.
 v_r:=public.sp_fin_preparar_avisos_portal_v1(5,100);
 IF (v_r->>'creados')::integer<>3 OR (v_r->>'desactivados')::integer<>1
    OR (v_r->>'enviosExternos')::boolean
 THEN RAISE EXCEPTION 'Preparación inicial incorrecta: %',v_r; END IF;
 SELECT count(*) INTO v_count FROM public.not_notificaciones
 WHERE referencia_modulo='FINANCIAMIENTO' AND activo;
 IF v_count<>3 THEN RAISE EXCEPTION 'Se esperaban 3 avisos activos, hay %',v_count; END IF;

 -- Segundo intento no duplica ni reenvía.
 v_r:=public.sp_fin_preparar_avisos_portal_v1(5,100);
 IF (v_r->>'creados')::integer<>0 OR (v_r->>'deduplicados')::integer<>3
   OR (v_r->>'desactivados')::integer<>0
 THEN RAISE EXCEPTION 'No fue idempotente: %',v_r; END IF;

 -- Preferencia PORTAL desactivada: alerta existente se desactiva.
 INSERT INTO public.not_preferencias(
   id_persona,id_tipo_notificacion,id_canal_notificacion,habilitado)
 VALUES(502,13,4,false);
 v_r:=public.sp_fin_preparar_avisos_portal_v1(5,100);
 IF (v_r->>'desactivados')::integer<>1 THEN
   RAISE EXCEPTION 'No respetó preferencia desactivada: %',v_r; END IF;
 SELECT count(*) INTO v_count FROM public.not_notificaciones
 WHERE referencia_modulo='FINANCIAMIENTO' AND activo;
 IF v_count<>2 THEN RAISE EXCEPTION 'La preferencia no ocultó la alerta'; END IF;

 -- Restaurar preferencia; se reutiliza clave existente y se reactiva aviso.
 UPDATE public.not_preferencias SET habilitado=true WHERE id_persona=502;
 v_r:=public.sp_fin_preparar_avisos_portal_v1(5,100);
 IF (v_r->>'creados')::integer<>0 THEN
   RAISE EXCEPTION 'Se duplicó alerta al reactivar preferencia'; END IF;
 SELECT count(*) INTO v_count FROM public.not_notificaciones
 WHERE referencia_modulo='FINANCIAMIENTO' AND activo;
 IF v_count<>3 THEN RAISE EXCEPTION 'No se reactivó aviso'; END IF;

 -- Pago confirmado completo: elimina alerta vencida del listado y
 -- desactiva el aviso, sin tocar la cuota registrada históricamente.
 UPDATE public.pag_pagos SET monto=2400 WHERE id_pago=1005;
 UPDATE public.pag_aplicaciones_pago
 SET monto_aplicado=2400 WHERE id_aplicacion_pago=10051;
 v:=public.sp_fin_alertas_cuotas_v1(5,'TODAS',1,20);
 IF (v->>'total')::integer<>2 OR (v->>'vencidas')::integer<>1
 THEN RAISE EXCEPTION 'Una cuota pagada sigue alertándose: %',v; END IF;
 v_r:=public.sp_fin_preparar_avisos_portal_v1(5,100);
 IF (v_r->>'desactivados')::integer<>1 THEN
   RAISE EXCEPTION 'Aviso pagado no fue desactivado: %',v_r; END IF;

 -- Corrección de aplicación reabre MISMO aviso, sin insertar duplicado.
 UPDATE public.pag_pagos SET monto=100 WHERE id_pago=1005;
 UPDATE public.pag_aplicaciones_pago
 SET monto_aplicado=100 WHERE id_aplicacion_pago=10051;
 v_r:=public.sp_fin_preparar_avisos_portal_v1(5,100);
 IF (v_r->>'creados')::integer<>0 THEN
   RAISE EXCEPTION 'Reversión de pago generó duplicado: %',v_r; END IF;
 SELECT count(*) INTO v_count FROM public.not_notificaciones
 WHERE referencia_modulo='FINANCIAMIENTO' AND activo;
 IF v_count<>3 THEN RAISE EXCEPTION 'No se reactivó un aviso después de reversión'; END IF;

 v_bloqueado:=false;
 BEGIN PERFORM public.sp_fin_preparar_avisos_portal_v1(6,100);
 EXCEPTION WHEN others THEN v_bloqueado:=true;
 END;
 IF NOT v_bloqueado THEN RAISE EXCEPTION 'Actor no autorizado pudo generar avisos'; END IF;

 IF has_function_privilege('anon','public.sp_fin_alertas_cuotas_v1(bigint,character varying,integer,integer)','EXECUTE')
 OR has_function_privilege('authenticated','public.fn_fin_alertas_cuotas_base_v1(date)','EXECUTE')
 OR has_function_privilege('anon','public.sp_fin_preparar_avisos_portal_v1(bigint,integer)','EXECUTE')
 OR NOT has_function_privilege('sigi_app_user','public.sp_fin_alertas_cuotas_v1(bigint,character varying,integer,integer)','EXECUTE')
 THEN RAISE EXCEPTION 'Funciones financieras abiertas o backend sin permiso'; END IF;

 RAISE NOTICE 'ALERTAS_526_OK|próximas, mora, parciales, pagadas, paginación, cartera, preferencias, dedup y reversión';
END;
$test$;
