-- SGI MONOLITHE | Ventas - reservas elegibles y simulacion financiera.
-- Los datos de reserva solo se consultan dentro del alcance del actor.
CREATE OR REPLACE FUNCTION public.sp_crm_reservas_vigentes_para_venta_v1(
    p_actor bigint, p_prospecto bigint
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'pg_catalog','public','pg_temp'
AS $function$
DECLARE
  v_autorizado jsonb;
  v_reservas jsonb;
BEGIN
  v_autorizado := public.sp_crm_listar_lotes_reservados_prospecto_v1(
      p_actor,p_prospecto);
  SELECT coalesce(jsonb_agg(jsonb_build_object(
      'idReserva',r.id_reserva,'codigoReserva',r.codigo,
      'idLote',l.id_lote,'idProyecto',l.id_proyecto,'idEtapa',l.id_etapa,
      'montoReserva',round(r.monto_reserva,2),
      'fechaVencimiento',r.fecha_vencimiento
  ) ORDER BY r.fecha_reserva DESC,r.id_reserva DESC),'[]'::jsonb)
  INTO v_reservas
  FROM public.ven_reservas r
  JOIN public.inm_lotes l ON l.id_lote=r.id_lote
  JOIN public.crm_prospectos p ON p.id_persona=r.id_persona
  JOIN public.cfg_estados_reserva e ON e.id_estado_reserva=r.id_estado_reserva
  WHERE p.id_prospecto=p_prospecto
    AND e.codigo='VIGENTE' AND r.fecha_vencimiento>now()
    AND l.id_lote IN (
      SELECT (x)::bigint
      FROM jsonb_array_elements_text(v_autorizado->'idLotes') x
    );
  RETURN jsonb_build_object('reservas',v_reservas,
                            'idLotes',v_autorizado->'idLotes');
END $function$;

REVOKE ALL ON FUNCTION public.sp_crm_reservas_vigentes_para_venta_v1(bigint,bigint)
FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.sp_crm_reservas_vigentes_para_venta_v1(bigint,bigint)
TO sigi_app_user;

-- Simulacion monetaria determinista en centimos, sin crear cuotas exigibles.
-- Se introduce la tasa mensual manualmente: no se presume una tasa empresarial.
CREATE OR REPLACE FUNCTION public.fn_crm_simular_aleman_v1(
  p_precio numeric,
  p_reserva numeric,
  p_inicial_adicional numeric,
  p_cuotas integer,
  p_tasa_mensual_pct numeric
)
RETURNS jsonb
LANGUAGE plpgsql
IMMUTABLE SECURITY INVOKER
SET search_path TO 'pg_catalog','public','pg_temp'
AS $function$
DECLARE
 v_capital numeric;
 v_saldo numeric;
 v_amortizacion_base numeric;
 v_amortizacion numeric;
 v_interes numeric;
 v_suma_intereses numeric := 0;
 v_i integer;
 v_items jsonb := '[]'::jsonb;
BEGIN
  IF p_precio IS NULL OR p_precio<=0 OR p_precio<>round(p_precio,2)
   OR p_reserva IS NULL OR p_reserva<0 OR p_reserva<>round(p_reserva,2)
   OR p_inicial_adicional IS NULL OR p_inicial_adicional<0
   OR p_inicial_adicional<>round(p_inicial_adicional,2)
   OR p_cuotas IS NULL OR p_cuotas NOT BETWEEN 1 AND 36
   OR p_tasa_mensual_pct IS NULL OR p_tasa_mensual_pct<=0
   OR p_tasa_mensual_pct>100 OR p_tasa_mensual_pct<>round(p_tasa_mensual_pct,4)
   OR p_reserva+p_inicial_adicional>=p_precio
  THEN
    RAISE EXCEPTION 'FINANCIAMIENTO_INVALIDO|Revise precio, reserva, inicial, cuotas y tasa mensual.';
  END IF;
  v_capital:=p_precio-p_reserva-p_inicial_adicional;
  v_saldo:=v_capital;
  v_amortizacion_base:=trunc(v_capital/p_cuotas,2);
  FOR v_i IN 1..p_cuotas LOOP
    v_amortizacion:=CASE WHEN v_i=p_cuotas
      THEN v_saldo ELSE v_amortizacion_base END;
    v_interes:=round(v_saldo*p_tasa_mensual_pct/100,2);
    v_saldo:=round(v_saldo-v_amortizacion,2);
    v_suma_intereses:=v_suma_intereses+v_interes;
    v_items:=v_items || jsonb_build_array(jsonb_build_object(
       'numero',v_i,'capital',v_amortizacion,'interes',v_interes,
       'cuota',v_amortizacion+v_interes,'saldo',v_saldo));
  END LOOP;
  RETURN jsonb_build_object(
      'capitalFinanciado',v_capital,
      'interesTotal',v_suma_intereses,
      'totalCuotas',v_capital+v_suma_intereses,
      'totalOperacion',p_precio+v_suma_intereses,
      'tasaMensualPct',p_tasa_mensual_pct,
      'cuotas',v_items
  );
END $function$;

-- Al validar el sistema, usar el precio oficial y el abono
-- de una reserva VIGENTE del mismo prospecto y del lote seleccionado.
CREATE OR REPLACE FUNCTION public.sp_crm_validar_formalizacion_v7(
  p_actor bigint,
  p_prospecto bigint,
  p_lote bigint,
  p_modalidad varchar,
  p_monto_total numeric,
  p_monto_inicial numeric,
  p_numero_cuotas integer,
  p_tasa_mensual_pct numeric
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'pg_catalog','public','pg_temp'
AS $function$
DECLARE
 v_contexto jsonb;
 v_reserva numeric:=0;
 v_persona bigint;
 v_simulacion jsonb;
BEGIN
  v_contexto:=public.sp_crm_validar_formalizacion_v6(
    p_actor,p_prospecto,p_lote,p_modalidad,p_monto_total,
    p_monto_inicial,p_numero_cuotas
  );
  v_persona:=(v_contexto->>'idPersona')::bigint;

  SELECT r.monto_reserva INTO v_reserva
  FROM public.ven_reservas r
  JOIN public.cfg_estados_reserva er ON er.id_estado_reserva=r.id_estado_reserva
  WHERE r.id_persona=v_persona
    AND r.id_lote=p_lote AND er.codigo='VIGENTE'
    AND r.fecha_vencimiento>now()
  ORDER BY r.fecha_reserva DESC,r.id_reserva DESC LIMIT 1;
  v_reserva:=coalesce(v_reserva,0);
  IF v_reserva<0 OR v_reserva<>round(v_reserva,2)
     OR v_reserva>p_monto_total THEN
    RAISE EXCEPTION 'RESERVA_INVALIDA|Monto de reserva no valido.';
  END IF;

  IF p_modalidad='FINANCIADA' THEN
    IF p_monto_inicial IS NULL OR p_monto_inicial<5000
       OR p_monto_inicial+v_reserva>=p_monto_total THEN
      RAISE EXCEPTION 'INICIAL_INVALIDA|La inicial adicional debe ser al menos S/ 5000 y dejar saldo financiable despues de la reserva.';
    END IF;
    v_simulacion:=public.fn_crm_simular_aleman_v1(
      p_monto_total,v_reserva,p_monto_inicial,p_numero_cuotas,p_tasa_mensual_pct);
  ELSIF p_tasa_mensual_pct IS NOT NULL THEN
    RAISE EXCEPTION 'DATOS_INVALIDOS|La venta al contado no requiere tasa de interes.';
  END IF;

  RETURN v_contexto || jsonb_build_object(
    'montoReservaAplicable',v_reserva,
    'saldoContado',p_monto_total-v_reserva,
    'planAleman',v_simulacion
  );
END $function$;

REVOKE ALL ON FUNCTION public.sp_crm_validar_formalizacion_v7(
  bigint,bigint,bigint,varchar,numeric,numeric,integer,numeric)
FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.sp_crm_validar_formalizacion_v7(
  bigint,bigint,bigint,varchar,numeric,numeric,integer,numeric)
TO sigi_app_user;
