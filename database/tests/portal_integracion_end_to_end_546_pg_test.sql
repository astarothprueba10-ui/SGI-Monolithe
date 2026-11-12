-- SGI-MONOLITHE | Sprint 4 / 5.4.6
-- Prueba integral: Portal -> Storage (objeto sintético) -> Finanzas -> imputación
-- -> cronograma/alertas, además del aislamiento contractual. PostgreSQL 17 EFÍMERO.
-- Todo el circuito se revierte con una subtransacción: sin pagos ni archivos residuales.
DO $test$
DECLARE
  v_inicio jsonb; v_lotes jsonb; v_cronograma jsonb; v_documentos jsonb;
  v_options jsonb; v_pre jsonb; v_reg jsonb; v_reg_repetido jsonb;
  v_revision jsonb; v_aplicacion jsonb; v_aplicacion_repetida jsonb;
  v_estado jsonb; v_alertas jsonb; v_lectura jsonb;
  v_venta bigint:=1003;
  v_cuota bigint;
  v_pago bigint; v_voucher bigint; v_plan bigint;
  v_monto numeric:=20.00; v_saldo numeric; v_saldo_tras numeric;
  v_monto_inicial numeric; v_id_carga uuid; v_solicitud uuid;
  v_fecha date:=(now() AT TIME ZONE 'America/Lima')::date;
  v_pagantes integer; v_aplicaciones integer; v_cargas integer;
  v_archivos integer; v_completado boolean:=false; v_bloqueado boolean;
