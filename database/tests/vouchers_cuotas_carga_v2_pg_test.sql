-- SGI MONOLITHE | 5.3.2 | PostgreSQL 17 aislado
DO $test$
DECLARE
 v_cuota bigint;
 v_carga uuid;
 v_carga2 uuid;
 v_pre jsonb;
 v_reg jsonb;
 v_reg2 jsonb;
 v_otra jsonb;
 v_monto numeric;
 v_n_aplicaciones integer;
 v_n_pagos integer;
 v_n_vouchers integer;
 v_denegado boolean;
BEGIN
 SELECT id_cuota INTO STRICT v_cuota
 FROM public.pag_cuotas WHERE id_plan_pago=2016 AND numero_cuota=1;
 SELECT monto_cuota INTO STRICT v_monto FROM public.pag_cuotas WHERE id_cuota=v_cuota;
 SELECT count(*) INTO v_n_aplicaciones FROM public.pag_aplicaciones_pago;
 SELECT count(*) INTO v_n_pagos FROM public.pag_pagos;
 SELECT count(*) INTO v_n_vouchers FROM public.pag_vouchers;

 v_pre:=public.sp_fin_opciones_registro_cuota_v1(5,'VENTA-CI-RACHA-2016',60);
 IF jsonb_array_length(v_pre->'items')<>3
    OR jsonb_array_length(v_pre->'metodos')<>1
 THEN RAISE EXCEPTION '5.3.2 opciones de cuota incorrectas: %',v_pre; END IF;
 v_denegado:=false;
 BEGIN PERFORM public.sp_fin_opciones_registro_cuota_v1(6,NULL,20);
 EXCEPTION WHEN others THEN v_denegado:=true; END;
 IF NOT v_denegado THEN RAISE EXCEPTION 'Sin permiso consultó cuotas'; END IF;

 v_pre:=public.sp_fin_preparar_carga_voucher_cuota_v1(
   5,2016,v_cuota,40,1,(now() AT TIME ZONE 'America/Lima')::date,
   'OP-CI-1','voucher-demo.pdf','application/pdf',1234);
 v_carga:=(v_pre->>'idCarga')::uuid;
 IF v_pre->>'bucket'<>'vouchers-ventas-private'
   OR v_pre->>'claveArchivo' NOT LIKE 'ventas/p-2016/l-92/%.pdf'
   OR (v_pre->>'expiresInSeconds')::integer<>1800
 THEN RAISE EXCEPTION 'Preparación no segura: %',v_pre; END IF;

 -- Antes de subir Storage no se puede registrar el pago.
 v_denegado:=false;
 BEGIN PERFORM public.sp_fin_registrar_voucher_cuota_pendiente_v1(5,v_carga);
 EXCEPTION WHEN others THEN v_denegado:=true; END;
 IF NOT v_denegado THEN RAISE EXCEPTION 'Registro aceptó archivo inexistente'; END IF;

 INSERT INTO storage.objects(bucket_id,name,metadata)
 VALUES('vouchers-ventas-private',v_pre->>'claveArchivo',
        '{"mimetype":"image/png","size":1234}'::jsonb);
 v_denegado:=false;
 BEGIN PERFORM public.sp_fin_registrar_voucher_cuota_pendiente_v1(5,v_carga);
 EXCEPTION WHEN others THEN v_denegado:=true; END;
 IF NOT v_denegado THEN RAISE EXCEPTION 'Registro aceptó MIME incorrecto'; END IF;
 UPDATE storage.objects
 SET metadata='{"mimetype":"application/pdf","size":1233}'::jsonb
 WHERE name=v_pre->>'claveArchivo';
 v_denegado:=false;
 BEGIN PERFORM public.sp_fin_registrar_voucher_cuota_pendiente_v1(5,v_carga);
 EXCEPTION WHEN others THEN v_denegado:=true; END;
 IF NOT v_denegado THEN RAISE EXCEPTION 'Registro aceptó tamaño incorrecto'; END IF;
 UPDATE storage.objects
 SET metadata='{"mimetype":"application/pdf","size":1234}'::jsonb
 WHERE name=v_pre->>'claveArchivo';

 v_denegado:=false;
 BEGIN PERFORM public.sp_fin_registrar_voucher_cuota_pendiente_v1(6,v_carga);
 EXCEPTION WHEN others THEN v_denegado:=true; END;
 IF NOT v_denegado THEN RAISE EXCEPTION 'Otro actor pudo finalizar la carga'; END IF;

 v_reg:=public.sp_fin_registrar_voucher_cuota_pendiente_v1(5,v_carga);
 IF v_reg->>'estadoPago'<>'REGISTRADO'
   OR v_reg->>'estadoVoucher'<>'PENDIENTE'
   OR (v_reg->>'saldoAplicado')::numeric<>0
   OR (v_reg->>'reutilizado')::boolean
 THEN RAISE EXCEPTION 'Pago no quedó pendiente: %',v_reg; END IF;
 IF (SELECT count(*) FROM public.pag_aplicaciones_pago)<>v_n_aplicaciones
 THEN RAISE EXCEPTION 'Pago pendiente redujo el saldo'; END IF;
 IF public.fn_fin_saldo_cuota_confirmado_v1(v_cuota)<>v_monto
 THEN RAISE EXCEPTION 'Saldo pendiente cambió tras registrar voucher'; END IF;
 IF (SELECT count(*) FROM public.pag_pagos)<>v_n_pagos+1
  OR (SELECT count(*) FROM public.pag_vouchers)<>v_n_vouchers+1
 THEN RAISE EXCEPTION 'No se creó exactamente un pago y un voucher'; END IF;

 v_reg2:=public.sp_fin_registrar_voucher_cuota_pendiente_v1(5,v_carga);
 IF NOT (v_reg2->>'reutilizado')::boolean
    OR v_reg2->>'idPago'<>v_reg->>'idPago'
    OR v_reg2->>'idVoucher'<>v_reg->>'idVoucher'
    OR (SELECT count(*) FROM public.pag_pagos)<>v_n_pagos+1
 THEN RAISE EXCEPTION 'Reintento no idempotente'; END IF;

 -- Otra carga con el mismo número de operación no puede registrarse.
 v_otra:=public.sp_fin_preparar_carga_voucher_cuota_v1(
   5,2016,v_cuota,20,1,(now() AT TIME ZONE 'America/Lima')::date,
   'OP-CI-1','voucher-otro.jpg','image/jpeg',555);
 v_carga2:=(v_otra->>'idCarga')::uuid;
 INSERT INTO storage.objects(bucket_id,name,metadata)
 VALUES('vouchers-ventas-private',v_otra->>'claveArchivo',
        '{"mimetype":"image/jpeg","size":555}'::jsonb);
 v_denegado:=false;
 BEGIN PERFORM public.sp_fin_registrar_voucher_cuota_pendiente_v1(5,v_carga2);
 EXCEPTION WHEN others THEN v_denegado:=true; END;
 IF NOT v_denegado THEN RAISE EXCEPTION 'Número de operación duplicado aceptado'; END IF;

 -- Actor sin permiso no prepara, importe excesivo/futuro tampoco.
 v_denegado:=false;
 BEGIN PERFORM public.sp_fin_preparar_carga_voucher_cuota_v1(
   6,2016,v_cuota,30,1,current_date,NULL,'x.pdf','application/pdf',200);
 EXCEPTION WHEN others THEN v_denegado:=true; END;
 IF NOT v_denegado THEN RAISE EXCEPTION 'Actor sin permiso preparó la carga'; END IF;
 v_denegado:=false;
 BEGIN PERFORM public.sp_fin_preparar_carga_voucher_cuota_v1(
   5,2016,v_cuota,9999,1,current_date,NULL,'x.pdf','application/pdf',200);
 EXCEPTION WHEN others THEN v_denegado:=true; END;
 IF NOT v_denegado THEN RAISE EXCEPTION 'Sobrepago fue aceptado'; END IF;
 v_denegado:=false;
 BEGIN PERFORM public.sp_fin_preparar_carga_voucher_cuota_v1(
   5,2014,v_cuota,20,1,current_date,NULL,'x.pdf','application/pdf',200);
 EXCEPTION WHEN others THEN v_denegado:=true; END;
 IF NOT v_denegado THEN RAISE EXCEPTION 'Se aceptó cuota de otra venta'; END IF;
 v_denegado:=false;
 BEGIN PERFORM public.sp_fin_preparar_carga_voucher_cuota_v1(
   5,2016,v_cuota,20,1,(now() AT TIME ZONE 'America/Lima')::date+1,
   NULL,'x.pdf','application/pdf',200);
 EXCEPTION WHEN others THEN v_denegado:=true; END;
 IF NOT v_denegado THEN RAISE EXCEPTION 'Fecha de operación futura aceptada'; END IF;

 IF has_function_privilege('anon',
 'public.sp_fin_registrar_voucher_cuota_pendiente_v1(bigint,uuid)','EXECUTE')
 OR has_function_privilege('authenticated',
 'public.sp_fin_preparar_carga_voucher_cuota_v1(bigint,bigint,bigint,numeric,integer,date,varchar,varchar,varchar,bigint)','EXECUTE')
 OR has_function_privilege('sigi_app_user',
 'public.fn_fin_saldo_cuota_confirmado_v1(bigint)','EXECUTE')
 OR NOT has_function_privilege('sigi_app_user',
 'public.sp_fin_registrar_voucher_cuota_pendiente_v1(bigint,uuid)','EXECUTE')
 THEN RAISE EXCEPTION 'Permisos SQL inseguros'; END IF;

 RAISE NOTICE 'VOUCHERS_532_OK: opción, enlace, validación MIME/tamaño, roles, idempotencia, duplicados y saldo intacto';
END;
$test$;
