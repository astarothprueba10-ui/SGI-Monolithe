-- 140-142 | Verificación no destructiva de alta bancaria y subsanación.
-- Ejecutar solamente después de migraciones 140,141,142.
DO $test$
DECLARE v_gerencia BIGINT;v_finanzas BIGINT;v_venta BIGINT;v_antes BIGINT;v_resultado JSONB;
BEGIN
 SELECT MIN(u.id_usuario) INTO v_gerencia FROM public.seg_usuarios u
 WHERE public.fn_fin_gerencia_configura_cuentas_v1(u.id_usuario);
 IF v_gerencia IS NULL THEN RAISE EXCEPTION 'TEST-01: sin Gerencia autorizada'; END IF;
 SELECT MIN(u.id_usuario) INTO v_finanzas FROM public.seg_usuarios u
 WHERE public.fn_usuario_tiene_permiso_seguridad(u.id_usuario,'finance.view'::varchar)
   AND public.fn_usuario_tiene_permiso_seguridad(u.id_usuario,'finance.edit'::varchar)
   AND NOT public.fn_fin_gerencia_configura_cuentas_v1(u.id_usuario);
 IF v_finanzas IS NULL THEN RAISE EXCEPTION 'TEST-02: sin actor de Finanzas segregado'; END IF;
 IF public.fn_fin_gerencia_configura_cuentas_v1(v_finanzas)
 THEN RAISE EXCEPTION 'TEST-03: actor no autorizado configuraría cuentas'; END IF;
 IF has_function_privilege('anon',
   'public.sp_fin_crear_cuenta_receptora_v1(bigint,character varying,character varying,character varying,character varying,character varying,character varying)','EXECUTE')
   OR has_function_privilege('authenticated',
   'public.sp_fin_confirmar_subsanacion_venta_v1(bigint,uuid)','EXECUTE')
 THEN RAISE EXCEPTION 'TEST-04: RPC financiera pública'; END IF;
 IF NOT (SELECT c.relrowsecurity FROM pg_class c WHERE c.oid='public.fin_cuentas_receptoras_auditoria_v1'::regclass)
   OR NOT (SELECT c.relrowsecurity FROM pg_class c WHERE c.oid='public.fin_cargas_subsanacion_venta_v1'::regclass)
 THEN RAISE EXCEPTION 'TEST-05: auditoría sin RLS'; END IF;
 BEGIN
   PERFORM public.sp_fin_crear_cuenta_receptora_v1(v_finanzas,
     'Cuenta principal','Banco seguro','Razón Social Autorizada',
     '123456789123',NULL,'PEN');
   RAISE EXCEPTION 'TEST-06: configuró banco sin Gerencia';
 EXCEPTION WHEN raise_exception THEN
   IF SQLERRM NOT LIKE 'DENEGADO|%' THEN RAISE; END IF;
 END;
 BEGIN
   PERFORM public.sp_fin_crear_cuenta_receptora_v1(v_gerencia,
     'Cuenta de prueba','Banco demo','Titular test',
     '000000000000',NULL,'PEN');
   RAISE EXCEPTION 'TEST-07: aceptó cuenta ficticia';
 EXCEPTION WHEN raise_exception THEN
   IF SQLERRM NOT LIKE 'DATOS_INVALIDOS|%' THEN RAISE; END IF;
 END;
 SELECT COUNT(*) INTO v_antes FROM public.fin_cargas_subsanacion_venta_v1;
 SELECT MIN(v.id_venta) INTO v_venta FROM public.ven_ventas v
 JOIN public.ven_ventas_medios_pago m ON m.id_venta=v.id_venta
 JOIN public.cfg_estados_venta ev ON ev.id_estado_venta=v.id_estado_venta
 WHERE m.estado_revision='PENDIENTE' AND ev.codigo='CONTRATADA'
 AND NOT EXISTS (SELECT 1 FROM public.ven_ventas_comprobantes c WHERE c.id_venta=v.id_venta)
 AND EXISTS (SELECT 1 FROM public.ven_contratos ct
    JOIN public.cfg_estados_contrato e ON e.id_estado_contrato=ct.id_estado_contrato
    WHERE ct.id_venta=v.id_venta AND e.codigo='VIGENTE' AND ct.fecha_firma IS NOT NULL);
 IF v_venta IS NOT NULL THEN
  BEGIN
    v_resultado:=public.sp_fin_preparar_subsanacion_venta_v1(
      v_finanzas,v_venta,'documento-prueba.pdf','application/pdf',1000);
    IF v_resultado->>'bucket'<>'vouchers-ventas-private'
       OR (v_resultado->>'expiresInSeconds')::INT<>900
    THEN RAISE EXCEPTION 'TEST-08: ruta y plazo inválidos'; END IF;
    -- Revertir la preparación de prueba, incluso si la generación tuvo éxito.
    RAISE EXCEPTION 'PRUEBA_REVERTIDA';
  EXCEPTION WHEN raise_exception THEN
    IF SQLERRM<>'PRUEBA_REVERTIDA' THEN RAISE; END IF;
  END;
 END IF;
 IF (SELECT COUNT(*) FROM public.fin_cargas_subsanacion_venta_v1)<>v_antes
 THEN RAISE EXCEPTION 'TEST-09: persistió preparación simulada'; END IF;
 v_resultado:=public.sp_fin_ventas_cobros_pendientes_v1(v_finanzas,NULL,1,100);
 IF NOT EXISTS (
   SELECT 1 FROM jsonb_array_elements(v_resultado->'items') x
   WHERE jsonb_typeof(x->'archivos')='array'
     AND jsonb_array_length(x->'archivos')=(x->>'comprobantes')::INT
 ) AND (v_resultado->>'total')::INT>0
 THEN RAISE EXCEPTION 'TEST-10: comprobantes sin desglose visual'; END IF;
 RAISE NOTICE 'Cuentas receptoras, subsanación y multicomprobantes: pruebas no destructivas superadas';
END $test$;
