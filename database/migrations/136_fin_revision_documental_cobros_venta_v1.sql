-- 136 | Revisión documental de cobros de venta.
-- No confirma ni crea pag_pagos. Todo movimiento financiero sigue sujeto a conciliación posterior.
BEGIN;

CREATE TABLE IF NOT EXISTS public.fin_revisiones_comprobantes_venta_v1 (
 id_revision BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 id_venta BIGINT NOT NULL REFERENCES public.ven_ventas(id_venta) ON DELETE RESTRICT,
 id_comprobante BIGINT REFERENCES public.ven_ventas_comprobantes(id_comprobante) ON DELETE RESTRICT,
 id_revisor BIGINT NOT NULL REFERENCES public.seg_usuarios(id_usuario) ON DELETE RESTRICT,
 decision VARCHAR(12) NOT NULL CHECK (decision IN('APROBADO','OBSERVADO')),
 motivo TEXT,
 fecha_revision TIMESTAMPTZ NOT NULL DEFAULT now(),
 id_pago BIGINT UNIQUE REFERENCES public.pag_pagos(id_pago) ON DELETE RESTRICT,
 id_movimiento BIGINT UNIQUE REFERENCES public.fin_movimientos(id_movimiento) ON DELETE RESTRICT,
 id_usuario_conciliacion BIGINT REFERENCES public.seg_usuarios(id_usuario) ON DELETE RESTRICT,
 fecha_conciliacion TIMESTAMPTZ,
 CONSTRAINT ck_fin_revision_motivo CHECK (
   (decision='APROBADO' AND motivo IS NULL AND id_comprobante IS NOT NULL)
   OR (decision='OBSERVADO' AND length(btrim(COALESCE(motivo,''))) BETWEEN 10 AND 500)
 ),
 CONSTRAINT ck_fin_revision_conciliacion CHECK (
   (id_pago IS NULL AND id_movimiento IS NULL AND id_usuario_conciliacion IS NULL AND fecha_conciliacion IS NULL)
   OR (decision='APROBADO' AND id_pago IS NOT NULL AND id_movimiento IS NOT NULL
       AND id_usuario_conciliacion IS NOT NULL AND fecha_conciliacion IS NOT NULL)
 )
);
CREATE UNIQUE INDEX IF NOT EXISTS ux_fin_revision_venta_aprobada_v1
 ON public.fin_revisiones_comprobantes_venta_v1(id_venta)
 WHERE decision='APROBADO';
CREATE INDEX IF NOT EXISTS ix_fin_revision_venta_fecha_v1
 ON public.fin_revisiones_comprobantes_venta_v1(id_venta,fecha_revision DESC);
ALTER TABLE public.fin_revisiones_comprobantes_venta_v1 ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.fin_revisiones_comprobantes_venta_v1 FROM PUBLIC,anon,authenticated;
REVOKE ALL ON SEQUENCE public.fin_revisiones_comprobantes_venta_v1_id_revision_seq FROM PUBLIC,anon,authenticated;

CREATE OR REPLACE FUNCTION public.sp_fin_revisar_comprobante_venta_v1(
 p_actor BIGINT,p_venta BIGINT,p_comprobante BIGINT,p_aprobar BOOLEAN,p_motivo VARCHAR DEFAULT NULL
) RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO pg_catalog,public,pg_temp
AS $fn$
DECLARE
 v_m RECORD; v_c RECORD; v_revision BIGINT;
 v_motivo TEXT:=nullif(btrim(p_motivo),'');
