-- SGI-MONOLITHE | Sprint 4 | 5.3.1
-- Bandeja segura de vouchers de CUOTAS (no separaciones).
-- No aprueba pagos, no registra aplicaciones ni cambia saldos.
-- Seguridad: solo rol backend + permiso de Finanzas en PostgreSQL.
-- Las rutas de Storage NUNCA se devuelven en la lista.

CREATE OR REPLACE FUNCTION public.sp_finanzas_listar_vouchers_cuotas_v1(
 p_actor bigint,p_estado varchar DEFAULT 'TODOS',
 p_busqueda varchar DEFAULT NULL,p_pagina integer DEFAULT 1,p_tamano integer DEFAULT 20
) RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path TO 'pg_catalog','public','pg_temp'
AS $fn$
DECLARE
 v_estado varchar:=coalesce(nullif(btrim(p_estado),''),'TODOS');
 v_busqueda text:=coalesce(nullif(btrim(p_busqueda),''),'');
 v_total integer;
 v_items jsonb;
BEGIN
 IF p_actor IS NULL OR NOT coalesce(public.fn_usuario_tiene_permiso_seguridad(
     p_actor,'finance.view'::varchar),false)
 THEN RAISE EXCEPTION 'DENEGADO|No tiene acceso a comprobantes financieros.'; END IF;
 IF v_estado NOT IN('TODOS','PENDIENTE','APROBADO','RECHAZADO')
    OR p_pagina IS NULL OR p_pagina NOT BETWEEN 1 AND 10000
    OR p_tamano IS NULL OR p_tamano NOT BETWEEN 1 AND 100
    OR length(v_busqueda)>120
 THEN RAISE EXCEPTION 'DATOS_INVALIDOS|Filtros de comprobantes incorrectos.'; END IF;

 WITH disponibles AS (
   SELECT v.id_voucher,v.codigo AS codigo_voucher,ev.codigo AS estado_voucher,
      ev.nombre AS nombre_estado_voucher,
      p.id_pago,p.codigo AS codigo_pago,p.id_venta,p.id_plan_pago,
      ve.codigo AS codigo_venta,p.monto AS monto_pago,
      pe.codigo AS estado_pago,
      mp.nombre AS metodo_pago,p.numero_operacion,
      v.numero_version,v.nombre_archivo_original AS nombre_archivo,
      v.tipo_mime,v.tamanio_bytes,v.fecha_carga,v.fecha_validacion,
      v.motivo_rechazo,v.observaciones_validacion,
      COALESCE(titular.nombre_cliente,'') AS nombre_cliente,
      COALESCE(obj.archivo_presente,false) AS archivo_disponible
   FROM public.pag_vouchers v
   JOIN public.pag_pagos p ON p.id_pago=v.id_pago
     AND p.id_reserva IS NULL AND p.id_venta IS NOT NULL
     AND p.id_plan_pago IS NOT NULL
   JOIN public.ven_ventas ve ON ve.id_venta=p.id_venta
   JOIN public.cfg_estados_voucher ev ON ev.id_estado_voucher=v.id_estado_voucher
   JOIN public.cfg_estados_pago pe ON pe.id_estado_pago=p.id_estado_pago
   JOIN public.cfg_metodos_pago mp ON mp.id_metodo_pago=p.id_metodo_pago
   LEFT JOIN LATERAL (
     SELECT trim(concat_ws(' ',per.nombres,per.apellido_paterno,per.apellido_materno)) AS nombre_cliente
     FROM public.ven_ventas_clientes vc
     JOIN public.crm_clientes cl ON cl.id_cliente=vc.id_cliente
     JOIN public.core_personas per ON per.id_persona=cl.id_persona
     WHERE vc.id_venta=p.id_venta AND vc.titular=true
     ORDER BY vc.id_cliente DESC LIMIT 1
   ) titular ON true
   LEFT JOIN LATERAL (
     SELECT true AS archivo_presente
     FROM storage.objects o
     WHERE o.bucket_id='vouchers-ventas-private' AND o.name=v.clave_archivo
       AND o.archived_at IS NULL AND o.is_delete_marker=false
       AND v.clave_archivo ~
         '^ventas/p-[0-9]+/l-[0-9]+/[0-9a-fA-F]{8}(-[0-9a-fA-F]{4}){3}-[0-9a-fA-F]{12}\.(pdf|jpg|png|webp)$'
       AND lower(coalesce(o.metadata->>'mimetype','')) IN
         ('application/pdf','image/jpeg','image/png','image/webp')
       AND coalesce((o.metadata->>'size')::bigint,0) BETWEEN 1 AND 5242880
     LIMIT 1
   ) obj ON true
   WHERE v.activo=true
     AND (v_estado='TODOS' OR ev.codigo=v_estado)
     AND (v_busqueda='' OR v.codigo ILIKE '%'||v_busqueda||'%'
       OR p.codigo ILIKE '%'||v_busqueda||'%'
       OR ve.codigo ILIKE '%'||v_busqueda||'%'
       OR coalesce(titular.nombre_cliente,'') ILIKE '%'||v_busqueda||'%')
 )
 SELECT count(*)::integer INTO v_total FROM disponibles;

 WITH disponibles AS (
   SELECT v.id_voucher,v.codigo AS codigo_voucher,ev.codigo AS estado_voucher,
      ev.nombre AS nombre_estado_voucher,
      p.id_pago,p.codigo AS codigo_pago,p.id_venta,p.id_plan_pago,
      ve.codigo AS codigo_venta,p.monto AS monto_pago,
      pe.codigo AS estado_pago,mp.nombre AS metodo_pago,p.numero_operacion,
      v.numero_version,v.nombre_archivo_original AS nombre_archivo,
      v.tipo_mime,v.tamanio_bytes,v.fecha_carga,v.fecha_validacion,
      v.motivo_rechazo,v.observaciones_validacion,
      coalesce(titular.nombre_cliente,'') AS nombre_cliente,
      coalesce(obj.archivo_presente,false) AS archivo_disponible
   FROM public.pag_vouchers v
   JOIN public.pag_pagos p ON p.id_pago=v.id_pago
     AND p.id_reserva IS NULL AND p.id_venta IS NOT NULL
     AND p.id_plan_pago IS NOT NULL
   JOIN public.ven_ventas ve ON ve.id_venta=p.id_venta
   JOIN public.cfg_estados_voucher ev ON ev.id_estado_voucher=v.id_estado_voucher
   JOIN public.cfg_estados_pago pe ON pe.id_estado_pago=p.id_estado_pago
   JOIN public.cfg_metodos_pago mp ON mp.id_metodo_pago=p.id_metodo_pago
   LEFT JOIN LATERAL (
     SELECT trim(concat_ws(' ',per.nombres,per.apellido_paterno,per.apellido_materno)) AS nombre_cliente
     FROM public.ven_ventas_clientes vc
     JOIN public.crm_clientes cl ON cl.id_cliente=vc.id_cliente
     JOIN public.core_personas per ON per.id_persona=cl.id_persona
     WHERE vc.id_venta=p.id_venta AND vc.titular=true
     ORDER BY vc.id_cliente DESC LIMIT 1
   ) titular ON true
   LEFT JOIN LATERAL (
     SELECT true AS archivo_presente
     FROM storage.objects o
     WHERE o.bucket_id='vouchers-ventas-private' AND o.name=v.clave_archivo
       AND o.archived_at IS NULL AND o.is_delete_marker=false
       AND v.clave_archivo ~
         '^ventas/p-[0-9]+/l-[0-9]+/[0-9a-fA-F]{8}(-[0-9a-fA-F]{4}){3}-[0-9a-fA-F]{12}\.(pdf|jpg|png|webp)$'
       AND lower(coalesce(o.metadata->>'mimetype','')) IN
         ('application/pdf','image/jpeg','image/png','image/webp')
       AND coalesce((o.metadata->>'size')::bigint,0) BETWEEN 1 AND 5242880
     LIMIT 1
   ) obj ON true
   WHERE v.activo=true
     AND (v_estado='TODOS' OR ev.codigo=v_estado)
     AND (v_busqueda='' OR v.codigo ILIKE '%'||v_busqueda||'%'
       OR p.codigo ILIKE '%'||v_busqueda||'%'
       OR ve.codigo ILIKE '%'||v_busqueda||'%'
       OR coalesce(titular.nombre_cliente,'') ILIKE '%'||v_busqueda||'%')
 )
 SELECT coalesce(jsonb_agg(to_jsonb(t) ORDER BY t.id_voucher DESC),'[]'::jsonb)
 INTO v_items
 FROM (
   SELECT * FROM disponibles ORDER BY id_voucher DESC
   LIMIT p_tamano OFFSET (p_pagina-1)*p_tamano
 ) t;

 RETURN jsonb_build_object(
   'items',v_items,'total',v_total,'pagina',p_pagina,'tamano',p_tamano,
   'paginas',greatest(1,ceil(v_total::numeric/p_tamano)::integer));
