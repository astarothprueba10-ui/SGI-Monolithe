-- Pruebas de cronograma Sprint 4 · 5.2.3 en PostgreSQL EFIMERO.
-- Ejecutar tras migraciones 73 y 74 y cronograma_v3_pg_fixture.sql.
DO $test$
DECLARE
 v jsonb;
 v_registered jsonb;
 v_legacy jsonb;
 v_check jsonb;
 v_total_capital numeric;
 v_total_interes numeric;
 v_total_cuotas numeric;
 v_lanzado boolean;
BEGIN
 -- Motor único: 31 enero bisiesto -> 29 febrero, 31 marzo, 30 abril.
 v:=public.fn_crm_generar_cronograma_frances_v2(
   30000,500,4500,36,DATE '2028-01-31');
 IF v->>'fechaPrimeraCuota'<>'2028-02-29'
 OR v->'items'->0->>'fechaVencimiento'<>'2028-02-29'
 OR v->'items'->1->>'fechaVencimiento'<>'2028-03-31'
 OR v->'items'->2->>'fechaVencimiento'<>'2028-04-30'
 OR (v->>'capitalFinanciado')::numeric<>25000
 OR (v->>'interesTotal')::numeric<>4040.50
 OR jsonb_array_length(v->'items')<>36
 OR (v->'items'->35->>'saldo')::numeric<>0 THEN
   RAISE EXCEPTION 'Cronograma de fecha bisiesta/capital incorrecto: %',v;
 END IF;
 -- Año no bisiesto: 31 enero -> 28 febrero -> 31 marzo.
 v_check:=public.fn_crm_generar_cronograma_frances_v2(
   30000,0,5000,12,DATE '2027-01-31');
 IF v_check->'items'->0->>'fechaVencimiento'<>'2027-02-28'
 OR v_check->'items'->1->>'fechaVencimiento'<>'2027-03-31'
 THEN RAISE EXCEPTION 'Se desplazaron fechas tras febrero no bisiesto'; END IF;
 SELECT sum((x->>'capital')::numeric),
        sum((x->>'interes')::numeric),
        sum((x->>'cuota')::numeric)
 INTO v_total_capital,v_total_interes,v_total_cuotas
 FROM jsonb_array_elements(v->'items') x;
 IF v_total_capital<>(v->>'capitalFinanciado')::numeric
 OR v_total_interes<>(v->>'interesTotal')::numeric
 OR v_total_cuotas<>(v->>'totalCuotas')::numeric
 THEN RAISE EXCEPTION 'Totales de cuotas no concilian'; END IF;

 -- Plan pendiente V2: solo PROYECCION, sin filas en pag_cuotas.
 v:=public.sp_crm_cronograma_venta_v3(5,1001);
 IF v->>'tipoCronograma'<>'PROYECTADO'
 OR jsonb_array_length(v->'items')<>36
 OR (v->>'capitalFinanciado')::numeric<>25000
 OR (v->>'interesTotal')::numeric<>4040.50
 OR v->'items'->1->>'fechaVencimiento'<>'2028-03-31'
 OR EXISTS(SELECT 1 FROM public.pag_cuotas WHERE id_plan_pago=1001)
 THEN RAISE EXCEPTION 'La proyeccion V2 difiere del motor: %',v; END IF;

 -- Plan antiguo pendiente V1: conserva montos V1 y corrige anclaje calendario.
 v_legacy:=public.sp_crm_cronograma_venta_v3(5,1002);
 IF v_legacy->>'tipoCronograma'<>'PROYECTADO'
 OR v_legacy->'items'->0->>'fechaVencimiento'<>'2028-02-29'
 OR v_legacy->'items'->1->>'fechaVencimiento'<>'2028-03-31'
 THEN RAISE EXCEPTION 'Proyeccion historica V1 inconsistente'; END IF;

 -- Plan firmado preexistente: usa pag_cuotas, sin recalcular montos historicos.
 v_registered:=public.sp_crm_cronograma_venta_v3(5,1003);
 IF v_registered->>'tipoCronograma'<>'REGISTRADO'
 OR jsonb_array_length(v_registered->'items')<>1
 OR v_registered->'items'->0->>'estado'<>'PAGADA'
 OR (v_registered->'items'->0->>'cuota')::numeric<>25000
 THEN RAISE EXCEPTION 'Un cronograma firmado se recalculo indebidamente'; END IF;

 -- Guardia de cartera / permiso: el actor 6 no puede leer venta del actor 5.
 v_lanzado:=false;
 BEGIN
   PERFORM public.sp_crm_cronograma_venta_v3(6,1001);
 EXCEPTION WHEN others THEN v_lanzado:=true;
 END;
 IF NOT v_lanzado THEN RAISE EXCEPTION 'La consulta de otra cartera fue autorizada'; END IF;

 -- Alteracion de intereses del plan de prueba: nunca se oculta una inconsistencia.
 UPDATE public.pag_planes_pago SET monto_interes_total=4040.49 WHERE id_plan_pago=1001;
 v_lanzado:=false;
 BEGIN
   PERFORM public.sp_crm_cronograma_venta_v3(5,1001);
 EXCEPTION WHEN others THEN v_lanzado:=true;
 END;
 IF NOT v_lanzado THEN RAISE EXCEPTION 'No se detecto interes incorrecto'; END IF;
 UPDATE public.pag_planes_pago SET monto_interes_total=4040.50 WHERE id_plan_pago=1001;

 -- Condiciones desconocidas: no presentar V2 ni cronograma proyectado falso.
 UPDATE public.pag_planes_pago SET descripcion_condiciones=NULL WHERE id_plan_pago=1001;
 v_check:=public.sp_crm_cronograma_venta_v3(5,1001);
 IF v_check->>'tipoCronograma'<>'SIN_CUOTAS' THEN
   RAISE EXCEPTION 'Un plan sin condiciones obtuvo cronograma simulado';
 END IF;
 UPDATE public.pag_planes_pago SET
   descripcion_condiciones='FRANCES_ANUAL_FIJA_10_V2|Prueba aislada'
 WHERE id_plan_pago=1001;

 -- Un plan PENDIENTE con cuotas es incoherente: nunca mostrar PAGADAS.
 INSERT INTO public.pag_cuotas(id_cuota,id_plan_pago,id_estado_cuota,
   numero_cuota,fecha_vencimiento,monto_capital,monto_interes,monto_cuota)
 VALUES (1001,1001,1,1,DATE '2028-02-29',1000,200,1200);
 v_lanzado:=false;
 BEGIN
   PERFORM public.sp_crm_cronograma_venta_v3(5,1001);
 EXCEPTION WHEN others THEN v_lanzado:=true;
 END;
 IF NOT v_lanzado THEN RAISE EXCEPTION 'No detecto cuotas en plan pendiente'; END IF;

 -- Un plan V2 firmado con cuotas incompletas tampoco debe mostrarse valido.
 UPDATE public.pag_planes_pago SET id_estado_plan_pago=2 WHERE id_plan_pago=1001;
 v_lanzado:=false;
 BEGIN
   PERFORM public.sp_crm_cronograma_venta_v3(5,1001);
 EXCEPTION WHEN others THEN v_lanzado:=true;
 END;
 IF NOT v_lanzado THEN RAISE EXCEPTION 'No detecto cronograma V2 incompleto'; END IF;
 DELETE FROM public.pag_cuotas WHERE id_cuota=1001;
 UPDATE public.pag_planes_pago SET id_estado_plan_pago=1 WHERE id_plan_pago=1001;

 -- En firma V8 solo nuevas ventas V2 usan el mismo motor; historicas -> V7.
 IF pg_get_functiondef('public.sp_crm_aprobar_firma_contrato_v8(bigint,bigint,bigint,date,boolean,varchar)'::regprocedure)
    NOT LIKE '%fn_crm_generar_cronograma_frances_v2%'
 THEN RAISE EXCEPTION 'Firma V8 no reutiliza el motor de cronogramas'; END IF;
 IF NOT has_function_privilege('sigi_app_user',
   'public.sp_crm_aprobar_firma_contrato_v8(bigint,bigint,bigint,date,boolean,varchar)','EXECUTE')
 OR has_function_privilege('anon',
   'public.sp_crm_aprobar_firma_contrato_v8(bigint,bigint,bigint,date,boolean,varchar)','EXECUTE')
 OR has_function_privilege('authenticated',
   'public.sp_crm_cronograma_venta_v3(bigint,bigint)','EXECUTE')
 THEN RAISE EXCEPTION 'Privilegios de cronograma indebidos'; END IF;
 RAISE NOTICE 'CRONOGRAMA OK: fechas bisiestas, saldo cero, V1/V2, firmado, acceso, conciliacion y firma V8';
END;
$test$;
