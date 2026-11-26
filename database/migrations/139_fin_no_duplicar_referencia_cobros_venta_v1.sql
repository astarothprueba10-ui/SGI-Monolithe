-- 139 | Endurece la conciliación: no repetir una referencia bancaria,
-- ni siquiera si corresponde a otra obligación de la misma venta.
-- No crea pagos; reemplaza únicamente la definición del procedimiento.
BEGIN;
CREATE OR REPLACE FUNCTION public.sp_fin_conciliar_cobro_venta_v1(
 p_actor BIGINT,p_venta BIGINT,p_cuenta BIGINT,p_fecha_operacion DATE,
 p_referencia VARCHAR DEFAULT NULL,p_observaciones VARCHAR DEFAULT NULL
) RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO pg_catalog,public,pg_temp
AS $fn$
DECLARE
 v_m RECORD; v_comp RECORD; v_rev RECORD; v_cta RECORD;
 v_plan RECORD; v_plan_id BIGINT; v_tipo VARCHAR; v_codigo_categoria VARCHAR; v_metodo VARCHAR;
 v_est_pago INT;v_est_voucher INT;v_est_mov INT;v_categoria BIGINT;
 v_pago BIGINT;v_voucher BIGINT;v_mov BIGINT;v_credito NUMERIC:=0;
 v_ref TEXT:=nullif(btrim(p_referencia),'');
 v_codigo VARCHAR; v_aplicacion JSONB;
