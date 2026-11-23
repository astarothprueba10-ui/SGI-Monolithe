-- 131 | CRM Compradores: identidad única, operaciones por lote y expediente maestro.
-- Sin cambios en separaciones, ventas, contratos, cuotas ni datos existentes.
BEGIN;

CREATE OR REPLACE FUNCTION public.fn_crm_compras_visibles_v1(p_actor BIGINT)
RETURNS TABLE(
 id_cliente BIGINT, codigo_cliente VARCHAR, nombre_completo TEXT, id_persona BIGINT,
 id_venta BIGINT, codigo_venta VARCHAR, id_contrato BIGINT, codigo_contrato VARCHAR,
 estado_contrato VARCHAR, id_lote BIGINT, codigo_lote VARCHAR, id_proyecto BIGINT,
 proyecto_nombre VARCHAR, modalidad VARCHAR, precio_venta NUMERIC,
 fecha_venta TIMESTAMPTZ, fecha_formalizacion TIMESTAMPTZ
)
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $function$
DECLARE v_global BOOLEAN;
BEGIN
 IF p_actor IS NULL OR p_actor <= 0 OR
   NOT COALESCE(public.fn_usuario_tiene_permiso_seguridad(p_actor,'crm.view'::VARCHAR), FALSE)
 THEN RAISE EXCEPTION 'DENEGADO|Se requiere crm.view'; END IF;

 SELECT EXISTS(
   SELECT 1 FROM public.seg_usuarios_roles ur
   JOIN public.seg_roles r ON r.id_rol=ur.id_rol
   WHERE ur.id_usuario=p_actor AND ur.activo AND ur.fecha_revocacion IS NULL AND r.activo
     AND r.codigo IN ('ADMINISTRADOR','GERENCIA','SUPERVISOR_COMERCIAL','ADMINISTRACION')
 ) INTO v_global;

 RETURN QUERY
 SELECT c.id_cliente,c.codigo,
   TRIM(CONCAT_WS(' ',per.nombres,per.apellido_paterno,per.apellido_materno)),
   c.id_persona,v.id_venta,v.codigo,ct.id_contrato,ct.codigo,ec.codigo,
   l.id_lote,l.codigo,l.id_proyecto,pro.nombre,mv.codigo,v.precio_venta,
   v.fecha_venta,COALESCE(ct.fecha_firma::timestamp AT TIME ZONE 'America/Lima',ct.fecha_creacion)
 FROM public.crm_clientes c
 JOIN public.core_personas per ON per.id_persona=c.id_persona
 JOIN public.ven_ventas_clientes vc ON vc.id_cliente=c.id_cliente
 JOIN public.ven_ventas v ON v.id_venta=vc.id_venta
 JOIN public.ven_contratos ct ON ct.id_venta=v.id_venta
 JOIN public.cfg_estados_contrato ec ON ec.id_estado_contrato=ct.id_estado_contrato
 JOIN public.inm_lotes l ON l.id_lote=v.id_lote
 JOIN public.inm_proyectos pro ON pro.id_proyecto=l.id_proyecto
 JOIN public.cfg_modalidades_venta mv ON mv.id_modalidad_venta=v.id_modalidad_venta
 WHERE c.activo AND per.activo
   -- Historico con firma, incluidos contratos terminados, resueltos o anulados.
   -- Contratos que siguen en borrador o pendientes de firma no son adquisiciones.
   AND ec.codigo IN ('VIGENTE','FINALIZADO','RESUELTO','ANULADO')
   AND (ct.fecha_firma IS NOT NULL OR ec.codigo IN ('VIGENTE','FINALIZADO'))
   AND (
      v_global OR EXISTS (
        SELECT 1 FROM public.com_ventas_asesores va
        JOIN public.com_asesores a ON a.id_asesor=va.id_asesor
        JOIN public.seg_usuarios u ON u.id_persona=a.id_persona AND u.id_usuario=p_actor
        JOIN public.seg_usuarios_roles ur ON ur.id_usuario=u.id_usuario
        JOIN public.seg_roles r ON r.id_rol=ur.id_rol
        JOIN public.cfg_estados_asesor ea ON ea.id_estado_asesor=a.id_estado_asesor
        WHERE va.id_venta=v.id_venta AND r.codigo='ASESOR' AND r.activo
          AND ur.activo AND ur.fecha_revocacion IS NULL
          AND ea.activo AND ea.permite_operar
          AND a.fecha_inicio <= CURRENT_DATE
          AND (a.fecha_fin IS NULL OR a.fecha_fin >= CURRENT_DATE)
      )
   );