BEGIN
 IF NOT coalesce(public.fn_usuario_tiene_permiso_seguridad(p_actor,'finance.view'::varchar),false)
    OR NOT coalesce(public.fn_usuario_tiene_permiso_seguridad(p_actor,'finance.edit'::varchar),false)
 THEN RAISE EXCEPTION 'DENEGADO|Se requieren permisos de Finanzas para revisar evidencias.'; END IF;
 IF p_venta IS NULL OR p_venta<=0 OR p_comprobante IS NULL OR p_comprobante<=0
    OR p_aprobar IS NULL OR length(COALESCE(p_motivo,''))>500
    OR (p_aprobar AND v_motivo IS NOT NULL)
    OR (NOT p_aprobar AND length(COALESCE(v_motivo,''))<10)
 THEN RAISE EXCEPTION 'DATOS_INVALIDOS|Indique la decisión, comprobante y motivo de observación.'; END IF;

 SELECT m.id_venta,m.estado_revision,m.id_usuario_registro,m.monto_pendiente_revision,
   v.id_lote,v.id_reserva,ev.codigo AS estado_venta
 INTO v_m FROM public.ven_ventas_medios_pago m
 JOIN public.ven_ventas v ON v.id_venta=m.id_venta
 JOIN public.cfg_estados_venta ev ON ev.id_estado_venta=v.id_estado_venta
 WHERE m.id_venta=p_venta
 FOR UPDATE OF m;
 IF NOT FOUND OR v_m.estado_revision<>'PENDIENTE' THEN
    RAISE EXCEPTION 'REVISION_CERRADA|Cobro no pendiente o inexistente.';
 END IF;
 IF p_actor=v_m.id_usuario_registro THEN
    RAISE EXCEPTION 'AUTOAPROBACION_DENEGADA|El registrador no puede validar su comprobante.';
 END IF;
 SELECT c.* INTO v_c
 FROM public.ven_ventas_comprobantes c
 WHERE c.id_venta=p_venta AND c.id_comprobante=p_comprobante
 FOR UPDATE OF c;
 IF NOT FOUND OR v_c.estado_revision<>'PENDIENTE' THEN
    RAISE EXCEPTION 'COMPROBANTE_NO_APTO|La evidencia no pertenece a la venta o ya fue revisada.';
 END IF;
 IF p_aprobar THEN
   IF v_m.estado_venta<>'CONTRATADA'
       OR NOT EXISTS(
         SELECT 1 FROM public.ven_contratos ct
         JOIN public.cfg_estados_contrato ec ON ec.id_estado_contrato=ct.id_estado_contrato
         WHERE ct.id_venta=p_venta AND ec.codigo='VIGENTE' AND ct.fecha_firma IS NOT NULL
       )
       OR v_m.monto_pendiente_revision<=0
   THEN RAISE EXCEPTION 'VENTA_NO_APTA|Requiere venta contratada y contrato firmado vigente.'; END IF;
   IF (SELECT count(*) FROM public.ven_ventas_comprobantes WHERE id_venta=p_venta)<>1
   THEN RAISE EXCEPTION 'EVIDENCIA_NO_DESGLOSADA|Varios comprobantes requieren desglose por importe antes de aprobar.'; END IF;
   IF NOT EXISTS(
     SELECT 1 FROM storage.objects o WHERE o.bucket_id='vouchers-ventas-private'
       AND o.name=v_c.clave_archivo AND o.archived_at IS NULL AND o.is_delete_marker=false
       AND lower(coalesce(o.metadata->>'mimetype',''))=v_c.tipo_mime
       AND coalesce((o.metadata->>'size')::bigint,0)=v_c.tamanio_bytes
       AND v_c.tamanio_bytes BETWEEN 1 AND 5242880
   ) THEN RAISE EXCEPTION 'ARCHIVO_NO_VERIFICABLE|Comprobante privado no disponible o distinto.'; END IF;
   UPDATE public.ven_ventas_comprobantes
     SET estado_revision='APROBADO' WHERE id_comprobante=p_comprobante;
   UPDATE public.ven_ventas_medios_pago
     SET estado_revision='APROBADO' WHERE id_venta=p_venta;
 END IF;
 INSERT INTO public.fin_revisiones_comprobantes_venta_v1(
   id_venta,id_comprobante,id_revisor,decision,motivo
 ) VALUES (p_venta,p_comprobante,p_actor,CASE WHEN p_aprobar THEN 'APROBADO' ELSE 'OBSERVADO' END,v_motivo)
 RETURNING id_revision INTO v_revision;
 RETURN jsonb_build_object(
   'idRevision',v_revision,'idVenta',p_venta,'idComprobante',p_comprobante,
   'decision',CASE WHEN p_aprobar THEN 'APROBADO' ELSE 'OBSERVADO' END,
   'estadoCobro',CASE WHEN p_aprobar THEN 'APROBADO' ELSE 'PENDIENTE' END,
   'dineroConfirmado',FALSE,'requiereConciliacion',p_aprobar
 );
END $fn$;

CREATE OR REPLACE FUNCTION public.sp_fin_venta_autorizar_lectura_comprobante_v1(
 p_actor BIGINT,p_venta BIGINT,p_comprobante BIGINT
) RETURNS JSONB LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path TO pg_catalog,public,pg_temp
AS $fn$
DECLARE v_result JSONB;
BEGIN
 IF NOT coalesce(public.fn_usuario_tiene_permiso_seguridad(p_actor,'finance.view'::varchar),FALSE)
 THEN RAISE EXCEPTION 'DENEGADO|Se requiere finance.view.'; END IF;
 SELECT jsonb_build_object('bucket',c.bucket,'clave_archivo',c.clave_archivo,
   'nombre_archivo',c.nombre_archivo,'tipo_mime',c.tipo_mime)
 INTO v_result FROM public.ven_ventas_comprobantes c
 WHERE c.id_venta=p_venta AND c.id_comprobante=p_comprobante
   AND c.bucket='vouchers-ventas-private';
 IF v_result IS NULL THEN RAISE EXCEPTION 'COMPROBANTE_NO_DISPONIBLE|No existe esta evidencia.'; END IF;
 RETURN v_result;
END $fn$;

REVOKE ALL ON FUNCTION public.sp_fin_revisar_comprobante_venta_v1(
 BIGINT,BIGINT,BIGINT,BOOLEAN,VARCHAR
) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.sp_fin_venta_autorizar_lectura_comprobante_v1(
 BIGINT,BIGINT,BIGINT
) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.sp_fin_revisar_comprobante_venta_v1(
 BIGINT,BIGINT,BIGINT,BOOLEAN,VARCHAR
) TO sigi_app_user;
GRANT EXECUTE ON FUNCTION public.sp_fin_venta_autorizar_lectura_comprobante_v1(
 BIGINT,BIGINT,BIGINT
) TO sigi_app_user;
COMMIT;
