-- SGI-MONOLITHE | Sprint 4 | 5.2.5
-- Clasificacion de cuotas en tiempo de CONSULTA, sin mutar historia.
-- Un pago reduce saldos solo cuando esta CONFIRMADO y tiene una aplicacion
-- CUOTA activa y vinculada al mismo plan; fuente: sp_crm_saldo_venta_v1.
-- Fecha de corte operativa: America/Lima, no UTC.
-- PARCIAL atrasada conserva PARCIAL y expone cuotaAtrasada=true.

CREATE OR REPLACE FUNCTION public.fn_crm_clasificar_cuota_v1(
 p_estado_registrado text,
 p_monto_cuota numeric,
 p_abonado_confirmado numeric,
 p_fecha_vencimiento date,
 p_fecha_corte date
) RETURNS jsonb
LANGUAGE plpgsql IMMUTABLE
SET search_path TO 'pg_catalog','public','pg_temp'
AS $fn$
DECLARE
 v_estado text;
 v_saldo numeric;
 v_atrasada boolean;
 v_dias integer;
 v_proxima boolean;
BEGIN
 IF p_fecha_corte IS NULL OR p_fecha_vencimiento IS NULL
    OR p_monto_cuota IS NULL OR p_monto_cuota<=0
    OR p_abonado_confirmado IS NULL OR p_abonado_confirmado<0
    OR p_abonado_confirmado>p_monto_cuota
    OR p_monto_cuota<>round(p_monto_cuota,2)
    OR p_abonado_confirmado<>round(p_abonado_confirmado,2)
 THEN RAISE EXCEPTION 'CUOTA_INCONSISTENTE|Datos de cuota o aplicaciones fuera de rango.'; END IF;
 v_saldo:=p_monto_cuota-p_abonado_confirmado;
 IF p_estado_registrado='ANULADA' THEN
   v_estado:='ANULADA';
 ELSIF v_saldo=0 THEN
   v_estado:='PAGADA';
 ELSIF p_abonado_confirmado>0 THEN
   v_estado:='PARCIAL';
 ELSIF p_fecha_vencimiento<p_fecha_corte THEN
   v_estado:='VENCIDA';
 ELSE
   v_estado:='PENDIENTE';
 END IF;

 v_atrasada:=v_saldo>0 AND p_estado_registrado<>'ANULADA'
   AND p_fecha_vencimiento<p_fecha_corte;
 v_dias:=CASE WHEN v_atrasada THEN p_fecha_corte-p_fecha_vencimiento ELSE 0 END;
 -- Incluye el propio dia de vencimiento: los atrasos empiezan al dia siguiente.
 v_proxima:=v_saldo>0 AND p_estado_registrado<>'ANULADA'
   AND p_fecha_vencimiento BETWEEN p_fecha_corte AND p_fecha_corte+7;
 RETURN jsonb_build_object(
   'estado',v_estado,
   'estadoCalculado',v_estado,
   'estadoRegistrado',p_estado_registrado,
   'estadoDifiereRegistro',v_estado IS DISTINCT FROM p_estado_registrado,
   'abonadoConfirmado',p_abonado_confirmado,
   'saldoCuota',v_saldo,
   'cuotaAtrasada',v_atrasada,
   'diasMora',v_dias,
   'proxima7Dias',v_proxima
 );
END;
$fn$;

-- Mantiene el contrato JSON original del cronograma v3. En planes
-- PROYECTADOS no clasifica cuotas, evita generar obligaciones antes de firma.
CREATE OR REPLACE FUNCTION public.sp_crm_cronograma_venta_v4(
 p_actor bigint,p_venta bigint
) RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path TO 'pg_catalog','public','pg_temp'
AS $fn$
DECLARE
 v_cronograma jsonb;
 v_saldo jsonb;
 v_item jsonb;
 v_saldo_cuota jsonb;
 v_estado jsonb;
 v_items jsonb:='[]'::jsonb;
 v_fecha_corte date:=(now() AT TIME ZONE 'America/Lima')::date;
 v_pendientes integer:=0;
 v_parciales integer:=0;
 v_vencidas integer:=0;
 v_pagadas integer:=0;
 v_anuladas integer:=0;
 v_proximas integer:=0;
 v_cuotas_atrasadas integer:=0;
 v_monto_vencido numeric:=0;
 v_monto_proximo numeric:=0;
 v_discrepancias integer:=0;
