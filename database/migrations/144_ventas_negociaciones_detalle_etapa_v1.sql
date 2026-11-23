-- 144 | La negociación recuerda proyecto y etapa de cada lote para facilitar su formalización.
BEGIN;
CREATE OR REPLACE FUNCTION public.sp_crm_listar_operaciones_agrupadas_v1(
 p_actor BIGINT,p_pagina INTEGER DEFAULT 1,p_tamano INTEGER DEFAULT 20
) RETURNS JSONB LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path TO pg_catalog,public,pg_temp
AS $fn$
DECLARE v_total INTEGER;v_items JSONB;
BEGIN
 IF NOT coalesce(public.fn_usuario_tiene_permiso_seguridad(p_actor,'sales.view'::varchar),FALSE)
 THEN RAISE EXCEPTION 'DENEGADO|No tiene permiso para consultar ventas.'; END IF;
 IF p_pagina IS NULL OR p_tamano IS NULL OR p_pagina NOT BETWEEN 1 AND 10000
   OR p_tamano NOT BETWEEN 1 AND 50
 THEN RAISE EXCEPTION 'DATOS_INVALIDOS|Paginación inválida.'; END IF;

 WITH visibles AS(
  SELECT g.id_operacion,g.codigo,g.id_persona,g.id_prospecto,
    g.fecha_creacion,g.observaciones,
    cp.nombres,cp.apellido_paterno,cp.apellido_materno,
    cl.codigo AS codigo_cliente
  FROM public.ven_operaciones_agrupadas_v1 g
  JOIN public.core_personas cp ON cp.id_persona=g.id_persona
  LEFT JOIN public.crm_clientes cl ON cl.id_persona=g.id_persona
  WHERE public.fn_crm_puede_consultar_prospecto(p_actor,g.id_prospecto)
 ),items AS(
  SELECT g.*,
  (
   SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'idItem',a.id_item,'idLote',a.id_lote,'codigoLote',l.codigo,
    'idProyecto',l.id_proyecto,'idEtapa',mz.id_etapa,
    'proyecto',pr.nombre,'modalidad',a.modalidad,
    'idVenta',a.id_venta,'codigoVenta',v.codigo,'estadoVenta',ev.codigo,
    'precioVenta',v.precio_venta,'monedaVenta',mo.codigo,
    'codigoContrato',ct.codigo,'estadoContrato',ec.codigo,
    'codigoPlan',pp.codigo
    ) ORDER BY a.id_item),'[]'::jsonb)
   FROM public.ven_operaciones_agrupadas_lotes_v1 a
   JOIN public.inm_lotes l ON l.id_lote=a.id_lote
   JOIN public.inm_manzanas mz ON mz.id_manzana=l.id_manzana
   JOIN public.inm_proyectos pr ON pr.id_proyecto=l.id_proyecto
   LEFT JOIN public.ven_ventas v ON v.id_venta=a.id_venta
   LEFT JOIN public.cfg_estados_venta ev ON ev.id_estado_venta=v.id_estado_venta
   LEFT JOIN public.cfg_monedas mo ON mo.id_moneda=v.id_moneda
   LEFT JOIN LATERAL (
     SELECT con.codigo,con.id_estado_contrato
     FROM public.ven_contratos con WHERE con.id_venta=v.id_venta
     ORDER BY con.id_contrato DESC LIMIT 1
   ) ct ON true
   LEFT JOIN public.cfg_estados_contrato ec ON ec.id_estado_contrato=ct.id_estado_contrato
   LEFT JOIN LATERAL(
      SELECT pg.codigo FROM public.pag_planes_pago pg
      WHERE pg.id_venta=v.id_venta AND pg.es_vigente
      ORDER BY pg.id_plan_pago DESC LIMIT 1
   ) pp ON true
   WHERE a.id_operacion=g.id_operacion
  ) lotes
  FROM visibles g
 )
 SELECT (SELECT count(*)::integer FROM visibles),
   (SELECT coalesce(jsonb_agg(jsonb_build_object(
       'idOperacion',it.id_operacion,'codigo',it.codigo,
       'idProspecto',it.id_prospecto,'idPersona',it.id_persona,
       'codigoCliente',it.codigo_cliente,
       'comprador',btrim(concat_ws(' ',it.nombres,it.apellido_paterno,it.apellido_materno)),
       'fechaCreacion',it.fecha_creacion,'observaciones',it.observaciones,
       'lotes',it.lotes,
       'cantidadLotes',jsonb_array_length(it.lotes),
       'cantidadVentas',(
         SELECT count(*) FROM jsonb_array_elements(it.lotes) x
         WHERE (x->>'idVenta') IS NOT NULL
       )
     ) ORDER BY it.id_operacion DESC),'[]'::jsonb)
    FROM (SELECT * FROM items ORDER BY id_operacion DESC LIMIT p_tamano
       OFFSET (p_pagina-1)*p_tamano) it
   ) INTO v_total,v_items;
 RETURN jsonb_build_object('total',v_total,'pagina',p_pagina,'tamano',p_tamano,
  'paginas',greatest(1,ceil(v_total::numeric/p_tamano)::integer),
  'items',v_items);
END $fn$;
REVOKE ALL ON FUNCTION public.sp_crm_listar_operaciones_agrupadas_v1(BIGINT,INTEGER,INTEGER)
 FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.sp_crm_listar_operaciones_agrupadas_v1(BIGINT,INTEGER,INTEGER)
 TO sigi_app_user;
COMMIT;