END;
$function$;
REVOKE ALL ON FUNCTION public.fn_crm_compras_visibles_v1(BIGINT)
 FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.fn_crm_compras_visibles_v1(BIGINT) TO sigi_app_user;

CREATE OR REPLACE FUNCTION public.sp_crm_compradores_unicos_v1(
 p_actor BIGINT, p_busqueda VARCHAR DEFAULT NULL, p_pagina INTEGER DEFAULT 1,
 p_tamano INTEGER DEFAULT 15, p_proyecto BIGINT DEFAULT NULL,
 p_modalidad VARCHAR DEFAULT NULL, p_desde DATE DEFAULT NULL, p_hasta DATE DEFAULT NULL
) RETURNS JSONB LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $function$
DECLARE v_result JSONB;
BEGIN
 IF p_pagina IS NULL OR p_pagina < 1 OR p_pagina > 100000
   OR p_tamano IS NULL OR p_tamano < 1 OR p_tamano > 100
   OR length(COALESCE(p_busqueda,'')) > 120
   OR (p_proyecto IS NOT NULL AND p_proyecto <= 0)
   OR (p_modalidad IS NOT NULL AND p_modalidad NOT IN ('CONTADO','FINANCIADA'))
   OR (p_desde IS NOT NULL AND p_hasta IS NOT NULL AND p_desde > p_hasta)
 THEN RAISE EXCEPTION 'DATOS_INVALIDOS|Filtros de compradores invalidos'; END IF;

 WITH visibles AS (
   SELECT * FROM public.fn_crm_compras_visibles_v1(p_actor)
   WHERE (p_proyecto IS NULL OR id_proyecto=p_proyecto)
     AND (p_modalidad IS NULL OR modalidad=p_modalidad)
     AND (p_desde IS NULL OR (fecha_formalizacion AT TIME ZONE 'America/Lima')::date >= p_desde)
     AND (p_hasta IS NULL OR (fecha_formalizacion AT TIME ZONE 'America/Lima')::date <= p_hasta)
 ), agrupado AS (
   SELECT id_cliente, MIN(codigo_cliente) AS codigo_cliente,
      MIN(nombre_completo) AS nombre_completo,
      COUNT(DISTINCT id_venta)::INTEGER AS cantidad_compras,
      COUNT(DISTINCT id_lote)::INTEGER AS cantidad_lotes,
      COUNT(DISTINCT id_proyecto)::INTEGER AS cantidad_proyectos,
      CASE WHEN BOOL_OR(modalidad='CONTADO') AND BOOL_OR(modalidad='FINANCIADA')
           THEN 'MIXTA'
           WHEN BOOL_OR(modalidad='FINANCIADA') THEN 'FINANCIADA'
           ELSE 'CONTADO' END AS modalidad_resumen,
      MAX(fecha_formalizacion) AS fecha_ultima_compra
   FROM visibles GROUP BY id_cliente
 ), coincidencias AS (
   SELECT a.* FROM agrupado a
   WHERE NULLIF(BTRIM(p_busqueda),'') IS NULL
     OR a.nombre_completo ILIKE '%'||BTRIM(p_busqueda)||'%'
     OR a.codigo_cliente ILIKE '%'||BTRIM(p_busqueda)||'%'
     OR EXISTS(
       SELECT 1 FROM visibles v
       WHERE v.id_cliente=a.id_cliente AND (
         v.codigo_venta ILIKE '%'||BTRIM(p_busqueda)||'%' OR
         v.codigo_contrato ILIKE '%'||BTRIM(p_busqueda)||'%' OR
         v.codigo_lote ILIKE '%'||BTRIM(p_busqueda)||'%' OR
         v.proyecto_nombre ILIKE '%'||BTRIM(p_busqueda)||'%'
       )
     )
 ), pagina AS (
   SELECT * FROM coincidencias ORDER BY fecha_ultima_compra DESC,id_cliente DESC
   LIMIT p_tamano OFFSET (p_pagina::BIGINT-1)*p_tamano
 )
 SELECT jsonb_build_object(
   'items',COALESCE((SELECT jsonb_agg(to_jsonb(p) ORDER BY p.fecha_ultima_compra DESC,p.id_cliente DESC) FROM pagina p),'[]'::jsonb),
   'total',(SELECT COUNT(*) FROM coincidencias),
   'pagina',p_pagina,'tamano',p_tamano,
   'paginas',CEIL((SELECT COUNT(*)::numeric FROM coincidencias)/p_tamano)::INTEGER
 ) INTO v_result;
 RETURN v_result;
