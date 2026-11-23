-- Verificación no destructiva de compras multilote y desgloses bancarios 143–148.
DO $test$
DECLARE
 v_count INTEGER;v_actor BIGINT;v_gerencia BIGINT;v_grupo JSONB;v_listado JSONB;
 v_id BIGINT;v_lotes INTEGER;v_previo INTEGER;v_ultimo INTEGER;v_pagos INTEGER;
 v_dinero NUMERIC;v_ref NUMERIC;
BEGIN
 SELECT count(*) INTO v_previo FROM public.ven_operaciones_agrupadas_v1;
 SELECT count(*) INTO v_ultimo FROM public.fin_ventas_desglose_comprobantes_v1;
 SELECT count(*) INTO v_pagos FROM public.pag_pagos;
 SELECT coalesce(sum(monto),0) INTO v_dinero FROM public.fin_movimientos;
 SELECT count(*) INTO v_lotes FROM public.ven_ventas;
 v_actor:=5;
 v_gerencia:=5;
 IF NOT public.fn_usuario_tiene_permiso_seguridad(v_actor,'sales.create'::varchar)
 THEN RAISE EXCEPTION 'TEST-00|Actor comercial inválido'; END IF;

 BEGIN
  v_grupo:=public.sp_crm_crear_operacion_agrupada_v1(
    v_actor,3,
    '[{"idLote":75,"modalidad":"CONTADO"},{"idLote":77,"modalidad":"FINANCIADA"}]'::jsonb,
    'Verificación reversible de dos contratos independientes'
  );
  v_id:=(v_grupo->>'idOperacion')::bigint;
  IF v_id IS NULL OR (v_grupo->>'cantidadLotes')::int<>2
  THEN RAISE EXCEPTION 'TEST-01|Planificación multílote incorrecta'; END IF;
  v_listado:=public.sp_crm_listar_operaciones_agrupadas_v1(v_actor,1,20);
  IF NOT EXISTS(
    SELECT 1 FROM jsonb_array_elements(v_listado->'items') i
    WHERE (i->>'idOperacion')::BIGINT=v_id AND jsonb_array_length(i->'lotes')=2
      AND EXISTS(SELECT 1 FROM jsonb_array_elements(i->'lotes') x
        WHERE x->>'modalidad'='CONTADO' AND x->>'idEtapa' IS NOT NULL)
      AND EXISTS(SELECT 1 FROM jsonb_array_elements(i->'lotes') x
        WHERE x->>'modalidad'='FINANCIADA' AND x->>'idProyecto' IS NOT NULL)
  ) THEN RAISE EXCEPTION 'TEST-02|Expediente no contiene modalidades o etapas'; END IF;
  BEGIN
    PERFORM public.sp_crm_vincular_venta_operacion_agrupada_v1(v_actor,v_id,27);
    RAISE EXCEPTION 'TEST-03|Venta de lote ajeno asociada sin control';
  EXCEPTION WHEN raise_exception THEN
    IF SQLERRM NOT LIKE 'LOTE_NO_COINCIDE|%' THEN RAISE; END IF;
  END;
  RAISE EXCEPTION 'ROLLBACK_TEST_GROUP';
 EXCEPTION WHEN raise_exception THEN
   IF SQLERRM<>'ROLLBACK_TEST_GROUP' THEN RAISE; END IF;
 END;
 IF (SELECT count(*) FROM public.ven_operaciones_agrupadas_v1)<>v_previo
 THEN RAISE EXCEPTION 'TEST-04|La planificación ficticia persistió'; END IF;

 BEGIN
  PERFORM public.sp_fin_configurar_desglose_venta_v1(
    20,30,'[{"idComprobante":1,"monto":1000,"numeroOperacion":"REF-01"},{"idComprobante":1,"monto":1000,"numeroOperacion":"REF-02"}]'::jsonb);
  RAISE EXCEPTION 'TEST-05|Desglose aceptó comprobantes ajenos o duplicados';
 EXCEPTION WHEN raise_exception THEN
   IF SQLERRM NOT LIKE 'CANTIDAD_INCORRECTA|%' AND
      SQLERRM NOT LIKE 'DOCUMENTO_NO_APTO|%' AND
      SQLERRM NOT LIKE 'DOCUMENTO_DUPLICADO|%' AND
      SQLERRM NOT LIKE 'SUMA_INCORRECTA|%' THEN RAISE; END IF;
 END;

 BEGIN
  PERFORM public.sp_fin_revisar_desglose_venta_v1(20,999999,TRUE,NULL);
  RAISE EXCEPTION 'TEST-06|Revisión inexistente fue aprobada';
 EXCEPTION WHEN raise_exception THEN
  IF SQLERRM NOT LIKE 'DESGLOSE_NO_APTO|%' THEN RAISE; END IF;
 END;
 BEGIN
  PERFORM public.sp_fin_conciliar_desglose_venta_v1(20,999999,1,current_date,NULL);
  RAISE EXCEPTION 'TEST-07|Evidencia inexistente fue conciliada';
 EXCEPTION WHEN raise_exception THEN
  IF SQLERRM NOT LIKE 'DESGLOSE_NO_APTO|%' THEN RAISE; END IF;
 END;
 BEGIN
  PERFORM public.sp_fin_reiniciar_desglose_venta_v1(20,30,
    'Reinicio solicitado sin autorización de Gerencia');
  RAISE EXCEPTION 'TEST-08|Finanzas modificó aprobaciones sin Gerencia';
 EXCEPTION WHEN raise_exception THEN
  IF SQLERRM NOT LIKE 'DENEGADO|%' THEN RAISE; END IF;
 END;
 BEGIN
  PERFORM public.sp_fin_reiniciar_desglose_venta_v1(v_gerencia,30,
    'Intento de reinicio sin desglose');
  RAISE EXCEPTION 'TEST-09|Gerencia reinició un desglose inexistente';
 EXCEPTION WHEN raise_exception THEN
  IF SQLERRM NOT LIKE 'DESGLOSE_INEXISTENTE|%' THEN RAISE; END IF;
 END;
 IF has_function_privilege('anon',
   'public.sp_crm_crear_operacion_agrupada_v1(bigint,bigint,jsonb,character varying)','EXECUTE')
 OR has_function_privilege('authenticated',
   'public.sp_fin_conciliar_desglose_venta_v1(bigint,bigint,bigint,date,character varying)','EXECUTE')
 OR has_function_privilege('anon',
   'public.sp_fin_reiniciar_desglose_venta_v1(bigint,bigint,character varying)','EXECUTE')
 THEN RAISE EXCEPTION 'TEST-10|Se expusieron funciones a clientes anónimos'; END IF;
 IF NOT (SELECT relrowsecurity FROM pg_class WHERE oid='public.ven_operaciones_agrupadas_v1'::regclass)
 OR NOT (SELECT relrowsecurity FROM pg_class WHERE oid='public.fin_ventas_desglose_comprobantes_v1'::regclass)
 THEN RAISE EXCEPTION 'TEST-11|Tablas sin RLS'; END IF;
 IF (SELECT count(*) FROM public.fin_ventas_desglose_comprobantes_v1)<>v_ultimo
 OR (SELECT count(*) FROM public.pag_pagos)<>v_pagos
 OR (SELECT count(*) FROM public.ven_ventas)<>v_lotes
 OR (SELECT coalesce(sum(monto),0) FROM public.fin_movimientos)<>v_dinero
 THEN RAISE EXCEPTION 'TEST-12|Se alteró contabilidad o histórico'; END IF;
 RAISE NOTICE 'Pruebas multílote y desglose 143-148 correctas, sin persistencia de datos simulados';
END $test$;