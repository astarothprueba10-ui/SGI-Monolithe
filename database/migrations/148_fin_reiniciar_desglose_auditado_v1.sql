-- 148 | Evita bloqueos invertidos y habilita reinicio auditado solo si no hay dinero confirmado.
BEGIN;
CREATE OR REPLACE FUNCTION public.sp_fin_revisar_desglose_venta_v1(
 p_actor BIGINT,p_desglose BIGINT,p_aprobar BOOLEAN,p_motivo VARCHAR DEFAULT NULL
) RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO pg_catalog,public,pg_temp
AS $fn$
DECLARE v_d RECORD;v_m RECORD;v_c RECORD;v_venta BIGINT;
 v_motivo TEXT:=nullif(btrim(p_motivo),'');
BEGIN
 IF NOT coalesce(public.fn_usuario_tiene_permiso_seguridad(p_actor,'finance.view'::varchar),FALSE)
   OR NOT coalesce(public.fn_usuario_tiene_permiso_seguridad(p_actor,'finance.edit'::varchar),FALSE)
 THEN RAISE EXCEPTION 'DENEGADO|Se requiere finance.edit para revisar un desglose.'; END IF;
 IF p_desglose IS NULL OR p_desglose<=0 OR p_aprobar IS NULL
   OR length(COALESCE(p_motivo,''))>500
   OR (p_aprobar AND v_motivo IS NOT NULL)
   OR (NOT p_aprobar AND length(COALESCE(v_motivo,''))<10)
 THEN RAISE EXCEPTION 'DATOS_INVALIDOS|Decisión o motivo de revisión inválidos.'; END IF;
 SELECT d.id_venta INTO v_venta FROM public.fin_ventas_desglose_comprobantes_v1 d
 WHERE d.id_desglose=p_desglose;
 IF NOT FOUND THEN RAISE EXCEPTION 'DESGLOSE_NO_APTO|El comprobante no existe.'; END IF;
 -- Orden de bloqueo idéntico a configuración y conciliación: primero medio de venta.
 PERFORM 1 FROM public.ven_ventas_medios_pago m WHERE m.id_venta=v_venta FOR UPDATE;
 SELECT d.* INTO v_d FROM public.fin_ventas_desglose_comprobantes_v1 d
 WHERE d.id_desglose=p_desglose FOR UPDATE;
 IF NOT FOUND OR v_d.estado<>'PENDIENTE'
 THEN RAISE EXCEPTION 'DESGLOSE_NO_APTO|El comprobante no está pendiente.'; END IF;
 SELECT m.id_usuario_registro,m.estado_revision,v.id_moneda,ev.codigo AS estado_venta
 INTO v_m FROM public.ven_ventas_medios_pago m
 JOIN public.ven_ventas v ON v.id_venta=m.id_venta
 JOIN public.cfg_estados_venta ev ON ev.id_estado_venta=v.id_estado_venta
 WHERE m.id_venta=v_d.id_venta FOR UPDATE OF m;
 IF NOT FOUND OR v_m.estado_revision<>'PENDIENTE'
   OR v_m.estado_venta<>'CONTRATADA'
   OR NOT EXISTS(
     SELECT 1 FROM public.ven_contratos c
     JOIN public.cfg_estados_contrato ec ON ec.id_estado_contrato=c.id_estado_contrato
     WHERE c.id_venta=v_d.id_venta AND ec.codigo='VIGENTE' AND c.fecha_firma IS NOT NULL)
 THEN RAISE EXCEPTION 'VENTA_NO_APTA|Contrato no vigente o cobro no disponible.'; END IF;
 IF p_actor=v_m.id_usuario_registro OR p_actor=v_d.id_registrador
 THEN RAISE EXCEPTION 'AUTOAPROBACION_DENEGADA|Debe revisar un usuario distinto del vendedor y del configurador.'; END IF;
 SELECT c.* INTO v_c FROM public.ven_ventas_comprobantes c
 WHERE c.id_comprobante=v_d.id_comprobante AND c.id_venta=v_d.id_venta FOR UPDATE;
 IF NOT FOUND OR v_c.estado_revision<>'PENDIENTE'
 THEN RAISE EXCEPTION 'DOCUMENTO_NO_APTO|Comprobante no disponible o ya revisado.'; END IF;
 IF p_aprobar THEN
   IF NOT EXISTS(
      SELECT 1 FROM storage.objects o
      WHERE o.bucket_id='vouchers-ventas-private'
        AND o.name=v_c.clave_archivo AND o.archived_at IS NULL AND o.is_delete_marker=FALSE
        AND lower(coalesce(o.metadata->>'mimetype',''))=v_c.tipo_mime
        AND coalesce((o.metadata->>'size')::BIGINT,0)=v_c.tamanio_bytes
    ) THEN RAISE EXCEPTION 'ARCHIVO_NO_VERIFICABLE|No existe el archivo original.'; END IF;
 END IF;
 UPDATE public.fin_ventas_desglose_comprobantes_v1
 SET estado=CASE WHEN p_aprobar THEN 'APROBADO' ELSE 'OBSERVADO' END,
   id_revisor=p_actor,fecha_revision=now(),motivo=v_motivo
 WHERE id_desglose=p_desglose;
 IF p_aprobar THEN UPDATE public.ven_ventas_comprobantes
   SET estado_revision='APROBADO' WHERE id_comprobante=v_c.id_comprobante; END IF;
 INSERT INTO public.fin_ventas_desglose_eventos_v1(
   id_venta,id_comprobante,id_actor,accion,datos
 ) VALUES(v_d.id_venta,v_d.id_comprobante,p_actor,
   CASE WHEN p_aprobar THEN 'APROBAR_EVIDENCIA' ELSE 'OBSERVAR_EVIDENCIA' END,
   jsonb_build_object('idDesglose',p_desglose,'monto',v_d.monto,
    'referencia',v_d.numero_operacion,'motivo',v_motivo));
 RETURN jsonb_build_object('idVenta',v_d.id_venta,'idDesglose',p_desglose,
  'estado',CASE WHEN p_aprobar THEN 'APROBADO' ELSE 'OBSERVADO' END,
  'dineroConfirmado',FALSE);