END;
$function$;
REVOKE ALL ON FUNCTION public.sp_crm_compradores_unicos_v1(BIGINT,VARCHAR,INTEGER,INTEGER,BIGINT,VARCHAR,DATE,DATE)
 FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.sp_crm_compradores_unicos_v1(BIGINT,VARCHAR,INTEGER,INTEGER,BIGINT,VARCHAR,DATE,DATE) TO sigi_app_user;

-- Detalle paginado para exportaciones: conserva cada contrato/lote sin repetir
-- a las personas en el listado principal. Mismo alcance estricto por venta.
CREATE OR REPLACE FUNCTION public.sp_crm_compradores_operaciones_v1(
 p_actor BIGINT, p_busqueda VARCHAR DEFAULT NULL, p_pagina INTEGER DEFAULT 1,
 p_tamano INTEGER DEFAULT 100, p_proyecto BIGINT DEFAULT NULL,
 p_modalidad VARCHAR DEFAULT NULL, p_desde DATE DEFAULT NULL, p_hasta DATE DEFAULT NULL
) RETURNS JSONB LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $function$
DECLARE v_result JSONB;
BEGIN
 IF p_pagina IS NULL OR p_pagina < 1 OR p_pagina > 100000
   OR p_tamano IS NULL OR p_tamano < 1 OR p_tamano > 100
   OR length(COALESCE(p_busqueda,'')) > 120
   OR (p_proyecto IS NOT NULL AND p_proyecto <= 0)
   OR (p_modalidad IS NOT NULL AND p_modalidad NOT IN ('CONTADO','FINANCIADA'))
   OR (p_desde IS NOT NULL AND p_hasta IS NOT NULL AND p_desde > p_hasta)
 THEN RAISE EXCEPTION 'DATOS_INVALIDOS|Filtros de operaciones invalidos'; END IF;
 WITH visibles AS (
   SELECT * FROM public.fn_crm_compras_visibles_v1(p_actor)
   WHERE (p_proyecto IS NULL OR id_proyecto=p_proyecto)
     AND (p_modalidad IS NULL OR modalidad=p_modalidad)
     AND (p_desde IS NULL OR (fecha_formalizacion AT TIME ZONE 'America/Lima')::date >= p_desde)
     AND (p_hasta IS NULL OR (fecha_formalizacion AT TIME ZONE 'America/Lima')::date <= p_hasta)
 ), coincidencias AS (
   SELECT * FROM visibles v
   WHERE NULLIF(BTRIM(p_busqueda),'') IS NULL
     OR v.nombre_completo ILIKE '%'||BTRIM(p_busqueda)||'%'
     OR v.codigo_cliente ILIKE '%'||BTRIM(p_busqueda)||'%'
     OR v.codigo_venta ILIKE '%'||BTRIM(p_busqueda)||'%'
     OR v.codigo_contrato ILIKE '%'||BTRIM(p_busqueda)||'%'
     OR v.codigo_lote ILIKE '%'||BTRIM(p_busqueda)||'%'
     OR v.proyecto_nombre ILIKE '%'||BTRIM(p_busqueda)||'%'
 ), pagina AS (
   SELECT * FROM coincidencias
   ORDER BY fecha_formalizacion DESC,id_venta DESC,id_contrato DESC
   LIMIT p_tamano OFFSET (p_pagina::BIGINT-1)*p_tamano
 )
 SELECT jsonb_build_object(
   'items',COALESCE((SELECT jsonb_agg(to_jsonb(p) ORDER BY p.fecha_formalizacion DESC,p.id_venta DESC,p.id_contrato DESC) FROM pagina p),'[]'::jsonb),
   'total',(SELECT COUNT(*) FROM coincidencias),'pagina',p_pagina,'tamano',p_tamano,
   'paginas',CEIL((SELECT COUNT(*)::numeric FROM coincidencias)/p_tamano)::INTEGER
 ) INTO v_result;
 RETURN v_result;
END;
$function$;
REVOKE ALL ON FUNCTION public.sp_crm_compradores_operaciones_v1(BIGINT,VARCHAR,INTEGER,INTEGER,BIGINT,VARCHAR,DATE,DATE)
 FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.sp_crm_compradores_operaciones_v1(BIGINT,VARCHAR,INTEGER,INTEGER,BIGINT,VARCHAR,DATE,DATE) TO sigi_app_user;

