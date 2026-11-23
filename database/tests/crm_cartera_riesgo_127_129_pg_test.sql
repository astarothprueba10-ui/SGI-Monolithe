-- Ejecutar con PostgreSQL 17 aislado despues de fixture y migraciones 127,128,129.
-- Errores lanzan excepcion y hacen fallar GitHub Actions.
DO $test$
DECLARE
  r jsonb;
  n bigint;
  fechas text[];
BEGIN
  SELECT public.sp_crm_compradores_filtros_v1(900,NULL,1,20)
    INTO r;
  IF (r->>'total')::integer <> 3 THEN
    RAISE EXCEPTION 'CRM-01: se esperaban 3 compras, resultado: %',r;
  END IF;
  SELECT COUNT(DISTINCT (item->>'id_cliente')) INTO n
    FROM jsonb_array_elements(r->'items') item;
  IF n <> 2 THEN
    RAISE EXCEPTION 'CRM-02: las 3 operaciones deben pertenecer a 2 compradores, no %',n;
  END IF;

  SELECT public.sp_crm_compradores_filtros_v1(
      900,NULL,1,20,1,'FINANCIADA'
  ) INTO r;
  IF (r->>'total')::integer <> 2 THEN
    RAISE EXCEPTION 'CRM-08: proyecto 1 debe tener 2 operaciones financiadas: %',r;
  END IF;
  IF EXISTS (
    SELECT 1 FROM jsonb_array_elements(r->'items') x
    WHERE x->>'alerta_financiera' <> 'PENDIENTE'
  ) THEN
    RAISE EXCEPTION 'CRM-09: financiados sin consulta deben ser PENDIENTE';
  END IF;

  SELECT public.sp_crm_compradores_filtros_v1(
      900,NULL,1,20,2,'CONTADO'
  ) INTO r;
  IF (r->>'total')::integer <> 1 OR
    r->'items'->0->>'alerta_financiera' <> 'NO_APLICA'
  THEN
    RAISE EXCEPTION 'CRM-10: contado debe figurar No aplica: %',r;
  END IF;

  SELECT public.sp_crm_compradores_filtros_v1(
      900,'CON-FIN-1',1,15
  ) INTO r;
  IF (r->>'total')::integer <> 1 OR
     r->'items'->0->>'codigo_venta' <> 'VEN-FIN-1' THEN
    RAISE EXCEPTION 'CRM-03: busqueda de contrato incorrecta: %',r;
  END IF;

  SELECT public.sp_crm_compradores_filtros_v1(
      900,NULL,1,20,NULL,NULL,NULL,'2026-11-14','2026-11-14'
  ) INTO r;
  IF (r->>'total')::integer <> 1
     OR r->'items'->0->>'codigo_contrato' <> 'CON-FIN-1' THEN
    RAISE EXCEPTION 'CRM-04/14: fecha de firma no filtra de forma inclusiva: %',r;
  END IF;

  SELECT public.sp_crm_compradores_filtros_v1(901,NULL,1,20)
    INTO r;
  IF (r->>'total')::integer <> 2 THEN
    RAISE EXCEPTION 'CRM-07: asesor no debe ver compras fuera de su cartera: %',r;
  END IF;
  BEGIN
    PERFORM public.sp_crm_compradores_filtros_v1(902,NULL,1,20);
    RAISE EXCEPTION 'CRM-07: usuario no autorizado obtuvo acceso';
  EXCEPTION WHEN raise_exception THEN
    IF SQLERRM NOT LIKE 'DENEGADO|%' THEN RAISE; END IF;
  END;

  IF has_function_privilege('anon',
      'public.sp_crm_compradores_filtros_v1(bigint,character varying,integer,integer,bigint,character varying,character varying,date,date)',
      'EXECUTE')
  THEN
    RAISE EXCEPTION 'CRM-SEG: anon no puede ejecutar consulta privilegiada';
  END IF;
  IF NOT has_function_privilege('sigi_app_user',
      'public.sp_crm_compradores_filtros_v1(bigint,character varying,integer,integer,bigint,character varying,character varying,date,date)',
      'EXECUTE')
  THEN
    RAISE EXCEPTION 'CRM-SEG: rol de backend sin execute';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_class c
      JOIN pg_namespace n ON n.oid=c.relnamespace
    WHERE n.nspname='public' AND c.relname='crm_evaluaciones_crediticias'
      AND c.relrowsecurity
  ) THEN
    RAISE EXCEPTION 'CRM-SEG: tabla de evaluaciones sin RLS';
  END IF;

  SELECT public.sp_crm_indicadores_periodo_v7(
    900,'2026-10-01 00:00:00-05','2026-12-01 00:00:00-05',1
  ) INTO r;
  IF (r->>'compradores')::integer <> 2 THEN
    RAISE EXCEPTION 'CRM-06: resumen proyecto 1 debe contar 2 compradores: %',r;
  END IF;
  SELECT public.sp_crm_indicadores_periodo_v7(
    900,'2026-10-01 00:00:00-05','2026-12-01 00:00:00-05',2
  ) INTO r;
  IF (r->>'compradores')::integer <> 1 THEN
    RAISE EXCEPTION 'CRM-06: resumen proyecto 2 debe contar 1 comprador: %',r;
  END IF;

  SELECT public.sp_crm_evolucion_mensual_v7(
    900,'2026-10-01 00:00:00-05','2026-12-01 00:00:00-05',1
  ) INTO r;
  IF jsonb_array_length(r->'items') <> 2 THEN
    RAISE EXCEPTION 'CRM-06: evolucion mensual del proyecto: %',r;
  END IF;
  SELECT public.sp_crm_fuentes_periodo_v7(
    900,'2026-10-01 00:00:00-05','2026-12-01 00:00:00-05',1
  ) INTO r;
  IF (r->>'total')::integer <> 2 THEN
    RAISE EXCEPTION 'CRM-06: fuentes por proyecto con total incorrecto: %',r;
  END IF;
  SELECT public.sp_crm_asesores_periodo_v7(
    900,'2026-10-01 00:00:00-05','2026-12-01 00:00:00-05',1
  ) INTO r;
  IF (r->>'total')::integer <> 1
      OR (r->'items'->0->>'leads_activos')::integer <> 1
  THEN
    RAISE EXCEPTION 'CRM-06: asesores por proyecto con conteos incorrectos: %',r;
  END IF;

  RAISE NOTICE 'CRM-01 a CRM-10, CRM-14 y SEG: validaciones SQL sin alertas aprobadas';