BEGIN
 IF p_actor IS NULL OR NOT coalesce(
   public.fn_usuario_tiene_permiso_seguridad(p_actor,'finance.view'::varchar),FALSE)
   OR NOT coalesce(public.fn_usuario_tiene_permiso_seguridad(p_actor,'finance.edit'::varchar),FALSE)
 THEN RAISE EXCEPTION 'DENEGADO|Se requieren permisos de edición de Finanzas.'; END IF;
 IF p_venta IS NULL OR p_venta<=0 OR p_cuenta IS NULL OR p_cuenta<=0
   OR p_fecha_operacion IS NULL OR p_fecha_operacion>(now() AT TIME ZONE 'America/Lima')::date
   OR p_fecha_operacion<DATE '2000-01-01'
   OR length(COALESCE(p_referencia,''))>100
   OR length(COALESCE(p_observaciones,''))>300
 THEN RAISE EXCEPTION 'DATOS_INVALIDOS|Cuenta, fecha o referencia inválida.'; END IF;

 SELECT m.id_venta,m.id_usuario_registro,m.estado_revision,m.id_metodo_pago,
   m.monto_pendiente_revision,m.tipo_abono,m.numero_operacion,
   v.id_reserva,v.id_moneda,v.precio_venta,v.fecha_venta,
   ev.codigo AS estado_venta,mv.codigo AS modalidad
 INTO v_m
 FROM public.ven_ventas_medios_pago m
 JOIN public.ven_ventas v ON v.id_venta=m.id_venta
 JOIN public.cfg_estados_venta ev ON ev.id_estado_venta=v.id_estado_venta
 JOIN public.cfg_modalidades_venta mv ON mv.id_modalidad_venta=v.id_modalidad_venta
 WHERE m.id_venta=p_venta FOR UPDATE OF m;
 IF NOT FOUND OR v_m.estado_revision<>'APROBADO'
   OR v_m.estado_venta<>'CONTRATADA' OR v_m.monto_pendiente_revision<=0
   OR p_actor=v_m.id_usuario_registro
   OR NOT EXISTS (
     SELECT 1 FROM public.ven_contratos ct
     JOIN public.cfg_estados_contrato ec ON ec.id_estado_contrato=ct.id_estado_contrato
     WHERE ct.id_venta=p_venta AND ec.codigo='VIGENTE' AND ct.fecha_firma IS NOT NULL
   ) THEN
   RAISE EXCEPTION 'COBRO_NO_APTO|Requiere evidencia aprobada, firma vigente y segregación de funciones.';
 END IF;

 SELECT * INTO v_rev
 FROM public.fin_revisiones_comprobantes_venta_v1 r
 WHERE r.id_venta=p_venta AND r.decision='APROBADO'
 FOR UPDATE;
 IF NOT FOUND OR v_rev.id_pago IS NOT NULL
 THEN RAISE EXCEPTION 'CONCILIACION_DUPLICADA|Revisión inexistente o ya contabilizada.'; END IF;

 SELECT c.* INTO v_comp FROM public.ven_ventas_comprobantes c
 WHERE c.id_venta=p_venta AND c.id_comprobante=v_rev.id_comprobante
 FOR UPDATE;
 IF NOT FOUND OR v_comp.estado_revision<>'APROBADO'
   OR (SELECT COUNT(*) FROM public.ven_ventas_comprobantes WHERE id_venta=p_venta)<>1
   OR NOT EXISTS (
      SELECT 1 FROM storage.objects o
      WHERE o.bucket_id='vouchers-ventas-private' AND o.name=v_comp.clave_archivo
        AND o.archived_at IS NULL AND o.is_delete_marker=FALSE
        AND lower(COALESCE(o.metadata->>'mimetype',''))=v_comp.tipo_mime
        AND COALESCE((o.metadata->>'size')::BIGINT,0)=v_comp.tamanio_bytes
   )
 THEN RAISE EXCEPTION 'COMPROBANTE_NO_APTO|Evidencia aprobada no verificable o múltiple.'; END IF;

 SELECT c.id_cuenta_financiera,c.codigo AS codigo_cuenta,c.id_moneda,
   c.permite_ingresos,c.activo,c.fecha_cierre,t.codigo AS tipo
 INTO v_cta
 FROM public.fin_cuentas_financieras c
 JOIN public.cfg_tipos_cuenta_financiera t ON t.id_tipo_cuenta_financiera=c.id_tipo_cuenta_financiera
 WHERE c.id_cuenta_financiera=p_cuenta
 FOR UPDATE OF c;
 IF NOT FOUND OR NOT v_cta.activo OR NOT v_cta.permite_ingresos
   OR v_cta.fecha_cierre IS NOT NULL OR v_cta.id_moneda<>v_m.id_moneda
   OR v_cta.codigo_cuenta ILIKE 'DEMO-%'
 THEN RAISE EXCEPTION 'CUENTA_NO_APTA|Configure una cuenta receptora real y de la misma moneda.'; END IF;

 SELECT codigo INTO v_metodo FROM public.cfg_metodos_pago WHERE id_metodo_pago=v_m.id_metodo_pago AND activo;
 IF v_metodo IS NULL
   OR (v_metodo IN ('TRANSFERENCIA','DEPOSITO') AND v_cta.tipo<>'BANCO')
   OR (v_metodo='EFECTIVO' AND v_cta.tipo<>'CAJA')
   OR (v_metodo='YAPE_PLIN' AND v_cta.tipo<>'BILLETERA_DIGITAL')
   OR v_metodo='OTRO'
 THEN RAISE EXCEPTION 'METODO_INCOMPATIBLE|El tipo de cuenta no corresponde al medio de cobro.'; END IF;
 IF v_metodo<>'EFECTIVO' AND length(COALESCE(v_ref,''))<4
 THEN RAISE EXCEPTION 'REFERENCIA_OBLIGATORIA|Introduzca referencia bancaria verificada.'; END IF;
 -- Serializa referencias iguales entre operaciones diferentes: hasta tener cobros agrupados,
 -- no atribuir una misma transferencia a ventas múltiples.
 IF v_ref IS NOT NULL THEN
   PERFORM pg_advisory_xact_lock(hashtextextended(
      'FIN_VENTA:'||v_m.id_moneda::text||':'||lower(v_ref),0));
   IF EXISTS (
     SELECT 1 FROM public.pag_pagos p
     JOIN public.cfg_estados_pago e ON e.id_estado_pago=p.id_estado_pago
     WHERE p.id_moneda=v_m.id_moneda AND lower(btrim(COALESCE(p.numero_operacion,'')))=lower(v_ref)
       AND e.codigo='CONFIRMADO'
   ) THEN RAISE EXCEPTION 'REFERENCIA_DUPLICADA|Transferencia ya registrada en otra operación.'; END IF;
 END IF;

 -- Los pagos de separación acreditados son independientes de los nuevos cobros.
 IF v_m.modalidad='CONTADO' AND v_m.tipo_abono='CONTADO' THEN
   IF v_m.id_reserva IS NOT NULL THEN
     SELECT COALESCE(SUM(pg.monto),0) INTO v_credito
     FROM public.pag_pagos pg
     JOIN public.cfg_estados_pago ep ON ep.id_estado_pago=pg.id_estado_pago
     WHERE pg.id_reserva=v_m.id_reserva AND ep.codigo='CONFIRMADO';
   END IF;
   IF v_m.monto_pendiente_revision<>ROUND(v_m.precio_venta-v_credito,2)
   THEN RAISE EXCEPTION 'MONTO_INCONSISTENTE|Contado y separación no cuadran.'; END IF;
 ELSIF v_m.modalidad='FINANCIADA' AND v_m.tipo_abono='INICIAL' THEN
   SELECT pp.id_plan_pago,pp.monto_inicial,pp.id_moneda,pp.es_vigente
   INTO v_plan FROM public.pag_planes_pago pp
   WHERE pp.id_venta=p_venta AND pp.es_vigente FOR UPDATE;
   IF NOT FOUND THEN
      RAISE EXCEPTION 'INICIAL_INCONSISTENTE|Plan de financiamiento no encontrado.';
   END IF;
   v_plan_id:=v_plan.id_plan_pago;
   IF NOT v_plan.es_vigente OR v_plan.id_moneda<>v_m.id_moneda
     OR v_plan.monto_inicial<>v_m.monto_pendiente_revision
   THEN RAISE EXCEPTION 'INICIAL_INCONSISTENTE|El plan y la inicial no cuadran.'; END IF;
   IF EXISTS (
     SELECT 1 FROM public.pag_cargas_voucher_inicial_v1 c
     WHERE c.id_venta=p_venta AND c.id_pago IS NOT NULL
   ) OR EXISTS (
     SELECT 1 FROM public.pag_aplicaciones_pago a
     JOIN public.cfg_tipos_aplicacion_pago t ON t.id_tipo_aplicacion_pago=a.id_tipo_aplicacion_pago
     WHERE a.id_plan_pago=v_plan.id_plan_pago AND a.activo AND t.codigo='INICIAL'
   ) THEN RAISE EXCEPTION 'INICIAL_DUPLICADA|Ya hay pagos de inicial por otra vía.'; END IF;
 ELSE
   RAISE EXCEPTION 'MODALIDAD_INCONSISTENTE|Tipo de abono no corresponde con la venta.';
 END IF;

 IF EXISTS (
   SELECT 1 FROM public.pag_pagos p JOIN public.cfg_estados_pago e ON e.id_estado_pago=p.id_estado_pago
   WHERE p.id_venta=p_venta AND p.id_reserva IS NULL AND e.codigo<>'ANULADO'
     AND NOT EXISTS(SELECT 1 FROM public.pag_cargas_voucher_cuota c WHERE c.id_pago=p.id_pago)
 ) THEN
   RAISE EXCEPTION 'PAGO_PREEXISTENTE|Existe cobro no relacionado a cuotas. Conciliar manualmente.';
 END IF;

 v_codigo_categoria:=CASE WHEN v_m.tipo_abono='CONTADO'
   THEN 'INGRESO_VENTA_LOTE' ELSE 'INGRESO_INICIAL_VENTA' END;
 SELECT cat.id_categoria INTO v_categoria FROM public.fin_categorias cat
 JOIN public.cfg_tipos_movimiento_financiero t ON t.id_tipo_movimiento_financiero=cat.id_tipo_movimiento_financiero
 WHERE cat.codigo=v_codigo_categoria AND cat.activo AND t.codigo='INGRESO';
 IF v_categoria IS NULL THEN RAISE EXCEPTION 'CATEGORIA_NO_APTA|Categoría de ingreso inexistente.'; END IF;
 SELECT id_estado_pago INTO STRICT v_est_pago FROM public.cfg_estados_pago WHERE codigo='CONFIRMADO' AND activo;
 SELECT id_estado_voucher INTO STRICT v_est_voucher FROM public.cfg_estados_voucher WHERE codigo='APROBADO' AND activo;
 SELECT id_estado_movimiento_financiero INTO STRICT v_est_mov
   FROM public.cfg_estados_movimiento_financiero WHERE codigo='CONFIRMADO' AND activo;

 v_codigo:='PAG-VTA-'||p_venta;
 INSERT INTO public.pag_pagos(
   id_reserva,id_venta,id_plan_pago,id_estado_pago,id_metodo_pago,id_moneda,
   codigo,monto,fecha_operacion,numero_operacion,observaciones,id_usuario_registro,
   id_usuario_confirmacion,fecha_confirmacion
 ) VALUES(
   NULL,p_venta,v_plan_id,
   v_est_pago,v_m.id_metodo_pago,v_m.id_moneda,
   v_codigo,v_m.monto_pendiente_revision,
   (p_fecha_operacion::TIMESTAMP AT TIME ZONE 'America/Lima'),v_ref,
   left(COALESCE(p_observaciones,'Cobro de venta validado por Finanzas'),255),
   v_m.id_usuario_registro,p_actor,now()
 ) RETURNING id_pago INTO v_pago;

 INSERT INTO public.pag_vouchers(
   id_pago,id_estado_voucher,codigo,numero_version,nombre_archivo_original,
   clave_archivo,tipo_mime,tamanio_bytes,fecha_carga,id_usuario_carga,
   fecha_validacion,id_usuario_validacion,observaciones_validacion,activo
 ) VALUES(
   v_pago,v_est_voucher,'VOU-VTA-'||p_venta,1,v_comp.nombre_archivo,
   v_comp.clave_archivo,v_comp.tipo_mime,v_comp.tamanio_bytes,v_comp.fecha_carga,
   v_m.id_usuario_registro,now(),p_actor,
   'Comprobante original revisado bajo expediente de venta '||p_venta,TRUE
 ) RETURNING id_voucher INTO v_voucher;

 INSERT INTO public.fin_movimientos(
   id_categoria,id_cuenta_financiera,id_estado_movimiento_financiero,id_pago,
   codigo,monto,fecha_movimiento,numero_operacion,concepto,descripcion,
   id_usuario_registro,id_usuario_confirmacion,fecha_confirmacion
 ) VALUES(
   v_categoria,p_cuenta,v_est_mov,v_pago,
   'FIN-VTA-'||p_venta,v_m.monto_pendiente_revision,
   (p_fecha_operacion::TIMESTAMP AT TIME ZONE 'America/Lima'),v_ref,
   CASE WHEN v_m.tipo_abono='INICIAL' THEN 'Inicial de lote ' ELSE 'Venta de lote ' END||p_venta,
   left(COALESCE(p_observaciones,'Conciliación de pago aprobado'),500),
   p_actor,p_actor,now()
 ) RETURNING id_movimiento INTO v_mov;

 IF v_m.tipo_abono='INICIAL' THEN
   v_aplicacion:=public.sp_fin_aplicar_pago_confirmado_v1(
     p_actor,gen_random_uuid(),v_pago,'INICIAL',NULL,
     v_m.monto_pendiente_revision,'Aplicación de inicial aprobada y conciliada');
 END IF;

 UPDATE public.fin_revisiones_comprobantes_venta_v1 SET
   id_pago=v_pago,id_movimiento=v_mov,
   id_usuario_conciliacion=p_actor,fecha_conciliacion=now()
 WHERE id_revision=v_rev.id_revision;

 RETURN jsonb_build_object('estado','CONCILIADO','idVenta',p_venta,
   'idPago',v_pago,'idVoucher',v_voucher,'idMovimiento',v_mov,
   'idAplicacionInicial',v_aplicacion->'idAplicacion','monto',v_m.monto_pendiente_revision,
   'codigoCategoria',v_codigo_categoria);
END $fn$;
REVOKE ALL ON FUNCTION public.sp_fin_conciliar_cobro_venta_v1(
 BIGINT,BIGINT,BIGINT,DATE,VARCHAR,VARCHAR
) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.sp_fin_conciliar_cobro_venta_v1(
 BIGINT,BIGINT,BIGINT,DATE,VARCHAR,VARCHAR
) TO sigi_app_user;
COMMIT;