BEGIN
 -- V3 revisa permiso por actor/venta y estado de aprobacion contractual.
 v_cronograma:=public.sp_crm_cronograma_venta_v3(p_actor,p_venta);
 IF v_cronograma->>'tipoCronograma'<>'REGISTRADO' THEN
   RETURN v_cronograma||jsonb_build_object(
     'fechaCorte',to_char(v_fecha_corte,'YYYY-MM-DD'),
     'fuenteEstados','SIN_CUOTAS_EXIGIBLES',
     'cuotasPendientes',0,'cuotasParciales',0,
     'cuotasVencidas',0,'cuotasPagadas',0,'cuotasProximas',0,
     'cuotasAtrasadas',0,'montoVencido',0,'montoProximo',0);
 END IF;

 -- Misma fuente autorizada del 5.2.4: un voucher o una fecha de pago
 -- no bastan; solo se descuentan aplicaciones de pagos confirmados.
 v_saldo:=public.sp_crm_saldo_venta_v1(p_actor,p_venta);
 IF v_saldo->>'tipoSaldo'<>'FINANCIADA'
    OR v_saldo->>'estadoPlan' NOT IN('ACTIVO','COMPLETADO')
    OR (v_saldo->>'numeroCuotasRegistradas')::int
        <>jsonb_array_length(v_cronograma->'items')
 THEN
   RAISE EXCEPTION 'PLAN_INCONSISTENTE|No es posible clasificar cuotas de este plan.';
 END IF;
 FOR v_item IN SELECT value FROM jsonb_array_elements(v_cronograma->'items')
 LOOP
   SELECT value INTO v_saldo_cuota
   FROM jsonb_array_elements(v_saldo->'cuotas')
   WHERE (value->>'numero')::int=(v_item->>'numero')::int
   LIMIT 1;
   IF v_saldo_cuota IS NULL THEN
      RAISE EXCEPTION 'PLAN_INCONSISTENTE|La cuota registrada no aparece en el saldo financiero.';
   END IF;
   v_estado:=public.fn_crm_clasificar_cuota_v1(
      v_saldo_cuota->>'estadoRegistrado',
      (v_item->>'cuota')::numeric,
      (v_saldo_cuota->>'abonadoConfirmado')::numeric,
      (v_item->>'fechaVencimiento')::date,
      v_fecha_corte);
   v_items:=v_items||jsonb_build_array(v_item||v_estado);
   IF v_estado->>'estado'='PAGADA' THEN
      v_pagadas:=v_pagadas+1;
   ELSIF v_estado->>'estado'='PARCIAL' THEN
      v_parciales:=v_parciales+1;
   ELSIF v_estado->>'estado'='VENCIDA' THEN
      v_vencidas:=v_vencidas+1;
   ELSIF v_estado->>'estado'='PENDIENTE' THEN
      v_pendientes:=v_pendientes+1;
   ELSIF v_estado->>'estado'='ANULADA' THEN
      v_anuladas:=v_anuladas+1;
   END IF;
   IF (v_estado->>'cuotaAtrasada')::boolean THEN
      v_cuotas_atrasadas:=v_cuotas_atrasadas+1;
      v_monto_vencido:=v_monto_vencido+(v_estado->>'saldoCuota')::numeric;
   END IF;
   IF (v_estado->>'proxima7Dias')::boolean THEN
      v_proximas:=v_proximas+1;
      v_monto_proximo:=v_monto_proximo+(v_estado->>'saldoCuota')::numeric;
   END IF;
   IF (v_estado->>'estadoDifiereRegistro')::boolean THEN
      v_discrepancias:=v_discrepancias+1;
   END IF;
   v_saldo_cuota:=NULL;
 END LOOP;
 RETURN v_cronograma||jsonb_build_object(
   'fechaCorte',to_char(v_fecha_corte,'YYYY-MM-DD'),
   'fuenteEstados','APLICACIONES_CONFIRMADAS',
   'items',v_items,
   'cuotasPendientes',v_pendientes,'cuotasParciales',v_parciales,
   'cuotasVencidas',v_vencidas,'cuotasPagadas',v_pagadas,
   'cuotasAnuladas',v_anuladas,'cuotasProximas',v_proximas,
   'cuotasAtrasadas',v_cuotas_atrasadas,
   'montoVencido',v_monto_vencido,'montoProximo',v_monto_proximo,
   'estadosDiferentesRegistro',v_discrepancias,
   'advertenciaEstados',CASE WHEN v_discrepancias>0 THEN
     'Hay estados almacenados que no coinciden con los pagos confirmados. Revisar antes de regularizar; no se modifico el historial.'
     ELSE NULL END);
END;
$fn$;

REVOKE ALL ON FUNCTION public.fn_crm_clasificar_cuota_v1(text,numeric,numeric,date,date)
 FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.fn_crm_clasificar_cuota_v1(text,numeric,numeric,date,date)
 TO sigi_app_user;
REVOKE ALL ON FUNCTION public.sp_crm_cronograma_venta_v4(bigint,bigint)
 FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.sp_crm_cronograma_venta_v4(bigint,bigint)
 TO sigi_app_user;