BEGIN
  -- 1. Identidad y coherencia entre resumen, lote, cronograma y documentos.
  v_inicio:=public.sp_portal_cliente_resumen_v1(9);
  v_lotes:=public.sp_portal_cliente_lotes_contratos_v1(9);
  v_cronograma:=public.sp_portal_cliente_cronograma_v1(9);
  v_documentos:=public.sp_portal_cliente_documentos_v1(9);
  v_options:=public.sp_portal_cliente_vouchers_v1(9);
  IF NOT EXISTS (SELECT 1 FROM jsonb_array_elements(v_inicio->'operaciones') o
     WHERE (o->>'id_venta')::bigint=v_venta)
     OR NOT EXISTS (SELECT 1 FROM jsonb_array_elements(v_lotes->'items') o
     WHERE (o->>'idVenta')::bigint=v_venta)
     OR NOT EXISTS (SELECT 1 FROM jsonb_array_elements(v_cronograma->'items') o
     WHERE (o->>'idVenta')::bigint=v_venta)
     OR NOT EXISTS (SELECT 1 FROM jsonb_array_elements(v_options->'operaciones') o
     WHERE (o->>'idVenta')::bigint=v_venta)
     OR (v_documentos->>'total')::int<>2
  THEN RAISE EXCEPTION '546|Expediente 1003 inconsistente entre módulos'; END IF;

  IF EXISTS (SELECT 1 FROM jsonb_array_elements(
      public.sp_portal_cliente_documentos_v1(10)->'items') d
      WHERE (d->>'idContrato')::bigint=93003)
     OR EXISTS (SELECT 1 FROM jsonb_array_elements(
      public.sp_portal_cliente_cronograma_v1(10)->'items') o
      WHERE (o->>'idVenta')::bigint=v_venta)
  THEN RAISE EXCEPTION '546|Fuga cruzada de contratos o cuotas'; END IF;

  SELECT c.id_cuota,c.id_plan_pago INTO STRICT v_cuota,v_plan
    FROM public.pag_cuotas c WHERE c.id_plan_pago=1003 AND c.numero_cuota=1;
  v_saldo:=public.fn_fin_saldo_cuota_confirmado_v1(v_cuota);
  IF v_saldo<v_monto THEN RAISE EXCEPTION '546|La cuota no tiene saldo de prueba'; END IF;

  SELECT count(*) INTO v_pagantes FROM public.pag_pagos;
  SELECT count(*) INTO v_aplicaciones FROM public.pag_aplicaciones_pago;
  SELECT count(*) INTO v_cargas FROM public.pag_cargas_voucher_cuota;
  SELECT count(*) INTO v_archivos FROM storage.objects
    WHERE bucket_id='vouchers-ventas-private';

  -- 2. Abrir proceso reversible, idéntico a una acción del comprador.
  BEGIN
    v_pre:=public.sp_portal_cliente_preparar_voucher_v1(
       9,v_venta,'CUOTA',v_cuota,v_monto,1,v_fecha,'CI-546-APROBACION',
       'documento-546.pdf','application/pdf',1234);
    v_id_carga:=(v_pre->>'idCarga')::uuid;
    IF (v_pre->>'bucket')<>'vouchers-ventas-private'
       OR (v_pre->>'destino')<>'CUOTA'
    THEN RAISE EXCEPTION '546|El comprador no obtiene la preautorización de cuota'; END IF;
    v_bloqueado:=false;
    BEGIN
      PERFORM public.sp_portal_cliente_registrar_voucher_v1(9,v_id_carga,'CUOTA');
    EXCEPTION WHEN OTHERS THEN
      IF SQLERRM LIKE 'PORTAL_ARCHIVO_NO_EXISTE|%' THEN v_bloqueado:=true;
      ELSE RAISE; END IF;
    END;
    IF NOT v_bloqueado THEN RAISE EXCEPTION '546|Registro permitió archivo inexistente'; END IF;

    -- Simula únicamente la presencia de un archivo de prueba, como Storage.
    INSERT INTO storage.objects(bucket_id,name,metadata)
      VALUES('vouchers-ventas-private',v_pre->>'claveArchivo',
         '{"mimetype":"application/pdf","size":1234}'::jsonb);
    v_reg:=public.sp_portal_cliente_registrar_voucher_v1(9,v_id_carga,'CUOTA');
    v_pago:=(v_reg->>'idPago')::bigint;
    v_voucher:=(v_reg->>'idVoucher')::bigint;
    IF v_reg->>'estadoPago'<>'REGISTRADO'
      OR v_reg->>'estadoVoucher'<>'PENDIENTE'
      OR public.fn_fin_saldo_cuota_confirmado_v1(v_cuota)<>v_saldo
    THEN RAISE EXCEPTION '546|Voucher nuevo modificó saldos antes de Finanzas'; END IF;
    v_reg_repetido:=public.sp_portal_cliente_registrar_voucher_v1(9,v_id_carga,'CUOTA');
    IF v_reg_repetido->>'idPago'<>v_reg->>'idPago'
        OR (v_reg_repetido->>'reutilizado')::boolean IS NOT TRUE
    THEN RAISE EXCEPTION '546|Reintento duplicó el voucher'; END IF;
    v_bloqueado:=false;
    BEGIN
      PERFORM public.sp_portal_cliente_registrar_voucher_v1(10,v_id_carga,'CUOTA');
    EXCEPTION WHEN OTHERS THEN v_bloqueado:=true;
    END;
    IF NOT v_bloqueado THEN RAISE EXCEPTION '546|Otro comprador registró un voucher ajeno'; END IF;
    v_bloqueado:=false;
    BEGIN
      PERFORM public.sp_fin_aplicar_pago_confirmado_v1(
        5,gen_random_uuid(),v_pago,'CUOTA',v_cuota,v_monto,'Pago sin aprobar');
    EXCEPTION WHEN OTHERS THEN v_bloqueado:=true;
    END;
    IF NOT v_bloqueado THEN RAISE EXCEPTION '546|Finanzas aplicó voucher pendiente'; END IF;
    v_alertas:=public.sp_portal_cliente_alertas_v1(9);
    IF NOT EXISTS(SELECT 1 FROM jsonb_array_elements(v_alertas->'items') x
       WHERE x->>'tipo'='VOUCHER_PENDIENTE'
         AND x->>'id'='VOUCHER:'||v_voucher::text)
    THEN RAISE EXCEPTION '546|No apareció alerta de revisión'; END IF;
    IF EXISTS(SELECT 1 FROM jsonb_array_elements(
        public.sp_portal_cliente_vouchers_v1(10)->'comprobantes') x
      WHERE (x->>'idVoucher')::bigint=v_voucher)
    THEN RAISE EXCEPTION '546|Se filtró comprobante en historial ajeno'; END IF;

    -- 3. Revisión independiente: confirma, pero NO aplica dinero.
    v_revision:=public.sp_finanzas_revisar_voucher_cuota_v1(
      6,v_voucher,true,NULL,'Revisión integrada CI 546');
    IF v_revision->>'estadoVoucher'<>'APROBADO'
      OR v_revision->>'estadoPago'<>'CONFIRMADO'
      OR public.fn_fin_saldo_cuota_confirmado_v1(v_cuota)<>v_saldo
    THEN RAISE EXCEPTION '546|Aprobación imputó indebidamente'; END IF;
    v_estado:=public.sp_portal_cliente_vouchers_v1(9);
    IF NOT EXISTS (SELECT 1 FROM jsonb_array_elements(v_estado->'comprobantes') x
      WHERE (x->>'idVoucher')::bigint=v_voucher
        AND x->>'estadoVoucher'='APROBADO'
        AND x->>'estadoPago'='CONFIRMADO'
        AND (x->>'montoAplicado')::numeric=0)
    THEN RAISE EXCEPTION '546|Portal no distingue aprobación e imputación'; END IF;

    -- 4. Imputación real de Finanzas: el mismo motor actualiza saldos y cronograma.
    v_solicitud:=gen_random_uuid();
    v_aplicacion:=public.sp_fin_aplicar_pago_confirmado_v1(
      5,v_solicitud,v_pago,'CUOTA',v_cuota,v_monto,'Abono confirmado 546');
    v_aplicacion_repetida:=public.sp_fin_aplicar_pago_confirmado_v1(
      5,v_solicitud,v_pago,'CUOTA',v_cuota,v_monto,'Abono confirmado 546');
    v_saldo_tras:=public.fn_fin_saldo_cuota_confirmado_v1(v_cuota);
    IF v_saldo_tras<>v_saldo-v_monto
      OR v_aplicacion_repetida->>'idAplicacion'<>v_aplicacion->>'idAplicacion'
      OR (v_aplicacion_repetida->>'reutilizado')::boolean IS NOT TRUE
    THEN RAISE EXCEPTION '546|Imputación no redujo exactamente 20 o duplicó asiento'; END IF;
    v_cronograma:=public.sp_portal_cliente_cronograma_v1(9);
    IF NOT EXISTS(SELECT 1
        FROM jsonb_array_elements(v_cronograma->'items') o
        CROSS JOIN LATERAL jsonb_array_elements(o->'cuotas') q
        WHERE (o->>'idVenta')::bigint=v_venta
          AND (q->>'idCuota')::bigint=v_cuota
          AND (q->>'saldoCuota')::numeric=v_saldo_tras)
    THEN RAISE EXCEPTION '546|Cronograma privado no reflejó el abono'; END IF;
    v_estado:=public.sp_portal_cliente_vouchers_v1(9);
    IF NOT EXISTS(SELECT 1 FROM jsonb_array_elements(v_estado->'comprobantes') x
       WHERE (x->>'idVoucher')::bigint=v_voucher
         AND (x->>'montoAplicado')::numeric=v_monto)
    THEN RAISE EXCEPTION '546|Portal no reflejó la imputación'; END IF;
    v_alertas:=public.sp_portal_cliente_alertas_v1(9);
    IF EXISTS(SELECT 1 FROM jsonb_array_elements(v_alertas->'items') x
       WHERE x->>'id'='VOUCHER:'||v_voucher::text)
    THEN RAISE EXCEPTION '546|El voucher aprobado conserva alerta pendiente'; END IF;

    -- 5. Rechazo con motivo: visible al cliente y sin alterar el saldo.
    v_pre:=public.sp_portal_cliente_preparar_voucher_v1(
       9,v_venta,'CUOTA',v_cuota,5.00,1,v_fecha,'CI-546-RECHAZO',
       'rechazo-546.png','image/png',700);
    INSERT INTO storage.objects(bucket_id,name,metadata)
      VALUES('vouchers-ventas-private',v_pre->>'claveArchivo',
         '{"mimetype":"image/png","size":700}'::jsonb);
    v_reg:=public.sp_portal_cliente_registrar_voucher_v1(
       9,(v_pre->>'idCarga')::uuid,'CUOTA');
    v_revision:=public.sp_finanzas_revisar_voucher_cuota_v1(
       6,(v_reg->>'idVoucher')::bigint,false,'Banco no valida operación',NULL);
    IF v_revision->>'estadoVoucher'<>'RECHAZADO'
        OR public.fn_fin_saldo_cuota_confirmado_v1(v_cuota)<>v_saldo_tras
    THEN RAISE EXCEPTION '546|Voucher rechazado modificó saldo'; END IF;
    v_alertas:=public.sp_portal_cliente_alertas_v1(9);
    IF NOT EXISTS(SELECT 1 FROM jsonb_array_elements(v_alertas->'items') x
        WHERE x->>'tipo'='VOUCHER_RECHAZADO'
          AND x->>'id'='VOUCHER:'||(v_reg->>'idVoucher'))
    THEN RAISE EXCEPTION '546|No se notificó el rechazo del comprobante'; END IF;

    -- 6. Inicial adicional (si existe saldo en el contrato de este fixture).
    v_options:=public.sp_portal_cliente_vouchers_v1(9);
    SELECT (o->>'saldoInicial')::numeric INTO v_monto_inicial
    FROM jsonb_array_elements(v_options->'operaciones') o
    WHERE (o->>'idVenta')::bigint=v_venta;
    IF v_monto_inicial>=10 THEN
      v_pre:=public.sp_portal_cliente_preparar_voucher_v1(
        9,v_venta,'INICIAL',NULL,10.00,1,v_fecha,'CI-546-INICIAL',
        'inicial-546.pdf','application/pdf',600);
      INSERT INTO storage.objects(bucket_id,name,metadata)
      VALUES('vouchers-ventas-private',v_pre->>'claveArchivo',
         '{"mimetype":"application/pdf","size":600}'::jsonb);
      v_reg:=public.sp_portal_cliente_registrar_voucher_v1(
        9,(v_pre->>'idCarga')::uuid,'INICIAL');
      v_revision:=public.sp_finanzas_revisar_voucher_inicial_v1(
        6,(v_reg->>'idVoucher')::bigint,true,NULL,'Inicial confirmada CI 546');
      IF v_revision->>'estadoPago'<>'CONFIRMADO'
      THEN RAISE EXCEPTION '546|Finanzas no confirmó la inicial'; END IF;
      v_aplicacion:=public.sp_fin_aplicar_pago_confirmado_v1(
        5,gen_random_uuid(),(v_reg->>'idPago')::bigint,
        'INICIAL',NULL,10.00,'Inicial aplicada 546');
      IF v_aplicacion->>'tipo'<>'INICIAL'
      THEN RAISE EXCEPTION '546|La inicial no se imputó en Finanzas'; END IF;
      v_estado:=public.sp_portal_cliente_vouchers_v1(9);
      IF NOT EXISTS(SELECT 1 FROM jsonb_array_elements(v_estado->'comprobantes') x
        WHERE (x->>'idVoucher')::bigint=(v_reg->>'idVoucher')::bigint
          AND (x->>'montoAplicado')::numeric=10.00)
      THEN RAISE EXCEPTION '546|Portal no reflejó abono de inicial'; END IF;
    END IF;

    -- 7. Publicación: lectura autorizada solo al comprador mientras exista PDF.
    v_lectura:=public.sp_portal_cliente_autorizar_documento_v1(9,'CONTRATO',93003);
    IF v_lectura->>'bucket'<>'contratos-firmados-private'
    THEN RAISE EXCEPTION '546|Documento no privado'; END IF;
    UPDATE public.ven_contratos_archivos
       SET visible_cliente=false WHERE id_contrato_archivo=93003;
    v_bloqueado:=false;
    BEGIN
      PERFORM public.sp_portal_cliente_autorizar_documento_v1(9,'CONTRATO',93003);
    EXCEPTION WHEN OTHERS THEN
      IF SQLERRM LIKE 'PORTAL_DOCUMENTO_NO_AUTORIZADO|%' THEN v_bloqueado:=true;
      ELSE RAISE; END IF;
    END;
    IF NOT v_bloqueado THEN RAISE EXCEPTION '546|Archivo oculto siguió autorizado'; END IF;

    v_completado:=true;
    RAISE EXCEPTION 'ROLLBACK_ACCEPTANCE_546';
  EXCEPTION WHEN raise_exception THEN
    IF SQLERRM<>'ROLLBACK_ACCEPTANCE_546' THEN RAISE; END IF;
  END;

  -- Comprobar reversión de la totalidad de los efectos en la base efímera.
  IF NOT v_completado
    OR (SELECT count(*) FROM public.pag_pagos)<>v_pagantes
    OR (SELECT count(*) FROM public.pag_aplicaciones_pago)<>v_aplicaciones
    OR (SELECT count(*) FROM public.pag_cargas_voucher_cuota)<>v_cargas
    OR (SELECT count(*) FROM storage.objects
         WHERE bucket_id='vouchers-ventas-private')<>v_archivos
    OR (SELECT visible_cliente FROM public.ven_contratos_archivos
         WHERE id_contrato_archivo=93003) IS NOT TRUE
  THEN RAISE EXCEPTION '546|Prueba integrada dejó datos alterados'; END IF;

  RAISE NOTICE 'PORTAL_546_OK|Compras aisladas, voucher, Finanzas, aprobación, imputación, rechazo, alertas, inicial, documentos y rollback';
END $test$;
