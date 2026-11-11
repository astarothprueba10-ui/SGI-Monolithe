-- SGI-MONOLITHE · Sprint 4 · 5.2.3
-- Generacion de cronograma de cuotas con anclaje a fecha de firma.
-- Requiere la migracion 73. NO reescribe ni recalcula planes historicos.
-- Los contratos pendientes solo reciben PROYECCIONES, sin pag_cuotas.

-- Motor inmutable reutilizado por la proyeccion y por la aprobacion de firma.
-- Vencimiento i = fecha_base + i meses (NO fecha_primera_cuota + i-1 meses).
-- Ej.: firma 31/01/2028 -> 29/02/2028, 31/03/2028, 30/04/2028.
CREATE OR REPLACE FUNCTION public.fn_crm_generar_cronograma_frances_v2(
 p_precio numeric,p_reserva_aplicada numeric,p_inicial_adicional numeric,
 p_numero_cuotas integer,p_fecha_base date)
RETURNS jsonb
LANGUAGE plpgsql IMMUTABLE
SET search_path TO 'pg_catalog','public','pg_temp'
AS $func$
DECLARE
 v_calculo jsonb;
 v_items jsonb;
 v_fecha_primera date;
BEGIN
 IF p_fecha_base IS NULL THEN
   RAISE EXCEPTION 'FECHA_INVALIDA|Se requiere fecha base del cronograma.';
 END IF;
 v_calculo:=public.fn_crm_simular_frances_v3(
   p_precio,p_reserva_aplicada,p_inicial_adicional+p_reserva_aplicada,
   p_numero_cuotas,10::numeric/12
 );
 SELECT COALESCE(jsonb_agg(
   jsonb_build_object(
     'numero',(cuota->>'numero')::integer,
     'fechaVencimiento',to_char(
       (p_fecha_base + make_interval(months=>(cuota->>'numero')::integer))::date,
       'YYYY-MM-DD'),
     'capital',cuota->'capital',
     'interes',cuota->'interes',
     'cuota',cuota->'cuota',
     'saldo',cuota->'saldo',
     'estado','PROYECTADA'
   ) ORDER BY (cuota->>'numero')::integer
 ),'[]'::jsonb) INTO v_items
 FROM jsonb_array_elements(v_calculo->'cuotas') cuota;
 v_fecha_primera:=(p_fecha_base+make_interval(months=>1))::date;
 RETURN jsonb_build_object(
   'fechaBase',p_fecha_base,
   'fechaPrimeraCuota',to_char(v_fecha_primera,'YYYY-MM-DD'),
   'numeroCuotas',p_numero_cuotas,
   'capitalFinanciado',v_calculo->'capitalFinanciado',
   'interesTotal',v_calculo->'interesTotal',
   'totalCuotas',v_calculo->'totalCuotas',
   'cuotaMensual',v_calculo->'cuotaMensual',
   'items',v_items
 );
END;
$func$;

-- Nueva lectura segura; deja intacta la funcion anterior V2.
CREATE OR REPLACE FUNCTION public.sp_crm_cronograma_venta_v3(
 p_actor bigint,p_venta bigint)
RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path TO 'pg_catalog','public','pg_temp'
AS $func$
DECLARE
 v_plan public.pag_planes_pago%ROWTYPE;
 v_codigo text;
 v_estado_plan text;
 v_cuotas jsonb;
 v_registros integer;
 v_calculo jsonb;
 v_fecha_base date;
 v_tasa numeric:=10::numeric/1200;
 v_mensual numeric;
