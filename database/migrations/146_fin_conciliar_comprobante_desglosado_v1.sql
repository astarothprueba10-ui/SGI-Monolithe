-- 146 | Conciliación bancaria por comprobante desglosado, atómica y segregada.
-- No ejecuta conciliaciones: únicamente registra la función protegida.
BEGIN;

CREATE OR REPLACE FUNCTION public.sp_fin_conciliar_desglose_venta_v1(
 p_actor BIGINT,p_desglose BIGINT,p_cuenta BIGINT,p_fecha DATE,p_observaciones VARCHAR DEFAULT NULL
) RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO pg_catalog,public,pg_temp
AS $fn$
DECLARE
 v_d RECORD;v_m RECORD;v_doc RECORD;v_cuenta RECORD;v_plan RECORD;
 v_plan_id BIGINT;v_ref TEXT;v_metodo VARCHAR;v_categoria BIGINT;
 v_est_pago INT;v_est_voucher INT;v_est_mov INT;
 v_pago BIGINT;v_voucher BIGINT;v_mov BIGINT;v_aplicacion JSONB;
 v_codigo_categoria VARCHAR;v_saldo INTEGER;v_count INTEGER;
 v_reserva NUMERIC:=0;v_inicial NUMERIC:=0;
BEGIN
 IF p_actor IS NULL
   OR NOT coalesce(public.fn_usuario_tiene_permiso_seguridad(p_actor,'finance.view'::varchar),FALSE)
   OR NOT coalesce(public.fn_usuario_tiene_permiso_seguridad(p_actor,'finance.edit'::varchar),FALSE)
 THEN RAISE EXCEPTION 'DENEGADO|Se requiere finance.edit para conciliar.'; END IF;
 IF p_desglose IS NULL OR p_desglose<=0 OR p_cuenta IS NULL OR p_cuenta<=0
   OR p_fecha IS NULL OR p_fecha<DATE '2000-01-01'
   OR p_fecha>(now() AT TIME ZONE 'America/Lima')::DATE
   OR length(coalesce(p_observaciones,''))>300
 THEN RAISE EXCEPTION 'DATOS_INVALIDOS|Fecha o cuenta receptora inválidas.'; END IF;

 -- Mantener el mismo orden de bloqueos que el procedimiento de desglose.
 SELECT d.id_venta INTO v_d FROM public.fin_ventas_desglose_comprobantes_v1 d
 WHERE d.id_desglose=p_desglose;
 IF NOT FOUND THEN RAISE EXCEPTION 'DESGLOSE_NO_APTO|Comprobante no disponible.'; END IF;
 SELECT m.id_venta,m.id_usuario_registro,m.estado_revision,m.id_metodo_pago,
    m.monto_pendiente_revision,m.tipo_abono,
    v.id_reserva,v.id_moneda,v.precio_venta,ev.codigo AS estado_venta,
    mv.codigo AS modalidad
 INTO v_m FROM public.ven_ventas_medios_pago m
 JOIN public.ven_ventas v ON v.id_venta=m.id_venta
 JOIN public.cfg_estados_venta ev ON ev.id_estado_venta=v.id_estado_venta
 JOIN public.cfg_modalidades_venta mv ON mv.id_modalidad_venta=v.id_modalidad_venta
 WHERE m.id_venta=v_d.id_venta FOR UPDATE OF m;
 IF NOT FOUND OR v_m.estado_revision<>'PENDIENTE'
   OR v_m.estado_venta<>'CONTRATADA'
   OR p_actor=v_m.id_usuario_registro
   OR NOT EXISTS(
      SELECT 1 FROM public.ven_contratos ct
      JOIN public.cfg_estados_contrato ec ON ec.id_estado_contrato=ct.id_estado_contrato
      WHERE ct.id_venta=v_m.id_venta AND ec.codigo='VIGENTE' AND ct.fecha_firma IS NOT NULL)
 THEN RAISE EXCEPTION 'VENTA_NO_APTA|Requiere venta contratada y revisión aprobada.'; END IF;
 SELECT d.* INTO v_d FROM public.fin_ventas_desglose_comprobantes_v1 d
 WHERE d.id_desglose=p_desglose AND d.id_venta=v_m.id_venta FOR UPDATE;
 IF NOT FOUND OR v_d.estado<>'APROBADO' OR v_d.id_pago IS NOT NULL
 THEN RAISE EXCEPTION 'DESGLOSE_NO_APTO|Soporte sin aprobar, ya conciliado o no disponible.'; END IF;
 IF EXISTS(
   SELECT 1 FROM public.fin_ventas_desglose_comprobantes_v1 d
   WHERE d.id_venta=v_m.id_venta AND d.estado='OBSERVADO')
 THEN RAISE EXCEPTION 'DESGLOSE_OBSERVADO|Resuelva los soportes observados antes de conciliar.'; END IF;
 IF (SELECT count(*) FROM public.ven_ventas_comprobantes c WHERE c.id_venta=v_m.id_venta)
      <>(SELECT count(*) FROM public.fin_ventas_desglose_comprobantes_v1 d WHERE d.id_venta=v_m.id_venta)
   OR (SELECT sum(d.monto) FROM public.fin_ventas_desglose_comprobantes_v1 d
       WHERE d.id_venta=v_m.id_venta)<>v_m.monto_pendiente_revision
 THEN RAISE EXCEPTION 'DESGLOSE_INCOMPLETO|La distribución no cubre todos los comprobantes o el total.'; END IF;
 SELECT c.* INTO v_doc FROM public.ven_ventas_comprobantes c
 WHERE c.id_comprobante=v_d.id_comprobante AND c.id_venta=v_d.id_venta FOR UPDATE;
 IF NOT FOUND OR v_doc.estado_revision<>'APROBADO'
 OR NOT EXISTS(
   SELECT 1 FROM storage.objects o
   WHERE o.bucket_id='vouchers-ventas-private' AND o.name=v_doc.clave_archivo
     AND o.archived_at IS NULL AND o.is_delete_marker=FALSE
     AND lower(coalesce(o.metadata->>'mimetype',''))=v_doc.tipo_mime
     AND coalesce((o.metadata->>'size')::BIGINT,0)=v_doc.tamanio_bytes
 )
 THEN RAISE EXCEPTION 'ARCHIVO_NO_VERIFICABLE|El archivo aprobado no está disponible.'; END IF;

 SELECT c.id_cuenta_financiera,c.codigo,c.id_moneda,c.permite_ingresos,
   c.activo,c.fecha_cierre,t.codigo AS tipo
 INTO v_cuenta
 FROM public.fin_cuentas_financieras c
 JOIN public.cfg_tipos_cuenta_financiera t ON t.id_tipo_cuenta_financiera=c.id_tipo_cuenta_financiera
 WHERE c.id_cuenta_financiera=p_cuenta FOR UPDATE OF c;
 IF NOT FOUND OR NOT v_cuenta.activo OR NOT v_cuenta.permite_ingresos
   OR v_cuenta.fecha_cierre IS NOT NULL OR v_cuenta.codigo ILIKE 'DEMO-%'
   OR v_cuenta.id_moneda<>v_m.id_moneda
 THEN RAISE EXCEPTION 'CUENTA_NO_APTA|Elija una cuenta receptora real y en la moneda correcta.'; END IF;
 SELECT codigo INTO v_metodo FROM public.cfg_metodos_pago
 WHERE id_metodo_pago=v_m.id_metodo_pago AND activo;
 IF v_metodo NOT IN('TRANSFERENCIA','DEPOSITO','YAPE_PLIN','EFECTIVO')
   OR (v_metodo IN('TRANSFERENCIA','DEPOSITO') AND v_cuenta.tipo<>'BANCO')
   OR (v_metodo='YAPE_PLIN' AND v_cuenta.tipo<>'BILLETERA_DIGITAL')
   OR (v_metodo='EFECTIVO' AND v_cuenta.tipo<>'CAJA')
 THEN RAISE EXCEPTION 'METODO_INCOMPATIBLE|Medio de pago incompatible con la cuenta.'; END IF;
 v_ref:=NULLIF(btrim(v_d.numero_operacion),'');
 IF v_metodo<>'EFECTIVO' AND length(coalesce(v_ref,''))<4
 THEN RAISE EXCEPTION 'REFERENCIA_OBLIGATORIA|No se identificó el abono bancario.'; END IF;
 IF v_ref IS NOT NULL THEN
   PERFORM pg_advisory_xact_lock(hashtextextended(
     'FIN_VENTA:'||v_m.id_moneda::TEXT||':'||lower(v_ref),0));
   IF EXISTS(
     SELECT 1 FROM public.pag_pagos p JOIN public.cfg_estados_pago ep USING(id_estado_pago)
     WHERE p.id_moneda=v_m.id_moneda AND ep.codigo='CONFIRMADO'
       AND lower(btrim(coalesce(p.numero_operacion,'')))=lower(v_ref)
   ) THEN RAISE EXCEPTION 'REFERENCIA_DUPLICADA|Abono ya registrado en una operación.'; END IF;
 END IF;

 IF v_m.modalidad='CONTADO' AND v_m.tipo_abono='CONTADO' THEN
   IF v_m.id_reserva IS NOT NULL THEN
     SELECT coalesce(sum(p.monto),0) INTO v_reserva
     FROM public.pag_pagos p JOIN public.cfg_estados_pago ep USING(id_estado_pago)
     WHERE p.id_reserva=v_m.id_reserva AND ep.codigo='CONFIRMADO';
   END IF;
   IF v_m.monto_pendiente_revision<>round(v_m.precio_venta-v_reserva,2)
   THEN RAISE EXCEPTION 'MONTO_INCONSISTENTE|El saldo al contado no cuadra con la separación.'; END IF;
 ELSIF v_m.modalidad='FINANCIADA' AND v_m.tipo_abono='INICIAL' THEN
   SELECT pp.id_plan_pago,pp.monto_inicial,pp.id_moneda,pp.es_vigente,e.codigo AS estado_plan
   INTO v_plan FROM public.pag_planes_pago pp
   JOIN public.cfg_estados_plan_pago e ON e.id_estado_plan_pago=pp.id_estado_plan_pago
   WHERE pp.id_venta=v_m.id_venta AND pp.es_vigente FOR UPDATE OF pp;
   IF NOT FOUND OR NOT v_plan.es_vigente OR v_plan.estado_plan<>'ACTIVO'
     OR v_plan.id_moneda<>v_m.id_moneda
     OR v_plan.monto_inicial<>v_m.monto_pendiente_revision
   THEN RAISE EXCEPTION 'INICIAL_INCONSISTENTE|El cronograma no coincide con la inicial.'; END IF;
   v_plan_id:=v_plan.id_plan_pago;
   -- Nunca utilizar abonos de otras vías como si fueran parte de esta distribución.
   IF EXISTS(
     SELECT 1 FROM public.pag_aplicaciones_pago a
     JOIN public.cfg_tipos_aplicacion_pago t ON t.id_tipo_aplicacion_pago=a.id_tipo_aplicacion_pago
     WHERE a.id_plan_pago=v_plan_id AND a.activo AND t.codigo='INICIAL'
       AND NOT EXISTS(
         SELECT 1 FROM public.fin_ventas_desglose_comprobantes_v1 d
         WHERE d.id_pago=a.id_pago AND d.id_venta=v_m.id_venta AND d.estado='CONCILIADO')
   ) THEN RAISE EXCEPTION 'INICIAL_PREEXISTENTE|Otra vía ya registró una inicial: conciliar manualmente.'; END IF;
 ELSE RAISE EXCEPTION 'MODALIDAD_INCONSISTENTE|El comprobante no coincide con modalidad de venta.'; END IF;

 IF EXISTS(
   SELECT 1 FROM public.pag_pagos p
   JOIN public.cfg_estados_pago ep ON ep.id_estado_pago=p.id_estado_pago
   WHERE p.id_venta=v_m.id_venta AND p.id_reserva IS NULL AND ep.codigo<>'ANULADO'
     AND NOT EXISTS(SELECT 1 FROM public.pag_cargas_voucher_cuota c WHERE c.id_pago=p.id_pago)
     AND NOT EXISTS(SELECT 1 FROM public.fin_ventas_desglose_comprobantes_v1 d
       WHERE d.id_pago=p.id_pago AND d.id_venta=v_m.id_venta AND d.estado='CONCILIADO')
 ) THEN RAISE EXCEPTION 'PAGO_PREEXISTENTE|Existe un abono adicional no conciliado con el desglose.'; END IF;

 v_codigo_categoria:=CASE WHEN v_m.tipo_abono='INICIAL'
   THEN 'INGRESO_INICIAL_VENTA' ELSE 'INGRESO_VENTA_LOTE' END;
 SELECT cat.id_categoria INTO v_categoria FROM public.fin_categorias cat
 JOIN public.cfg_tipos_movimiento_financiero t ON t.id_tipo_movimiento_financiero=cat.id_tipo_movimiento_financiero
 WHERE cat.codigo=v_codigo_categoria AND cat.activo AND t.codigo='INGRESO';
 IF v_categoria IS NULL THEN RAISE EXCEPTION 'CATEGORIA_NO_APTA|No existe categoría contable adecuada.'; END IF;
 SELECT id_estado_pago INTO STRICT v_est_pago FROM public.cfg_estados_pago
 WHERE codigo='CONFIRMADO' AND activo;
 SELECT id_estado_voucher INTO STRICT v_est_voucher FROM public.cfg_estados_voucher
 WHERE codigo='APROBADO' AND activo;
 SELECT id_estado_movimiento_financiero INTO STRICT v_est_mov FROM public.cfg_estados_movimiento_financiero
 WHERE codigo='CONFIRMADO' AND activo;

 INSERT INTO public.pag_pagos(
   id_reserva,id_venta,id_plan_pago,id_estado_pago,id_metodo_pago,id_moneda,
   codigo,monto,fecha_operacion,numero_operacion,observaciones,id_usuario_registro,
   id_usuario_confirmacion,fecha_confirmacion
 ) VALUES(
   NULL,v_m.id_venta,v_plan_id,v_est_pago,v_m.id_metodo_pago,v_m.id_moneda,
   'PAG-VTD-'||v_d.id_desglose,v_d.monto,
   p_fecha::TIMESTAMP AT TIME ZONE 'America/Lima',v_ref,
   left(coalesce(p_observaciones,'Conciliación del comprobante de venta'),255),
   v_m.id_usuario_registro,p_actor,now()
 ) RETURNING id_pago INTO v_pago;

 INSERT INTO public.pag_vouchers(
   id_pago,id_estado_voucher,codigo,numero_version,nombre_archivo_original,
   clave_archivo,tipo_mime,tamanio_bytes,fecha_carga,id_usuario_carga,
   fecha_validacion,id_usuario_validacion,observaciones_validacion,activo
 ) VALUES(
   v_pago,v_est_voucher,'VOU-VTD-'||v_d.id_desglose,1,v_doc.nombre_archivo,
   v_doc.clave_archivo,v_doc.tipo_mime,v_doc.tamanio_bytes,v_doc.fecha_carga,
   v_m.id_usuario_registro,now(),p_actor,
   'Evidencia individual revisada del desglose de venta',TRUE
 ) RETURNING id_voucher INTO v_voucher;

 INSERT INTO public.fin_movimientos(
   id_categoria,id_cuenta_financiera,id_estado_movimiento_financiero,id_pago,
   codigo,monto,fecha_movimiento,numero_operacion,concepto,descripcion,
   id_usuario_registro,id_usuario_confirmacion,fecha_confirmacion
 ) VALUES(
   v_categoria,p_cuenta,v_est_mov,v_pago,
   'FIN-VTD-'||v_d.id_desglose,v_d.monto,
   p_fecha::TIMESTAMP AT TIME ZONE 'America/Lima',v_ref,
   CASE WHEN v_m.tipo_abono='INICIAL' THEN 'Inicial de venta ' ELSE 'Cobro de venta ' END||v_m.id_venta,
   left(coalesce(p_observaciones,'Conciliación bancaria por evidencia'),500),
   p_actor,p_actor,now()
 ) RETURNING id_movimiento INTO v_mov;

 IF v_m.tipo_abono='INICIAL' THEN
   v_aplicacion:=public.sp_fin_aplicar_pago_confirmado_v1(
     p_actor,gen_random_uuid(),v_pago,'INICIAL',NULL,v_d.monto,
     'Inicial conciliada por comprobante individual');
 END IF;

 UPDATE public.fin_ventas_desglose_comprobantes_v1 SET
   estado='CONCILIADO',id_pago=v_pago,id_movimiento=v_mov,
   id_cuenta_financiera=p_cuenta,id_conciliador=p_actor,fecha_conciliacion=now()
 WHERE id_desglose=v_d.id_desglose;
 INSERT INTO public.fin_ventas_desglose_eventos_v1(
   id_venta,id_comprobante,id_actor,accion,datos
 ) VALUES(v_d.id_venta,v_d.id_comprobante,p_actor,'CONCILIAR_EVIDENCIA',
   jsonb_build_object('idDesglose',v_d.id_desglose,'idPago',v_pago,'idMovimiento',v_mov,
    'monto',v_d.monto,'numeroOperacion',v_ref,'idCuenta',p_cuenta));

 SELECT count(*) INTO v_count
 FROM public.fin_ventas_desglose_comprobantes_v1
 WHERE id_venta=v_m.id_venta AND estado<>'CONCILIADO';
 IF v_count=0 THEN
   UPDATE public.ven_ventas_medios_pago SET estado_revision='APROBADO'
     WHERE id_venta=v_m.id_venta;
 END IF;
 RETURN jsonb_build_object(
   'estado','CONCILIADO','idVenta',v_d.id_venta,'idDesglose',v_d.id_desglose,
   'idPago',v_pago,'idVoucher',v_voucher,'idMovimiento',v_mov,
   'idAplicacionInicial',v_aplicacion->'idAplicacion','monto',v_d.monto,
   'comprobantesRestantes',v_count,'dineroConfirmado',TRUE
 );
END $fn$;

REVOKE ALL ON FUNCTION public.sp_fin_conciliar_desglose_venta_v1(BIGINT,BIGINT,BIGINT,DATE,VARCHAR)
 FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.sp_fin_conciliar_desglose_venta_v1(BIGINT,BIGINT,BIGINT,DATE,VARCHAR)
 TO sigi_app_user;
COMMIT;
