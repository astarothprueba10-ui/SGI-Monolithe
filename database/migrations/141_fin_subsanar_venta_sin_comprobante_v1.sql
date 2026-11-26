-- 141 | Subsanación controlada de comprobantes faltantes en ventas ya registradas.
-- Al subir evidencia no se confirma el pago ni se modifica contrato, precio o cronograma.
BEGIN;
CREATE TABLE IF NOT EXISTS public.fin_cargas_subsanacion_venta_v1 (
 id_carga UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 id_actor BIGINT NOT NULL REFERENCES public.seg_usuarios(id_usuario) ON DELETE RESTRICT,
 id_venta BIGINT NOT NULL REFERENCES public.ven_ventas(id_venta) ON DELETE RESTRICT,
 clave_archivo TEXT NOT NULL UNIQUE,
 nombre_archivo VARCHAR(255) NOT NULL,
 tipo_mime VARCHAR(50) NOT NULL,
 tamanio_bytes BIGINT NOT NULL CHECK(tamanio_bytes BETWEEN 1 AND 5242880),
 fecha_creacion TIMESTAMPTZ NOT NULL DEFAULT now(),
 expira_en TIMESTAMPTZ NOT NULL DEFAULT now()+interval '15 minutes',
 id_comprobante BIGINT UNIQUE REFERENCES public.ven_ventas_comprobantes(id_comprobante) ON DELETE RESTRICT
);
CREATE INDEX IF NOT EXISTS ix_fin_cargas_subsanacion_venta_idventa
 ON public.fin_cargas_subsanacion_venta_v1(id_venta);
ALTER TABLE public.fin_cargas_subsanacion_venta_v1 ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.fin_cargas_subsanacion_venta_v1 FROM PUBLIC,anon,authenticated;

CREATE OR REPLACE FUNCTION public.sp_fin_preparar_subsanacion_venta_v1(
 p_actor BIGINT,p_venta BIGINT,p_nombre VARCHAR,p_mime VARCHAR,p_tamanio BIGINT
) RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO pg_catalog,public,pg_temp
AS $fn$
DECLARE
 v_venta RECORD;v_prospecto BIGINT;v_carga UUID:=gen_random_uuid();
 v_clave TEXT;v_ext VARCHAR(5);
BEGIN
 IF NOT coalesce(public.fn_usuario_tiene_permiso_seguridad(p_actor,'finance.view'::varchar),FALSE)
    OR NOT coalesce(public.fn_usuario_tiene_permiso_seguridad(p_actor,'finance.edit'::varchar),FALSE)
 THEN RAISE EXCEPTION 'DENEGADO|Se requieren permisos financieros para subsanar.'; END IF;
 IF p_venta IS NULL OR p_venta<=0 OR length(btrim(coalesce(p_nombre,''))) NOT BETWEEN 1 AND 255
   OR p_tamanio IS NULL OR p_tamanio NOT BETWEEN 1 AND 5242880
   OR p_mime IS NULL OR p_mime NOT IN('application/pdf','image/jpeg','image/png','image/webp')
 THEN RAISE EXCEPTION 'DATOS_INVALIDOS|El comprobante debe ser PDF o imagen de hasta 5 MB.'; END IF;
 SELECT v.id_venta,v.id_lote,m.estado_revision,ev.codigo AS estado_venta
 INTO v_venta
 FROM public.ven_ventas v
 JOIN public.ven_ventas_medios_pago m ON m.id_venta=v.id_venta
 JOIN public.cfg_estados_venta ev ON ev.id_estado_venta=v.id_estado_venta
 WHERE v.id_venta=p_venta FOR UPDATE OF m;
 IF NOT FOUND OR v_venta.estado_revision<>'PENDIENTE'
    OR v_venta.estado_venta<>'CONTRATADA'
    OR NOT EXISTS(
      SELECT 1 FROM public.ven_contratos ct
      JOIN public.cfg_estados_contrato ec ON ec.id_estado_contrato=ct.id_estado_contrato
      WHERE ct.id_venta=p_venta AND ec.codigo='VIGENTE' AND ct.fecha_firma IS NOT NULL
    )
 THEN RAISE EXCEPTION 'VENTA_NO_APTA|Requiere venta contratada, firmada y cobro pendiente.'; END IF;
 IF EXISTS(SELECT 1 FROM public.ven_ventas_comprobantes c WHERE c.id_venta=p_venta)
 THEN RAISE EXCEPTION 'YA_TIENE_EVIDENCIA|Solo se permite subsanar ventas sin comprobante.'; END IF;
 SELECT MIN(cp.id_prospecto) INTO v_prospecto
 FROM public.ven_ventas_clientes vc
 JOIN public.crm_clientes cl ON cl.id_cliente=vc.id_cliente
 JOIN public.crm_prospectos cp ON cp.id_persona=cl.id_persona
 WHERE vc.id_venta=p_venta AND vc.titular;
 IF v_prospecto IS NULL
 THEN RAISE EXCEPTION 'PROSPECTO_NO_APTO|No se encontró un titular con prospecto de origen.'; END IF;
 v_ext:=CASE p_mime WHEN 'application/pdf' THEN 'pdf'
  WHEN 'image/png' THEN 'png' WHEN 'image/webp' THEN 'webp' ELSE 'jpg' END;
 v_clave:='ventas/p-'||v_prospecto||'/l-'||v_venta.id_lote||
   '/'||v_carga::text||'.'||v_ext;
 INSERT INTO public.fin_cargas_subsanacion_venta_v1(
   id_carga,id_actor,id_venta,clave_archivo,nombre_archivo,tipo_mime,tamanio_bytes
 ) VALUES(v_carga,p_actor,p_venta,v_clave,btrim(p_nombre),p_mime,p_tamanio);
 RETURN jsonb_build_object('idCarga',v_carga,'bucket','vouchers-ventas-private',
  'claveArchivo',v_clave,'tipoMime',p_mime,'maxBytes',5242880,
  'expiresInSeconds',900);
