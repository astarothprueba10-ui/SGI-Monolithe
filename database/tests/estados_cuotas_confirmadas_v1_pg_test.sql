-- 5.2.5 | Postgres 17 aislado, sin datos reales.
-- Fixture previa: venta 1003, cuota 25,000, pago CONFIRMADO 175,
-- cuota abonada 100, inicial 50, 25 sin imputar y otro pago REGISTRADO.
DO $prueba$
DECLARE
 v jsonb;
 v_fila jsonb;
 v_esperado text;
 v_excepcion boolean;
 v_hoy date:=(now() AT TIME ZONE 'America/Lima')::date;
BEGIN
 -- Clasificacion pura con fecha controlada: vencimiento solo desde el dia siguiente.
 v:=public.fn_crm_clasificar_cuota_v1('PENDIENTE',2400,0,
    DATE '2026-11-11',DATE '2026-11-11');
 IF v->>'estado'<>'PENDIENTE' OR (v->>'cuotaAtrasada')::boolean
    OR (v->>'diasMora')::int<>0 OR NOT (v->>'proxima7Dias')::boolean
 THEN RAISE EXCEPTION 'El dia de vencimiento debe continuar PENDIENTE'; END IF;

 v:=public.fn_crm_clasificar_cuota_v1('PENDIENTE',2400,0,
    DATE '2026-11-11',DATE '2026-11-12');
 IF v->>'estado'<>'VENCIDA' OR NOT (v->>'cuotaAtrasada')::boolean
    OR (v->>'diasMora')::int<>1 OR (v->>'saldoCuota')::numeric<>2400
 THEN RAISE EXCEPTION 'Cuota VENCIDA al dia siguiente incorrecta'; END IF;

 v:=public.fn_crm_clasificar_cuota_v1('PENDIENTE',2400,1000,
    DATE '2026-11-11',DATE '2026-11-12');
 IF v->>'estado'<>'PARCIAL' OR (v->>'diasMora')::int<>1
    OR (v->>'saldoCuota')::numeric<>1400
    OR NOT (v->>'cuotaAtrasada')::boolean
 THEN RAISE EXCEPTION 'Abono parcial vencido debe permanecer PARCIAL y atrasada'; END IF;

 v:=public.fn_crm_clasificar_cuota_v1('PENDIENTE',2400,2400,
    DATE '2026-11-11',DATE '2026-11-12');
 IF v->>'estado'<>'PAGADA' OR (v->>'cuotaAtrasada')::boolean
    OR (v->>'saldoCuota')::numeric<>0
 THEN RAISE EXCEPTION 'Pago completo debe ser PAGADA sin deuda'; END IF;

 v:=public.fn_crm_clasificar_cuota_v1('PENDIENTE',2400,0,
    DATE '2026-11-18',DATE '2026-11-11');
 IF NOT (v->>'proxima7Dias')::boolean OR v->>'estado'<>'PENDIENTE'
 THEN RAISE EXCEPTION 'Frontera de proximos siete dias'; END IF;

 v:=public.fn_crm_clasificar_cuota_v1('PENDIENTE',2400,0,
    DATE '2026-11-19',DATE '2026-11-11');
 IF (v->>'proxima7Dias')::boolean THEN
    RAISE EXCEPTION 'Ocho dias no puede considerarse proximidad'; END IF;

 v:=public.fn_crm_clasificar_cuota_v1('ANULADA',2400,0,
    DATE '2026-11-01',DATE '2026-11-11');
 IF v->>'estado'<>'ANULADA' OR (v->>'cuotaAtrasada')::boolean
 THEN RAISE EXCEPTION 'La cuota ANULADA no debe contarse como morosa'; END IF;

 v_excepcion:=false;
 BEGIN PERFORM public.fn_crm_clasificar_cuota_v1('PENDIENTE',2400,2400.01,
    DATE '2026-11-11',DATE '2026-11-12');
 EXCEPTION WHEN others THEN v_excepcion:=true;
 END;
 IF NOT v_excepcion THEN RAISE EXCEPTION 'Sobrepago debe ser rechazado'; END IF;

 -- Cronograma firmado: estado histórico PAGADA pero solo se confirmaron
 -- 100 sobre 25,000 => estado calculado PARCIAL y alerta de conciliación.
 v:=public.sp_crm_cronograma_venta_v4(5,1003);
 v_fila:=v->'items'->0;
 IF v->>'tipoCronograma'<>'REGISTRADO'
    OR v->>'fuenteEstados'<>'APLICACIONES_CONFIRMADAS'
    OR v_fila->>'estado'<>'PARCIAL'
    OR v_fila->>'estadoRegistrado'<>'PAGADA'
    OR NOT (v_fila->>'estadoDifiereRegistro')::boolean
    OR (v_fila->>'saldoCuota')::numeric<>24900
    OR (v->>'cuotasParciales')::int<>1
    OR (v->>'estadosDiferentesRegistro')::int<>1
 THEN RAISE EXCEPTION 'Estado integral y pagos confirmados no concilian: %',v; END IF;

 -- Plan sin firma: las 36 filas simuladas NO se convierten en exigibles.
 v:=public.sp_crm_cronograma_venta_v4(5,1001);
 IF v->>'tipoCronograma'<>'PROYECTADO'
    OR v->>'fuenteEstados'<>'SIN_CUOTAS_EXIGIBLES'
    OR (v->>'cuotasAtrasadas')::int<>0
    OR jsonb_array_length(v->'items')<>36
    OR v->'items'->0->>'estado'<>'PROYECTADA'
 THEN RAISE EXCEPTION 'Proyeccion pendiente no debe tener mora: %',v; END IF;

 -- Vencimiento de cuota ya parcialmente pagada: se conserva PARCIAL.
 UPDATE public.pag_cuotas SET fecha_vencimiento=v_hoy-2 WHERE id_cuota=1003;
 v:=public.sp_crm_cronograma_venta_v4(5,1003);
 IF v->'items'->0->>'estado'<>'PARCIAL'
    OR (v->'items'->0->>'diasMora')::int<>2
    OR (v->>'cuotasAtrasadas')::int<>1
    OR (v->>'montoVencido')::numeric<>24900
 THEN RAISE EXCEPTION 'Mora de cuota parcial no detectada: %',v; END IF;

 UPDATE public.pag_cuotas SET fecha_vencimiento=v_hoy+7 WHERE id_cuota=1003;
 v:=public.sp_crm_cronograma_venta_v4(5,1003);
 IF (v->>'cuotasProximas')::int<>1
    OR (v->>'cuotasAtrasadas')::int<>0
 THEN RAISE EXCEPTION 'Cuota parcial proxima no detectada'; END IF;

 -- Vuelve a fecha pendiente; un pago no confirmado no amortiza.
 UPDATE public.pag_pagos SET id_estado_pago=2 WHERE id_pago=1003;
 v:=public.sp_crm_cronograma_venta_v4(5,1003);
 v_esperado:=CASE WHEN v_hoy>v_hoy+7 THEN 'VENCIDA' ELSE 'PENDIENTE' END;
 IF v->'items'->0->>'estado'<>v_esperado
    OR (v->'items'->0->>'abonadoConfirmado')::numeric<>0
 THEN RAISE EXCEPTION 'Pago sin confirmar se conto como abonado'; END IF;
 UPDATE public.pag_pagos SET id_estado_pago=1 WHERE id_pago=1003;

 -- Una cuota totalmente cubierta no debe estar vencida.
 UPDATE public.pag_pagos SET monto=25050 WHERE id_pago=1003;
 UPDATE public.pag_aplicaciones_pago SET monto_aplicado=25000
 WHERE id_aplicacion_pago=10031;
 v:=public.sp_crm_cronograma_venta_v4(5,1003);
 IF v->'items'->0->>'estado'<>'PAGADA'
    OR (v->>'cuotasPagadas')::int<>1
    OR (v->>'cuotasAtrasadas')::int<>0
    OR (v->'items'->0->>'saldoCuota')::numeric<>0
 THEN RAISE EXCEPTION 'Cuota totalmente abonada se clasificó incorrectamente'; END IF;

 -- Plan cerrado: no reclamar mora sobre un contrato anulado.
 INSERT INTO public.cfg_estados_plan_pago VALUES(3,'ANULADO');
 UPDATE public.pag_planes_pago SET id_estado_plan_pago=3 WHERE id_plan_pago=1003;
 v:=public.sp_crm_cronograma_venta_v4(5,1003);
 IF v->>'fuenteEstados'<>'HISTORICO_NO_EXIGIBLE'
    OR (v->>'cuotasAtrasadas')::int<>0
    OR (v->>'montoVencido')::numeric<>0
    OR jsonb_array_length(v->'items')<>1
 THEN RAISE EXCEPTION 'Plan cerrado no debe generar mora nueva'; END IF;
 UPDATE public.pag_planes_pago SET id_estado_plan_pago=2 WHERE id_plan_pago=1003;

 -- El usuario de otra cartera carece de permiso para consultar.
 v_excepcion:=false;
 BEGIN PERFORM public.sp_crm_cronograma_venta_v4(6,1003);
 EXCEPTION WHEN others THEN v_excepcion:=true;
 END;
 IF NOT v_excepcion THEN RAISE EXCEPTION 'Acceso indebido al cronograma'; END IF;
 IF has_function_privilege('anon',
    'public.sp_crm_cronograma_venta_v4(bigint,bigint)','EXECUTE')
    OR has_function_privilege('authenticated',
    'public.fn_crm_clasificar_cuota_v1(text,numeric,numeric,date,date)','EXECUTE')
 THEN RAISE EXCEPTION 'Funciones financieras expuestas a navegador'; END IF;

 RAISE NOTICE '5.2.5 OK: pendiente, vencida, parcial, pagada, anulada, proximas, mora, historico, seguridad';
END;
$prueba$;
