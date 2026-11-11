-- SGI-MONOLITHE / Sprint 4 / 5.2.7
-- Pruebas sintéticas SQL en PostgreSQL 17, no en datos reales.
DO $test$
DECLARE
 v_corte date:=(now() AT TIME ZONE 'America/Lima')::date;
 v jsonb;
 v_racha record;
 v_total integer;
 v_bloqueado boolean;
 v_notificaciones integer;
BEGIN
 SELECT count(*) INTO v_notificaciones FROM public.not_notificaciones;
 v:=public.sp_fin_alertas_resolutoria_v1(5,1,20);
 IF (v->>'total')::integer<>3
    OR (v->>'montoEnRevision')::numeric<>960
    OR (v->>'resolucionAutomatica')::boolean
    OR jsonb_array_length(v->'items')<>3
    OR v->'items'->0->>'codigoVenta'<>'VENTA-CI-RACHA-2017'
    OR (v->'items'->0->>'cuotasConsecutivas')::integer<>4
 THEN RAISE EXCEPTION 'Resultado de revisión legal incorrecto: %',v; END IF;

 SELECT * INTO STRICT v_racha
 FROM public.fn_fin_rachas_impagas_v1(v_corte)
 WHERE id_venta=2010;
 IF v_racha.cuotas_consecutivas<>3
    OR v_racha.desde_cuota<>1 OR v_racha.hasta_cuota<>3
    OR v_racha.saldo_racha<>260
    OR (v_racha.cuotas->1->>'abonadoConfirmado')::numeric<>40
    OR (v_racha.cuotas->1->>'saldoPendiente')::numeric<>60
 THEN RAISE EXCEPTION 'Pago parcial no debió interrumpir racha: %',row_to_json(v_racha); END IF;

 SELECT * INTO STRICT v_racha
 FROM public.fn_fin_rachas_impagas_v1(v_corte)
 WHERE id_venta=2018;
 IF v_racha.desde_cuota<>5 OR v_racha.hasta_cuota<>7
   OR v_racha.cuotas_consecutivas<>3
   OR v_racha.saldo_racha<>300
 THEN RAISE EXCEPTION 'Se seleccionó la racha antigua o mezclada: %',row_to_json(v_racha); END IF;

 -- Tres impagos aislados o con uno pagado NO son consecutivos.
 IF EXISTS(SELECT 1 FROM public.fn_fin_rachas_impagas_v1(v_corte)
   WHERE id_venta IN (2011,2012,2013,2014,2015,2016,2019,2020,2021))
 THEN RAISE EXCEPTION 'Falso positivo en plan sin firma/cerrado/incompleto o cuotas no consecutivas'; END IF;
 -- El día exacto de vencimiento no cuenta como moroso.
 IF EXISTS(SELECT 1 FROM public.fn_fin_rachas_impagas_v1(v_corte)
   WHERE id_venta=2016)
 THEN RAISE EXCEPTION 'Tercera cuota del día de vencimiento fue marcada como impaga vencida'; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.fn_fin_rachas_impagas_v1(v_corte+1)
   WHERE id_venta=2016 AND cuotas_consecutivas=3)
 THEN RAISE EXCEPTION 'La racha no aparece después del vencimiento'; END IF;

 -- Si se confirma el pago TOTAL de la cuota 2, se rompe la secuencia.
 UPDATE public.pag_pagos SET monto=100 WHERE id_pago=320102;
 UPDATE public.pag_aplicaciones_pago SET monto_aplicado=100
 WHERE id_aplicacion_pago=320102;
 IF EXISTS(SELECT 1 FROM public.fn_fin_rachas_impagas_v1(v_corte)
   WHERE id_venta=2010)
 THEN RAISE EXCEPTION 'Pago completo no interrumpió la racha'; END IF;
 -- Un pago que se revierte a REGISTRADO no cubre la cuota.
 UPDATE public.pag_pagos SET id_estado_pago=2 WHERE id_pago=320102;
 SELECT * INTO STRICT v_racha
 FROM public.fn_fin_rachas_impagas_v1(v_corte) WHERE id_venta=2010;
 IF v_racha.saldo_racha<>300 OR v_racha.cuotas_consecutivas<>3
 THEN RAISE EXCEPTION 'Pago no confirmado redujo la mora'; END IF;
 UPDATE public.pag_pagos SET monto=40,id_estado_pago=1 WHERE id_pago=320102;
 UPDATE public.pag_aplicaciones_pago SET monto_aplicado=40
 WHERE id_aplicacion_pago=320102;

 -- Revocación lógica de una aplicación: no reduce el saldo.
 UPDATE public.pag_aplicaciones_pago SET activo=false WHERE id_aplicacion_pago=320102;
 SELECT * INTO STRICT v_racha
 FROM public.fn_fin_rachas_impagas_v1(v_corte) WHERE id_venta=2010;
 IF v_racha.saldo_racha<>300 THEN
   RAISE EXCEPTION 'Aplicación inactiva redujo el saldo pendiente'; END IF;
 UPDATE public.pag_aplicaciones_pago SET activo=true WHERE id_aplicacion_pago=320102;

 -- Paginación con orden por gravedad.
 v:=public.sp_fin_alertas_resolutoria_v1(5,2,1);
 IF (v->>'total')::int<>3 OR (v->>'paginas')::int<>3
    OR jsonb_array_length(v->'items')<>1 THEN
    RAISE EXCEPTION 'Paginación de revisión incorrecta: %',v; END IF;
 v_bloqueado:=false;
 BEGIN
    PERFORM public.sp_fin_alertas_resolutoria_v1(5,1,101);
 EXCEPTION WHEN others THEN v_bloqueado:=true;
 END;
 IF NOT v_bloqueado THEN RAISE EXCEPTION 'Se permitió límite excesivo'; END IF;
 v_bloqueado:=false;
 BEGIN
    PERFORM public.sp_fin_alertas_resolutoria_v1(6,1,20);
 EXCEPTION WHEN others THEN v_bloqueado:=true;
 END;
 IF NOT v_bloqueado THEN RAISE EXCEPTION 'Actor sin permiso obtuvo revisión contractual'; END IF;
 IF has_function_privilege('anon',
     'public.fn_fin_rachas_impagas_v1(date)','EXECUTE')
    OR has_function_privilege('authenticated',
     'public.sp_fin_alertas_resolutoria_v1(bigint,integer,integer)','EXECUTE')
    OR NOT has_function_privilege('sigi_app_user',
     'public.sp_fin_alertas_resolutoria_v1(bigint,integer,integer)','EXECUTE')
 THEN RAISE EXCEPTION 'Permisos SQL de revisión contractual inseguros'; END IF;

 SELECT count(*) INTO v_total FROM public.not_notificaciones;
 IF v_total<>v_notificaciones THEN
   RAISE EXCEPTION 'La detección creó notificaciones inesperadas'; END IF;
 RAISE NOTICE 'RESOLUTORIA_527_OK: 3 rachas reales, parciales, rupturas, firma, cartera, corte Lima y cero escrituras';
END;
$test$;