END $fn$;
CREATE OR REPLACE FUNCTION public.sp_fin_reiniciar_desglose_venta_v1(
 p_actor BIGINT,p_venta BIGINT,p_motivo VARCHAR
) RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO pg_catalog,public,pg_temp
AS $fn$
DECLARE v_m RECORD;v_historial JSONB;v_count INT;
BEGIN
 IF NOT public.fn_fin_gerencia_configura_cuentas_v1(p_actor)
 THEN RAISE EXCEPTION 'DENEGADO|Solo Gerencia con permisos financieros puede revocar revisiones sin cobros.'; END IF;
 IF p_venta IS NULL OR p_venta<=0 OR length(btrim(coalesce(p_motivo,''))) NOT BETWEEN 10 AND 500
 THEN RAISE EXCEPTION 'DATOS_INVALIDOS|Indique una venta y motivo documentado de reinicio.'; END IF;
 SELECT m.id_venta,m.estado_revision
 INTO v_m FROM public.ven_ventas_medios_pago m
 WHERE m.id_venta=p_venta FOR UPDATE;
 IF NOT FOUND OR v_m.estado_revision<>'PENDIENTE'
 THEN RAISE EXCEPTION 'COBRO_NO_APTO|Solo pueden reiniciarse revisiones de un cobro pendiente.'; END IF;
 IF EXISTS(
   SELECT 1 FROM public.fin_ventas_desglose_comprobantes_v1 d
   WHERE d.id_venta=p_venta AND (d.estado='CONCILIADO' OR d.id_pago IS NOT NULL)
 ) OR EXISTS(
   SELECT 1 FROM public.fin_revisiones_comprobantes_venta_v1 r
   WHERE r.id_venta=p_venta AND r.id_pago IS NOT NULL)
 THEN RAISE EXCEPTION 'DINERO_CONFIRMADO|No se pueden borrar ni revocar conciliaciones: requiere reversión financiera formal.'; END IF;
 SELECT coalesce(jsonb_agg(to_jsonb(d) ORDER BY d.id_desglose),'[]'::jsonb),
   count(*)::int INTO v_historial,v_count
 FROM public.fin_ventas_desglose_comprobantes_v1 d WHERE d.id_venta=p_venta;
 IF v_count<2 THEN RAISE EXCEPTION 'DESGLOSE_INEXISTENTE|No hay varios comprobantes configurados.'; END IF;
 INSERT INTO public.fin_ventas_desglose_eventos_v1(
   id_venta,id_actor,accion,datos
 ) VALUES(p_venta,p_actor,'REEMPLAZAR_DESGLOSE',
   jsonb_build_object('motivo',btrim(p_motivo),'evento','REVOCAR_REVISIONES_SIN_DINERO',
     'estadoAnterior',v_historial));
 UPDATE public.ven_ventas_comprobantes c SET estado_revision='PENDIENTE'
 WHERE c.id_venta=p_venta AND c.estado_revision='APROBADO';
 DELETE FROM public.fin_ventas_desglose_comprobantes_v1 WHERE id_venta=p_venta;
 RETURN jsonb_build_object('idVenta',p_venta,'estado','PENDIENTE_DESGLOSE',
   'comprobantesARevisar',v_count,'dineroConfirmado',FALSE,'auditoria',TRUE);
END $fn$;
REVOKE ALL ON FUNCTION public.sp_fin_revisar_desglose_venta_v1(BIGINT,BIGINT,BOOLEAN,VARCHAR)
 FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.sp_fin_reiniciar_desglose_venta_v1(BIGINT,BIGINT,VARCHAR)
 FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.sp_fin_revisar_desglose_venta_v1(BIGINT,BIGINT,BOOLEAN,VARCHAR)
 TO sigi_app_user;
GRANT EXECUTE ON FUNCTION public.sp_fin_reiniciar_desglose_venta_v1(BIGINT,BIGINT,VARCHAR)
 TO sigi_app_user;
COMMIT;