END;
$fn$;

CREATE OR REPLACE FUNCTION public.sp_finanzas_obtener_ruta_voucher_cuota_v1(
 p_actor bigint,p_id_voucher bigint
) RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path TO 'pg_catalog','public','pg_temp'
AS $fn$
DECLARE
 v_clave varchar;
 v_nombre varchar;
 v_mime varchar;
 v_bytes bigint;
BEGIN
 IF p_actor IS NULL OR NOT coalesce(public.fn_usuario_tiene_permiso_seguridad(
     p_actor,'finance.view'::varchar),false)
 THEN RAISE EXCEPTION 'DENEGADO|Acceso restringido a Finanzas.'; END IF;
 IF p_id_voucher IS NULL OR p_id_voucher<=0 THEN
    RAISE EXCEPTION 'DATOS_INVALIDOS|Voucher inválido.'; END IF;

 SELECT v.clave_archivo,v.nombre_archivo_original,v.tipo_mime,v.tamanio_bytes
 INTO v_clave,v_nombre,v_mime,v_bytes
 FROM public.pag_vouchers v
 JOIN public.pag_pagos p ON p.id_pago=v.id_pago
 WHERE v.id_voucher=p_id_voucher AND v.activo
   AND p.id_reserva IS NULL AND p.id_venta IS NOT NULL
   AND p.id_plan_pago IS NOT NULL;

 IF v_clave IS NULL OR v_clave !~
    '^ventas/p-[0-9]+/l-[0-9]+/[0-9a-fA-F]{8}(-[0-9a-fA-F]{4}){3}-[0-9a-fA-F]{12}\.(pdf|jpg|png|webp)$'
 THEN RAISE EXCEPTION 'ARCHIVO_NO_EXISTE|Comprobante de cuota no disponible.'; END IF;

 IF NOT EXISTS(
   SELECT 1 FROM storage.objects o
   WHERE o.bucket_id='vouchers-ventas-private' AND o.name=v_clave
     AND o.archived_at IS NULL AND o.is_delete_marker=false
     AND lower(coalesce(o.metadata->>'mimetype','')) IN
       ('application/pdf','image/jpeg','image/png','image/webp')
     AND coalesce((o.metadata->>'size')::bigint,0) BETWEEN 1 AND 5242880
 ) THEN RAISE EXCEPTION 'ARCHIVO_NO_EXISTE|Archivo no disponible en Storage.'; END IF;
 RETURN jsonb_build_object(
    'bucket','vouchers-ventas-private',
    'clave_archivo',v_clave,'nombre_archivo',v_nombre,'tipo_mime',v_mime);
