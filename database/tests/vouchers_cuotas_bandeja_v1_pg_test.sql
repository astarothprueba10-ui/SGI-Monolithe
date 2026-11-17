-- 5.3.1 | Solo datos sintéticos de PostgreSQL 17 efímero.
DO $test$
DECLARE
 j jsonb;
 v_error boolean;
BEGIN
 j:=public.sp_finanzas_listar_vouchers_cuotas_v1(5,'TODOS',NULL,1,20);
 IF (j->>'total')::integer<>2
  OR jsonb_array_length(j->'items')<>2
  OR (j->'items'->0->>'id_voucher')::integer<>104
  OR (j->'items'->0->>'archivo_disponible')::boolean
  OR (j->'items'->1->>'id_voucher')::integer<>103
  OR NOT (j->'items'->1->>'archivo_disponible')::boolean
  OR j->'items'->0 ? 'clave_archivo'
 THEN RAISE EXCEPTION 'Bandeja no concilia ni protege rutas: %',j; END IF;

 j:=public.sp_finanzas_listar_vouchers_cuotas_v1(5,'PENDIENTE',NULL,1,20);
 IF (j->>'total')::integer<>1 OR
    (j->'items'->0->>'id_voucher')::integer<>104
 THEN RAISE EXCEPTION 'Filtro de pendiente incorrecto: %',j; END IF;
 j:=public.sp_finanzas_listar_vouchers_cuotas_v1(5,'TODOS','VOU-CI-103',1,20);
 IF (j->>'total')::integer<>1 OR
    (j->'items'->0->>'id_voucher')::integer<>103
 THEN RAISE EXCEPTION 'Búsqueda incorrecta: %',j; END IF;
 j:=public.sp_finanzas_listar_vouchers_cuotas_v1(5,'TODOS',NULL,2,1);
 IF (j->>'total')::integer<>2 OR (j->>'paginas')::integer<>2
  OR jsonb_array_length(j->'items')<>1
 THEN RAISE EXCEPTION 'Paginación incorrecta: %',j; END IF;

 j:=public.sp_finanzas_obtener_ruta_voucher_cuota_v1(5,103);
 IF j->>'bucket'<>'vouchers-ventas-private'
  OR j->>'clave_archivo'<>'ventas/p-5/l-92/11111111-2222-3333-4444-555555555555.pdf'
 THEN RAISE EXCEPTION 'Ruta firmable inesperada: %',j; END IF;
 v_error:=false;
 BEGIN
   PERFORM public.sp_finanzas_obtener_ruta_voucher_cuota_v1(5,104);
 EXCEPTION WHEN others THEN v_error:=true; END;
 IF NOT v_error THEN RAISE EXCEPTION 'Voucher histórico sin archivo fue descargable'; END IF;

 v_error:=false;
 BEGIN
  PERFORM public.sp_finanzas_obtener_ruta_voucher_cuota_v1(5,105);
 EXCEPTION WHEN others THEN v_error:=true; END;
 IF NOT v_error THEN RAISE EXCEPTION 'Voucher de separación en bandeja cuotas'; END IF;

 v_error:=false;
 BEGIN
  PERFORM public.sp_finanzas_listar_vouchers_cuotas_v1(6,'TODOS',NULL,1,20);
 EXCEPTION WHEN others THEN v_error:=true; END;
 IF NOT v_error THEN RAISE EXCEPTION 'Actor sin finance.view pudo leer vouchers'; END IF;
 v_error:=false;
 BEGIN
  PERFORM public.sp_finanzas_listar_vouchers_cuotas_v1(5,'TODOS',NULL,1,101);
 EXCEPTION WHEN others THEN v_error:=true; END;
 IF NOT v_error THEN RAISE EXCEPTION 'Límite superior de página no se respetó'; END IF;
 v_error:=false;
 BEGIN
  PERFORM public.sp_finanzas_listar_vouchers_cuotas_v1(5,'FALSO',NULL,1,20);
 EXCEPTION WHEN others THEN v_error:=true; END;
 IF NOT v_error THEN RAISE EXCEPTION 'Filtro inválido aceptado'; END IF;

 -- Rutinas inseguras antiguas dejan de ser ejecutables desde Core.
 IF has_function_privilege('sigi_app_user',
    'public.sp_validar_voucher(bigint,varchar,bigint,varchar)','EXECUTE')
 OR has_function_privilege('sigi_app_user',
    'public.sp_registrar_pago_voucher(bigint,bigint,numeric,integer,varchar,varchar,varchar,varchar,bigint)','EXECUTE')
 OR has_function_privilege('sigi_app_user',
    'public.sp_listar_vouchers_tesoreria()','EXECUTE')
 THEN RAISE EXCEPTION 'Persisten permisos de rutinas financieras inseguras'; END IF;
 IF has_function_privilege('anon',
    'public.sp_finanzas_listar_vouchers_cuotas_v1(bigint,varchar,varchar,integer,integer)','EXECUTE')
 OR has_function_privilege('authenticated',
    'public.sp_finanzas_obtener_ruta_voucher_cuota_v1(bigint,bigint)','EXECUTE')
 OR NOT has_function_privilege('sigi_app_user',
    'public.sp_finanzas_listar_vouchers_cuotas_v1(bigint,varchar,varchar,integer,integer)','EXECUTE')
 THEN RAISE EXCEPTION 'Acceso inseguro a bandeja de cuotas'; END IF;
 RAISE NOTICE 'VOUCHERS_531_OK: listado real, filtro, paginación, permisos, rutas y bloqueo legado';
END;
$test$;