BEGIN
 IF NOT COALESCE(public.fn_crm_puede_consultar_venta_v1(p_actor,p_venta),false)
 THEN
   RAISE EXCEPTION 'VENTA_NO_DISPONIBLE|Venta fuera de su cartera autorizada.';
 END IF;
 SELECT codigo INTO v_codigo FROM public.ven_ventas WHERE id_venta=p_venta;
 SELECT * INTO v_plan FROM public.pag_planes_pago
 WHERE id_venta=p_venta ORDER BY es_vigente DESC,numero_version DESC,id_plan_pago DESC
 LIMIT 1;
 IF v_plan.id_plan_pago IS NULL THEN
   RETURN jsonb_build_object('idVenta',p_venta,'codigoVenta',v_codigo,
     'tipoCronograma','SIN_PLAN','items','[]'::jsonb);
 END IF;
 SELECT codigo INTO v_estado_plan FROM public.cfg_estados_plan_pago
 WHERE id_estado_plan_pago=v_plan.id_estado_plan_pago;
 SELECT count(*) INTO v_registros FROM public.pag_cuotas
 WHERE id_plan_pago=v_plan.id_plan_pago;
 IF v_registros>0 THEN
   SELECT COALESCE(jsonb_agg(jsonb_build_object(
     'numero',c.numero_cuota,
     'fechaVencimiento',to_char(c.fecha_vencimiento,'YYYY-MM-DD'),
     'capital',c.monto_capital,'interes',c.monto_interes,
     'cuota',c.monto_cuota,'estado',e.codigo,
     'fechaPagoCompleto',c.fecha_pago_completo
   ) ORDER BY c.numero_cuota),'[]'::jsonb)
   INTO v_cuotas FROM public.pag_cuotas c
   JOIN public.cfg_estados_cuota e ON e.id_estado_cuota=c.id_estado_cuota
   WHERE c.id_plan_pago=v_plan.id_plan_pago;
   RETURN jsonb_build_object(
     'idVenta',p_venta,'codigoVenta',v_codigo,'codigoPlan',v_plan.codigo,
     'tipoCronograma','REGISTRADO','numeroCuotas',v_plan.numero_cuotas,
     'capitalFinanciado',v_plan.capital_financiado,
     'interesTotal',v_plan.monto_interes_total,
     'totalCuotas',v_plan.monto_total_financiado,
     'fechaPrimeraCuota',v_plan.fecha_primera_cuota,
     'items',v_cuotas);
 END IF;

 -- Nunca mostrar como exigible un plan pendiente y nunca presentar un
 -- plan activo SIN cuotas como si fuera una proyeccion valida.
 IF v_estado_plan IS DISTINCT FROM 'PENDIENTE'
    OR v_plan.fecha_primera_cuota IS NULL
    OR v_plan.capital_financiado<=0
    OR v_plan.numero_cuotas NOT BETWEEN 1 AND 36
    OR v_plan.descripcion_condiciones NOT LIKE 'FRANCES_ANUAL_FIJA_10_%'
 THEN
   RETURN jsonb_build_object(
     'idVenta',p_venta,'codigoVenta',v_codigo,'codigoPlan',v_plan.codigo,
     'tipoCronograma','SIN_CUOTAS',
     'numeroCuotas',v_plan.numero_cuotas,
     'fechaPrimeraCuota',v_plan.fecha_primera_cuota,
     'items','[]'::jsonb);
 END IF;

 v_fecha_base:=coalesce(v_plan.fecha_inicio,
        (v_plan.fecha_primera_cuota-interval '1 month')::date);
 IF v_plan.descripcion_condiciones LIKE 'FRANCES_ANUAL_FIJA_10_V2%' THEN
   v_calculo:=public.fn_crm_generar_cronograma_frances_v2(
     v_plan.monto_venta,v_plan.monto_reserva_aplicada,v_plan.monto_inicial,
     v_plan.numero_cuotas,v_fecha_base);
   IF (v_calculo->>'capitalFinanciado')::numeric<>v_plan.capital_financiado
      OR (v_calculo->>'interesTotal')::numeric<>v_plan.monto_interes_total
      OR (v_calculo->>'totalCuotas')::numeric<>v_plan.monto_total_financiado
   THEN
      RAISE EXCEPTION 'PLAN_INCONSISTENTE|El cronograma proyectado no coincide con el plan pactado.';
   END IF;
   RETURN jsonb_build_object(
     'idVenta',p_venta,'codigoVenta',v_codigo,'codigoPlan',v_plan.codigo,
     'tipoCronograma','PROYECTADO','numeroCuotas',v_plan.numero_cuotas,
     'capitalFinanciado',v_plan.capital_financiado,
     'interesTotal',v_plan.monto_interes_total,
     'totalCuotas',v_plan.monto_total_financiado,
     'fechaPrimeraCuota',v_calculo->'fechaPrimeraCuota',
     'tasaAnualNominal',10,
     'advertencia','Proyeccion orientativa no exigible. La aprobacion del contrato fija la fecha base de vencimientos.',
     'items',v_calculo->'items');
 END IF;

 -- La proyeccion de V1 preserva su tasa y redondeo historicos.
 -- Solo se corrige la generacion de fechas: se anclan al primer dia base.
 v_mensual:=round(v_plan.capital_financiado*v_tasa/
     (1-power(1+v_tasa,-v_plan.numero_cuotas)),2);
 WITH RECURSIVE amort(n,saldo_inicio,interes,capital,cuota) AS (
   SELECT 1,(v_plan.capital_financiado+0::numeric),
     round(v_plan.capital_financiado*v_tasa,2),
     CASE WHEN v_plan.numero_cuotas=1 THEN v_plan.capital_financiado
        ELSE round(v_mensual-round(v_plan.capital_financiado*v_tasa,2),2) END,
     CASE WHEN v_plan.numero_cuotas=1 THEN
       v_plan.capital_financiado+round(v_plan.capital_financiado*v_tasa,2)
       ELSE v_mensual END
   UNION ALL
   SELECT a.n+1,r.saldo,round(r.saldo*v_tasa,2),
      CASE WHEN a.n+1=v_plan.numero_cuotas THEN r.saldo
      ELSE least(r.saldo,round(v_mensual-round(r.saldo*v_tasa,2),2)) END,
      CASE WHEN a.n+1=v_plan.numero_cuotas
      THEN r.saldo+round(r.saldo*v_tasa,2) ELSE v_mensual END
   FROM amort a
   CROSS JOIN LATERAL(SELECT greatest(0,a.saldo_inicio-a.capital) saldo) r
   WHERE a.n<v_plan.numero_cuotas
 )
 SELECT COALESCE(jsonb_agg(jsonb_build_object(
   'numero',n,
   'fechaVencimiento',to_char((v_fecha_base+make_interval(months=>n))::date,'YYYY-MM-DD'),
   'capital',capital,'interes',interes,'cuota',cuota,'estado','PROYECTADA'
 ) ORDER BY n),'[]'::jsonb) INTO v_cuotas
 FROM amort;
 RETURN jsonb_build_object(
   'idVenta',p_venta,'codigoVenta',v_codigo,'codigoPlan',v_plan.codigo,
   'tipoCronograma','PROYECTADO','numeroCuotas',v_plan.numero_cuotas,
   'capitalFinanciado',v_plan.capital_financiado,
   'fechaPrimeraCuota',to_char((v_fecha_base+interval '1 month')::date,'YYYY-MM-DD'),
   'tasaAnualNominal',10,
   'advertencia','Proyeccion historica no exigible. Las cuotas definitivas requieren aprobacion de firma.',
   'items',v_cuotas);
