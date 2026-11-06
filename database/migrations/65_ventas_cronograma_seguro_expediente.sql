-- CRM Compradores | Cronogramas reales y proyección explícita cuando el plan aún no tiene cuotas.
-- Proyecciones francesas NO sustituyen cuotas exigibles ni contratos aprobados.
CREATE OR REPLACE FUNCTION public.sp_crm_cronograma_venta_v1(
 p_actor bigint,p_venta bigint
) RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog','public','pg_temp'
AS $fn$
DECLARE
 v_plan public.pag_planes_pago%ROWTYPE;
 v_codigo text;
 v_cuotas jsonb;
 v_registros integer;
 v_mensual numeric;
 v_interes numeric;
BEGIN
 IF NOT coalesce(public.fn_crm_puede_consultar_venta_v1(p_actor,p_venta),false)
 THEN RAISE EXCEPTION 'VENTA_NO_DISPONIBLE|Venta fuera de su cartera autorizada.'; END IF;
 SELECT codigo INTO v_codigo FROM public.ven_ventas WHERE id_venta=p_venta;
 SELECT * INTO v_plan FROM public.pag_planes_pago
  WHERE id_venta=p_venta
  ORDER BY es_vigente DESC,numero_version DESC,id_plan_pago DESC LIMIT 1;
 IF v_plan.id_plan_pago IS NULL THEN
  RETURN jsonb_build_object('idVenta',p_venta,'codigoVenta',v_codigo,
   'tipoCronograma','SIN_PLAN','items','[]'::jsonb);
 END IF;
 SELECT count(*) INTO v_registros FROM public.pag_cuotas WHERE id_plan_pago=v_plan.id_plan_pago;
 IF v_registros>0 THEN
  SELECT coalesce(jsonb_agg(jsonb_build_object(
    'numero',c.numero_cuota,
    'fechaVencimiento',to_char(c.fecha_vencimiento,'YYYY-MM-DD'),
    'capital',c.monto_capital,'interes',c.monto_interes,
    'cuota',c.monto_cuota,'estado',est.codigo,
    'fechaPagoCompleto',c.fecha_pago_completo
   ) ORDER BY c.numero_cuota),'[]'::jsonb)
  INTO v_cuotas FROM public.pag_cuotas c
  JOIN public.cfg_estados_cuota est ON est.id_estado_cuota=c.id_estado_cuota
  WHERE c.id_plan_pago=v_plan.id_plan_pago;
  RETURN jsonb_build_object('idVenta',p_venta,'codigoVenta',v_codigo,
   'codigoPlan',v_plan.codigo,'tipoCronograma','REGISTRADO',
   'numeroCuotas',v_plan.numero_cuotas,'capitalFinanciado',v_plan.capital_financiado,
   'fechaPrimeraCuota',v_plan.fecha_primera_cuota,
   'items',v_cuotas);
 END IF;
 IF v_plan.fecha_primera_cuota IS NULL OR v_plan.capital_financiado<=0
    OR v_plan.numero_cuotas NOT BETWEEN 1 AND 36
    OR v_plan.descripcion_condiciones NOT LIKE 'FRANCES_ANUAL_FIJA_10_%'
 THEN
  RETURN jsonb_build_object('idVenta',p_venta,'codigoVenta',v_codigo,
   'codigoPlan',v_plan.codigo,'tipoCronograma','SIN_CUOTAS',
   'numeroCuotas',v_plan.numero_cuotas,
   'fechaPrimeraCuota',v_plan.fecha_primera_cuota,
   'items','[]'::jsonb);
 END IF;
 v_interes:=10::numeric/1200;
 v_mensual:=round(v_plan.capital_financiado*v_interes/
         (1-power(1+v_interes,-v_plan.numero_cuotas)),2);
 SELECT coalesce(jsonb_agg(jsonb_build_object(
  'numero',n,
  'fechaVencimiento',to_char((v_plan.fecha_primera_cuota+
    make_interval(months=>n-1))::date,'YYYY-MM-DD'),
  'capital',CASE WHEN n=v_plan.numero_cuotas THEN saldo_inicial
    ELSE round(v_mensual-round(saldo_inicial*v_interes,2),2) END,
  'interes',round(saldo_inicial*v_interes,2),
  'cuota',CASE WHEN n=v_plan.numero_cuotas THEN
    saldo_inicial+round(saldo_inicial*v_interes,2) ELSE v_mensual END,
  'estado','PROYECTADA'
 ) ORDER BY n),'[]'::jsonb) INTO v_cuotas
 FROM (
  SELECT g.n,
  round(v_plan.capital_financiado*power(1+v_interes,g.n-1)-
    v_mensual*(power(1+v_interes,g.n-1)-1)/v_interes,2) saldo_inicial
  FROM generate_series(1,v_plan.numero_cuotas) AS g(n)
 ) s;
 RETURN jsonb_build_object('idVenta',p_venta,'codigoVenta',v_codigo,
   'codigoPlan',v_plan.codigo,'tipoCronograma','PROYECTADO',
   'numeroCuotas',v_plan.numero_cuotas,
   'capitalFinanciado',v_plan.capital_financiado,
   'fechaPrimeraCuota',v_plan.fecha_primera_cuota,
   'tasaAnualNominal',10,
   'advertencia','Proyección orientativa. Las fechas e importes exigibles dependen del contrato firmado y el cronograma aprobado.',
   'items',v_cuotas);
END $fn$;
REVOKE ALL ON FUNCTION public.sp_crm_cronograma_venta_v1(bigint,bigint)
 FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.sp_crm_cronograma_venta_v1(bigint,bigint)
 TO sigi_app_user;