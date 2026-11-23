-- 145 | Desglose verificable de múltiples comprobantes por venta.
-- Configurar y revisar NO acredita dinero, modifica cuotas ni altera contratos.
BEGIN;
CREATE TABLE IF NOT EXISTS public.fin_ventas_desglose_comprobantes_v1(
 id_desglose BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 id_venta BIGINT NOT NULL REFERENCES public.ven_ventas(id_venta) ON DELETE RESTRICT,
 id_comprobante BIGINT NOT NULL UNIQUE REFERENCES public.ven_ventas_comprobantes(id_comprobante) ON DELETE RESTRICT,
 monto NUMERIC(14,2) NOT NULL CHECK(monto>0),
 numero_operacion VARCHAR(100),
 estado VARCHAR(15) NOT NULL DEFAULT 'PENDIENTE'
   CHECK(estado IN('PENDIENTE','OBSERVADO','APROBADO','CONCILIADO')),
 id_registrador BIGINT NOT NULL REFERENCES public.seg_usuarios(id_usuario),
 fecha_registro TIMESTAMPTZ NOT NULL DEFAULT now(),
 id_revisor BIGINT REFERENCES public.seg_usuarios(id_usuario),
 fecha_revision TIMESTAMPTZ,
 motivo TEXT,
 id_pago BIGINT UNIQUE REFERENCES public.pag_pagos(id_pago) ON DELETE RESTRICT,
 id_movimiento BIGINT UNIQUE REFERENCES public.fin_movimientos(id_movimiento) ON DELETE RESTRICT,
 id_cuenta_financiera BIGINT REFERENCES public.fin_cuentas_financieras(id_cuenta_financiera) ON DELETE RESTRICT,
 id_conciliador BIGINT REFERENCES public.seg_usuarios(id_usuario),
 fecha_conciliacion TIMESTAMPTZ,
 CONSTRAINT ck_fin_desglose_revision CHECK(
  (estado='PENDIENTE' AND id_revisor IS NULL AND fecha_revision IS NULL AND motivo IS NULL)
  OR (estado='OBSERVADO' AND id_revisor IS NOT NULL AND fecha_revision IS NOT NULL AND length(btrim(COALESCE(motivo,''))) BETWEEN 10 AND 500)
  OR (estado IN('APROBADO','CONCILIADO') AND id_revisor IS NOT NULL AND fecha_revision IS NOT NULL AND motivo IS NULL)
 ),
 CONSTRAINT ck_fin_desglose_conciliacion CHECK(
  (estado<>'CONCILIADO' AND id_pago IS NULL AND id_movimiento IS NULL AND id_cuenta_financiera IS NULL
   AND id_conciliador IS NULL AND fecha_conciliacion IS NULL)
  OR (estado='CONCILIADO' AND id_pago IS NOT NULL AND id_movimiento IS NOT NULL
   AND id_cuenta_financiera IS NOT NULL AND id_conciliador IS NOT NULL AND fecha_conciliacion IS NOT NULL)
 )
);
CREATE INDEX IF NOT EXISTS ix_fin_desglose_por_venta ON public.fin_ventas_desglose_comprobantes_v1(id_venta,id_desglose);
CREATE UNIQUE INDEX IF NOT EXISTS ux_fin_desglose_referencia_venta_v1
 ON public.fin_ventas_desglose_comprobantes_v1(id_venta,lower(btrim(numero_operacion)))
 WHERE numero_operacion IS NOT NULL;
ALTER TABLE public.fin_ventas_desglose_comprobantes_v1 ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.fin_ventas_desglose_comprobantes_v1 FROM PUBLIC,anon,authenticated;

