-- SGI-MONOLITHE Sprint 4 / 5.4.2
-- Únicamente datos de las compras del actor JWT. No requiere IDs del navegador.
-- Contratos: solo metadatos. No exponer rutas/archivos ni documentos no publicados.
-- Evitar avances de obras/planos simulados. No recalcula condiciones financieras.
CREATE OR REPLACE FUNCTION public.sp_portal_cliente_lotes_contratos_v1(p_actor bigint)
RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path TO 'pg_catalog','public','pg_temp'
AS $fn$
DECLARE
  v_persona bigint;
  v_items jsonb;
  v_total integer;
BEGIN
  SELECT u.id_persona INTO v_persona
  FROM public.seg_usuarios u
  JOIN public.core_personas per
    ON per.id_persona=u.id_persona AND per.activo
  JOIN public.cfg_estados_usuario eu
    ON eu.id_estado_usuario=u.id_estado_usuario
    AND eu.activo AND eu.permite_acceso
  WHERE u.id_usuario=p_actor AND p_actor>0
    AND (u.bloqueado_hasta IS NULL OR u.bloqueado_hasta<=now())
    AND EXISTS(
      SELECT 1 FROM public.seg_usuarios_roles ur
      JOIN public.seg_roles rr
        ON rr.id_rol=ur.id_rol AND rr.codigo='CLIENTE' AND rr.activo
      WHERE ur.id_usuario=u.id_usuario AND ur.activo
    );
  IF v_persona IS NULL THEN
    RAISE EXCEPTION 'PORTAL_ACCESO_DENEGADO|Identidad cliente no autorizada.';
  END IF;

  WITH propias AS (
    SELECT v.id_venta,v.codigo codigo_venta,v.precio_venta,
       v.id_lote,ev.codigo estado_venta,
       bool_or(vc.titular) AS titular
    FROM public.crm_clientes cl
    JOIN public.ven_ventas_clientes vc ON vc.id_cliente=cl.id_cliente
    JOIN public.ven_ventas v ON v.id_venta=vc.id_venta
    JOIN public.cfg_estados_venta ev ON ev.id_estado_venta=v.id_estado_venta
    WHERE cl.id_persona=v_persona AND cl.activo
    GROUP BY v.id_venta,ev.codigo
  ), detalle AS (
    SELECT
      p.id_venta AS "idVenta",
      p.codigo_venta AS "codigoVenta",
      p.estado_venta AS "estadoVenta",
      p.titular AS "esTitular",
      p.precio_venta AS "precioVentaPactado",
      jsonb_build_object(
        'idProyecto',pr.id_proyecto,
        'codigo',pr.codigo,'nombre',pr.nombre,
        'distrito',pr.distrito,'provincia',pr.provincia,
        'departamento',pr.departamento,'pais',pr.pais,
        'direccion',pr.direccion,
        'referencia',pr.ubicacion_referencia,
        'areaTotalM2',pr.area_total_m2,
        'fechaInicio',to_char(pr.fecha_inicio,'YYYY-MM-DD'),
        'fechaFinEstimada',to_char(pr.fecha_fin_estimada,'YYYY-MM-DD')
      ) AS proyecto,
      jsonb_build_object(
        'idLote',l.id_lote,
        'codigo',l.codigo,'numero',l.numero,
        'areaM2',l.area_m2,'frenteM',l.frente_m,'fondoM',l.fondo_m,
        'lateralDerechoM',l.lateral_derecho_m,
        'lateralIzquierdoM',l.lateral_izquierdo_m,
        'estado',el.codigo,
        'tipo',tl.nombre,
        'manzana',m.nombre,'codigoManzana',m.codigo,
        'etapa',et.nombre
      ) AS lote,
      coalesce(ct.contratos,'[]'::jsonb) AS contratos
    FROM propias p
    JOIN public.inm_lotes l ON l.id_lote=p.id_lote
    JOIN public.inm_proyectos pr ON pr.id_proyecto=l.id_proyecto
    JOIN public.cfg_estados_lote el ON el.id_estado_lote=l.id_estado_lote
    LEFT JOIN public.cfg_tipos_lote tl ON tl.id_tipo_lote=l.id_tipo_lote
    LEFT JOIN public.inm_manzanas m ON m.id_manzana=l.id_manzana
    LEFT JOIN public.inm_etapas et ON et.id_etapa=m.id_etapa
    LEFT JOIN LATERAL (
      SELECT jsonb_agg(
        jsonb_build_object(
          'idContrato',c.id_contrato,
          'codigo',c.codigo,
          'numero',c.numero_contrato,
          'tipo',tc.nombre,
          'estado',ec.codigo,
          'fechaEmision',to_char(c.fecha_emision,'YYYY-MM-DD'),
          'fechaFirma',to_char(c.fecha_firma,'YYYY-MM-DD'),
          'fechaInicioVigencia',to_char(c.fecha_inicio_vigencia,'YYYY-MM-DD'),
          'fechaFinVigencia',to_char(c.fecha_fin_vigencia,'YYYY-MM-DD'),
          -- Solo conteos, no claves/rutas de objetos de Storage.
          'documentosPublicados',(
            SELECT count(*) FROM public.ven_contratos_archivos ca
            WHERE ca.id_contrato=c.id_contrato
              AND ca.vigente AND ca.visible_cliente
              AND ca.fecha_publicacion_cliente IS NOT NULL
          ),
          'anexosPublicados',(
            SELECT count(*) FROM public.ven_contratos_anexos an
            WHERE an.id_contrato=c.id_contrato
              AND an.vigente AND an.visible_cliente
              AND an.fecha_publicacion_cliente IS NOT NULL
          )
        )
        ORDER BY c.id_contrato DESC) AS contratos
      FROM public.ven_contratos c
      JOIN public.cfg_estados_contrato ec
        ON ec.id_estado_contrato=c.id_estado_contrato
      LEFT JOIN public.cfg_tipos_contrato tc
        ON tc.id_tipo_contrato=c.id_tipo_contrato
      WHERE c.id_venta=p.id_venta
    ) ct ON TRUE
  )
  SELECT count(*)::integer,
     coalesce(jsonb_agg(to_jsonb(d) ORDER BY d."idVenta"),'[]'::jsonb)
  INTO v_total,v_items FROM detalle d;

  RETURN jsonb_build_object(
    'total',v_total,
    'items',v_items,
    'fechaConsulta',to_char(now() AT TIME ZONE 'America/Lima','YYYY-MM-DD'),
    'advertenciaPlano','No existe un plano verificado y publicado para este visor; no se generan representaciones ficticias.',
    'advertenciaDocumentos','Los documentos solo pueden descargarse cuando el área responsable los publique y el portal habilite lectura privada.');
END;
$fn$;

REVOKE ALL ON FUNCTION public.sp_portal_cliente_lotes_contratos_v1(bigint)
  FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.sp_portal_cliente_lotes_contratos_v1(bigint)
  TO sigi_app_user;
