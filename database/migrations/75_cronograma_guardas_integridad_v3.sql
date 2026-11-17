-- SGI-MONOLITHE | Sprint 4 | 5.2.3
-- Endurecimiento de lectura de cronogramas, sin recalcular historial.
-- Requiere migracion 74; es una correccion versionada del procedimiento V3.
DO $endurecer$
DECLARE
 v_def text;
 v_antes text;
 v_despues text;
BEGIN
 SELECT pg_get_functiondef(oid) INTO STRICT v_def FROM pg_proc
 WHERE pronamespace='public'::regnamespace
   AND proname='sp_crm_cronograma_venta_v3';

 -- NULL NOT LIKE devuelve NULL; no debe mostrar como FRANCES
 -- una operacion que no declara condiciones financieras.
 v_antes:='OR v_plan.descripcion_condiciones NOT LIKE ''FRANCES_ANUAL_FIJA_10_%''';
 v_despues:='OR NOT COALESCE(v_plan.descripcion_condiciones LIKE ''FRANCES_ANUAL_FIJA_10_%'',false)';
 IF strpos(v_def,v_antes)=0 THEN
   RAISE EXCEPTION 'MIGRACION_INCOMPATIBLE|Guardia de condiciones ya cambio.';
 END IF;
 v_def:=replace(v_def,v_antes,v_despues);

 v_antes:=' IF v_registros>0 THEN';
 v_despues:=$bloque$
 IF v_estado_plan='PENDIENTE' AND v_registros>0 THEN
   RAISE EXCEPTION 'PLAN_INCONSISTENTE|Un plan pendiente no puede contener cuotas exigibles.';
 END IF;
 IF v_registros>0 AND COALESCE(
      v_plan.descripcion_condiciones LIKE 'FRANCES_ANUAL_FIJA_10_V2%',false)
 THEN
   IF v_registros<>v_plan.numero_cuotas
      OR (SELECT COALESCE(SUM(monto_capital),0) FROM public.pag_cuotas
          WHERE id_plan_pago=v_plan.id_plan_pago)<>v_plan.capital_financiado
      OR (SELECT COALESCE(SUM(monto_interes),0) FROM public.pag_cuotas
          WHERE id_plan_pago=v_plan.id_plan_pago)<>v_plan.monto_interes_total
      OR (SELECT COALESCE(SUM(monto_cuota),0) FROM public.pag_cuotas
          WHERE id_plan_pago=v_plan.id_plan_pago)<>v_plan.monto_total_financiado
   THEN
     RAISE EXCEPTION 'PLAN_INCONSISTENTE|El cronograma firmado V2 tiene cuotas incompletas o diferencias monetarias.';
   END IF;
 END IF;
 IF v_registros>0 THEN
$bloque$;
 IF strpos(v_def,v_antes)=0 THEN
   RAISE EXCEPTION 'MIGRACION_INCOMPATIBLE|Guardia de cuotas ya cambio.';
 END IF;
 v_def:=replace(v_def,v_antes,v_despues);
 EXECUTE v_def;
END;
$endurecer$;
