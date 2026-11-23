-- 135: corregir alias de paginación de la bandeja financiera v134.
-- Sustituye únicamente la definición de la función; no modifica pagos.
-- No crea pagos, no aprueba vouchers y no modifica contratos o planes.
BEGIN;
CREATE OR REPLACE FUNCTION public.sp_fin_ventas_cobros_pendientes_v1(
 p_actor bigint, p_busqueda varchar DEFAULT NULL, p_pagina integer DEFAULT 1,
 p_tamano integer DEFAULT 20
) RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path TO 'pg_catalog','public','pg_temp'
AS $fn$
DECLARE
 v_busqueda text:=lower(btrim(coalesce(p_busqueda,'')));
 v_resultado jsonb;
BEGIN
 IF p_actor IS NULL OR p_actor<=0 OR NOT coalesce(
   public.fn_usuario_tiene_permiso_seguridad(p_actor,'finance.view'::varchar),false
 ) THEN RAISE EXCEPTION 'DENEGADO|Se requiere finance.view para consultar cobros pendientes.'; END IF;
 IF length(v_busqueda)>120 OR p_pagina IS NULL OR p_pagina<1 OR p_pagina>10000
   OR p_tamano IS NULL OR p_tamano<1 OR p_tamano>100
 THEN RAISE EXCEPTION 'DATOS_INVALIDOS|Filtros de cobros pendientes inválidos.'; END IF;

 WITH base AS (
  SELECT
    v.id_venta AS "idVenta",
    v.codigo::text AS "codigoVenta",
    v.fecha_venta AS "fechaVenta",
    l.codigo::text AS "codigoLote",
    ip.nombre::text AS "proyecto",
    nullif(btrim(concat_ws(' ',cp.nombres,cp.apellido_paterno,cp.apellido_materno)),'')::text AS "comprador",
    m.tipo_abono::text AS "tipoAbono",
    mp.nombre::text AS "metodoPago",
    m.numero_operacion::text AS "numeroOperacion",
    m.monto_pendiente_revision AS "montoPendiente",
    m.estado_revision::text AS "estadoRevision",
    ev.codigo::text AS "estadoVenta",
    con.codigo::text AS "codigoContrato",
    con.estado::text AS "estadoContrato",
    COALESCE((SELECT count(*) FROM public.ven_ventas_comprobantes co
      WHERE co.id_venta=v.id_venta),0)::integer AS "comprobantes"
  FROM public.ven_ventas_medios_pago m
  JOIN public.ven_ventas v ON v.id_venta=m.id_venta
  JOIN public.cfg_estados_venta ev ON ev.id_estado_venta=v.id_estado_venta
  JOIN public.inm_lotes l ON l.id_lote=v.id_lote
  JOIN public.inm_proyectos ip ON ip.id_proyecto=l.id_proyecto
  JOIN public.cfg_metodos_pago mp ON mp.id_metodo_pago=m.id_metodo_pago
  LEFT JOIN LATERAL (
    SELECT ct.codigo, ec.codigo AS estado
    FROM public.ven_contratos ct
    JOIN public.cfg_estados_contrato ec ON ec.id_estado_contrato=ct.id_estado_contrato
    WHERE ct.id_venta=v.id_venta
    ORDER BY ct.id_contrato DESC LIMIT 1
  ) con ON true
  LEFT JOIN public.ven_ventas_clientes vc ON vc.id_venta=v.id_venta AND vc.titular
  LEFT JOIN public.crm_clientes cl ON cl.id_cliente=vc.id_cliente
  LEFT JOIN public.core_personas cp ON cp.id_persona=cl.id_persona
  WHERE m.estado_revision='PENDIENTE'
    AND (v_busqueda='' OR lower(v.codigo) LIKE '%'||v_busqueda||'%'
      OR lower(l.codigo) LIKE '%'||v_busqueda||'%'
      OR lower(ip.nombre) LIKE '%'||v_busqueda||'%'
      OR lower(concat_ws(' ',cp.nombres,cp.apellido_paterno,cp.apellido_materno))
         LIKE '%'||v_busqueda||'%')
 ),
 pagina AS (
   SELECT * FROM base ORDER BY "idVenta" DESC
   LIMIT p_tamano OFFSET ((p_pagina-1)*p_tamano)
 )
 SELECT jsonb_build_object(
   'total',(SELECT count(*) FROM base),
   'montoPendiente',(SELECT coalesce(sum("montoPendiente"),0) FROM base),
   'pagina',p_pagina,
   'tamano',p_tamano,
   'paginas',greatest(1,ceil((SELECT count(*) FROM base)::numeric/p_tamano)::int),
   'items',(SELECT coalesce(jsonb_agg(to_jsonb(pg) ORDER BY pg."idVenta" DESC),'[]'::jsonb) FROM pagina pg),
   'soloConsulta',true
 ) INTO v_resultado;
 RETURN v_resultado;
END $fn$;

REVOKE ALL ON FUNCTION public.sp_fin_ventas_cobros_pendientes_v1(
 bigint,character varying,integer,integer
) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.sp_fin_ventas_cobros_pendientes_v1(
 bigint,character varying,integer,integer
) TO sigi_app_user;
COMMIT;
