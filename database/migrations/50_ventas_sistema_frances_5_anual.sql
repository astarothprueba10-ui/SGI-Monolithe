-- MONOLITHE | Sistema frances para NUEVAS ventas: 5% nominal anual fijo.
-- TEM aplicada = 5 / 12 / 100 = 5/1200, sin alterar operaciones previas.
-- Cuota base fija redondeada a centimos; ultima cuota regulariza centimos.
-- Las funciones v7 y los contratos historicos ALEMAN_* se conservan.

CREATE OR REPLACE FUNCTION public.fn_crm_simular_frances_v1(
 p_precio numeric, p_reserva numeric, p_inicial_adicional numeric,
 p_cuotas integer, p_tasa_mensual_pct numeric
)
RETURNS jsonb LANGUAGE plpgsql IMMUTABLE
SET search_path TO 'pg_catalog','public','pg_temp'
AS $function$
DECLARE
 v_capital numeric(14,2);
 v_saldo numeric(14,2);
 v_tasa numeric;
 v_cuota_base numeric(14,2);
 v_amortizacion numeric(14,2);
 v_interes numeric(14,2);
 v_cuota numeric(14,2);
 v_total_intereses numeric(14,2):=0;
 v_i integer;
 v_items jsonb:='[]'::jsonb;
BEGIN
  IF p_precio IS NULL OR p_precio<=0 OR p_precio<>round(p_precio,2)
    OR p_reserva IS NULL OR p_reserva<0 OR p_reserva<>round(p_reserva,2)
    OR p_inicial_adicional IS NULL OR p_inicial_adicional<5000
    OR p_inicial_adicional<>round(p_inicial_adicional,2)
    OR p_reserva+p_inicial_adicional>=p_precio
    OR p_cuotas IS NULL OR p_cuotas NOT BETWEEN 1 AND 36
    OR p_tasa_mensual_pct IS DISTINCT FROM (5::numeric/12)
  THEN
     RAISE EXCEPTION 'FINANCIAMIENTO_INVALIDO|Revise inicial, reserva, plazo y tasa fija del 5%% anual.';
  END IF;

  v_capital:=p_precio-p_reserva-p_inicial_adicional;
  v_saldo:=v_capital;
  v_tasa:=p_tasa_mensual_pct/100;
  v_cuota_base:=round(v_capital *
     (v_tasa * power(1+v_tasa,p_cuotas)) /
     (power(1+v_tasa,p_cuotas)-1),2);

  FOR v_i IN 1..p_cuotas LOOP
     v_interes:=round(v_saldo*v_tasa,2);
     IF v_i=p_cuotas THEN
        v_amortizacion:=v_saldo;
        v_cuota:=v_amortizacion+v_interes;
     ELSE
        v_cuota:=v_cuota_base;
        v_amortizacion:=v_cuota-v_interes;
     END IF;
     IF v_amortizacion<=0 OR v_amortizacion>v_saldo OR v_cuota<=0 THEN
         RAISE EXCEPTION 'PLAN_INCONSISTENTE|La cuota francesa excede el capital o no amortiza.';
     END IF;
     v_saldo:=round(v_saldo-v_amortizacion,2);
     v_total_intereses:=v_total_intereses+v_interes;
     v_items:=v_items||jsonb_build_array(jsonb_build_object(
        'numero',v_i,
        'capital',v_amortizacion,
        'interes',v_interes,
        'cuota',v_cuota,
        'saldo',v_saldo
     ));
  END LOOP;

  IF v_saldo<>0 THEN
     RAISE EXCEPTION 'PLAN_INCONSISTENTE|El plan frances deja saldo pendiente.';
  END IF;

  RETURN jsonb_build_object(
     'sistema','FRANCES',
     'tasaAnualPct',5,
     'tasaMensualPct',p_tasa_mensual_pct,
     'cuotaMensual',v_cuota_base,
     'capitalFinanciado',v_capital,
     'interesTotal',v_total_intereses,
     'totalCuotas',v_capital+v_total_intereses,
     'totalOperacion',p_precio+v_total_intereses,
     'cuotas',v_items
  );
END $function$;

