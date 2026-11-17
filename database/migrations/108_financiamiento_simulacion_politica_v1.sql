-- SGI MONOLITHE | BLOQUE 2.2
-- Motor francés determinista a partir de política inmutable, tasa NOMINAL anual.
-- El motor histórico 10% permanece disponible para contratos antiguos.

BEGIN;
CREATE FUNCTION public.fn_fin_simular_frances_politica_v1(
 p_precio numeric, p_reserva numeric, p_inicial_total numeric,
 p_cuotas integer, p_id_politica bigint, p_fecha_firma date DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path TO 'pg_catalog','public','pg_temp'
AS $$
DECLARE
 p record;
 v_capital numeric(14,2);
 v_saldo numeric(14,2);
 v_interes numeric(14,2);
 v_amortizacion numeric(14,2);
 v_importe numeric(14,2);
 v_cuota_base numeric(14,2);
 v_intereses numeric(14,2):=0;
 v_tasa numeric;
 v_potencia numeric;
 v_items jsonb:='[]'::jsonb;
 v_i integer;
BEGIN
 SELECT monto_separacion,modo_inicial,inicial_minima,inicial_maxima,inicial_fija,
        tasa_nominal_anual_pct,cuotas_min,cuotas_max,version
 INTO p FROM public.cfg_fin_politicas_versiones WHERE id_politica=p_id_politica;
 IF NOT FOUND THEN RAISE EXCEPTION 'POLITICA_NO_DISPONIBLE|La política no existe.'; END IF;

 IF p_precio IS NULL OR p_precio<=0 OR p_precio<>round(p_precio,2)
    OR p_reserva IS NULL OR p_reserva<0 OR p_reserva<>round(p_reserva,2)
    OR (p_reserva<>0 AND p_reserva<>p.monto_separacion)
    OR p_inicial_total IS NULL OR p_inicial_total<>round(p_inicial_total,2)
    OR p_inicial_total>=p_precio OR p_inicial_total<p_reserva
    OR p_cuotas IS NULL OR p_cuotas NOT BETWEEN p.cuotas_min AND p.cuotas_max
    OR (p.modo_inicial='MINIMA' AND p_inicial_total<p.inicial_minima)
    OR (p.modo_inicial='RANGO' AND
        (p_inicial_total<p.inicial_minima OR p_inicial_total>p.inicial_maxima))
    OR (p.modo_inicial='FIJA' AND p_inicial_total<>p.inicial_fija)
 THEN RAISE EXCEPTION
    'FINANCIAMIENTO_INVALIDO|La inicial, número de cuotas o separación no cumple la política contractual.';
 END IF;

 v_capital:=p_precio-p_inicial_total;
 v_saldo:=v_capital;
 v_tasa:=p.tasa_nominal_anual_pct/1200;
 IF v_tasa=0 THEN
    v_cuota_base:=round(v_capital/p_cuotas,2);
 ELSE
    v_potencia:=power(1+v_tasa,p_cuotas);
    v_cuota_base:=round(v_capital*v_tasa*v_potencia/(v_potencia-1),2);
 END IF;

 FOR v_i IN 1..p_cuotas LOOP
    v_interes:=round(v_saldo*v_tasa,2);
    IF v_i=p_cuotas THEN
       v_amortizacion:=v_saldo;
       v_importe:=v_amortizacion+v_interes;
    ELSE
       v_importe:=v_cuota_base;
       v_amortizacion:=v_importe-v_interes;
    END IF;
    IF v_amortizacion<=0 OR v_amortizacion>v_saldo OR v_importe<=0
    THEN RAISE EXCEPTION 'PLAN_INCONSISTENTE|La cuota no amortiza el saldo.'; END IF;
    v_saldo:=round(v_saldo-v_amortizacion,2);
    v_intereses:=v_intereses+v_interes;
    v_items:=v_items||jsonb_build_array(jsonb_build_object(
       'numero',v_i,'capital',v_amortizacion,'interes',v_interes,
       'cuota',v_importe,'saldo',v_saldo,
       'fechaVencimiento', CASE WHEN p_fecha_firma IS NULL THEN NULL
          ELSE (p_fecha_firma+make_interval(months=>v_i))::date END
    ));
 END LOOP;
 IF v_saldo<>0 THEN RAISE EXCEPTION 'PLAN_INCONSISTENTE|El saldo final es distinto de cero.'; END IF;

 RETURN jsonb_build_object(
  'sistema','FRANCES','version','FRANCES_POLITICA_V'||p.version,
  'idPolitica',p_id_politica,'politicaVersion',p.version,
  'tasaAnualPct',p.tasa_nominal_anual_pct,
  'tasaMensualPct',p.tasa_nominal_anual_pct/12,
  'inicialTotal',p_inicial_total,
  'reservaAplicada',p_reserva,
  'inicialAdicional',p_inicial_total-p_reserva,
  'cuotaMensual',v_cuota_base,'capitalFinanciado',v_capital,
  'interesTotal',v_intereses,
  'totalCuotas',v_capital+v_intereses,
  'totalOperacion',p_precio+v_intereses,
  'fechaPrimeraCuota',CASE WHEN p_fecha_firma IS NULL THEN NULL
     ELSE (p_fecha_firma+interval '1 month')::date END,
  'cuotas',v_items);
END;
$$;

REVOKE ALL ON FUNCTION public.fn_fin_simular_frances_politica_v1(
 numeric,numeric,numeric,integer,bigint,date)
 FROM PUBLIC,anon,authenticated,service_role;
-- Backend podrá solicitar simulaciones autorizadas a través de función actorizada;
-- evitar uso anónimo; la validación del registro y firma usa el mismo motor interno.
REVOKE ALL ON FUNCTION public.fn_fin_simular_frances_politica_v1(
 numeric,numeric,numeric,integer,bigint,date) FROM sigi_app_user;

COMMIT;