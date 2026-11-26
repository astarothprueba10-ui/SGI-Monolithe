DO $$
DECLARE v_def text;
BEGIN
 SELECT pg_get_functiondef(p.oid) INTO v_def
 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
 WHERE n.nspname='public' AND p.proname='sp_fin_ventas_cobros_pendientes_v1';
 IF v_def IS NULL THEN RAISE EXCEPTION 'VEN-135-01: falta la bandeja.'; END IF;
 IF position('finance.view' in v_def)=0
   OR position('estado_revision=''PENDIENTE''' in v_def)=0
   OR position('soloConsulta' in v_def)=0
   OR position('FROM pagina pg' in v_def)=0
 THEN RAISE EXCEPTION 'VEN-135-02: la consulta no implementa filtros, alias o advertencia.'; END IF;
 IF position('INSERT INTO' in v_def)>0
   OR position('UPDATE public.' in v_def)>0
   OR position('DELETE FROM' in v_def)>0
 THEN RAISE EXCEPTION 'VEN-135-03: bandeja no es de solo lectura.'; END IF;
 IF has_function_privilege('anon',
     'public.sp_fin_ventas_cobros_pendientes_v1(bigint,character varying,integer,integer)','EXECUTE')
   OR has_function_privilege('authenticated',
     'public.sp_fin_ventas_cobros_pendientes_v1(bigint,character varying,integer,integer)','EXECUTE')
   OR NOT has_function_privilege('sigi_app_user',
     'public.sp_fin_ventas_cobros_pendientes_v1(bigint,character varying,integer,integer)','EXECUTE')
 THEN RAISE EXCEPTION 'VEN-135-04: permisos de la bandeja incorrectos.'; END IF;
 RAISE NOTICE 'VEN-135: consulta solo lectura y permisos verificados.';
END $$;
