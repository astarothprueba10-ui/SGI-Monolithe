-- SGI-MONOLITHE | Sprint 4 | 5.4.5
-- Esta migración representa las funciones validadas en Supabase de testeo.
-- Se conserva search_path fijo, autorización de cliente y permisos por rol backend.
CREATE OR REPLACE FUNCTION public.fn_portal_documentos_publicados_v1(p_actor bigint)
 RETURNS TABLE(tipo text, id_documento bigint, id_contrato bigint, id_venta bigint, codigo_venta text, codigo_contrato text, categoria text, nombre text, numero_version integer, fecha_publicacion timestamp with time zone, nombre_archivo text, clave_archivo text, tipo_mime text, tamanio_bytes bigint)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'pg_temp'
AS $function$
 WITH propias AS MATERIALIZED (
   SELECT DISTINCT ((op.value->>'id_venta'))::bigint AS id_venta
   FROM jsonb_array_elements(
     public.sp_portal_cliente_resumen_v1(p_actor)->'operaciones'
   ) op(value)
 ), documentos AS (
   SELECT 'CONTRATO'::text tipo, a.id_contrato_archivo id_documento,
     c.id_contrato,c.id_venta,v.codigo::text codigo_venta,
     c.codigo::text codigo_contrato,'Contrato'::text categoria,
     a.nombre_documento::text nombre,a.numero_version,
     a.fecha_publicacion_cliente fecha_publicacion,
     a.nombre_archivo_original::text nombre_archivo,
     a.clave_archivo::text clave_archivo,
     a.tipo_mime::text tipo_mime,
     a.tamano_bytes::bigint tamanio_bytes
   FROM propias p
   JOIN public.ven_ventas v ON v.id_venta=p.id_venta
   JOIN public.ven_contratos c ON c.id_venta=v.id_venta AND c.fecha_firma IS NOT NULL
   JOIN public.ven_contratos_archivos a ON a.id_contrato=c.id_contrato
   WHERE a.vigente AND a.visible_cliente AND a.fecha_publicacion_cliente IS NOT NULL
   UNION ALL
   SELECT 'ANEXO'::text,x.id_anexo,c.id_contrato,c.id_venta,
     v.codigo::text,c.codigo::text,x.tipo_anexo::text,
     CASE x.tipo_anexo WHEN 'PLANO_LOTE' THEN 'Plano del lote'
       WHEN 'MEMORIA_DESCRIPTIVA' THEN 'Memoria descriptiva' END,
     x.numero_version,x.fecha_publicacion_cliente,
     x.nombre_archivo_original::text,x.clave_archivo::text,
     x.tipo_mime::text,x.tamano_bytes::bigint
   FROM propias p
   JOIN public.ven_ventas v ON v.id_venta=p.id_venta
   JOIN public.ven_contratos c ON c.id_venta=v.id_venta AND c.fecha_firma IS NOT NULL
   JOIN public.ven_contratos_anexos x ON x.id_contrato=c.id_contrato
   WHERE x.vigente AND x.visible_cliente
     AND x.fecha_publicacion_cliente IS NOT NULL
     AND x.tipo_anexo IN ('PLANO_LOTE','MEMORIA_DESCRIPTIVA')
 )
 SELECT d.tipo,d.id_documento,d.id_contrato,d.id_venta,d.codigo_venta,
   d.codigo_contrato,d.categoria,d.nombre,d.numero_version,d.fecha_publicacion,
   d.nombre_archivo,d.clave_archivo,d.tipo_mime,d.tamanio_bytes
 FROM documentos d
 JOIN storage.buckets b ON b.id='contratos-firmados-private' AND NOT b.public
 WHERE d.tipo_mime='application/pdf'
   AND d.tamanio_bytes BETWEEN 1 AND 10485760
   AND (
     (d.tipo='CONTRATO' AND d.clave_archivo ~ (
       '^contratos/'||d.id_contrato::text||
       '/[0-9a-fA-F]{8}(-[0-9a-fA-F]{4}){3}-[0-9a-fA-F]{12}\.pdf$'))
     OR
     (d.tipo='ANEXO' AND d.categoria IN ('PLANO_LOTE','MEMORIA_DESCRIPTIVA')
      AND d.clave_archivo ~ (
       '^anexos/'||d.id_contrato::text||'/'||d.categoria||
       '/[0-9a-fA-F]{8}(-[0-9a-fA-F]{4}){3}-[0-9a-fA-F]{12}\.pdf$'))
   )
   AND EXISTS (
     SELECT 1 FROM storage.objects o
     WHERE o.bucket_id=b.id AND o.name=d.clave_archivo
       AND o.archived_at IS NULL AND NOT coalesce(o.is_delete_marker,false)
       AND lower(coalesce(o.metadata->>'mimetype',''))=d.tipo_mime
       AND coalesce((o.metadata->>'size')::bigint,0)=d.tamanio_bytes
   );
