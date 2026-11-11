-- SGI-MONOLITHE / 5.3.3 | pruebas aisladas PostgreSQL 17.
DO $test$
DECLARE
  v_cuota bigint;
  v_fecha date:=(now() AT TIME ZONE 'America/Lima')::date;
  v_pre jsonb;
  v_reg jsonb;
  v_res jsonb;
  v_res2 jsonb;
  v_voucher bigint;
  v_pago bigint;
  v_saldo numeric;
  v_count integer;
  v_denegado boolean;
  v_aplicaciones integer;
BEGIN
 SELECT id_cuota INTO STRICT v_cuota FROM public.pag_cuotas
 WHERE id_plan_pago=2016 AND numero_cuota=1;
 SELECT public.fn_fin_saldo_cuota_confirmado_v1(v_cuota) INTO v_saldo;
 SELECT count(*) INTO v_aplicaciones FROM public.pag_aplicaciones_pago;

 -- 1. REGISTRO Y APROBACIÓN por persona distinta del registrador.
 v_pre:=public.sp_fin_preparar_carga_voucher_cuota_v1(
    5,2016,v_cuota,40,1,v_fecha,'CI-532-533-APROBAR',
    'voucher-1.pdf','application/pdf',1200);
 INSERT INTO storage.objects(bucket_id,name,metadata)
 VALUES('vouchers-ventas-private',v_pre->>'claveArchivo',
     '{"mimetype":"application/pdf","size":1200}'::jsonb);
 v_reg:=public.sp_fin_registrar_voucher_cuota_pendiente_v1(
    5,(v_pre->>'idCarga')::uuid);
 v_voucher:=(v_reg->>'idVoucher')::bigint;
 v_pago:=(v_reg->>'idPago')::bigint;

 v_denegado:=false;
 BEGIN
  PERFORM public.sp_finanzas_revisar_voucher_cuota_v1(
    5,v_voucher,true,NULL,'Comprobante verificado');
 EXCEPTION WHEN others THEN v_denegado:=true; END;
 IF NOT v_denegado THEN RAISE EXCEPTION 'AUTOAPROBACION|Cargador aprobó su propia evidencia'; END IF;

 v_denegado:=false;
 BEGIN
  PERFORM public.sp_finanzas_revisar_voucher_cuota_v1(
    6,v_voucher,true,NULL,'Comprobante distinto');
 EXCEPTION WHEN others THEN v_denegado:=true; END;
 IF v_denegado THEN RAISE EXCEPTION 'Revisor autorizado fue rechazado'; END IF;
 -- La primera revisión con observaciones distintas, realizada arriba,
 -- ya sería exitosa. Recuperar estado y confirmar idempotencia exacta.
 v_res:=public.sp_finanzas_revisar_voucher_cuota_v1(
    6,v_voucher,true,NULL,'Comprobante distinto');
 IF NOT (v_res->>'reutilizado')::boolean
 OR v_res->>'estadoPago'<>'CONFIRMADO'
 OR v_res->>'estadoVoucher'<>'APROBADO'
 OR (v_res->>'saldoAplicado')::numeric<>0
 THEN RAISE EXCEPTION 'Idempotencia de aprobación incorrecta: %',v_res; END IF;
 IF (SELECT count(*) FROM public.pag_vouchers_cuota_revisiones
      WHERE id_voucher=v_voucher)<>1
 THEN RAISE EXCEPTION 'Auditoría duplicada'; END IF;
 IF (SELECT count(*) FROM public.pag_aplicaciones_pago)<>v_aplicaciones
    OR public.fn_fin_saldo_cuota_confirmado_v1(v_cuota)<>v_saldo
 THEN RAISE EXCEPTION 'La aprobación imputó el saldo antes del 5.3.4'; END IF;

 v_denegado:=false;
 BEGIN
  PERFORM public.sp_finanzas_revisar_voucher_cuota_v1(
    6,v_voucher,false,'Quiero rechazar','');
 EXCEPTION WHEN others THEN v_denegado:=true; END;
 IF NOT v_denegado THEN RAISE EXCEPTION 'Una revisión cerrada fue cambiada'; END IF;

 -- 2. RECHAZO con motivo, incluso si ya se borró el objeto de Storage.
 v_pre:=public.sp_fin_preparar_carga_voucher_cuota_v1(
    5,2016,v_cuota,25,1,v_fecha,'CI-532-533-RECHAZAR',
    'voucher-2.jpg','image/jpeg',500);
 INSERT INTO storage.objects(bucket_id,name,metadata)
 VALUES('vouchers-ventas-private',v_pre->>'claveArchivo',
   '{"mimetype":"image/jpeg","size":500}'::jsonb);
 v_reg:=public.sp_fin_registrar_voucher_cuota_pendiente_v1(
    5,(v_pre->>'idCarga')::uuid);
 v_voucher:=(v_reg->>'idVoucher')::bigint;
 v_pago:=(v_reg->>'idPago')::bigint;
 DELETE FROM storage.objects WHERE name=v_pre->>'claveArchivo';

 v_denegado:=false;
 BEGIN
   PERFORM public.sp_finanzas_revisar_voucher_cuota_v1(
     6,v_voucher,false,'No','Falta el archivo');
 EXCEPTION WHEN others THEN v_denegado:=true; END;
 IF NOT v_denegado THEN RAISE EXCEPTION 'Rechazo sin motivo claro fue aceptado'; END IF;

 v_res:=public.sp_finanzas_revisar_voucher_cuota_v1(
   6,v_voucher,false,'Archivo extraviado','Falta el archivo');
 IF v_res->>'estadoVoucher'<>'RECHAZADO'
    OR v_res->>'estadoPago'<>'ANULADO'
    OR (v_res->>'saldoAplicado')::numeric<>0
 THEN RAISE EXCEPTION 'Rechazo incorrecto: %',v_res; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.pag_pagos p
    WHERE p.id_pago=v_pago AND p.motivo_anulacion='Archivo extraviado'
      AND p.id_usuario_anulacion=6 AND p.fecha_anulacion IS NOT NULL)
 THEN RAISE EXCEPTION 'Anulación sin trazabilidad de usuario y motivo'; END IF;
 v_res2:=public.sp_finanzas_revisar_voucher_cuota_v1(
   6,v_voucher,false,'Archivo extraviado','Falta el archivo');
 IF NOT (v_res2->>'reutilizado')::boolean OR
    v_res2->>'idRevision'<>v_res->>'idRevision'
 THEN RAISE EXCEPTION 'Reintento de rechazo generó doble decisión'; END IF;

 -- 3. Dos pagos confirmados no pueden superar el saldo aún por imputar.
 v_pre:=public.sp_fin_preparar_carga_voucher_cuota_v1(
    5,2016,v_cuota,70,1,v_fecha,'CI-532-533-EXCESO',
    'voucher-3.png','image/png',800);
 INSERT INTO storage.objects(bucket_id,name,metadata)
 VALUES('vouchers-ventas-private',v_pre->>'claveArchivo',
     '{"mimetype":"image/png","size":800}'::jsonb);
 v_reg:=public.sp_fin_registrar_voucher_cuota_pendiente_v1(
    5,(v_pre->>'idCarga')::uuid);
 v_voucher:=(v_reg->>'idVoucher')::bigint;

 v_denegado:=false;
 BEGIN
   PERFORM public.sp_finanzas_revisar_voucher_cuota_v1(
     6,v_voucher,true,NULL,'Comprobante revisado');
 EXCEPTION WHEN others THEN v_denegado:=true; END;
 IF NOT v_denegado THEN RAISE EXCEPTION 'Se sobre-confirmó la cuota con 40+70 > 100'; END IF;

 -- El mismo voucher sí puede rechazarse, sin alterar la confirmación previa.
 v_res:=public.sp_finanzas_revisar_voucher_cuota_v1(
    6,v_voucher,false,'Importe supera saldo disponible',NULL);
 IF v_res->>'estadoPago'<>'ANULADO' THEN
   RAISE EXCEPTION 'Rechazo tras sobre-confirmación fallida incorrecto'; END IF;

 -- Seguridad: otro actor no revisor, separación e histórico excluidos.
 v_denegado:=false;
 BEGIN PERFORM public.sp_finanzas_revisar_voucher_cuota_v1(
    7,v_voucher,true,NULL,NULL);
 EXCEPTION WHEN others THEN v_denegado:=true; END;
 IF NOT v_denegado THEN RAISE EXCEPTION 'Revisor sin permisos accedió'; END IF;
 v_denegado:=false;
 BEGIN PERFORM public.sp_finanzas_revisar_voucher_cuota_v1(
    6,105,true,NULL,NULL);
 EXCEPTION WHEN others THEN v_denegado:=true; END;
 IF NOT v_denegado THEN RAISE EXCEPTION 'Voucher de separación admitido'; END IF;

 IF has_function_privilege('anon',
   'public.sp_finanzas_revisar_voucher_cuota_v1(bigint,bigint,boolean,varchar,varchar)','EXECUTE')
 OR has_function_privilege('authenticated',
   'public.sp_finanzas_revisar_voucher_cuota_v1(bigint,bigint,boolean,varchar,varchar)','EXECUTE')
 OR NOT has_function_privilege('sigi_app_user',
   'public.sp_finanzas_revisar_voucher_cuota_v1(bigint,bigint,boolean,varchar,varchar)','EXECUTE')
 THEN RAISE EXCEPTION 'Permisos de revisión inseguros'; END IF;

 SELECT count(*) INTO v_count
 FROM public.pag_vouchers_cuota_revisiones;
 IF v_count<>3 THEN
   RAISE EXCEPTION 'Auditoría esperaba 3 decisiones, existen %',v_count; END IF;
 IF (SELECT count(*) FROM public.pag_aplicaciones_pago)<>v_aplicaciones
 OR public.fn_fin_saldo_cuota_confirmado_v1(v_cuota)<>v_saldo
 THEN RAISE EXCEPTION 'La revisión cambió aplicaciones o saldos'; END IF;
 RAISE NOTICE 'VOUCHERS_533_OK: aprobación independiente, rechazo motivado, audit, dedup, sobre-confirmación y saldos intactos';
END;
$test$;
