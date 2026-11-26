-- 138 | Bandeja con dos etapas, cuentas reales y revisión de separaciones vencidas.
-- Solo modifica RPC de consulta: sin liberación de lotes ni confirmación de dinero.
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
    (SELECT MIN(co.id_comprobante) FROM public.ven_ventas_comprobantes co
      WHERE co.id_venta=v.id_venta) AS "idComprobante",
    (SELECT rev.decision FROM public.fin_revisiones_comprobantes_venta_v1 rev
      WHERE rev.id_venta=v.id_venta ORDER BY rev.id_revision DESC LIMIT 1)::text AS "ultimaDecision",
    (SELECT LEFT(rev.motivo,250) FROM public.fin_revisiones_comprobantes_venta_v1 rev
      WHERE rev.id_venta=v.id_venta ORDER BY rev.id_revision DESC LIMIT 1)::text AS "observacion",
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
  WHERE m.estado_revision IN ('PENDIENTE','APROBADO')
    AND NOT EXISTS (SELECT 1 FROM public.fin_revisiones_comprobantes_venta_v1 rev
      WHERE rev.id_venta=v.id_venta AND rev.id_pago IS NOT NULL)
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
   'porVerificar',(SELECT count(*) FROM base WHERE "estadoRevision"='PENDIENTE'),
   'porConciliar',(SELECT count(*) FROM base WHERE "estadoRevision"='APROBADO'),
   'pagina',p_pagina,
   'tamano',p_tamano,
   'paginas',greatest(1,ceil((SELECT count(*) FROM base)::numeric/p_tamano)::int),
   'items',(SELECT coalesce(jsonb_agg(to_jsonb(pg) ORDER BY pg."idVenta" DESC),'[]'::jsonb) FROM pagina pg),
   'requiereAprobacionYConciliacion',true
 ) INTO v_resultado;
 RETURN v_resultado;
END $fn$;

CREATE OR REPLACE FUNCTION public.sp_fin_cuentas_venta_receptoras_v1(p_actor BIGINT)
RETURNS JSONB LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path TO pg_catalog,public,pg_temp
AS $fn$
BEGIN
 IF NOT COALESCE(public.fn_usuario_tiene_permiso_seguridad(p_actor,'finance.view'::varchar),FALSE)
 THEN RAISE EXCEPTION 'DENEGADO|Se requiere finance.view.'; END IF;
 RETURN jsonb_build_object(
  'cuentas',COALESCE((
    SELECT jsonb_agg(jsonb_build_object('idCuenta',c.id_cuenta_financiera,
      'codigo',c.codigo,'nombre',c.nombre,'tipo',t.codigo,'idMoneda',c.id_moneda)
      ORDER BY c.nombre)
    FROM public.fin_cuentas_financieras c
    JOIN public.cfg_tipos_cuenta_financiera t ON t.id_tipo_cuenta_financiera=c.id_tipo_cuenta_financiera
    WHERE c.activo AND c.permite_ingresos AND c.fecha_cierre IS NULL
      AND c.codigo NOT ILIKE 'DEMO-%'
  ),'[]'::jsonb),
  'categorias',COALESCE((
    SELECT jsonb_agg(jsonb_build_object('codigo',c.codigo,'nombre',c.nombre) ORDER BY c.codigo)
    FROM public.fin_categorias c
    JOIN public.cfg_tipos_movimiento_financiero t ON t.id_tipo_movimiento_financiero=c.id_tipo_movimiento_financiero
    WHERE c.activo AND t.codigo='INGRESO'
      AND c.codigo IN('INGRESO_VENTA_LOTE','INGRESO_INICIAL_VENTA')
  ),'[]'::jsonb)
 );
END $fn$;

CREATE OR REPLACE FUNCTION public.sp_fin_reservas_vencidas_revision_v1(p_actor BIGINT)
RETURNS JSONB LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path TO pg_catalog,public,pg_temp
AS $fn$
BEGIN
 IF NOT COALESCE(public.fn_usuario_tiene_permiso_seguridad(p_actor,'finance.view'::varchar),FALSE)
 THEN RAISE EXCEPTION 'DENEGADO|Se requiere finance.view.'; END IF;
 RETURN jsonb_build_object(
  'items',COALESCE((
    SELECT jsonb_agg(to_jsonb(x) ORDER BY x."fechaVencimiento",x."idReserva")
    FROM (
      SELECT r.id_reserva AS "idReserva",r.codigo::text AS "codigo",
        r.fecha_vencimiento AS "fechaVencimiento",
        e.codigo::text AS "estadoReserva",el.codigo::text AS "estadoLote",
        l.codigo::text AS "codigoLote",pr.nombre::text AS "proyecto",
        r.monto_reserva AS "montoReserva",
        COALESCE((
          SELECT SUM(p.monto) FROM public.pag_pagos p
          JOIN public.cfg_estados_pago ep ON ep.id_estado_pago=p.id_estado_pago
          WHERE p.id_reserva=r.id_reserva AND ep.codigo='CONFIRMADO'
        ),0)::numeric AS "montoConfirmado",
        COALESCE((
          SELECT COUNT(*) FROM public.pag_pagos p
          JOIN public.cfg_estados_pago ep ON ep.id_estado_pago=p.id_estado_pago
          WHERE p.id_reserva=r.id_reserva AND ep.codigo='REGISTRADO'
        ),0)::int AS "pagosEnRevision",
        (EXISTS (
          SELECT 1 FROM public.pag_pagos p
          JOIN public.cfg_estados_pago ep ON ep.id_estado_pago=p.id_estado_pago
          WHERE p.id_reserva=r.id_reserva AND ep.codigo<>'ANULADO'
        ) OR EXISTS (
          SELECT 1 FROM public.ven_ventas v JOIN public.cfg_estados_venta ev
            ON ev.id_estado_venta=v.id_estado_venta
          WHERE v.id_lote=r.id_lote AND ev.codigo<>'ANULADA'
        )) AS "requiereRevision",
        r.fecha_reserva AS "fechaReserva"
      FROM public.ven_reservas r
      JOIN public.cfg_estados_reserva e ON e.id_estado_reserva=r.id_estado_reserva
      JOIN public.inm_lotes l ON l.id_lote=r.id_lote
      JOIN public.cfg_estados_lote el ON el.id_estado_lote=l.id_estado_lote
      JOIN public.inm_proyectos pr ON pr.id_proyecto=l.id_proyecto
      WHERE e.codigo IN('PENDIENTE','VIGENTE') AND r.fecha_vencimiento <= now()
      ORDER BY r.fecha_vencimiento,r.id_reserva LIMIT 100
    ) x
  ),'[]'::jsonb),
  'soloConsulta',true
 );
END $fn$;

REVOKE ALL ON FUNCTION public.sp_fin_ventas_cobros_pendientes_v1(BIGINT,VARCHAR,INTEGER,INTEGER)
 FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.sp_fin_cuentas_venta_receptoras_v1(BIGINT)
 FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.sp_fin_reservas_vencidas_revision_v1(BIGINT)
 FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.sp_fin_ventas_cobros_pendientes_v1(BIGINT,VARCHAR,INTEGER,INTEGER) TO sigi_app_user;
GRANT EXECUTE ON FUNCTION public.sp_fin_cuentas_venta_receptoras_v1(BIGINT) TO sigi_app_user;
GRANT EXECUTE ON FUNCTION public.sp_fin_reservas_vencidas_revision_v1(BIGINT) TO sigi_app_user;
COMMIT;