END;
$func$;

-- Version V8 de aprobacion: reutiliza toda la autorizacion/documentacion de
-- V7. Solo reemplaza el calculo/INSERT de cuotas para planes V2; V1 queda igual.
DO $clonar$
DECLARE
 v_def text;
 v_inicio integer;
 v_fin integer;
 v_legado text;
 v_nuevo text;
BEGIN
 SELECT pg_get_functiondef(oid) INTO STRICT v_def
 FROM pg_proc WHERE pronamespace='public'::regnamespace
   AND proname='sp_crm_aprobar_firma_contrato_v7';
 v_inicio:=strpos(v_def,'    v_cuota_base:=trunc(v_capital/v_num_cuotas,2);');
 v_fin:=strpos(v_def,'    IF v_interes_acumulado<>coalesce(v_interes_previsto,0)');
 IF v_inicio=0 OR v_fin<=v_inicio
   OR strpos(v_def,'sp_crm_aprobar_firma_contrato_v7(')=0
   OR strpos(v_def,'  v_es_frances boolean;')=0
 THEN RAISE EXCEPTION 'MIGRACION_INCOMPATIBLE|Aprobacion V7 no coincide con codigo auditado.'; END IF;
 v_legado:=substr(v_def,v_inicio,v_fin-v_inicio);
 v_def:=replace(v_def,'sp_crm_aprobar_firma_contrato_v7(',
    'sp_crm_aprobar_firma_contrato_v8(');
 v_def:=replace(v_def,'  v_es_frances boolean;',
    '  v_es_frances boolean;'||E'\n'||
    '  v_programado jsonb;'||E'\n'||
    '  v_fila_programada jsonb;'||E'\n'||
    '  v_precio_base numeric;'||E'\n'||
    '  v_inicial_adicional numeric;'||E'\n'||
    '  v_reserva_base numeric;');
 v_nuevo:=$bloque$
    IF EXISTS(
      SELECT 1 FROM public.pag_planes_pago
      WHERE id_plan_pago=v_plan AND descripcion_condiciones LIKE 'FRANCES_ANUAL_FIJA_10_V2%'
    ) THEN
      SELECT monto_venta,monto_inicial,monto_reserva_aplicada
      INTO STRICT v_precio_base,v_inicial_adicional,v_reserva_base
      FROM public.pag_planes_pago WHERE id_plan_pago=v_plan;
      v_programado:=public.fn_crm_generar_cronograma_frances_v2(
        v_precio_base,v_reserva_base,v_inicial_adicional,
        v_num_cuotas,p_fecha_firma);
      IF (v_programado->>'capitalFinanciado')::numeric<>v_capital
         OR (v_programado->>'interesTotal')::numeric<>COALESCE(v_interes_previsto,0)
         OR (v_programado->>'fechaPrimeraCuota')::date<>v_primer_vencimiento
         OR jsonb_array_length(v_programado->'items')<>v_num_cuotas
      THEN
        RAISE EXCEPTION 'PLAN_INCONSISTENTE|Cronograma definitivo distinto al plan firmado.';
      END IF;
      FOR v_i IN 1..v_num_cuotas LOOP
        v_fila_programada:=v_programado->'items'->(v_i-1);
        INSERT INTO public.pag_cuotas(
          id_plan_pago,id_estado_cuota,numero_cuota,
          fecha_vencimiento,monto_capital,monto_interes,
          monto_cuota,observaciones
        ) VALUES(
          v_plan,v_id_estado_cuota_pendiente,v_i,
          (v_fila_programada->>'fechaVencimiento')::date,
          (v_fila_programada->>'capital')::numeric,
          (v_fila_programada->>'interes')::numeric,
          (v_fila_programada->>'cuota')::numeric,
          'Cuota generada por contrato firmado - sistema frances V2'
        );
        v_cuotas_creadas:=v_cuotas_creadas+1;
      END LOOP;
      v_interes_acumulado:=(v_programado->>'interesTotal')::numeric;
      v_saldo_restante:=0;
    ELSE
$bloque$||v_legado||$bloque$
    END IF;
$bloque$;
 v_def:=substr(v_def,1,v_inicio-1)||v_nuevo||substr(v_def,v_fin);
 EXECUTE v_def;
END;
$clonar$;

-- Solo el rol interno de Core Service accede a funciones versionadas.
REVOKE ALL ON FUNCTION public.fn_crm_generar_cronograma_frances_v2(numeric,numeric,numeric,integer,date)
 FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.fn_crm_generar_cronograma_frances_v2(numeric,numeric,numeric,integer,date)
 TO sigi_app_user;
REVOKE ALL ON FUNCTION public.sp_crm_cronograma_venta_v3(bigint,bigint)
 FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.sp_crm_cronograma_venta_v3(bigint,bigint)
 TO sigi_app_user;
REVOKE ALL ON FUNCTION public.sp_crm_aprobar_firma_contrato_v8(bigint,bigint,bigint,date,boolean,varchar)
 FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.sp_crm_aprobar_firma_contrato_v8(bigint,bigint,bigint,date,boolean,varchar)
 TO sigi_app_user;