END;
$fn$;

-- Se bloquea el uso del registro/validador antiguos desde la app:
-- el validador marcaba una cuota PAGADA sin conciliar saldos parciales.
-- No se eliminan definiciones ni se modifican pagos históricos.
REVOKE ALL ON FUNCTION public.sp_registrar_pago_voucher(
 bigint,bigint,numeric,integer,varchar,varchar,varchar,varchar,bigint)
 FROM PUBLIC,anon,authenticated,sigi_app_user;
REVOKE ALL ON FUNCTION public.sp_validar_voucher(bigint,varchar,bigint,varchar)
 FROM PUBLIC,anon,authenticated,sigi_app_user;
REVOKE ALL ON FUNCTION public.sp_listar_vouchers_tesoreria()
 FROM PUBLIC,anon,authenticated,sigi_app_user;

REVOKE ALL ON FUNCTION public.sp_finanzas_listar_vouchers_cuotas_v1(
 bigint,varchar,varchar,integer,integer)
 FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.sp_finanzas_listar_vouchers_cuotas_v1(
 bigint,varchar,varchar,integer,integer) TO sigi_app_user;
REVOKE ALL ON FUNCTION public.sp_finanzas_obtener_ruta_voucher_cuota_v1(
 bigint,bigint)
 FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.sp_finanzas_obtener_ruta_voucher_cuota_v1(
 bigint,bigint) TO sigi_app_user;
