-- PostgreSQL 17 pruebas de agrupacion, historial y permisos estrictos por venta.
DO $test$
DECLARE j JSONB; other JSONB; first_id bigint;
BEGIN
 SELECT public.sp_crm_compradores_unicos_v1(900,NULL,1,20) INTO j;
 IF (j->>'total')::integer <> 2 OR jsonb_array_length(j->'items') <> 2 THEN
   RAISE EXCEPTION 'CRM131-01: deben ser 2 clientes únicos: %',j;
 END IF;
 SELECT value INTO other FROM jsonb_array_elements(j->'items') value
 WHERE (value->>'id_cliente')::bigint=1;
 IF (other->>'cantidad_lotes')::integer <> 2
    OR (other->>'cantidad_proyectos')::integer <> 2
    OR other->>'modalidad_resumen' <> 'MIXTA' THEN
   RAISE EXCEPTION 'CRM131-02: comprador con dos proyectos debe conservar 2 lotes y modalidad mixta: %',other;
 END IF;
 SELECT public.sp_crm_compradores_unicos_v1(900,NULL,1,20,1) INTO j;
 SELECT value INTO other FROM jsonb_array_elements(j->'items') value
 WHERE (value->>'id_cliente')::bigint=1;
 IF (j->>'total')::integer <> 2 OR (other->>'cantidad_lotes')::integer <> 1
    OR (other->>'cantidad_proyectos')::integer <> 1 THEN
    RAISE EXCEPTION 'CRM131-03: proyecto 1 debe mostrar 1 lote del comprador 1: %',j;
 END IF;
 SELECT public.sp_crm_compradores_unicos_v1(900,'CON-CTD-2',1,20) INTO j;
 IF (j->>'total')::integer <> 1 OR (j->'items'->0->>'cantidad_lotes')::integer <> 2 THEN
   RAISE EXCEPTION 'CRM131-04: busqueda de contrato debe conservar contador total del comprador: %',j;
 END IF;
 SELECT public.sp_crm_compradores_unicos_v1(901,NULL,1,20) INTO j;
 IF (j->>'total')::integer <> 1 OR (j->'items'->0->>'cantidad_lotes')::integer <> 1 THEN
   RAISE EXCEPTION 'CRM131-05: asesor solo puede ver su venta: %',j;
 END IF;
 SELECT public.sp_crm_comprador_expediente_v1(900,1) INTO j;
 IF jsonb_array_length(j->'operaciones') <> 2
    OR (j->'totales'->>'cantidad_proyectos')::integer <> 2
    OR j->'cliente'->>'numero_documento' <> '00000001'
    OR j->'cliente'->>'direccion' <> 'Calle Pruebas 10' THEN
    RAISE EXCEPTION 'CRM131-06: expediente gerente sin todas las adquisiciones o datos centrales: %',j;
 END IF;
 SELECT public.sp_crm_comprador_expediente_v1(901,1) INTO j;
 IF jsonb_array_length(j->'operaciones') <> 1
    OR j->'operaciones'->0->>'codigo_venta' <> 'VEN-FIN-1' THEN
    RAISE EXCEPTION 'CRM131-07: expediente asesor revela compra ajena: %',j;
 END IF;
 BEGIN
   PERFORM public.sp_crm_comprador_expediente_v1(901,2);
   RAISE EXCEPTION 'CRM131-08: expediente ajeno accesible';
 EXCEPTION WHEN raise_exception THEN
   IF SQLERRM NOT LIKE 'DENEGADO|%' THEN RAISE; END IF;
 END;
 SELECT public.sp_crm_compradores_operaciones_v1(900,NULL,1,20) INTO j;
 IF (j->>'total')::integer <> 3 THEN
    RAISE EXCEPTION 'CRM131-09: exportación debe conservar cada una de las 3 operaciones: %',j;
 END IF;
 SELECT public.sp_crm_compradores_operaciones_v1(901,NULL,1,20) INTO j;
 IF (j->>'total')::integer <> 1 THEN
    RAISE EXCEPTION 'CRM131-10: exportación asesor revela ventas ajenas: %',j;
 END IF;
 IF has_function_privilege('anon','public.sp_crm_comprador_expediente_v1(bigint,bigint)','EXECUTE')
    OR has_function_privilege('authenticated','public.sp_crm_comprador_expediente_v1(bigint,bigint)','EXECUTE')
 THEN RAISE EXCEPTION 'CRM131-11: expediente de cliente expuesto al frontend'; END IF;
 IF (SELECT COUNT(*) FROM public.ven_ventas) <> 3 OR (SELECT COUNT(*) FROM public.ven_contratos) <> 3 THEN
    RAISE EXCEPTION 'CRM131-12: se alteraron ventas y contratos'; END IF;
 RAISE NOTICE 'CRM131: clientes únicos, proyectos, historial, asesor y exportación aprobados';
END;
$test$;
