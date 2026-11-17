-- Sprint 4 / 5.4.4: PostgreSQL 17 efímero, solo fixtures sintéticos.
DO $test$
DECLARE
  a jsonb; b jsonb; pre jsonb; reg jsonb; reg2 jsonb; lista jsonb;
  v_venta bigint; v_ajena bigint; v_cuota bigint; v_metodo integer;
  v_saldo numeric; v_carga uuid;
  n_pago integer; n_aplic integer; n_carga integer;
  negado boolean:=false; cubierto boolean:=false;
BEGIN
  a:=public.sp_portal_cliente_vouchers_v1(9);
  b:=public.sp_portal_cliente_vouchers_v1(10);
  v_venta:=(a->'operaciones'->0->>'idVenta')::bigint;
  v_ajena:=(b->'operaciones'->0->>'idVenta')::bigint;
  v_cuota:=(a->'operaciones'->0->'cuotas'->0->>'idCuota')::bigint;
  v_metodo:=(a->'metodos'->0->>'idMetodoPago')::integer;
  v_saldo:=public.fn_fin_saldo_cuota_confirmado_v1(v_cuota);
  -- Las fixtures previas pueden aportar más operaciones propias a cada
  -- actor; solo se prohíbe cruzar la venta exclusiva del otro comprador.
  IF v_venta<>1003 OR v_ajena<>1004 OR v_cuota IS NULL
     OR v_metodo IS NULL
     OR EXISTS(SELECT 1 FROM jsonb_array_elements(a->'operaciones') o
         WHERE (o->>'idVenta')::bigint=1004)
     OR EXISTS(SELECT 1 FROM jsonb_array_elements(b->'operaciones') o
         WHERE (o->>'idVenta')::bigint=1003)
     OR a::text LIKE '%clave_archivo%' OR a::text LIKE '%urlCarga%'
  THEN RAISE EXCEPTION '544|Consulta privada no aislada: venta=%, ajena=%, cuota=%, metodo=%, ops_a=%, ops_b=%', v_venta,v_ajena,v_cuota,v_metodo,jsonb_array_length(a->'operaciones'),jsonb_array_length(b->'operaciones'); END IF;

  BEGIN
    PERFORM public.sp_portal_cliente_vouchers_v1(5);
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM LIKE 'PORTAL_ACCESO_DENEGADO|%' THEN negado:=true;
    ELSE RAISE; END IF;
  END;
  IF NOT negado THEN RAISE EXCEPTION '544|Empleado consultó historial ajeno'; END IF;
  negado:=false;
  BEGIN
    PERFORM public.sp_portal_cliente_preparar_voucher_v1(
      9,v_ajena,'CUOTA',v_cuota,1,v_metodo,(now() AT TIME ZONE 'America/Lima')::date,
      NULL,'falso.pdf','application/pdf',500);
  EXCEPTION WHEN OTHERS THEN negado:=true;
  END;
  IF NOT negado THEN RAISE EXCEPTION '544|Cliente preparó voucher de venta ajena'; END IF;
  negado:=false;
  BEGIN
    PERFORM public.sp_portal_cliente_preparar_voucher_v1(
      9,v_venta,'CUOTA',v_cuota,v_saldo+1,v_metodo,
      (now() AT TIME ZONE 'America/Lima')::date,NULL,'falso.pdf','application/pdf',500);
  EXCEPTION WHEN OTHERS THEN negado:=true;
  END;
  IF NOT negado THEN RAISE EXCEPTION '544|Importe superior al saldo aceptado'; END IF;

  SELECT count(*) INTO n_pago FROM public.pag_pagos;
  SELECT count(*) INTO n_aplic FROM public.pag_aplicaciones_pago;
  SELECT count(*) INTO n_carga FROM public.pag_cargas_voucher_cuota;
  BEGIN
    pre:=public.sp_portal_cliente_preparar_voucher_v1(
      9,v_venta,'CUOTA',v_cuota,1,v_metodo,(now() AT TIME ZONE 'America/Lima')::date,
      'CI-PORTAL-544','archivo.pdf','application/pdf',700);
    v_carga:=(pre->>'idCarga')::uuid;
    IF pre->>'bucket'<>'vouchers-ventas-private'
       OR pre->>'claveArchivo' NOT LIKE 'ventas/p-1003/l-%/%.pdf'
    THEN RAISE EXCEPTION '544|Preautorización inválida'; END IF;
    negado:=false;
    BEGIN
      PERFORM public.sp_portal_cliente_registrar_voucher_v1(9,v_carga,'CUOTA');
    EXCEPTION WHEN OTHERS THEN
      IF SQLERRM LIKE 'PORTAL_ARCHIVO_NO_EXISTE|%' THEN negado:=true;
      ELSE RAISE; END IF;
    END;
    IF NOT negado THEN RAISE EXCEPTION '544|Registró sin archivo físico'; END IF;
    INSERT INTO storage.objects(bucket_id,name,metadata)
      VALUES('vouchers-ventas-private',pre->>'claveArchivo',
      '{"mimetype":"application/pdf","size":700}'::jsonb);
    negado:=false;
    BEGIN
      PERFORM public.sp_portal_cliente_registrar_voucher_v1(10,v_carga,'CUOTA');
    EXCEPTION WHEN OTHERS THEN negado:=true;
    END;
    IF NOT negado THEN RAISE EXCEPTION '544|Otro comprador registró carga ajena'; END IF;

    reg:=public.sp_portal_cliente_registrar_voucher_v1(9,v_carga,'CUOTA');
    IF reg->>'estadoVoucher'<>'PENDIENTE' OR reg->>'estadoPago'<>'REGISTRADO'
       OR (reg->>'saldoAplicado')::numeric<>0
    THEN RAISE EXCEPTION '544|Registro aplicó pago automáticamente'; END IF;
    reg2:=public.sp_portal_cliente_registrar_voucher_v1(9,v_carga,'CUOTA');
    IF (reg2->>'reutilizado')::boolean IS NOT TRUE
       OR reg2->>'idVoucher'<>reg->>'idVoucher'
    THEN RAISE EXCEPTION '544|Reintento no idempotente'; END IF;
    IF public.fn_fin_saldo_cuota_confirmado_v1(v_cuota)<>v_saldo
       OR (SELECT count(*) FROM public.pag_aplicaciones_pago)<>n_aplic
       OR (SELECT count(*) FROM public.pag_pagos)<>n_pago+1
    THEN RAISE EXCEPTION '544|Saldo modificado sin aprobación'; END IF;
    lista:=public.sp_portal_cliente_vouchers_v1(9);
    IF NOT EXISTS(SELECT 1 FROM jsonb_array_elements(lista->'comprobantes') x
        WHERE x->>'idVoucher'=reg->>'idVoucher'
          AND x->>'estadoVoucher'='PENDIENTE'
          AND (x->>'montoAplicado')::numeric=0)
       OR EXISTS(SELECT 1 FROM jsonb_array_elements(
           public.sp_portal_cliente_vouchers_v1(10)->'comprobantes') x
          WHERE x->>'idVoucher'=reg->>'idVoucher')
    THEN RAISE EXCEPTION '544|Historial compartido con otro comprador'; END IF;
    cubierto:=true;
    RAISE EXCEPTION 'ROLLBACK_544';
  EXCEPTION WHEN raise_exception THEN
    IF SQLERRM<>'ROLLBACK_544' THEN RAISE; END IF;
  END;
  IF NOT cubierto
      OR (SELECT count(*) FROM public.pag_pagos)<>n_pago
      OR (SELECT count(*) FROM public.pag_cargas_voucher_cuota)<>n_carga
  THEN RAISE EXCEPTION '544|Prueba dejó efectos de escritura'; END IF;

  IF has_function_privilege('anon',
      'public.sp_portal_cliente_vouchers_v1(bigint)','EXECUTE')
    OR has_function_privilege('authenticated',
      'public.sp_portal_cliente_preparar_voucher_v1(bigint,bigint,varchar,bigint,numeric,integer,date,varchar,varchar,varchar,bigint)','EXECUTE')
    OR has_function_privilege('authenticated',
      'public.sp_portal_cliente_registrar_voucher_v1(bigint,uuid,varchar)','EXECUTE')
    OR NOT has_function_privilege('sigi_app_user',
      'public.sp_portal_cliente_registrar_voucher_v1(bigint,uuid,varchar)','EXECUTE')
  THEN RAISE EXCEPTION '544|Permisos SQL incorrectos'; END IF;
  RAISE NOTICE 'PORTAL_544_OK|Aislamiento, carga firmada, Storage, idempotencia y saldo intacto';
END;
$test$;
