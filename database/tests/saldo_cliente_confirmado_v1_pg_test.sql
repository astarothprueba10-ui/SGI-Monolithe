-- 5.2.4: comprobaciones SQL de solo lectura excepto mutaciones sintéticas
-- deliberadas en PostgreSQL efímero de CI, nunca Supabase.
DO $test$
DECLARE
 v jsonb;
 v_cliente jsonb;
 v_error boolean:=false;
BEGIN
 v:=public.sp_crm_saldo_venta_v1(5,1003);
 IF v->>'tipoSaldo'<>'FINANCIADA'
    OR v->>'estadoPlan'<>'ACTIVO'
    OR (v->>'saldoFinanciamiento')::numeric<>24900
    OR (v->>'abonadoCuotasConfirmado')::numeric<>100
    OR (v->>'inicialAbonadaConfirmada')::numeric<>50
    OR (v->>'inicialSinAplicacionConfirmada')::numeric<>4950
    OR (v->>'pagosConfirmadosSinAplicar')::numeric<>25
    OR (v->'cuotas'->0->>'saldoCuota')::numeric<>24900
 THEN RAISE EXCEPTION 'Saldos venta confirmado y registro pendiente incorrectos: %',v; END IF;
 -- La versión V2 pendiente tiene interés contractual, SIN cuotas exigibles.
 v:=public.sp_crm_saldo_venta_v1(5,1001);
 IF (v->>'saldoFinanciamiento')::numeric<>29040.50
    OR v->>'estadoPlan'<>'PENDIENTE'
    OR (v->>'cuotasExigibles')::boolean
    OR jsonb_array_length(v->'cuotas')<>0
    OR (v->>'reservaAplicada')::numeric<>500
    OR (v->>'inicialAdicionalPactada')::numeric<>4500
 THEN RAISE EXCEPTION 'Proyección de saldos de plan sin firma incorrecta: %',v; END IF;

 -- Cliente titular con dos ventas pendientes: no duplicar ni cobrar cuotas
 -- antes de firmar.
 v_cliente:=public.sp_crm_saldo_cliente_v1(5,600);
 IF (v_cliente->>'numeroVentas')::integer<>2
    OR (v_cliente->>'saldoFinanciamientoActivo')::numeric<>0
    OR (v_cliente->>'saldoFinanciamientoPendienteFirma')::numeric<>55415.25
    OR (v_cliente->>'inicialSinAplicacionConfirmada')::numeric<>9500
 THEN RAISE EXCEPTION 'Consolidado por cliente incorrecto: %',v_cliente; END IF;
 v_cliente:=public.sp_crm_saldo_cliente_v1(5,700);
 IF (v_cliente->>'saldoFinanciamientoActivo')::numeric<>24900
   OR (v_cliente->>'saldoFinanciamientoPendienteFirma')::numeric<>0
 THEN RAISE EXCEPTION 'Saldo activo de otro cliente incorrecto'; END IF;

 -- Aplicación anulada o inactiva NO resta saldo.
 UPDATE public.pag_aplicaciones_pago SET activo=false WHERE id_aplicacion_pago=10031;
 v:=public.sp_crm_saldo_venta_v1(5,1003);
 IF (v->>'saldoFinanciamiento')::numeric<>25000
 THEN RAISE EXCEPTION 'Aplicación inactiva redujo saldo'; END IF;
 UPDATE public.pag_aplicaciones_pago SET activo=true WHERE id_aplicacion_pago=10031;

 -- Pago anulado NO resta saldo, aunque su aplicación continúe activa.
 UPDATE public.pag_pagos SET id_estado_pago=2 WHERE id_pago=1003;
 v:=public.sp_crm_saldo_venta_v1(5,1003);
 IF (v->>'abonadoCuotasConfirmado')::numeric<>0
    OR (v->>'inicialAbonadaConfirmada')::numeric<>0
 THEN RAISE EXCEPTION 'Pago no confirmado redujo saldo'; END IF;
 UPDATE public.pag_pagos SET id_estado_pago=1 WHERE id_pago=1003;

 -- Pago confirmado con sobreaplicación al importe de cuota: rechazar.
 UPDATE public.pag_aplicaciones_pago SET monto_aplicado=25000.01
 WHERE id_aplicacion_pago=10031;
 v_error:=false;
 BEGIN
   PERFORM public.sp_crm_saldo_venta_v1(5,1003);
 EXCEPTION WHEN OTHERS THEN v_error:=true;
 END;
 IF NOT v_error THEN RAISE EXCEPTION 'No detectó aplicación excesiva'; END IF;
 UPDATE public.pag_aplicaciones_pago SET monto_aplicado=100
 WHERE id_aplicacion_pago=10031;

 -- Aunque la cuota sea 25,000, un pago recibido por 175 no puede
 -- aplicar 150 a cuota y 50 a inicial: 200 > 175.
 UPDATE public.pag_aplicaciones_pago SET monto_aplicado=150
 WHERE id_aplicacion_pago=10031;
 v_error:=false;
 BEGIN
   PERFORM public.sp_crm_saldo_venta_v1(5,1003);
 EXCEPTION WHEN OTHERS THEN v_error:=true;
 END;
 IF NOT v_error THEN RAISE EXCEPTION 'No detectó sobreaplicación al pago'; END IF;
 UPDATE public.pag_aplicaciones_pago SET monto_aplicado=100
 WHERE id_aplicacion_pago=10031;

 -- Denegar lectura de venta/cliente ajeno a la cartera.
 v_error:=false;
 BEGIN
   PERFORM public.sp_crm_saldo_venta_v1(6,1003);
 EXCEPTION WHEN OTHERS THEN v_error:=true;
 END;
 IF NOT v_error THEN RAISE EXCEPTION 'Filtración de saldo de venta'; END IF;
 v_error:=false;
 BEGIN
   PERFORM public.sp_crm_saldo_cliente_v1(6,700);
 EXCEPTION WHEN OTHERS THEN v_error:=true;
 END;
 IF NOT v_error THEN RAISE EXCEPTION 'Filtración de saldo de cliente'; END IF;

 IF has_function_privilege('anon',
      'public.sp_crm_saldo_venta_v1(bigint,bigint)','EXECUTE')
    OR has_function_privilege('authenticated',
      'public.sp_crm_saldo_cliente_v1(bigint,bigint)','EXECUTE')
    OR NOT has_function_privilege('sigi_app_user',
      'public.sp_crm_saldo_venta_v1(bigint,bigint)','EXECUTE')
 THEN RAISE EXCEPTION 'Privilegios incorrectos'; END IF;

 RAISE NOTICE 'SALDOS OK: parcial, pendiente, inicial, cliente, pagos no confirmados, anulacion, excesos y permiso';
END;
$test$;
