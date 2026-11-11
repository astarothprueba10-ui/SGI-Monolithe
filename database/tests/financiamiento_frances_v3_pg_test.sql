-- SQL puro: se ejecuta solo en PostgreSQL efimero de CI.
-- Antes debe haberse creado fn_crm_simular_frances_v3 de la migracion 73.
DO $test$
DECLARE
  v_precio numeric;
  v_inicial numeric;
  v_reserva numeric;
  v_plazo integer;
  v_calculo jsonb;
  v_suma_capital numeric;
  v_suma_interes numeric;
  v_suma_cuotas numeric;
  v_saldo_final numeric;
  v_numero integer:=0;
  v_error boolean;
  v_esperado numeric;
  v_caso record;
BEGIN
  FOR v_precio IN SELECT unnest(ARRAY[
      29900::numeric,30000::numeric,31865.63::numeric,
      52560::numeric,85250::numeric]) LOOP
    FOR v_inicial IN SELECT unnest(ARRAY[
        5000::numeric,8000::numeric,10000::numeric]) LOOP
      FOR v_reserva IN SELECT unnest(ARRAY[0::numeric,500::numeric]) LOOP
        FOR v_plazo IN SELECT unnest(ARRAY[1,12,24,36]) LOOP
          v_calculo:=public.fn_crm_simular_frances_v3(
            v_precio,v_reserva,v_inicial,v_plazo,10::numeric/12);
          SELECT
            coalesce(sum((c->>'capital')::numeric),0),
            coalesce(sum((c->>'interes')::numeric),0),
            coalesce(sum((c->>'cuota')::numeric),0)
          INTO v_suma_capital,v_suma_interes,v_suma_cuotas
          FROM jsonb_array_elements(v_calculo->'cuotas') c;
          SELECT (c->>'saldo')::numeric INTO v_saldo_final
          FROM jsonb_array_elements(v_calculo->'cuotas')
          WITH ORDINALITY t(c,orden) ORDER BY orden DESC LIMIT 1;
          IF (v_calculo->>'capitalFinanciado')::numeric<>v_precio-v_inicial
             OR (v_calculo->>'inicialAdicional')::numeric<>v_inicial-v_reserva
             OR v_suma_capital<>v_precio-v_inicial
             OR v_suma_interes<>(v_calculo->>'interesTotal')::numeric
             OR v_suma_cuotas<>(v_calculo->>'totalCuotas')::numeric
             OR v_saldo_final<>0
             OR jsonb_array_length(v_calculo->'cuotas')<>v_plazo
          THEN
            RAISE EXCEPTION 'FINANCIAMIENTO_CI_FALLIDO: P %, I %, R %, N %',
               v_precio,v_inicial,v_reserva,v_plazo;
          END IF;
          v_numero:=v_numero+1;
        END LOOP;
      END LOOP;
    END LOOP;
  END LOOP;
  IF v_numero<>120 THEN RAISE EXCEPTION 'Se esperaban 120 escenarios'; END IF;
  FOR v_caso IN
    SELECT * FROM (VALUES
      ('P01',30000::numeric,0::numeric,5000::numeric,12,1374.75::numeric),
      ('P02',30000::numeric,500::numeric,5000::numeric,12,1374.75::numeric),
      ('P03',30000::numeric,500::numeric,8000::numeric,36,3555.59::numeric),
      ('P04',30000::numeric,0::numeric,5000::numeric,36,4040.50::numeric),
      ('P05',29900::numeric,0::numeric,5000::numeric,36,4024.35::numeric),
      ('P06',30000::numeric,0::numeric,5000::numeric,1,208.33::numeric),
      ('P07',85250::numeric,0::numeric,5000::numeric,36,12969.91::numeric)
    ) t(codigo,precio,reserva,inicial,plazo,esperado)
  LOOP
    v_calculo:=public.fn_crm_simular_frances_v3(
      v_caso.precio,v_caso.reserva,v_caso.inicial,v_caso.plazo,10::numeric/12);
    IF (v_calculo->>'interesTotal')::numeric<>v_caso.esperado
    THEN
      RAISE EXCEPTION 'Intereses incorrectos para %',v_caso.codigo;
    END IF;
  END LOOP;

  -- Rechazos de inicial insuficiente, plazo invalido y tasa no autorizada.
  v_error:=false;
  BEGIN
    PERFORM public.fn_crm_simular_frances_v3(30000,500,4999.99,12,10::numeric/12);
  EXCEPTION WHEN others THEN v_error:=true;
  END;
  IF NOT v_error THEN RAISE EXCEPTION 'No rechazo inicial insuficiente'; END IF;
  v_error:=false;
  BEGIN
    PERFORM public.fn_crm_simular_frances_v3(30000,500,5000,37,10::numeric/12);
  EXCEPTION WHEN others THEN v_error:=true;
  END;
  IF NOT v_error THEN RAISE EXCEPTION 'No rechazo plazo invalido'; END IF;
  v_error:=false;
  BEGIN
    PERFORM public.fn_crm_simular_frances_v3(30000,500,5000,12,0.5);
  EXCEPTION WHEN others THEN v_error:=true;
  END;
  IF NOT v_error THEN RAISE EXCEPTION 'No rechazo tasa variable'; END IF;

  RAISE NOTICE 'EXITO: 120 simulaciones, 7 referencias y 3 rechazos verificados.';
END $test$;
