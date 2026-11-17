-- SGI MONOLITHE / Sprint 4 - 5.3.5
-- PostgreSQL 17 efímero, después de 5.3.4. No usa datos de compradores.
DO $test$
DECLARE
 r jsonb;v jsonb;v_paginated jsonb;v_mark jsonb;
 n_p int;n_a int;n_c int;n_rev int;n_event int;
 v_pago bigint;v_codigo varchar;v_denegado bool;
BEGIN
 SELECT count(*) INTO n_p FROM public.pag_pagos;
 SELECT count(*) INTO n_a FROM public.pag_aplicaciones_pago;
 SELECT count(*) INTO n_c FROM public.pag_cuotas;
 SELECT count(*) INTO n_rev FROM public.pag_conciliacion_revisiones_v1;
 SELECT count(*) INTO n_event FROM public.pag_conciliacion_eventos_v1;
 r:=public.sp_fin_conciliacion_integral_v1(5,'TODOS',NULL,1,20);
 IF jsonb_array_length(r->'items')<1 OR (r->>'total')::int<1
    OR (r->>'montoConfirmado')::numeric<=0
 THEN RAISE EXCEPTION '535|Conciliación sin pagos reales sintéticos %',r; END IF;
 v_paginated:=public.sp_fin_conciliacion_integral_v1(5,'TODOS',NULL,1,1);
 IF jsonb_array_length(v_paginated->'items')<>1
    OR (v_paginated->>'total')::int<>(r->>'total')::int
 THEN RAISE EXCEPTION '535|Paginar alteró total: %',v_paginated; END IF;

 -- La carga de cuota y los pagos confirmados deben seguir conciliándose.
 SELECT id_pago INTO STRICT v_pago FROM public.pag_pagos
 WHERE codigo='CI-534-INICIAL';
 SELECT value INTO v FROM jsonb_array_elements(r->'items')
 WHERE (value->>'id_pago')::bigint=v_pago LIMIT 1;
 IF v IS NULL OR v->>'concepto'<>'INICIAL'
   OR v->>'codigo_incidencia'<>'PAGO_CONFIRMADO_SIN_IMPUTAR'
 THEN RAISE EXCEPTION '535|Inicial revertida no aparece pendiente %',v; END IF;
 v_codigo:=v->>'codigo_incidencia';

 v_mark:=public.sp_fin_marcar_revision_conciliacion_v1(
    5,v_pago,v_codigo,'EN_REVISION',
    'Inicio de revisión financiera de un pago sintético.');
 v_mark:=public.sp_fin_marcar_revision_conciliacion_v1(
    6,v_pago,v_codigo,'REVISADA',
    'Revisión documental terminada: falta aplicar el pago.');
 IF (SELECT count(*) FROM public.pag_conciliacion_revisiones_v1)<>n_rev+1
 OR (SELECT count(*) FROM public.pag_conciliacion_eventos_v1)<>n_event+2
 THEN RAISE EXCEPTION '535|No preservó historial de dos eventos'; END IF;
 r:=public.sp_fin_conciliacion_integral_v1(5,'TODOS',NULL,1,20);
 SELECT value INTO v FROM jsonb_array_elements(r->'items')
 WHERE (value->>'id_pago')::bigint=v_pago LIMIT 1;
 IF v->>'estado_revision'<>'REVISADA'
    OR v->>'codigo_incidencia'<>'PAGO_CONFIRMADO_SIN_IMPUTAR'
 THEN RAISE EXCEPTION '535|Revisada borró alerta sin corregir %',v; END IF;

 v_denegado:=false;
 BEGIN PERFORM public.sp_fin_marcar_revision_conciliacion_v1(
   5,v_pago,'PAGO_SIN_VOUCHER','REVISADA',
   'Intento deliberado de registrar incidencia inexistente.');
 EXCEPTION WHEN others THEN v_denegado:=true; END;
 IF NOT v_denegado THEN RAISE EXCEPTION '535|Permite marcar alerta inventada'; END IF;
 v_denegado:=false;
 BEGIN PERFORM public.sp_fin_conciliacion_integral_v1(8,'TODOS',NULL,1,20);
 EXCEPTION WHEN others THEN v_denegado:=true; END;
 IF NOT v_denegado THEN RAISE EXCEPTION '535|Actor no autorizado consultó pagos'; END IF;
 v_denegado:=false;
 BEGIN PERFORM public.sp_fin_marcar_revision_conciliacion_v1(
    8,v_pago,v_codigo,'REVISADA','Falsa revisión sin permisos');
 EXCEPTION WHEN others THEN v_denegado:=true; END;
 IF NOT v_denegado THEN RAISE EXCEPTION '535|Actor no autorizado marcó revisión'; END IF;

 IF (SELECT count(*) FROM public.pag_pagos)<>n_p OR
    (SELECT count(*) FROM public.pag_aplicaciones_pago)<>n_a OR
    (SELECT count(*) FROM public.pag_cuotas)<>n_c
 THEN RAISE EXCEPTION '535|La conciliación modificó la contabilidad'; END IF;
 IF has_function_privilege('anon',
   'public.sp_fin_conciliacion_integral_v1(bigint,varchar,varchar,integer,integer)','EXECUTE')
 OR has_function_privilege('authenticated',
   'public.sp_fin_marcar_revision_conciliacion_v1(bigint,bigint,varchar,varchar,varchar)','EXECUTE')
 OR NOT has_function_privilege('sigi_app_user',
   'public.sp_fin_conciliacion_integral_v1(bigint,varchar,varchar,integer,integer)','EXECUTE')
 THEN RAISE EXCEPTION '535|Funciones de conciliación expuestas'; END IF;
 RAISE NOTICE 'CONCILIACION_535_OK|Read-only, alertas, paginación, permisos, eventos append-only, sin mutar finanzas';
END;
$test$;
