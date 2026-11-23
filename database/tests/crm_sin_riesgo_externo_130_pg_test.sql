-- CRM 130: prueba PostgreSQL 17 aislada, tras retirar los datos ficticios de la fixture.
DO $test$
DECLARE
    r JSONB;
BEGIN
    IF to_regclass('public.crm_evaluaciones_crediticias') IS NOT NULL THEN
       RAISE EXCEPTION 'CRM130: historial externo sigue creado';
    END IF;
    IF to_regprocedure('public.fn_crm_notificar_alerta_crediticia_v1()') IS NOT NULL THEN
       RAISE EXCEPTION 'CRM130: notificación externa sigue activa';
    END IF;
    IF to_regprocedure('public.sp_crm_compradores_filtros_v1(bigint,character varying,integer,integer,bigint,character varying,character varying,date,date)') IS NOT NULL THEN
       RAISE EXCEPTION 'CRM130: procedimiento externo obsoleto';
    END IF;
    IF has_function_privilege('anon',
      'public.sp_crm_compradores_filtros_v2(bigint,character varying,integer,integer,bigint,character varying,date,date)','EXECUTE') THEN
       RAISE EXCEPTION 'CRM130: el rol anon no puede consultar el procedimiento';
    END IF;

    SELECT public.sp_crm_compradores_filtros_v2(900,NULL,1,20)
    INTO r;
    IF (r->>'total')::int <> 3 THEN
       RAISE EXCEPTION 'CRM130: cartera alterada tras quitar evaluaciones: %',r;
    END IF;
    IF (SELECT COUNT(DISTINCT (v->>'id_cliente')) FROM jsonb_array_elements(r->'items') v) <> 2 THEN
       RAISE EXCEPTION 'CRM130: cliente con multiples contratos perdido';
    END IF;
    IF EXISTS(SELECT 1 FROM jsonb_array_elements(r->'items') v WHERE v ? 'alerta_financiera') THEN
       RAISE EXCEPTION 'CRM130: alerta financiera sigue en respuesta';
    END IF;

    SELECT public.sp_crm_compradores_filtros_v2(900,NULL,1,20,1,'FINANCIADA')
    INTO r;
    IF (r->>'total')::int <> 2 THEN
       RAISE EXCEPTION 'CRM130: filtro de financiados alterado';
    END IF;
    SELECT public.sp_crm_compradores_filtros_v2(900,'CON-FIN-1',1,20)
    INTO r;
    IF (r->>'total')::int <> 1 THEN
       RAISE EXCEPTION 'CRM130: busqueda por contrato alterada';
    END IF;
    SELECT public.sp_crm_compradores_filtros_v2(901,NULL,1,20)
    INTO r;
    IF (r->>'total')::int <> 2 THEN
       RAISE EXCEPTION 'CRM130: permiso asesor alterado';
    END IF;
    IF (SELECT COUNT(*) FROM public.ven_ventas) <> 3
       OR (SELECT COUNT(*) FROM public.ven_contratos) <> 3
       OR (SELECT COUNT(*) FROM public.not_notificaciones) <> 2 THEN
       RAISE EXCEPTION 'CRM130: venta, contrato o avisos existentes modificados';
    END IF;
    RAISE NOTICE 'CRM130: cartera, permisos y modalidades correctos sin evaluacion externa';
END;
$test$;