END $fn$;

CREATE OR REPLACE FUNCTION public.sp_fin_confirmar_subsanacion_venta_v1(
 p_actor BIGINT,p_carga UUID
) RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO pg_catalog,public,pg_temp
AS $fn$
DECLARE
 v_pre RECORD;v_estado VARCHAR;v_comprobante BIGINT;
BEGIN
 IF NOT coalesce(public.fn_usuario_tiene_permiso_seguridad(p_actor,'finance.view'::varchar),FALSE)
    OR NOT coalesce(public.fn_usuario_tiene_permiso_seguridad(p_actor,'finance.edit'::varchar),FALSE)
 THEN RAISE EXCEPTION 'DENEGADO|Se requieren permisos financieros.'; END IF;
 IF p_carga IS NULL THEN RAISE EXCEPTION 'DATOS_INVALIDOS|Carga inexistente.'; END IF;
 SELECT id_venta INTO v_pre FROM public.fin_cargas_subsanacion_venta_v1 WHERE id_carga=p_carga;
 IF NOT FOUND THEN RAISE EXCEPTION 'CARGA_NO_DISPONIBLE|Carga no encontrada.'; END IF;
 PERFORM 1 FROM public.ven_ventas_medios_pago WHERE id_venta=v_pre.id_venta FOR UPDATE;
 SELECT c.* INTO v_pre FROM public.fin_cargas_subsanacion_venta_v1 c
 WHERE c.id_carga=p_carga FOR UPDATE;
 IF v_pre.id_actor<>p_actor THEN RAISE EXCEPTION 'CARGA_NO_AUTORIZADA|Solo el mismo actor puede finalizar.'; END IF;
 IF v_pre.id_comprobante IS NOT NULL THEN
   RETURN jsonb_build_object('idVenta',v_pre.id_venta,
    'idComprobante',v_pre.id_comprobante,'reutilizado',TRUE,'estadoRevision','PENDIENTE');
 END IF;
 IF v_pre.expira_en<now()
 THEN RAISE EXCEPTION 'CARGA_EXPIRADA|Prepare otra carga; no se agregó comprobante.'; END IF;
 SELECT estado_revision INTO v_estado FROM public.ven_ventas_medios_pago
 WHERE id_venta=v_pre.id_venta;
 IF v_estado<>'PENDIENTE'
    OR EXISTS(SELECT 1 FROM public.ven_ventas_comprobantes x WHERE x.id_venta=v_pre.id_venta)
 THEN RAISE EXCEPTION 'VENTA_NO_APTA|La venta ya tiene evidencia o no está pendiente.'; END IF;
 IF NOT EXISTS(
   SELECT 1 FROM storage.objects o
   WHERE o.bucket_id='vouchers-ventas-private' AND o.name=v_pre.clave_archivo
     AND o.archived_at IS NULL AND o.is_delete_marker=FALSE
     AND lower(coalesce(o.metadata->>'mimetype',''))=v_pre.tipo_mime
     AND coalesce((o.metadata->>'size')::bigint,0)=v_pre.tamanio_bytes
 ) THEN RAISE EXCEPTION 'ARCHIVO_NO_VERIFICABLE|No se completó la carga privada o difiere su contenido.'; END IF;
 INSERT INTO public.ven_ventas_comprobantes(
   id_venta,clave_archivo,nombre_archivo,tipo_mime,tamanio_bytes,
   estado_revision
 ) VALUES(v_pre.id_venta,v_pre.clave_archivo,
   v_pre.nombre_archivo,v_pre.tipo_mime,v_pre.tamanio_bytes,'PENDIENTE')
 RETURNING id_comprobante INTO v_comprobante;
 UPDATE public.fin_cargas_subsanacion_venta_v1
 SET id_comprobante=v_comprobante WHERE id_carga=p_carga;
 RETURN jsonb_build_object('idVenta',v_pre.id_venta,'idComprobante',v_comprobante,
   'reutilizado',FALSE,'estadoRevision','PENDIENTE',
   'dineroConfirmado',FALSE);
END $fn$;

REVOKE ALL ON FUNCTION public.sp_fin_preparar_subsanacion_venta_v1(BIGINT,BIGINT,VARCHAR,VARCHAR,BIGINT)
 FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.sp_fin_confirmar_subsanacion_venta_v1(BIGINT,UUID)
 FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.sp_fin_preparar_subsanacion_venta_v1(BIGINT,BIGINT,VARCHAR,VARCHAR,BIGINT)
 TO sigi_app_user;
GRANT EXECUTE ON FUNCTION public.sp_fin_confirmar_subsanacion_venta_v1(BIGINT,UUID)
 TO sigi_app_user;
COMMIT;
