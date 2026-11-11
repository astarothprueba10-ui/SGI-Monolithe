-- SGI MONOLITHE · CI aislado PostgreSQL 17 · Sprint 4 / 5.3.4
DO $test$
DECLARE
 f date:=(now() AT TIME ZONE 'America/Lima')::date;
 cuota bigint;
 pre jsonb;reg jsonb;rev jsonb;
 app jsonb;app2 jsonb;undo jsonb;undo2 jsonb; appini jsonb;
 solicitud uuid; id_app bigint;v_pago bigint;v_inicial_pago bigint;
 saldo numeric; saldo_actual numeric; inicial numeric;
 n_apps int;n_cuotas int;v_bad bool;
BEGIN
 SELECT id_cuota INTO STRICT cuota FROM public.pag_cuotas
 WHERE id_plan_pago=2016 AND numero_cuota=1;
 saldo:=public.fn_fin_saldo_cuota_confirmado_v1(cuota);
 IF saldo<>100 THEN RAISE EXCEPTION 'CI_534|Cuota origen de 100 inesperada: %',saldo; END IF;
 SELECT count(*) INTO n_apps FROM public.pag_aplicaciones_pago;
 SELECT count(*) INTO n_cuotas FROM public.pag_cuotas;

 -- PREPARAR -> SUBIR -> REGISTRAR -> APROBAR EN 5.3.3
 pre:=public.sp_fin_preparar_carga_voucher_cuota_v1(
  5,2016,cuota,60,1,f,'CI-534-CUOTA','abono.pdf','application/pdf',1200);
 INSERT INTO storage.objects(bucket_id,name,metadata)
 VALUES('vouchers-ventas-private',pre->>'claveArchivo',
  '{"mimetype":"application/pdf","size":1200}');
 reg:=public.sp_fin_registrar_voucher_cuota_pendiente_v1(
  5,(pre->>'idCarga')::uuid);
 rev:=public.sp_finanzas_revisar_voucher_cuota_v1(
  6,(reg->>'idVoucher')::bigint,true,NULL,'Banco validado');
 v_pago:=(reg->>'idPago')::bigint;
 IF rev->>'estadoPago'<>'CONFIRMADO' THEN
   RAISE EXCEPTION 'CI_534|Pago no confirmado'; END IF;
 IF public.fn_fin_saldo_cuota_confirmado_v1(cuota)<>100
 THEN RAISE EXCEPTION 'CI_534|Confirmación imputó sin aplicación'; END IF;

 -- PAGADO PARCIAL, luego segunda aplicación parcial, sin sobrepaso.
 solicitud:=gen_random_uuid();
 app:=public.sp_fin_aplicar_pago_confirmado_v1(
   5,solicitud,v_pago,'CUOTA',cuota,25,'Primer abono de 25');
 id_app:=(app->>'idAplicacion')::bigint;
 IF (app->>'montoAplicado')::numeric<>25
  OR (app->>'saldoPagoRestante')::numeric<>35
  OR (app->>'saldoDestinoRestante')::numeric<>75
  OR public.fn_fin_saldo_cuota_confirmado_v1(cuota)<>75
 THEN RAISE EXCEPTION 'CI_534|Primer parcial incorrecto %',app; END IF;
 app2:=public.sp_fin_aplicar_pago_confirmado_v1(
   5,solicitud,v_pago,'CUOTA',cuota,25,'Primer abono de 25');
 IF (app2->>'idAplicacion')::bigint<>id_app
   OR NOT (app2->>'reutilizado')::boolean
 THEN RAISE EXCEPTION 'CI_534|Reintento duplicó aplicación'; END IF;
 v_bad:=false;
 BEGIN PERFORM public.sp_fin_aplicar_pago_confirmado_v1(
   5,solicitud,v_pago,'CUOTA',cuota,35,'Importe distinto');
 EXCEPTION WHEN others THEN v_bad:=true; END;
 IF NOT v_bad THEN RAISE EXCEPTION 'CI_534|Id solicitud permitió monto distinto'; END IF;

 app2:=public.sp_fin_aplicar_pago_confirmado_v1(
   5,gen_random_uuid(),v_pago,'CUOTA',cuota,35,'Segundo abono');
 IF public.fn_fin_saldo_cuota_confirmado_v1(cuota)<>40
 THEN RAISE EXCEPTION 'CI_534|Dos aplicaciones no suman 60'; END IF;
 v_bad:=false;
 BEGIN PERFORM public.sp_fin_aplicar_pago_confirmado_v1(
   5,gen_random_uuid(),v_pago,'CUOTA',cuota,1,'Sobre el pago de 60');
 EXCEPTION WHEN others THEN v_bad:=true; END;
 IF NOT v_bad THEN RAISE EXCEPTION 'CI_534|Sobre-aplicación de pago permitida'; END IF;

 v_bad:=false;
 BEGIN PERFORM public.sp_fin_aplicar_pago_confirmado_v1(
   5,gen_random_uuid(),v_pago,'INICIAL',NULL,1,NULL);
 EXCEPTION WHEN others THEN v_bad:=true; END;
 IF NOT v_bad THEN RAISE EXCEPTION 'CI_534|Voucher de cuota desviado a inicial'; END IF;
 v_bad:=false;
 BEGIN PERFORM public.sp_fin_aplicar_pago_confirmado_v1(
   5,gen_random_uuid(),v_pago,'CUOTA',cuota+1,1,NULL);
 EXCEPTION WHEN others THEN v_bad:=true; END;
 IF NOT v_bad THEN RAISE EXCEPTION 'CI_534|Cuota de origen falsificada'; END IF;

 -- REVERSION con segunda persona, histórico permanece; saldo vuelve a subir.
 v_bad:=false;
 BEGIN PERFORM public.sp_fin_revertir_aplicacion_v1(
   5,id_app,'Error bancario');
 EXCEPTION WHEN others THEN v_bad:=true; END;
 IF NOT v_bad THEN RAISE EXCEPTION 'CI_534|Auto-reversión permitida'; END IF;
 v_bad:=false;
 BEGIN PERFORM public.sp_fin_revertir_aplicacion_v1(6,id_app,'No');
 EXCEPTION WHEN others THEN v_bad:=true; END;
 IF NOT v_bad THEN RAISE EXCEPTION 'CI_534|Reversión sin motivo admitida'; END IF;
 undo:=public.sp_fin_revertir_aplicacion_v1(
   6,id_app,'Conciliación de abono incorrecta');
 undo2:=public.sp_fin_revertir_aplicacion_v1(
   6,id_app,'Conciliación de abono incorrecta');
 IF undo->>'activo'<>'false' OR NOT (undo2->>'reutilizado')::bool
   OR public.fn_fin_saldo_cuota_confirmado_v1(cuota)<>65
   OR NOT EXISTS(SELECT 1 FROM public.pag_aplicaciones_pago a
     WHERE a.id_aplicacion_pago=id_app AND NOT a.activo
       AND a.id_usuario_anulacion=6
       AND a.motivo_anulacion='Conciliación de abono incorrecta'
       AND a.fecha_anulacion IS NOT NULL)
 THEN RAISE EXCEPTION 'CI_534|Reversión no auditada % %',undo,undo2; END IF;

 -- INICIAL: pago existente CONFIRMADO no vinculado a cuota o reserva,
 -- con voucher APROBADO, puede aplicar sólo hasta inicial adicional pactada.
 INSERT INTO public.pag_pagos(
  id_reserva,id_venta,id_plan_pago,id_estado_pago,id_metodo_pago,id_moneda,
  codigo,monto,fecha_operacion,numero_operacion,id_usuario_registro,
  id_usuario_confirmacion,fecha_confirmacion
 ) VALUES(NULL,2016,2016,1,1,1,
  'CI-534-INICIAL',75,now(),'CI-INICIAL-534',5,6,now())
 RETURNING id_pago INTO v_inicial_pago;
 INSERT INTO public.pag_vouchers(
  id_pago,id_estado_voucher,activo,codigo,numero_version,
  nombre_archivo_original,clave_archivo,tipo_mime,tamanio_bytes,
  fecha_carga,id_usuario_carga,id_usuario_validacion,fecha_validacion
 ) VALUES(v_inicial_pago,1,true,'CI-534-VOUINI',1,
  'inicial.pdf','ventas/p-2016/l-92/11111111-2222-3333-4444-aaaaaaaaaaaa.pdf',
  'application/pdf',1000,now(),5,6,now());
 -- Voucher histórico sintético con evidencia presente en bucket privado.
 INSERT INTO storage.objects(bucket_id,name,metadata)
 VALUES('vouchers-ventas-private',
  'ventas/p-2016/l-92/11111111-2222-3333-4444-aaaaaaaaaaaa.pdf',
  '{"mimetype":"application/pdf","size":1000}'::jsonb);
 appini:=public.sp_fin_aplicar_pago_confirmado_v1(
   5,gen_random_uuid(),v_inicial_pago,'INICIAL',NULL,75,'Pago de inicial comprobado');
 IF (appini->>'montoAplicado')::numeric<>75
   OR (appini->>'saldoDestinoRestante')::numeric<>4925
 THEN RAISE EXCEPTION 'CI_534|Abono de inicial incorrecto %',appini; END IF;

 -- La inversión de una inicial devuelve saldo inicial sin borrar aplicación.
 undo:=public.sp_fin_revertir_aplicacion_v1(
    6,(appini->>'idAplicacion')::bigint,'Revisión de inicial incorrecta');
 IF undo->>'activo'<>'false' THEN
   RAISE EXCEPTION 'CI_534|Reversión de inicial incorrecta'; END IF;

 v_bad:=false;
 BEGIN PERFORM public.sp_fin_aplicar_pago_confirmado_v1(
   5,gen_random_uuid(),1004,'CUOTA',cuota,10,NULL);
 EXCEPTION WHEN others THEN v_bad:=true; END;
 IF NOT v_bad THEN RAISE EXCEPTION 'CI_534|Pago REGISTRADO fue aplicado'; END IF;

 IF (SELECT count(*) FROM public.pag_cuotas)<>n_cuotas
  OR (SELECT count(*) FROM public.pag_aplicaciones_pago)<>n_apps+3
 THEN RAISE EXCEPTION 'CI_534|Cuotas modificadas o número de aplicaciones incorrecto'; END IF;
 -- El listado contiene historial auditado sin rutas privadas.
 rev:=public.sp_fin_imputaciones_v1(5,1,20);
 IF jsonb_array_length(rev->'historial')<>3
   OR (rev->>'total')::integer<0
 THEN RAISE EXCEPTION 'CI_534|Listado/historial incorrecto: %',rev; END IF;
 v_bad:=false;
 BEGIN PERFORM public.sp_fin_imputaciones_v1(8,1,20);
 EXCEPTION WHEN others THEN v_bad:=true; END;
 IF NOT v_bad THEN RAISE EXCEPTION 'CI_534|Actor sin vista accedió'; END IF;
 IF has_function_privilege('anon',
   'public.sp_fin_aplicar_pago_confirmado_v1(bigint,uuid,bigint,varchar,bigint,numeric,varchar)','EXECUTE')
 OR has_function_privilege('authenticated',
   'public.sp_fin_revertir_aplicacion_v1(bigint,bigint,varchar)','EXECUTE')
 OR NOT has_function_privilege('sigi_app_user',
   'public.sp_fin_aplicar_pago_confirmado_v1(bigint,uuid,bigint,varchar,bigint,numeric,varchar)','EXECUTE')
 THEN RAISE EXCEPTION 'CI_534|Permisos SQL inseguros'; END IF;

 RAISE NOTICE 'IMPUTACION_534_OK|Abono parcial, inicial, reversión auditada, no sobrepago, idempotencia y saldos derivados';
END $test$;
