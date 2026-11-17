-- El orden de operaciones NUMERIC debe coincidir con la versión histórica
-- (multiplicar saldo por tasa anual y DESPUÉS dividir entre 1200).
BEGIN;
DO $patch$
DECLARE v_def text;
BEGIN
 SELECT pg_get_functiondef('public.fn_fin_simular_frances_politica_v1(numeric,numeric,numeric,integer,bigint,date)'::regprocedure)
   INTO STRICT v_def;
 IF strpos(v_def,'v_interes:=round(v_saldo*v_tasa,2);')=0 THEN
   RAISE EXCEPTION 'MIGRACION_INCOMPATIBLE|No se reconoce el cálculo de interés.';
 END IF;
 v_def:=replace(v_def,'v_interes:=round(v_saldo*v_tasa,2);',
                       'v_interes:=round(v_saldo*p.tasa_nominal_anual_pct/1200,2);');
 EXECUTE v_def;
END $patch$;
COMMIT;