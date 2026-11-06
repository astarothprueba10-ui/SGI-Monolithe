-- SGI MONOLITHE: tasa nominal anual fija de 10% para NUEVAS ventas francesas.
-- Preserva planes historicos alemanes y franceses al 5%.
DO $mig$
DECLARE v_def text; v_inicio text; v_fin text; v_bloque text;
BEGIN
 SELECT pg_get_functiondef(oid) INTO STRICT v_def FROM pg_proc
 WHERE pronamespace='public'::regnamespace AND proname='fn_crm_simular_frances_v1';
 IF strpos(v_def,'p_tasa_mensual_pct IS DISTINCT FROM (5::numeric/12)')=0 THEN
    RAISE EXCEPTION 'MIGRACION_INCOMPATIBLE|Simulador frances modificado.';
 END IF;
 v_def:=replace(v_def,'fn_crm_simular_frances_v1(', 'fn_crm_simular_frances_v2(');
 v_def:=replace(v_def,'p_tasa_mensual_pct IS DISTINCT FROM (5::numeric/12)',
   'p_tasa_mensual_pct IS DISTINCT FROM (10::numeric/12)');
 v_def:=replace(v_def,'''tasaAnualPct'',5','''tasaAnualPct'',10');
 EXECUTE v_def;

 SELECT pg_get_functiondef(oid) INTO STRICT v_def FROM pg_proc
 WHERE pronamespace='public'::regnamespace AND proname='sp_crm_validar_formalizacion_v8';
 IF strpos(v_def,'fn_crm_simular_frances_v1')=0 OR
    strpos(v_def,'p_numero_cuotas,(5::numeric/12)')=0 THEN
    RAISE EXCEPTION 'MIGRACION_INCOMPATIBLE|Validacion francesa v8 modificada.';
 END IF;
 v_def:=replace(v_def,'sp_crm_validar_formalizacion_v8(', 'sp_crm_validar_formalizacion_v9(');
 v_def:=replace(v_def,'fn_crm_simular_frances_v1','fn_crm_simular_frances_v2');
 v_def:=replace(v_def,'p_numero_cuotas,(5::numeric/12)','p_numero_cuotas,(10::numeric/12)');
 EXECUTE v_def;

 SELECT pg_get_functiondef(oid) INTO STRICT v_def FROM pg_proc
 WHERE pronamespace='public'::regnamespace AND proname='sp_crm_registrar_venta_pendiente_v8';
 IF strpos(v_def,'FRANCES_ANUAL_FIJA_5_V1')=0 OR
    strpos(v_def,'sp_crm_validar_formalizacion_v8')=0 THEN
    RAISE EXCEPTION 'MIGRACION_INCOMPATIBLE|Registro frances v8 modificado.';
 END IF;
 v_def:=replace(v_def,'sp_crm_registrar_venta_pendiente_v8(', 'sp_crm_registrar_venta_pendiente_v9(');
 v_def:=replace(v_def,'sp_crm_validar_formalizacion_v8','sp_crm_validar_formalizacion_v9');
 v_def:=replace(v_def,'FRANCES_ANUAL_FIJA_5_V1','FRANCES_ANUAL_FIJA_10_V1');
 v_def:=replace(v_def,'round(5::numeric/12,6)','round(10::numeric/12,6)');
 v_def:=replace(v_def,'tasa nominal anual fija 5%; mensual 5/12%',
   'tasa nominal anual fija 10%; mensual 10/12%');
 EXECUTE v_def;

 SELECT pg_get_functiondef(oid) INTO STRICT v_def FROM pg_proc
 WHERE pronamespace='public'::regnamespace AND proname='sp_crm_aprobar_firma_contrato_v6';

 v_inicio := '    v_cuota_base:=trunc(v_capital/v_num_cuotas,2);';
 v_fin := '    v_saldo_restante:=v_capital;';
 IF strpos(v_def,v_inicio)=0 OR strpos(v_def,v_fin)=0 THEN
    RAISE EXCEPTION 'MIGRACION_INCOMPATIBLE|Bloque cuotas firma modificado.';
 END IF;
 v_bloque := substring(v_def from strpos(v_def,v_inicio)
           for strpos(v_def,v_fin)-strpos(v_def,v_inicio));
 IF strpos(v_bloque,'FRANCES_ANUAL_FIJA_5_V1')=0 THEN
    RAISE EXCEPTION 'MIGRACION_INCOMPATIBLE|No se encontro plan frances historico.';
 END IF;

 v_def := replace(v_def,v_bloque,
   '    v_cuota_base:=trunc(v_capital/v_num_cuotas,2);
    SELECT
      (pp.descripcion_condiciones LIKE ''FRANCES_ANUAL_FIJA_5_V1%''
       OR pp.descripcion_condiciones LIKE ''FRANCES_ANUAL_FIJA_10_V1%''),
      CASE
        WHEN pp.descripcion_condiciones LIKE ''FRANCES_ANUAL_FIJA_10_V1%''
          THEN 10::numeric/12
        WHEN pp.descripcion_condiciones LIKE ''FRANCES_ANUAL_FIJA_5_V1%''
          OR pp.descripcion_condiciones LIKE ''ALEMAN_ANUAL_FIJA_5_V1%''
          THEN 5::numeric/12
        ELSE coalesce(v_tasa_mensual,0)
      END
    INTO v_es_frances,v_tasa_aplicada
    FROM public.pag_planes_pago pp WHERE pp.id_plan_pago=v_plan;
    IF v_es_frances THEN
      v_cuota_francesa:=round(
          v_capital*(v_tasa_aplicada/100)*
          power(1+(v_tasa_aplicada/100),v_num_cuotas)/
          (power(1+(v_tasa_aplicada/100),v_num_cuotas)-1),2);
    END IF;
');
 v_def := replace(v_def,
   'v_interes_cuota:=round(v_saldo_restante*(5::numeric/1200),2);',
   'v_interes_cuota:=round(v_saldo_restante*v_tasa_aplicada/100,2);');
 IF strpos(v_def,'''FRANCES_ANUAL_FIJA_10_V1%''')=0 THEN
   RAISE EXCEPTION 'MIGRACION_INCOMPATIBLE|La aprobacion no reconoce nueva tasa.';
 END IF;
 v_def := replace(v_def,
   'OR descripcion_condiciones LIKE ''FRANCES_ANUAL_FIJA_5_V1%''',
   'OR descripcion_condiciones LIKE ''FRANCES_ANUAL_FIJA_5_V1%''
            OR descripcion_condiciones LIKE ''FRANCES_ANUAL_FIJA_10_V1%''');
 EXECUTE v_def;
END $mig$;

REVOKE ALL ON FUNCTION public.sp_crm_validar_formalizacion_v9(
 bigint,bigint,bigint,varchar,numeric,numeric,integer,numeric)
 FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.sp_crm_validar_formalizacion_v9(
 bigint,bigint,bigint,varchar,numeric,numeric,integer,numeric)
 TO sigi_app_user;
REVOKE ALL ON FUNCTION public.sp_crm_registrar_venta_pendiente_v9(
 bigint,bigint,bigint,varchar,numeric,numeric,integer,numeric,text)
 FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.sp_crm_registrar_venta_pendiente_v9(
 bigint,bigint,bigint,varchar,numeric,numeric,integer,numeric,text)
 TO sigi_app_user;