$function$;


CREATE OR REPLACE FUNCTION public.sp_portal_cliente_documentos_v1(p_actor bigint)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'pg_temp'
AS $function$
DECLARE v_items jsonb;
BEGIN
 -- La función base vuelve a verificar rol CLIENTE, cuenta activa y ventas.
 SELECT coalesce(jsonb_agg(jsonb_build_object(
    'tipo',d.tipo,'idDocumento',d.id_documento,
    'idContrato',d.id_contrato,'idVenta',d.id_venta,
    'codigoVenta',d.codigo_venta,'codigoContrato',d.codigo_contrato,
    'categoria',d.categoria,'nombre',d.nombre,'numeroVersion',d.numero_version,
    'fechaPublicacion',to_char(d.fecha_publicacion AT TIME ZONE 'America/Lima','YYYY-MM-DD'),
    'nombreArchivo',d.nombre_archivo,'tamanioBytes',d.tamanio_bytes
  ) ORDER BY d.fecha_publicacion DESC,d.id_documento DESC),'[]'::jsonb)
 INTO v_items FROM public.fn_portal_documentos_publicados_v1(p_actor) d;
 RETURN jsonb_build_object(
   'items',v_items,'total',jsonb_array_length(v_items),
   'advertencia','Solo se muestran PDFs publicados, vigentes y físicamente disponibles para las compras vinculadas a la cuenta.');
END;
$function$;


CREATE OR REPLACE FUNCTION public.sp_portal_cliente_autorizar_documento_v1(p_actor bigint, p_tipo character varying, p_documento bigint)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'pg_temp'
AS $function$
DECLARE d record;
BEGIN
 IF p_tipo IS NULL OR p_tipo NOT IN ('CONTRATO','ANEXO')
    OR p_documento IS NULL OR p_documento<=0
 THEN RAISE EXCEPTION 'PORTAL_DOCUMENTO_NO_AUTORIZADO|Documento no disponible.'; END IF;
 -- Consulta basada en identidad, publicación activa y presencia real en Storage.
 SELECT * INTO d FROM public.fn_portal_documentos_publicados_v1(p_actor) x
 WHERE x.tipo=p_tipo AND x.id_documento=p_documento;
 IF NOT FOUND THEN
   RAISE EXCEPTION 'PORTAL_DOCUMENTO_NO_AUTORIZADO|Documento no publicado para este cliente.';
 END IF;
 RETURN jsonb_build_object(
   'autorizado',true,'bucket','contratos-firmados-private',
   'tipo',d.tipo,'idDocumento',d.id_documento,'idContrato',d.id_contrato,
   'categoria',d.categoria,'nombreOriginal',d.nombre_archivo,
   'claveArchivo',d.clave_archivo,'tipoMime',d.tipo_mime,
   'tamanioBytes',d.tamanio_bytes);
END;
$function$;


CREATE OR REPLACE FUNCTION public.sp_portal_cliente_alertas_v1(p_actor bigint)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'pg_temp'
AS $function$
DECLARE
 v_crono jsonb;
 v_vouchers jsonb;
 v_docs jsonb;
 v_items jsonb;
