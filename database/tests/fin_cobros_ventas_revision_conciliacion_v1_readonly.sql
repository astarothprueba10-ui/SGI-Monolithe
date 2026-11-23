-- Verificación de solo lectura. Se ejecuta sobre Supabase original sin generar cobros.
DO $test$
DECLARE v_actor BIGINT;v_venta BIGINT;v_pagos BIGINT;v_rev BIGINT;v_cobros JSONB;v_reservas JSONB;
BEGIN
 IF has_function_privilege('anon',
   'public.sp_fin_conciliar_cobro_venta_v1(bigint,bigint,bigint,date,character varying,character varying)','EXECUTE')
   OR has_function_privilege('authenticated',
   'public.sp_fin_revisar_comprobante_venta_v1(bigint,bigint,bigint,boolean,character varying)','EXECUTE')
   OR NOT has_function_privilege('sigi_app_user',
   'public.sp_fin_conciliar_cobro_venta_v1(bigint,bigint,bigint,date,character varying,character varying)','EXECUTE')
 THEN RAISE EXCEPTION 'SEGURIDAD-01|Permisos RPC incorrectos'; END IF;
 IF (SELECT relrowsecurity FROM pg_class WHERE oid='public.fin_revisiones_comprobantes_venta_v1'::regclass) IS NOT TRUE
 THEN RAISE EXCEPTION 'SEGURIDAD-02|Auditoría sin RLS'; END IF;
 SELECT min(u.id_usuario) INTO v_actor FROM public.seg_usuarios u
 WHERE public.fn_usuario_tiene_permiso_seguridad(u.id_usuario,'finance.view'::varchar)
   AND public.fn_usuario_tiene_permiso_seguridad(u.id_usuario,'finance.edit'::varchar);
 SELECT min(id_venta) INTO v_venta FROM public.ven_ventas_medios_pago WHERE estado_revision='PENDIENTE';
 IF v_actor IS NULL THEN RAISE EXCEPTION 'PRUEBA-03|No existe revisor financiero'; END IF;
 SELECT count(*) INTO v_pagos FROM public.pag_pagos;
 SELECT count(*) INTO v_rev FROM public.fin_revisiones_comprobantes_venta_v1;
 SELECT public.sp_fin_ventas_cobros_pendientes_v1(v_actor,NULL,1,100) INTO v_cobros;
 SELECT public.sp_fin_reservas_vencidas_revision_v1(v_actor) INTO v_reservas;
 IF v_cobros->'items' IS NULL OR v_reservas->'items' IS NULL
 THEN RAISE EXCEPTION 'PRUEBA-04|Bandejas no disponibles'; END IF;
 BEGIN
  PERFORM public.sp_fin_revisar_comprobante_venta_v1(0,1,1,TRUE,NULL);
  RAISE EXCEPTION 'PRUEBA-05|Aprobación sin actor';
 EXCEPTION WHEN raise_exception THEN
  IF SQLERRM NOT LIKE 'DENEGADO|%' THEN RAISE; END IF;
 END;
 IF v_venta IS NOT NULL THEN
  BEGIN
   PERFORM public.sp_fin_conciliar_cobro_venta_v1(
     v_actor,v_venta,1,CURRENT_DATE,'PRUEBA-SIN-ABONO',NULL);
   RAISE EXCEPTION 'PRUEBA-06|Se concilió sin evidencia aprobada';
  EXCEPTION WHEN raise_exception THEN
   IF SQLERRM NOT LIKE 'COBRO_NO_APTO|%' THEN RAISE; END IF;
  END;
 END IF;
 IF (SELECT count(*) FROM public.pag_pagos)<>v_pagos
    OR (SELECT count(*) FROM public.fin_revisiones_comprobantes_venta_v1)<>v_rev
 THEN RAISE EXCEPTION 'PRUEBA-07|Se alteró el historial financiero'; END IF;
 RAISE NOTICE 'Finanzas: permisos, bandejas y prevención de cobros ficticios verificados.';
END $test$;