CREATE OR REPLACE FUNCTION public.sp_crm_comprador_expediente_v1(
 p_actor BIGINT,p_cliente BIGINT
) RETURNS JSONB LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $function$
DECLARE v_result JSONB; v_persona BIGINT; v_count BIGINT;
BEGIN
 IF p_cliente IS NULL OR p_cliente <= 0 THEN
   RAISE EXCEPTION 'DATOS_INVALIDOS|Cliente invalido';
 END IF;
 -- Esta misma funcion aplica el alcance por venta, no confía en id_cliente enviado.
 SELECT COUNT(*),MIN(id_persona) INTO v_count,v_persona
 FROM public.fn_crm_compras_visibles_v1(p_actor)
 WHERE id_cliente=p_cliente;
 IF v_count=0 THEN
   RAISE EXCEPTION 'DENEGADO|Cliente sin adquisiciones accesibles';
 END IF;

 WITH operaciones AS (
   SELECT * FROM public.fn_crm_compras_visibles_v1(p_actor)
   WHERE id_cliente=p_cliente
 ), persona AS (
   SELECT per.id_persona,per.estado_civil_codigo,
      d.numero_documento,d.tipo_documento,
      ce.telefono,ce.correo,
      dir.direccion,dir.distrito,dir.provincia,dir.departamento,dir.pais
   FROM public.core_personas per
   LEFT JOIN LATERAL (
      SELECT pd.numero_documento,td.codigo AS tipo_documento
      FROM public.core_personas_documentos pd
      JOIN public.cfg_tipos_documento td ON td.id_tipo_documento=pd.id_tipo_documento
      WHERE pd.id_persona=per.id_persona AND pd.activo
      ORDER BY pd.principal DESC,pd.id_persona_documento DESC LIMIT 1
   ) d ON TRUE
   LEFT JOIN LATERAL (
      SELECT
        (SELECT pc.valor FROM public.core_personas_contactos pc
          JOIN public.cfg_tipos_contacto tc ON tc.id_tipo_contacto=pc.id_tipo_contacto
          WHERE pc.id_persona=per.id_persona AND pc.activo
            AND (tc.codigo ILIKE '%TELEF%' OR tc.codigo ILIKE '%CEL%' OR tc.codigo ILIKE '%MOVIL%' OR tc.codigo ILIKE '%WHATS%')
          ORDER BY pc.principal DESC,pc.id_persona_contacto DESC LIMIT 1) AS telefono,
        (SELECT pc.valor FROM public.core_personas_contactos pc
          JOIN public.cfg_tipos_contacto tc ON tc.id_tipo_contacto=pc.id_tipo_contacto
          WHERE pc.id_persona=per.id_persona AND pc.activo
            AND (tc.codigo ILIKE '%MAIL%' OR tc.codigo ILIKE '%CORREO%')
          ORDER BY pc.principal DESC,pc.id_persona_contacto DESC LIMIT 1) AS correo
   ) ce ON TRUE
   LEFT JOIN LATERAL (
      SELECT pd.direccion,pd.distrito,pd.provincia,pd.departamento,pd.pais
      FROM public.core_personas_direcciones pd
      WHERE pd.id_persona=per.id_persona AND pd.activo
      ORDER BY pd.principal DESC,pd.id_persona_direccion DESC LIMIT 1
   ) dir ON TRUE
   WHERE per.id_persona=v_persona
 )
 SELECT jsonb_build_object(
    'cliente',(SELECT jsonb_build_object(
      'id_cliente',o.id_cliente,'codigo_cliente',o.codigo_cliente,
      'nombre_completo',o.nombre_completo,
      'tipo_documento',p.tipo_documento,'numero_documento',p.numero_documento,
      'telefono',p.telefono,'correo',p.correo,'estado_civil',p.estado_civil_codigo,
      'direccion',p.direccion,'distrito',p.distrito,'provincia',p.provincia,
      'departamento',p.departamento,'pais',p.pais
     ) FROM operaciones o CROSS JOIN persona p LIMIT 1),
    'totales',(SELECT jsonb_build_object(
      'cantidad_compras',COUNT(DISTINCT o.id_venta),
      'cantidad_lotes',COUNT(DISTINCT o.id_lote),
      'cantidad_proyectos',COUNT(DISTINCT o.id_proyecto)
      ) FROM operaciones o),
    'operaciones',COALESCE((SELECT jsonb_agg(
       to_jsonb(o) ORDER BY o.proyecto_nombre,o.fecha_formalizacion DESC,o.id_venta DESC
    ) FROM operaciones o),'[]'::jsonb)
 ) INTO v_result;
 RETURN v_result;
END;
$function$;
REVOKE ALL ON FUNCTION public.sp_crm_comprador_expediente_v1(BIGINT,BIGINT)
 FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.sp_crm_comprador_expediente_v1(BIGINT,BIGINT) TO sigi_app_user;
COMMIT;
