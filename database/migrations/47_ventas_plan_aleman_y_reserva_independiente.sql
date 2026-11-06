-- SGI MONOLITHE | Financiamiento alemán con reserva e inicial independientes.
-- No modifica planes existentes ni genera cuotas hasta aprobar el contrato.
ALTER TABLE public.pag_planes_pago
 ADD COLUMN IF NOT EXISTS monto_reserva_aplicada numeric(14,2) NOT NULL DEFAULT 0;

ALTER TABLE public.pag_planes_pago
 DROP CONSTRAINT IF EXISTS chk_pag_planes_pago_capital_calculado;

ALTER TABLE public.pag_planes_pago
 ADD CONSTRAINT chk_pag_planes_pago_capital_calculado
 CHECK (capital_financiado = monto_venta - monto_inicial - monto_reserva_aplicada);

ALTER TABLE public.pag_planes_pago
 ADD CONSTRAINT chk_pag_planes_pago_reserva_aplicada
 CHECK (monto_reserva_aplicada >= 0 AND monto_reserva_aplicada <= monto_venta);

CREATE OR REPLACE FUNCTION public.sp_crm_registrar_venta_pendiente_v7(
 p_actor bigint, p_prospecto bigint, p_lote bigint,
 p_modalidad varchar, p_monto_total numeric,
 p_monto_inicial numeric,p_numero_cuotas integer,
 p_tasa_mensual_pct numeric, p_observaciones text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'pg_catalog','public','pg_temp'
AS $function$
DECLARE
 v_ctx jsonb;
 v_resultado jsonb;
 v_plan jsonb;
 v_id_plan bigint;
 v_reserva numeric;
BEGIN
 -- La validación v7 aplica el alcance comercial, precio y titular de reserva.
 v_ctx:=public.sp_crm_validar_formalizacion_v7(
   p_actor,p_prospecto,p_lote,p_modalidad,p_monto_total,
   p_monto_inicial,p_numero_cuotas,p_tasa_mensual_pct);
 v_reserva:=(v_ctx->>'montoReservaAplicable')::numeric;
 v_plan:=v_ctx->'planAleman';

 -- La versión estable v6 registra venta y contrato pendiente de firma.
 v_resultado:=public.sp_crm_registrar_venta_pendiente_v6(
   p_actor,p_prospecto,p_lote,p_modalidad,p_monto_total,
   p_monto_inicial,p_numero_cuotas,p_observaciones);

 IF p_modalidad='FINANCIADA' THEN
   v_id_plan:=(v_resultado->>'idPlanPago')::bigint;
   IF v_id_plan IS NULL OR v_plan IS NULL OR v_plan='null'::jsonb THEN
     RAISE EXCEPTION 'PLAN_INCONSISTENTE|La venta financiada requiere un plan confirmado.';
   END IF;
   UPDATE public.pag_planes_pago
   SET monto_reserva_aplicada=v_reserva,
       capital_financiado=(v_plan->>'capitalFinanciado')::numeric,
       tasa_interes_pct=p_tasa_mensual_pct,
       monto_interes_total=(v_plan->>'interesTotal')::numeric,
       monto_total_financiado=(v_plan->>'totalCuotas')::numeric,
       descripcion_condiciones='ALEMAN_V1|Tasa nominal mensual; inicial adicional y reserva independientes',
       fecha_actualizacion=now()
   WHERE id_plan_pago=v_id_plan AND id_venta=(v_resultado->>'idVenta')::bigint;
   IF NOT FOUND THEN
      RAISE EXCEPTION 'PLAN_INCONSISTENTE|No fue posible asociar el plan alemán.';
   END IF;
 END IF;
 RETURN v_resultado || jsonb_build_object(
   'montoReservaAplicable',v_reserva,
   'saldoContado',v_ctx->'saldoContado',
   'planAleman',v_plan);
END $function$;

REVOKE ALL ON FUNCTION public.sp_crm_registrar_venta_pendiente_v7(
 bigint,bigint,bigint,varchar,numeric,numeric,integer,numeric,text)
 FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.sp_crm_registrar_venta_pendiente_v7(
 bigint,bigint,bigint,varchar,numeric,numeric,integer,numeric,text)
 TO sigi_app_user;

-- El plan guarda la inicial adicional; en comprobación contractual
-- se suman los S/500 de la reserva una única vez.
DO $patch$
DECLARE v_def text;
BEGIN
 SELECT pg_get_functiondef(oid) INTO STRICT v_def FROM pg_proc
 WHERE pronamespace='public'::regnamespace
   AND proname='sp_crm_aprobar_firma_contrato_v6';

 IF strpos(v_def,'v_tasa_mensual numeric;')=0 THEN
  IF strpos(v_def,'  v_cuota_base numeric;')=0 THEN
    RAISE EXCEPTION 'MIGRACION_INCOMPATIBLE|No se encontro declaracion de cuotas.';
  END IF;
  v_def:=replace(v_def,'  v_cuota_base numeric;',
    '  v_cuota_base numeric;
  v_tasa_mensual numeric;
  v_saldo_restante numeric;
  v_interes_cuota numeric;
  v_interes_acumulado numeric;
  v_interes_previsto numeric;');
 END IF;

 IF strpos(v_def,'p.monto_inicial,p.tasa_interes_pct')=0 THEN
  IF strpos(v_def,'p.monto_venta,p.monto_inicial')=0 THEN
    RAISE EXCEPTION 'MIGRACION_INCOMPATIBLE|No se encontro seleccion de plan.';
  END IF;
  v_def:=replace(v_def,'p.monto_venta,p.monto_inicial',
    'p.monto_venta,p.monto_inicial+p.monto_reserva_aplicada,p.tasa_interes_pct,p.monto_interes_total');
  v_def:=replace(v_def,
    'INTO v_plan,v_estado_plan,v_num_cuotas,v_capital,v_monto_plan,v_inicial',
    'INTO v_plan,v_estado_plan,v_num_cuotas,v_capital,v_monto_plan,v_inicial,v_tasa_mensual,v_interes_previsto');
 END IF;

 IF strpos(v_def,'v_saldo_restante:=v_capital;')=0 THEN
  IF strpos(v_def,'    v_cuota_base:=trunc(v_capital/v_num_cuotas,2);')=0 THEN
     RAISE EXCEPTION 'MIGRACION_INCOMPATIBLE|No se encontro amortizacion de capital.';
  END IF;
  v_def:=replace(v_def,
    '    v_cuota_base:=trunc(v_capital/v_num_cuotas,2);',
    '    v_cuota_base:=trunc(v_capital/v_num_cuotas,2);
    v_saldo_restante:=v_capital;
    v_interes_acumulado:=0;');
  v_def:=replace(v_def,
    '      INSERT INTO public.pag_cuotas(',
    '      v_interes_cuota:=round(v_saldo_restante*coalesce(v_tasa_mensual,0)/100,2);
      v_saldo_restante:=round(v_saldo_restante-v_importe_cuota,2);
      v_interes_acumulado:=v_interes_acumulado+v_interes_cuota;

      INSERT INTO public.pag_cuotas(');
  v_def:=replace(v_def,
    '        v_importe_cuota,0,v_importe_cuota,',
    '        v_importe_cuota,v_interes_cuota,v_importe_cuota+v_interes_cuota,');
  v_def:=replace(v_def,
    '    END LOOP;
  END IF;

  UPDATE public.ven_contratos_archivos',
    '    END LOOP;
    IF v_interes_acumulado<>coalesce(v_interes_previsto,0)
       OR v_saldo_restante<>0 THEN
      RAISE EXCEPTION ''PLAN_INCONSISTENTE|Intereses del cronograma no coinciden con el plan pactado.'';
    END IF;
  END IF;

  UPDATE public.ven_contratos_archivos');
 END IF;
 EXECUTE v_def;

 -- La aplicación contable computa el abono existente dentro de los
 -- créditos de la compra pero mantiene la inicial adicional pendiente.
 SELECT pg_get_functiondef(oid) INTO STRICT v_def FROM pg_proc
 WHERE pronamespace='public'::regnamespace
   AND proname='sp_crm_aplicar_separacion_a_venta_v1';
 IF strpos(v_def,'pl.monto_inicial+pl.monto_reserva_aplicada')=0 THEN
   IF strpos(v_def,'pl.monto_inicial,pl.capital_financiado,ep.codigo')=0 THEN
     RAISE EXCEPTION 'MIGRACION_INCOMPATIBLE|No se encontro conciliacion de reserva.';
   END IF;
   v_def:=replace(v_def,
     'pl.monto_inicial,pl.capital_financiado,ep.codigo',
     'pl.monto_inicial+pl.monto_reserva_aplicada,pl.capital_financiado,ep.codigo');
 END IF;
 EXECUTE v_def;
END $patch$;