-- Nuevo contrato SQL v8, sin sobrescribir el v7 usado en planes alemanes.
DO $patch$
DECLARE v_def text;
BEGIN
  SELECT pg_get_functiondef(oid) INTO STRICT v_def
  FROM pg_proc WHERE pronamespace='public'::regnamespace
    AND proname='sp_crm_validar_formalizacion_v7';
  IF strpos(v_def,'planAleman')=0 OR strpos(v_def,'fn_crm_simular_aleman_v1')=0 THEN
     RAISE EXCEPTION 'MIGRACION_INCOMPATIBLE|Cambio en validacion v7.';
  END IF;
  v_def:=replace(v_def,'sp_crm_validar_formalizacion_v7(','sp_crm_validar_formalizacion_v8(');
  v_def:=replace(v_def,'fn_crm_simular_aleman_v1','fn_crm_simular_frances_v1');
  v_def:=replace(v_def,'''planAleman''','''planFrances''');
  EXECUTE v_def;

  SELECT pg_get_functiondef(oid) INTO STRICT v_def
  FROM pg_proc WHERE pronamespace='public'::regnamespace
    AND proname='sp_crm_registrar_venta_pendiente_v7';
  IF strpos(v_def,'sp_crm_validar_formalizacion_v7')=0
      OR strpos(v_def,'ALEMAN_ANUAL_FIJA_5_V1')=0 THEN
     RAISE EXCEPTION 'MIGRACION_INCOMPATIBLE|Cambio en registro v7.';
  END IF;
  v_def:=replace(v_def,'sp_crm_registrar_venta_pendiente_v7(','sp_crm_registrar_venta_pendiente_v8(');
  v_def:=replace(v_def,'sp_crm_validar_formalizacion_v7(','sp_crm_validar_formalizacion_v8(');
  v_def:=replace(v_def,'''planAleman''','''planFrances''');
  v_def:=replace(v_def,'ALEMAN_ANUAL_FIJA_5_V1','FRANCES_ANUAL_FIJA_5_V1');
  v_def:=replace(v_def,'No fue posible asociar el plan alemán','No fue posible asociar el plan francés');
  v_def:=replace(v_def,'Tasa nominal anual fija 5%; mensual 5/12%; reserva e inicial independientes',
       'Cuota fija francesa; tasa nominal anual fija 5%; mensual 5/12%; reserva e inicial independientes');
  EXECUTE v_def;

  SELECT pg_get_functiondef(oid) INTO STRICT v_def
  FROM pg_proc WHERE pronamespace='public'::regnamespace
    AND proname='sp_crm_aprobar_firma_contrato_v6';
  IF strpos(v_def,'v_es_frances boolean;')=0 THEN
     IF strpos(v_def,'  v_tasa_aplicada numeric;')=0 OR
       strpos(v_def,'    v_cuota_base:=trunc(v_capital/v_num_cuotas,2);')=0 OR
       strpos(v_def,'    FOR v_i IN 1..v_num_cuotas LOOP')=0 THEN
       RAISE EXCEPTION 'MIGRACION_INCOMPATIBLE|Cambio en generacion de cuotas de contrato.';
     END IF;

     v_def:=replace(v_def,'  v_tasa_aplicada numeric;',
        '  v_tasa_aplicada numeric;
  v_es_frances boolean;
  v_cuota_francesa numeric;');

     -- Mantener la descripcion de los nuevos planes, sin afectar planes alemanes.
     v_def:=replace(v_def,
       'WHEN descripcion_condiciones LIKE ''ALEMAN_ANUAL_FIJA_5_V1%''',
       'WHEN descripcion_condiciones LIKE ''ALEMAN_ANUAL_FIJA_5_V1%''
            OR descripcion_condiciones LIKE ''FRANCES_ANUAL_FIJA_5_V1%''');

     v_def:=replace(v_def,
       '    v_cuota_base:=trunc(v_capital/v_num_cuotas,2);',
       '    v_cuota_base:=trunc(v_capital/v_num_cuotas,2);
    SELECT pp.descripcion_condiciones LIKE ''FRANCES_ANUAL_FIJA_5_V1%''
      INTO v_es_frances FROM public.pag_planes_pago pp
      WHERE pp.id_plan_pago=v_plan;
    IF v_es_frances THEN
      v_cuota_francesa:=round(
          v_capital*(5::numeric/1200)*power(1+(5::numeric/1200),v_num_cuotas)/
          (power(1+(5::numeric/1200),v_num_cuotas)-1),2);
    END IF;');

     -- Siempre la tasa EXACTA 5/12 para los dos sistemas del 5% anual.
     v_def:=replace(v_def,
       'AND pp.descripcion_condiciones LIKE ''ALEMAN_ANUAL_FIJA_5_V1%''',
       'AND (pp.descripcion_condiciones LIKE ''ALEMAN_ANUAL_FIJA_5_V1%''
         OR pp.descripcion_condiciones LIKE ''FRANCES_ANUAL_FIJA_5_V1%'')');

     v_def:=replace(v_def,
       '      v_importe_cuota:=CASE
        WHEN v_i=v_num_cuotas THEN v_capital-v_cuota_base*(v_num_cuotas-1)
        ELSE v_cuota_base
      END;',
       '      IF v_es_frances THEN
        v_interes_cuota:=round(v_saldo_restante*(5::numeric/1200),2);
        v_importe_cuota:=CASE
          WHEN v_i=v_num_cuotas THEN v_saldo_restante
          ELSE v_cuota_francesa-v_interes_cuota
        END;
      ELSE
        v_importe_cuota:=CASE
          WHEN v_i=v_num_cuotas THEN v_capital-v_cuota_base*(v_num_cuotas-1)
          ELSE v_cuota_base
        END;
      END IF;');
     EXECUTE v_def;
  END IF;
END $patch$;

-- Solo la aplicacion Java puede registrar/validar operaciones.
REVOKE ALL ON FUNCTION public.sp_crm_validar_formalizacion_v8(
 bigint,bigint,bigint,varchar,numeric,numeric,integer,numeric
) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.sp_crm_validar_formalizacion_v8(
 bigint,bigint,bigint,varchar,numeric,numeric,integer,numeric
) TO sigi_app_user;
REVOKE ALL ON FUNCTION public.sp_crm_registrar_venta_pendiente_v8(
 bigint,bigint,bigint,varchar,numeric,numeric,integer,numeric,text
) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.sp_crm_registrar_venta_pendiente_v8(
 bigint,bigint,bigint,varchar,numeric,numeric,integer,numeric,text
) TO sigi_app_user;