BEGIN
 -- No leer notificaciones RRHH ni las generadas en fechas anteriores:
 -- las alertas dependen siempre de saldos y estados actuales del propio plan.
 v_crono:=public.sp_portal_cliente_cronograma_v1(p_actor);
 v_vouchers:=public.sp_portal_cliente_vouchers_v1(p_actor);
 v_docs:=public.sp_portal_cliente_documentos_v1(p_actor);
 WITH fuentes AS (
  SELECT
   'CUOTA_'||(q.value->>'estadoCalculado')||':'||(q.value->>'idCuota') AS id,
   CASE WHEN ((q.value->>'cuotaAtrasada'))::boolean THEN 'CUOTA_VENCIDA'
        ELSE 'CUOTA_PROXIMA' END tipo,
   CASE WHEN ((q.value->>'cuotaAtrasada'))::boolean THEN 'critico'
        ELSE 'atencion' END nivel,
   CASE WHEN ((q.value->>'cuotaAtrasada'))::boolean THEN 'Cuota vencida'
        ELSE 'Próximo vencimiento' END titulo,
   'Compra '||(op.value->>'codigoVenta')||', cuota '||(q.value->>'numero')||
     ': saldo S/ '||to_char(((q.value->>'saldoCuota'))::numeric,'FM999999999.00')||
     ', vence el '||(q.value->>'fechaVencimiento')||'.' AS detalle,
   '/portal/cronograma'::text ruta,'Ver cronograma'::text accion,
   CASE WHEN ((q.value->>'cuotaAtrasada'))::boolean THEN 1 ELSE 3 END prioridad,
   (q.value->>'fechaVencimiento') AS fecha_evento
  FROM jsonb_array_elements(v_crono->'items') op(value)
  CROSS JOIN LATERAL jsonb_array_elements(op.value->'cuotas') q(value)
  WHERE ((q.value->>'saldoCuota'))::numeric>0
    AND (((q.value->>'cuotaAtrasada'))::boolean
         OR ((q.value->>'proxima7Dias'))::boolean)
  UNION ALL
  SELECT 'VOUCHER:'||(v.value->>'idVoucher'),
   CASE WHEN (v.value->>'estadoVoucher')='RECHAZADO' THEN 'VOUCHER_RECHAZADO'
        ELSE 'VOUCHER_PENDIENTE' END,
   CASE WHEN (v.value->>'estadoVoucher')='RECHAZADO' THEN 'critico' ELSE 'info' END,
   CASE WHEN (v.value->>'estadoVoucher')='RECHAZADO' THEN 'Voucher rechazado'
        ELSE 'Voucher en revisión' END,
   'Compra '||(v.value->>'codigoVenta')||': '||
     CASE WHEN (v.value->>'estadoVoucher')='RECHAZADO'
       THEN 'Finanzas rechazó el comprobante. '||
          coalesce(nullif((v.value->>'motivoRechazo'),''),'Revise el expediente.')
       ELSE 'El comprobante fue recibido y no reduce el saldo hasta su aplicación.' END,
   '/portal/pagos','Ver comprobantes',
   CASE WHEN (v.value->>'estadoVoucher')='RECHAZADO' THEN 2 ELSE 4 END,
   (v.value->>'fechaRegistro')
  FROM jsonb_array_elements(v_vouchers->'comprobantes') v(value)
  WHERE (v.value->>'estadoVoucher') IN ('PENDIENTE','RECHAZADO')
  UNION ALL
  SELECT 'DOCUMENTO:'||(d.value->>'tipo')||':'||(d.value->>'idDocumento'),
    'DOCUMENTO_PUBLICADO','info','Documento disponible',
    'Compra '||(d.value->>'codigoVenta')||': '||(d.value->>'nombre')||
      ' publicado para consulta privada.',
    '/portal/documentos','Ver documentos',5,(d.value->>'fechaPublicacion')
  FROM jsonb_array_elements(v_docs->'items') d(value)
  WHERE ((d.value->>'fechaPublicacion'))::date
    BETWEEN (now() AT TIME ZONE 'America/Lima')::date-7
        AND (now() AT TIME ZONE 'America/Lima')::date
 )
 SELECT coalesce(jsonb_agg(jsonb_build_object(
   'id',f.id,'tipo',f.tipo,'nivel',f.nivel,
   'titulo',f.titulo,'detalle',f.detalle,'ruta',f.ruta,'accion',f.accion
 ) ORDER BY f.prioridad,f.fecha_evento,f.id),'[]'::jsonb)
 INTO v_items FROM (SELECT * FROM fuentes ORDER BY prioridad,fecha_evento,id LIMIT 100) f;
 RETURN jsonb_build_object('items',v_items,'total',jsonb_array_length(v_items),
   'fechaCorte',v_crono->>'fechaCorte',
   'fuente','CRONOGRAMA_VOUCHERS_DOCUMENTOS_REALES');
END;
$function$;


REVOKE ALL ON FUNCTION public.fn_portal_documentos_publicados_v1(bigint) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.fn_portal_documentos_publicados_v1(bigint) TO sigi_app_user;
REVOKE ALL ON FUNCTION public.sp_portal_cliente_documentos_v1(bigint) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.sp_portal_cliente_documentos_v1(bigint) TO sigi_app_user;
REVOKE ALL ON FUNCTION public.sp_portal_cliente_autorizar_documento_v1(bigint,character varying,bigint) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.sp_portal_cliente_autorizar_documento_v1(bigint,character varying,bigint) TO sigi_app_user;
REVOKE ALL ON FUNCTION public.sp_portal_cliente_alertas_v1(bigint) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.sp_portal_cliente_alertas_v1(bigint) TO sigi_app_user;
