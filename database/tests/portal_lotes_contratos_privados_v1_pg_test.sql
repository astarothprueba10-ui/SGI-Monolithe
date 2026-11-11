-- Sprint 4 · 5.4.1 / 5.4.2 | Solo CI PostgreSQL sintético.
DO $test$
DECLARE
  r9 jsonb; r10 jsonb; r6 jsonb; resumen jsonb;
  contrato jsonb; item jsonb;
  denegado boolean:=false;validado boolean:=false;
BEGIN
  r9:=public.sp_portal_cliente_lotes_contratos_v1(9);
  r10:=public.sp_portal_cliente_lotes_contratos_v1(10);
  r6:=public.sp_portal_cliente_lotes_contratos_v1(6);
  IF (r9->>'total')::integer<1 OR (r10->>'total')::integer<1
    OR (r6->>'total')::integer<>0 THEN
      RAISE EXCEPTION '542|Alcance por usuario incorrecto % % %',r9,r10,r6; END IF;
  IF NOT EXISTS(
      SELECT 1 FROM jsonb_array_elements(r9->'items') x
      WHERE (x->>'idVenta')::bigint=1003)
    OR EXISTS(
      SELECT 1 FROM jsonb_array_elements(r9->'items') x
      WHERE (x->>'idVenta')::bigint=1004)
    OR EXISTS(
      SELECT 1 FROM jsonb_array_elements(r10->'items') x
      WHERE (x->>'idVenta')::bigint=1003)
  THEN RAISE EXCEPTION '542|Fuga de ventas de otro cliente'; END IF;
  SELECT x INTO item FROM jsonb_array_elements(r9->'items') x
    WHERE (x->>'idVenta')::bigint=1003 LIMIT 1;
  IF item->'lote'->>'codigo'<>'MZ-CI-L01'
    OR item->'proyecto'->>'nombre'<>'Proyecto sintético'
    OR item->>'estadoVenta'<>'CONTRATADA'
    OR (item->>'esTitular')::boolean IS NOT TRUE
  THEN RAISE EXCEPTION '542|Lote, proyecto o titular incorrectos %',item; END IF;
  IF jsonb_array_length(item->'contratos')<>1
  THEN RAISE EXCEPTION '542|Contrato sin identificar'; END IF;
  contrato:=item->'contratos'->0;
  IF contrato->>'estado'<>'VIGENTE'
    OR contrato->>'fechaFirma'<>'2026-11-01'
    OR (contrato->>'documentosPublicados')::integer<>1
    OR (contrato->>'anexosPublicados')::integer<>0
    OR contrato ? 'clave_archivo'
    OR contrato ? 'claveArchivo'
    OR contrato ? 'observaciones'
  THEN RAISE EXCEPTION '542|Publicación o fuga documental %',contrato; END IF;

  -- Si se vincula una segunda compra como cotitular,
  -- aparece solo en ese expediente y respeta titular=false.
  BEGIN
    INSERT INTO public.ven_ventas_clientes(id_venta,id_cliente,titular)
      VALUES(1004,700,false);
    r9:=public.sp_portal_cliente_lotes_contratos_v1(9);
    SELECT x INTO item FROM jsonb_array_elements(r9->'items') x
      WHERE (x->>'idVenta')::bigint=1004 LIMIT 1;
    IF item IS NULL OR (item->>'esTitular')::boolean IS NOT FALSE THEN
      RAISE EXCEPTION '542|Coparticipación incorrecta %',item; END IF;
    validado:=true;
    RAISE EXCEPTION 'ROLLBACK_542_COPARTICIPACION';
  EXCEPTION WHEN raise_exception THEN
    IF SQLERRM<>'ROLLBACK_542_COPARTICIPACION' THEN RAISE; END IF;
  END;
  IF NOT validado
    OR EXISTS(SELECT 1 FROM public.ven_ventas_clientes
        WHERE id_venta=1004 AND id_cliente=700)
  THEN RAISE EXCEPTION '542|La prueba de coparticipación alteró registros'; END IF;

  -- Sin rol CLIENTE, incluso un empleado con ROLE diferente no lee detalles.
  denegado:=false;
  BEGIN
    PERFORM public.sp_portal_cliente_lotes_contratos_v1(5);
  EXCEPTION WHEN others THEN denegado:=true;
  END;
  IF NOT denegado THEN RAISE EXCEPTION '542|Personal interno leyó portal ajeno'; END IF;
  denegado:=false;
  BEGIN
    PERFORM public.sp_portal_cliente_lotes_contratos_v1(-1);
  EXCEPTION WHEN others THEN denegado:=true;
  END;
  IF NOT denegado THEN RAISE EXCEPTION '542|Actor negativo autorizado'; END IF;

  -- La migración 95 conserva acceso a resumen de identidad propia.
  resumen:=public.sp_portal_cliente_resumen_v1(9);
  IF NOT EXISTS(SELECT 1 FROM jsonb_array_elements(resumen->'operaciones') v
      WHERE (v->>'id_venta')::bigint=1003)
  THEN RAISE EXCEPTION '541|Regresión de resumen privado'; END IF;
  IF has_function_privilege('anon',
    'public.sp_portal_cliente_lotes_contratos_v1(bigint)','EXECUTE')
    OR has_function_privilege('authenticated',
    'public.sp_portal_cliente_lotes_contratos_v1(bigint)','EXECUTE')
    OR NOT has_function_privilege('sigi_app_user',
    'public.sp_portal_cliente_lotes_contratos_v1(bigint)','EXECUTE')
  THEN RAISE EXCEPTION '542|Endpoint SQL público indebido'; END IF;
  RAISE NOTICE 'PORTAL_542_OK|JWT actor, ventas propias, coparticipante, contratos, visibilidad, permisos';
END;
$test$;