END;
$test$;

-- Simulacion exclusivamente en fixture: no contiene un informe real de SBS/Experian.
INSERT INTO public.crm_evaluaciones_crediticias
(id_venta,proveedor,referencia_externa,referencia_base_legal,resultado,
 fecha_consulta,fecha_vencimiento,motivo_resumido,id_usuario_consulta)
VALUES
(1,'EXPERIAN','TEST-EXTERNAL-0001','TEST-BASE-LEGAL','ALERTA',
 now(),now()+INTERVAL '30 days','Simulacion de riesgo externo',900);

DO $test$
DECLARE r jsonb;
BEGIN
 SELECT public.sp_crm_compradores_filtros_v1(
     900,NULL,1,20,1,'FINANCIADA','SI'
 ) INTO r;
 IF (r->>'total')::integer <> 1
    OR r->'items'->0->>'codigo_contrato' <> 'CON-FIN-1'
 THEN
    RAISE EXCEPTION 'CRM-11: ALERTA no aparece para la venta financiada correcta: %',r;
 END IF;
 IF (SELECT COUNT(*) FROM public.not_notificaciones WHERE referencia_entidad='VENTA'
     AND referencia_id='1' AND referencia_modulo='CRM') <> 2 THEN
   RAISE EXCEPTION 'CRM-11: se esperan notificaciones para gerente y asesor principal';
 END IF;
 IF (SELECT COUNT(DISTINCT id_persona) FROM public.not_notificaciones
     WHERE referencia_id='1' AND referencia_modulo='CRM') <> 2 THEN
   RAISE EXCEPTION 'CRM-11: notificaciones duplicadas para un destinatario';
 END IF;
 RAISE NOTICE 'CRM-11: notificaciones deduplicadas a asesor y gerencia verificadas';
END;
$test$;

INSERT INTO public.crm_evaluaciones_crediticias
(id_venta,proveedor,referencia_externa,referencia_base_legal,resultado,
 fecha_consulta,fecha_vencimiento,id_usuario_consulta)
VALUES
(1,'EXPERIAN','TEST-EXTERNAL-0002','TEST-BASE-LEGAL','SIN_ALERTA',
 now()+interval '1 second',now()+INTERVAL '31 days',900),
(3,'EXPERIAN','TEST-EXTERNAL-0003','TEST-BASE-LEGAL','ALERTA',
 now()-interval '45 days',now()-INTERVAL '15 days',900);

DO $test$
DECLARE r jsonb;
BEGIN
 SELECT public.sp_crm_compradores_filtros_v1(
     900,NULL,1,20,1,'FINANCIADA','NO'
 ) INTO r;
 IF (r->>'total')::integer <> 1 OR
    r->'items'->0->>'codigo_contrato' <> 'CON-FIN-1'
 THEN
    RAISE EXCEPTION 'CRM-12: SIN_ALERTA no aparece en reporte: %',r;
 END IF;
 SELECT public.sp_crm_compradores_filtros_v1(
     900,NULL,1,20,1,'FINANCIADA','PENDIENTE'
 ) INTO r;
 IF (r->>'total')::integer <> 1 OR
    r->'items'->0->>'codigo_contrato' <> 'CON-FIN-3'
 THEN
    RAISE EXCEPTION 'CRM-13: consulta caducada debe quedar PENDIENTE: %',r;
 END IF;
 IF (SELECT COUNT(*) FROM public.not_notificaciones WHERE referencia_modulo='CRM') <> 2 THEN
    RAISE EXCEPTION 'CRM-13/17: alerta caducada o SIN_ALERTA emitieron un aviso indebido';
 END IF;
 IF has_table_privilege('authenticated','public.crm_evaluaciones_crediticias','SELECT')
 THEN
    RAISE EXCEPTION 'CRM-SEG: authenticated no puede leer historial crediticio';
 END IF;
 RAISE NOTICE 'CRM-12/13/17: gestion de evaluaciones confirmada';
END;
$test$;
