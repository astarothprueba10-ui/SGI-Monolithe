-- Sprint 4 / 5.4.3: exclusivamente datos sintéticos del PostgreSQL 17 de CI.
DO $test$
DECLARE
  r9 jsonb; r10 jsonb; r6 jsonb;
  item jsonb; cuota jsonb; ms jsonb;
  denegado boolean := false;
BEGIN
  r9:=public.sp_portal_cliente_cronograma_v1(9);
  r10:=public.sp_portal_cliente_cronograma_v1(10);
  r6:=public.sp_portal_cliente_cronograma_v1(6);
  IF (r9->>'total')::int<1 OR (r10->>'total')::int<1
     OR (r6->>'total')::int<>0 THEN
    RAISE EXCEPTION '543|La consulta no aisló las compras % % %',r9,r10,r6;
  END IF;
  IF EXISTS (SELECT 1 FROM jsonb_array_elements(r9->'items') x
             WHERE (x->>'idVenta')::bigint=1004)
     OR EXISTS (SELECT 1 FROM jsonb_array_elements(r10->'items') x
             WHERE (x->>'idVenta')::bigint=1003)
  THEN RAISE EXCEPTION '543|Fuga de compra ajena'; END IF;
  SELECT x INTO item FROM jsonb_array_elements(r9->'items') x
    WHERE (x->>'idVenta')::bigint=1003 LIMIT 1;
  IF item IS NULL OR (item->'financiamiento'->>'idPlanPago')::bigint<>1003
     OR jsonb_array_length(item->'cuotas')<1
  THEN RAISE EXCEPTION '543|No recuperó plan firmado real %',item; END IF;
  SELECT x INTO cuota FROM jsonb_array_elements(item->'cuotas') x
    WHERE (x->>'idCuota')::bigint=1003 LIMIT 1;
  IF cuota IS NULL
     OR (cuota->>'abonadoConfirmado')::numeric<>100
     OR (cuota->>'saldoCuota')::numeric<>24900
     OR cuota->>'estadoCalculado'<>'PARCIAL'
  THEN RAISE EXCEPTION '543|Abonos, estados o saldos incoherentes %',cuota; END IF;
  ms:=item->'movimientosConfirmados';
  IF jsonb_array_length(ms)<>2
     OR NOT EXISTS (SELECT 1 FROM jsonb_array_elements(ms) x
          WHERE (x->>'idAplicacion')::bigint=10031
            AND x->>'tipo'='CUOTA' AND (x->>'montoAplicado')::numeric=100)
     OR NOT EXISTS (SELECT 1 FROM jsonb_array_elements(ms) x
          WHERE (x->>'idAplicacion')::bigint=10032
            AND x->>'tipo'='INICIAL' AND (x->>'montoAplicado')::numeric=50)
     OR EXISTS (SELECT 1 FROM jsonb_array_elements(ms) x
          WHERE (x->>'idAplicacion')::bigint=10041)
  THEN RAISE EXCEPTION '543|Pago registrado o sin aplicar expuesto %',ms; END IF;
  IF item ? 'claveArchivo' OR item ? 'hash_sha256'
     OR ms::text LIKE '%clave_archivo%' THEN
    RAISE EXCEPTION '543|Se filtraron detalles de Storage';
  END IF;

  BEGIN
    PERFORM public.sp_portal_cliente_cronograma_v1(5);
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM LIKE 'PORTAL_ACCESO_DENEGADO|%' THEN denegado:=true;
    ELSE RAISE; END IF;
  END;
  IF NOT denegado THEN RAISE EXCEPTION '543|Empleado pudo leer el portal'; END IF;
  denegado:=false;
  BEGIN
    PERFORM public.sp_portal_cliente_cronograma_v1(-1);
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM LIKE 'PORTAL_ACCESO_DENEGADO|%' THEN denegado:=true;
    ELSE RAISE; END IF;
  END;
  IF NOT denegado THEN RAISE EXCEPTION '543|Actor inválido autorizado'; END IF;

  IF has_function_privilege('anon',
        'public.sp_portal_cliente_cronograma_v1(bigint)','EXECUTE')
     OR has_function_privilege('authenticated',
        'public.sp_portal_cliente_cronograma_v1(bigint)','EXECUTE')
     OR NOT has_function_privilege('sigi_app_user',
        'public.sp_portal_cliente_cronograma_v1(bigint)','EXECUTE')
  THEN RAISE EXCEPTION '543|Permisos SQL incorrectos'; END IF;
  RAISE NOTICE 'PORTAL_543_OK|Compras privadas, abono cuota, inicial y pago registrado excluido';
END;
$test$;