CREATE TABLE IF NOT EXISTS public.fin_ventas_desglose_eventos_v1(
 id_evento BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 id_venta BIGINT NOT NULL REFERENCES public.ven_ventas(id_venta) ON DELETE RESTRICT,
 id_comprobante BIGINT REFERENCES public.ven_ventas_comprobantes(id_comprobante) ON DELETE RESTRICT,
 id_actor BIGINT NOT NULL REFERENCES public.seg_usuarios(id_usuario) ON DELETE RESTRICT,
 accion VARCHAR(32) NOT NULL CHECK(accion IN(
   'CREAR_DESGLOSE','REEMPLAZAR_DESGLOSE','APROBAR_EVIDENCIA','OBSERVAR_EVIDENCIA','CONCILIAR_EVIDENCIA')),
 datos JSONB NOT NULL,
 fecha TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ix_fin_ventas_desglose_eventos_v1
 ON public.fin_ventas_desglose_eventos_v1(id_venta,fecha DESC);
ALTER TABLE public.fin_ventas_desglose_eventos_v1 ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.fin_ventas_desglose_eventos_v1 FROM PUBLIC,anon,authenticated;

CREATE OR REPLACE FUNCTION public.sp_fin_configurar_desglose_venta_v1(
 p_actor BIGINT,p_venta BIGINT,p_detalles JSONB
) RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO pg_catalog,public,pg_temp
AS $fn$
DECLARE
 v_m RECORD;v_item JSONB;v_id_comprobante BIGINT;v_monto NUMERIC;
 v_monto_text TEXT;v_ref TEXT;v_estado_doc VARCHAR;
 v_cantidad INT;v_total NUMERIC:=0;v_vistos BIGINT[]:='{}'::BIGINT[];
 v_metodo VARCHAR;v_historico JSONB;v_result JSONB;
BEGIN
 IF NOT coalesce(public.fn_usuario_tiene_permiso_seguridad(p_actor,'finance.view'::varchar),FALSE)
   OR NOT coalesce(public.fn_usuario_tiene_permiso_seguridad(p_actor,'finance.edit'::varchar),FALSE)
 THEN RAISE EXCEPTION 'DENEGADO|Se requieren permisos financieros.'; END IF;
 IF p_venta IS NULL OR p_venta<=0 OR jsonb_typeof(p_detalles)<>'array'
   OR length(p_detalles::text)>12000 THEN
   RAISE EXCEPTION 'DATOS_INVALIDOS|Detalle de comprobantes inválido.'; END IF;
 v_cantidad:=jsonb_array_length(p_detalles);
 IF v_cantidad NOT BETWEEN 2 AND 8
 THEN RAISE EXCEPTION 'ARCHIVOS_INVALIDOS|Se requiere de 2 a 8 comprobantes.'; END IF;

 SELECT m.id_venta,m.estado_revision,m.monto_pendiente_revision,
   m.id_usuario_registro,met.codigo AS metodo,ev.codigo AS venta_estado
 INTO v_m FROM public.ven_ventas_medios_pago m
 JOIN public.ven_ventas v ON v.id_venta=m.id_venta
 JOIN public.cfg_estados_venta ev ON ev.id_estado_venta=v.id_estado_venta
 JOIN public.cfg_metodos_pago met ON met.id_metodo_pago=m.id_metodo_pago
 WHERE m.id_venta=p_venta FOR UPDATE OF m;
 IF NOT FOUND OR v_m.estado_revision<>'PENDIENTE' OR v_m.venta_estado<>'CONTRATADA'
   OR NOT EXISTS(
      SELECT 1 FROM public.ven_contratos ct
      JOIN public.cfg_estados_contrato ec ON ec.id_estado_contrato=ct.id_estado_contrato
      WHERE ct.id_venta=p_venta AND ec.codigo='VIGENTE' AND ct.fecha_firma IS NOT NULL
   ) THEN RAISE EXCEPTION 'VENTA_NO_APTA|La venta debe estar contratada, firmada y pendiente de revisión.'; END IF;
 IF p_actor=v_m.id_usuario_registro THEN
   RAISE EXCEPTION 'AUTOAPROBACION_DENEGADA|El vendedor no puede desglosar el cobro.'; END IF;
 IF (SELECT count(*) FROM public.ven_ventas_comprobantes c WHERE c.id_venta=p_venta)<>v_cantidad
 THEN RAISE EXCEPTION 'CANTIDAD_INCORRECTA|Debe incluir exactamente todos los comprobantes de la venta.'; END IF;
 IF EXISTS(SELECT 1 FROM public.fin_revisiones_comprobantes_venta_v1 r
   WHERE r.id_venta=p_venta AND r.decision='APROBADO')
 THEN RAISE EXCEPTION 'REVISION_EXISTENTE|Ya hay una aprobación del flujo individual.'; END IF;

 SELECT coalesce(jsonb_agg(to_jsonb(d) ORDER BY d.id_desglose),'[]'::jsonb)
 INTO v_historico FROM public.fin_ventas_desglose_comprobantes_v1 d WHERE d.id_venta=p_venta;
 IF EXISTS(
   SELECT 1 FROM public.fin_ventas_desglose_comprobantes_v1 d
   WHERE d.id_venta=p_venta AND d.estado IN('APROBADO','CONCILIADO')
 ) THEN RAISE EXCEPTION 'DESGLOSE_CERRADO|Ya existen aprobaciones o conciliaciones; no se puede modificar el desglose.'; END IF;

 SELECT jsonb_agg(z.id_comprobante) INTO v_historico
 FROM public.fin_ventas_desglose_comprobantes_v1 z WHERE z.id_venta=p_venta;
 IF v_historico IS NOT NULL THEN
   INSERT INTO public.fin_ventas_desglose_eventos_v1(
     id_venta,id_actor,accion,datos
   ) SELECT p_venta,p_actor,'REEMPLAZAR_DESGLOSE',
     COALESCE(jsonb_agg(to_jsonb(x) ORDER BY x.id_desglose),'[]'::jsonb)
   FROM public.fin_ventas_desglose_comprobantes_v1 x WHERE x.id_venta=p_venta;
   DELETE FROM public.fin_ventas_desglose_comprobantes_v1 WHERE id_venta=p_venta;
 END IF;

 FOR v_item IN SELECT value FROM jsonb_array_elements(p_detalles) LOOP
   IF jsonb_typeof(v_item)<>'object'
     OR COALESCE(v_item->>'idComprobante','') !~ '^[1-9][0-9]{0,17}$'
   THEN RAISE EXCEPTION 'DOCUMENTO_INVALIDO|Identificador del comprobante inválido.'; END IF;
   v_id_comprobante:=(v_item->>'idComprobante')::BIGINT;
   IF v_id_comprobante=ANY(v_vistos)
   THEN RAISE EXCEPTION 'DOCUMENTO_DUPLICADO|No repita el mismo comprobante.'; END IF;
   v_vistos:=array_append(v_vistos,v_id_comprobante);
   v_monto_text:=COALESCE(v_item->>'monto','');
   IF v_monto_text !~ '^[0-9]{1,12}(\.[0-9]{1,2})?$'
   THEN RAISE EXCEPTION 'MONTO_INVALIDO|Indique importes en soles con máximo dos decimales.'; END IF;
   v_monto:=v_monto_text::NUMERIC;
   IF v_monto<=0 OR v_monto>v_m.monto_pendiente_revision
   THEN RAISE EXCEPTION 'MONTO_INVALIDO|Importe positivo y no mayor al total pendiente.'; END IF;
   v_total:=v_total+v_monto;
   v_ref:=NULLIF(btrim(COALESCE(v_item->>'numeroOperacion','')),'');
   IF length(COALESCE(v_ref,''))>100
      OR (v_m.metodo<>'EFECTIVO' AND (
       v_ref IS NULL OR v_ref !~ '^[A-Za-z0-9][A-Za-z0-9_./: -]{3,99}$'))
   THEN RAISE EXCEPTION 'REFERENCIA_INVALIDA|Cada transferencia requiere su propia referencia.'; END IF;
   SELECT c.estado_revision INTO v_estado_doc FROM public.ven_ventas_comprobantes c
   WHERE c.id_venta=p_venta AND c.id_comprobante=v_id_comprobante FOR UPDATE;
   IF NOT FOUND OR v_estado_doc<>'PENDIENTE'
   THEN RAISE EXCEPTION 'DOCUMENTO_NO_APTO|Comprobante ajeno o ya revisado.'; END IF;
   INSERT INTO public.fin_ventas_desglose_comprobantes_v1(
     id_venta,id_comprobante,monto,numero_operacion,id_registrador
   ) VALUES(p_venta,v_id_comprobante,v_monto,v_ref,p_actor);
 END LOOP;
 IF v_total<>v_m.monto_pendiente_revision
 THEN RAISE EXCEPTION 'SUMA_INCORRECTA|El desglose debe coincidir con el importe exacto pendiente de revisión.'; END IF;
 INSERT INTO public.fin_ventas_desglose_eventos_v1(
   id_venta,id_actor,accion,datos
 ) VALUES(p_venta,p_actor,'CREAR_DESGLOSE',p_detalles);

 SELECT coalesce(jsonb_agg(jsonb_build_object(
  'idDesglose',d.id_desglose,'idComprobante',d.id_comprobante,
  'monto',d.monto,'numeroOperacion',d.numero_operacion,
  'estado',d.estado) ORDER BY d.id_desglose),'[]'::jsonb)
 INTO v_result FROM public.fin_ventas_desglose_comprobantes_v1 d WHERE d.id_venta=p_venta;
 RETURN jsonb_build_object('idVenta',p_venta,'totalDesglosado',v_total,
  'cantidad',v_cantidad,'items',v_result,'dineroConfirmado',FALSE);
END $fn$;

CREATE OR REPLACE FUNCTION public.sp_fin_revisar_desglose_venta_v1(
 p_actor BIGINT,p_desglose BIGINT,p_aprobar BOOLEAN,p_motivo VARCHAR DEFAULT NULL
) RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO pg_catalog,public,pg_temp
AS $fn$
DECLARE v_d RECORD;v_m RECORD;v_c RECORD;v_motivo TEXT:=nullif(btrim(p_motivo),'');
BEGIN
 IF NOT coalesce(public.fn_usuario_tiene_permiso_seguridad(p_actor,'finance.view'::varchar),FALSE)
   OR NOT coalesce(public.fn_usuario_tiene_permiso_seguridad(p_actor,'finance.edit'::varchar),FALSE)
 THEN RAISE EXCEPTION 'DENEGADO|Se requiere finance.edit para revisar un desglose.'; END IF;
 IF p_desglose IS NULL OR p_desglose<=0 OR p_aprobar IS NULL
   OR length(COALESCE(p_motivo,''))>500
   OR (p_aprobar AND v_motivo IS NOT NULL)
   OR (NOT p_aprobar AND length(COALESCE(v_motivo,''))<10)
 THEN RAISE EXCEPTION 'DATOS_INVALIDOS|Decisión o motivo de revisión inválidos.'; END IF;
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

REVOKE ALL ON FUNCTION public.sp_fin_configurar_desglose_venta_v1(BIGINT,BIGINT,JSONB)
 FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.sp_fin_revisar_desglose_venta_v1(BIGINT,BIGINT,BOOLEAN,VARCHAR)
 FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.sp_fin_configurar_desglose_venta_v1(BIGINT,BIGINT,JSONB) TO sigi_app_user;
GRANT EXECUTE ON FUNCTION public.sp_fin_revisar_desglose_venta_v1(BIGINT,BIGINT,BOOLEAN,VARCHAR) TO sigi_app_user;
COMMIT;
