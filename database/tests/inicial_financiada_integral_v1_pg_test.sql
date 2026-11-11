-- SGI MONOLITHE · Sprint 4 / 5.3.5
-- PostgreSQL 17 efímero: nuevo pago documental de inicial, sin datos privados.
DO $test$
DECLARE
 f date:=(now() AT TIME ZONE 'America/Lima')::date;
 opts jsonb;pre jsonb;reg jsonb;reg2 jsonb;rev jsonb;rev2 jsonb;
 pr2 jsonb;r2 jsonb;app jsonb;bandeja jsonb;
 pago bigint;voucher bigint;v_saldo numeric;v_bad bool;
BEGIN
 opts:=public.sp_fin_opciones_registro_inicial_v1(5,NULL,60);
 IF NOT EXISTS(SELECT 1 FROM jsonb_array_elements(opts->'items') e
   WHERE (e->>'id_plan_pago')::bigint=2016)
 THEN RAISE EXCEPTION '535_INITIAL|Plan firmado no disponible'; END IF;

 pre:=public.sp_fin_preparar_carga_voucher_inicial_v1(
   5,2016,2016,100,1,f,'CI-535-INI-A',
   'inicial.pdf','application/pdf',900);
 v_bad:=false;
 BEGIN PERFORM public.sp_fin_registrar_voucher_inicial_pendiente_v1(
  5,(pre->>'idCarga')::uuid);
 EXCEPTION WHEN others THEN v_bad:=true; END;
 IF NOT v_bad THEN RAISE EXCEPTION '535_INITIAL|Aceptó registro sin objeto'; END IF;
 INSERT INTO storage.objects(bucket_id,name,metadata)
 VALUES('vouchers-ventas-private',pre->>'claveArchivo',
        '{"mimetype":"application/pdf","size":900}');
 reg:=public.sp_fin_registrar_voucher_inicial_pendiente_v1(
   5,(pre->>'idCarga')::uuid);
 reg2:=public.sp_fin_registrar_voucher_inicial_pendiente_v1(
   5,(pre->>'idCarga')::uuid);
 IF reg->>'estadoPago'<>'REGISTRADO' OR reg->>'destino'<>'INICIAL'
    OR NOT (reg2->>'reutilizado')::boolean OR
       reg->>'idPago'<>reg2->>'idPago'
 THEN RAISE EXCEPTION '535_INITIAL|Registro inicial no idempotente % %',reg,reg2; END IF;
 pago:=(reg->>'idPago')::bigint;
 voucher:=(reg->>'idVoucher')::bigint;

 v_bad:=false;
 BEGIN PERFORM public.sp_finanzas_revisar_voucher_financiamiento_v2(
     5,voucher,true,NULL,'Verificado');
 EXCEPTION WHEN others THEN v_bad:=true; END;
 IF NOT v_bad THEN RAISE EXCEPTION '535_INITIAL|Autoaprobación aceptada'; END IF;
 rev:=public.sp_finanzas_revisar_voucher_financiamiento_v2(
   6,voucher,true,NULL,'Banco verificado');
 rev2:=public.sp_finanzas_revisar_voucher_financiamiento_v2(
   6,voucher,true,NULL,'Banco verificado');
 IF rev->>'estadoPago'<>'CONFIRMADO'
   OR rev->>'estadoVoucher'<>'APROBADO'
   OR (rev->>'saldoAplicado')::numeric<>0
   OR NOT (rev2->>'reutilizado')::boolean
 THEN RAISE EXCEPTION '535_INITIAL|Revisión no protegida: % %',rev,rev2; END IF;

 -- Confirmar inicial por encima del disponible es imposible.
 pr2:=public.sp_fin_preparar_carga_voucher_inicial_v1(
   5,2016,2016,5000,1,f,'CI-535-INI-B',
   'inicial2.jpg','image/jpeg',800);
 INSERT INTO storage.objects(bucket_id,name,metadata)
 VALUES('vouchers-ventas-private',pr2->>'claveArchivo',
        '{"mimetype":"image/jpeg","size":800}');
 r2:=public.sp_fin_registrar_voucher_inicial_pendiente_v1(
   5,(pr2->>'idCarga')::uuid);
 v_bad:=false;
 BEGIN PERFORM public.sp_finanzas_revisar_voucher_financiamiento_v2(
   6,(r2->>'idVoucher')::bigint,true,NULL,'Exceso bancario');
 EXCEPTION WHEN others THEN v_bad:=true; END;
 IF NOT v_bad THEN RAISE EXCEPTION '535_INITIAL|Sobreconfirmación aceptada'; END IF;
 rev:=public.sp_finanzas_revisar_voucher_financiamiento_v2(
   6,(r2->>'idVoucher')::bigint,false,
   'Importe excede la inicial disponible',NULL);
 IF rev->>'estadoPago'<>'ANULADO' THEN
   RAISE EXCEPTION '535_INITIAL|Rechazo no anula pago'; END IF;

 v_saldo:=public.fn_fin_saldo_cuota_confirmado_v1(
   (SELECT id_cuota FROM public.pag_cuotas WHERE id_plan_pago=2016 AND numero_cuota=1));
 app:=public.sp_fin_aplicar_pago_confirmado_v1(
   5,gen_random_uuid(),pago,'INICIAL',NULL,100,'Inicial abonada y revisada');
 IF (app->>'montoAplicado')::numeric<>100
   OR (SELECT count(*) FROM public.pag_aplicaciones_pago a
       WHERE a.id_pago=pago AND a.activo)<>1
   OR public.fn_fin_saldo_cuota_confirmado_v1(
     (SELECT id_cuota FROM public.pag_cuotas WHERE id_plan_pago=2016 AND numero_cuota=1))
        <>v_saldo
 THEN RAISE EXCEPTION '535_INITIAL|Imputación alteró cuotas: %',app; END IF;

 bandeja:=public.sp_finanzas_listar_vouchers_financiamiento_v2(5,'TODOS',NULL,1,100);
 IF NOT EXISTS(SELECT 1 FROM jsonb_array_elements(bandeja->'items') e
    WHERE (e->>'id_voucher')::bigint=voucher
      AND e->>'tipo_destino'='INICIAL')
 THEN RAISE EXCEPTION '535_INITIAL|Bandeja no distingue inicial'; END IF;
 v_bad:=false;
 BEGIN PERFORM public.sp_fin_opciones_registro_inicial_v1(8,NULL,20);
 EXCEPTION WHEN others THEN v_bad:=true; END;
 IF NOT v_bad THEN RAISE EXCEPTION '535_INITIAL|Actor sin permisos consultó'; END IF;
 IF has_function_privilege('anon',
   'public.sp_fin_registrar_voucher_inicial_pendiente_v1(bigint,uuid)','EXECUTE')
   OR has_function_privilege('authenticated',
   'public.sp_finanzas_revisar_voucher_financiamiento_v2(bigint,bigint,boolean,varchar,varchar)','EXECUTE')
 THEN RAISE EXCEPTION '535_INITIAL|Funciones públicas'; END IF;

 RAISE NOTICE 'INICIAL_535_OK|Carga, registro, aprobación independiente, rechazo, sobrepago, imputación sin tocar cuotas, permisos';
END;
$test$;
