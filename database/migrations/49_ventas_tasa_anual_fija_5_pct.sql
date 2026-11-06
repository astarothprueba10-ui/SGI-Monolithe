-- SGI MONOLITHE | Tasa nominal anual fija del 5% para nuevas ventas financiadas.
-- Equivalente mensual = 5/12 porciento. No modifica planes preexistentes.
-- Todos los cálculos usan el valor exacto 5/12; la tasa informativa del
-- plan se almacena con 6 decimales. Las cuotas decrecen (sistema alemán).
DO $patch$
DECLARE v_def text;
BEGIN
  -- El cálculo mensual debe admitir la tasa racional exacta (5/12).
  SELECT pg_get_functiondef(oid) INTO STRICT v_def
    FROM pg_proc WHERE pronamespace='public'::regnamespace
      AND proname='fn_crm_simular_aleman_v1';
  IF strpos(v_def,'p_tasa_mensual_pct<>round(p_tasa_mensual_pct,4)')>0 THEN
    v_def:=replace(v_def,
      ' OR p_tasa_mensual_pct<>round(p_tasa_mensual_pct,4)','');
    EXECUTE v_def;
  END IF;

  -- El contrato de validación no debe admitir tasas suministradas por el
  -- frontend; solo se calculará la tasa fija en el servidor.
  SELECT pg_get_functiondef(oid) INTO STRICT v_def
    FROM pg_proc WHERE pronamespace='public'::regnamespace
      AND proname='sp_crm_validar_formalizacion_v7';
  IF strpos(v_def,'TASA_FIJA|La tasa de interes anual se calcula')=0 THEN
    IF strpos(v_def,'  v_contexto:=public.sp_crm_validar_formalizacion_v6(')=0
       OR strpos(v_def,'p_numero_cuotas,p_tasa_mensual_pct);')=0 THEN
      RAISE EXCEPTION 'MIGRACION_INCOMPATIBLE|Cambio en validacion de ventas.';
    END IF;
    v_def:=replace(v_def,
      '  v_contexto:=public.sp_crm_validar_formalizacion_v6(',
      '  IF p_tasa_mensual_pct IS NOT NULL THEN
    RAISE EXCEPTION ''TASA_FIJA|La tasa de interes anual se calcula en el servidor y no se puede modificar.'';
  END IF;
  v_contexto:=public.sp_crm_validar_formalizacion_v6(');
    v_def:=replace(v_def,
      'p_numero_cuotas,p_tasa_mensual_pct);',
      'p_numero_cuotas,(5::numeric/12));');
    EXECUTE v_def;
  END IF;

  -- El registro conserva la simulación fija devuelta por la validación.
  -- En adelante la tasa enviada al RPC debe ser NULL.
  SELECT pg_get_functiondef(oid) INTO STRICT v_def
    FROM pg_proc WHERE pronamespace='public'::regnamespace
      AND proname='sp_crm_registrar_venta_pendiente_v7';
  IF strpos(v_def,'ALEMAN_ANUAL_FIJA_5_V1')=0 THEN
    IF strpos(v_def,'tasa_interes_pct=p_tasa_mensual_pct')=0
      OR strpos(v_def,'ALEMAN_V1|Tasa nominal mensual; inicial adicional y reserva independientes')=0 THEN
      RAISE EXCEPTION 'MIGRACION_INCOMPATIBLE|Cambio en registro de ventas v7.';
    END IF;
    v_def:=replace(v_def,'tasa_interes_pct=p_tasa_mensual_pct',
      'tasa_interes_pct=round(5::numeric/12,6)');
    v_def:=replace(v_def,
      'ALEMAN_V1|Tasa nominal mensual; inicial adicional y reserva independientes',
      'ALEMAN_ANUAL_FIJA_5_V1|Tasa nominal anual fija 5%; mensual 5/12%; reserva e inicial independientes');
    EXECUTE v_def;
  END IF;

  -- Evitar modificar planes antiguos, manteniendo su tasa y condiciones.
  -- Para los nuevos planes se preserva el identificador de tasa fija tras
  -- la firma y se calcula el interés exactamente con 5/12, no con el
  -- redondeo a seis decimales que se muestra en el plan.
  SELECT pg_get_functiondef(oid) INTO STRICT v_def
    FROM pg_proc WHERE pronamespace='public'::regnamespace
      AND proname='sp_crm_aprobar_firma_contrato_v6';
  IF strpos(v_def,'v_tasa_aplicada numeric;')=0 THEN
    IF strpos(v_def,'  v_tasa_mensual numeric;')=0
       OR strpos(v_def,'descripcion_condiciones=''Plan activo desde firma contractual validada''')=0
       OR strpos(v_def,'    v_cuota_base:=trunc(v_capital/v_num_cuotas,2);')=0
       OR strpos(v_def,'v_interes_cuota:=round(v_saldo_restante*coalesce(v_tasa_mensual,0)/100,2);')=0 THEN
      RAISE EXCEPTION 'MIGRACION_INCOMPATIBLE|Cambio en aprobacion contractual.';
    END IF;
    v_def:=replace(v_def,
      '  v_tasa_mensual numeric;',
      '  v_tasa_mensual numeric;
  v_tasa_aplicada numeric;');
    v_def:=replace(v_def,
      'descripcion_condiciones=''Plan activo desde firma contractual validada''',
      'descripcion_condiciones=CASE
          WHEN descripcion_condiciones LIKE ''ALEMAN_ANUAL_FIJA_5_V1%''
            THEN descripcion_condiciones
          ELSE ''Plan activo desde firma contractual validada''
        END');
    v_def:=replace(v_def,
      '    v_cuota_base:=trunc(v_capital/v_num_cuotas,2);',
      '    v_cuota_base:=trunc(v_capital/v_num_cuotas,2);
    v_tasa_aplicada:=CASE
      WHEN EXISTS (
        SELECT 1 FROM public.pag_planes_pago pp
        WHERE pp.id_plan_pago=v_plan
          AND pp.descripcion_condiciones LIKE ''ALEMAN_ANUAL_FIJA_5_V1%''
      ) THEN 5::numeric/12
      ELSE coalesce(v_tasa_mensual,0)
    END;');
    v_def:=replace(v_def,
      'v_interes_cuota:=round(v_saldo_restante*coalesce(v_tasa_mensual,0)/100,2);',
      'v_interes_cuota:=round(v_saldo_restante*v_tasa_aplicada/100,2);');
    EXECUTE v_def;
  END IF;
END $patch$;
