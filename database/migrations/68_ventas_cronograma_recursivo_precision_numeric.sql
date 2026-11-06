-- SGI MONOLITHE. Evita error 42804 de tipos numeric(14,2) / numeric
-- al generar cuotas proyectadas del sistema francés.
-- La consulta sigue siendo de solo lectura: no modifica ni aprueba cuotas.
DO $patch$
DECLARE definition text;
BEGIN
 SELECT pg_get_functiondef(oid) INTO STRICT definition
 FROM pg_proc WHERE pronamespace='public'::regnamespace
   AND proname='sp_crm_cronograma_venta_v1';
 IF strpos(definition,'    v_plan.capital_financiado,')>0 THEN
   definition:=replace(definition,
       '    v_plan.capital_financiado,',
       '    (v_plan.capital_financiado + 0::numeric),');
   EXECUTE definition;
 ELSIF strpos(definition,'    (v_plan.capital_financiado + 0::numeric),')=0 THEN
   RAISE EXCEPTION 'MIGRACION_INCOMPATIBLE|No se encontró saldo inicial del cálculo francés.';
 END IF;
END $patch$;
