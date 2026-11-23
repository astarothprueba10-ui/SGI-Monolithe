-- 130 | Retirar evaluacion crediticia externa no integrada; conservar filtros y cartera por contrato.
-- Requiere 127-129. No altera ventas, contratos, cuotas, ni alertas de pagos internos.
BEGIN;

CREATE OR REPLACE FUNCTION public.sp_crm_compradores_filtros_v2(
    p_actor BIGINT,
    p_busqueda VARCHAR,
    p_pagina INTEGER,
    p_tamano INTEGER,
    p_proyecto BIGINT DEFAULT NULL,
    p_modalidad VARCHAR DEFAULT NULL,
    p_desde DATE DEFAULT NULL,
    p_hasta DATE DEFAULT NULL
) RETURNS JSONB
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $func$
DECLARE
    v_global BOOLEAN;
    v_resultado JSONB;
BEGIN
    IF p_actor IS NULL OR p_actor <= 0 OR
       NOT COALESCE(public.fn_usuario_tiene_permiso_seguridad(p_actor,'crm.view'),false)
    THEN
        RAISE EXCEPTION 'DENEGADO|Se requiere crm.view.';
    END IF;
    IF p_pagina IS NULL OR p_pagina < 1 OR p_pagina > 100000 OR
       p_tamano IS NULL OR p_tamano < 1 OR p_tamano > 100 OR
       LENGTH(COALESCE(p_busqueda,'')) > 120 OR
       (p_proyecto IS NOT NULL AND p_proyecto <= 0) OR
       (p_modalidad IS NOT NULL AND p_modalidad NOT IN ('CONTADO','FINANCIADA')) OR
       (p_desde IS NOT NULL AND p_hasta IS NOT NULL AND p_desde > p_hasta)
    THEN
        RAISE EXCEPTION 'DATOS_INVALIDOS|Filtros de cartera invalidos.';
    END IF;

    SELECT EXISTS (
        SELECT 1 FROM public.seg_usuarios_roles ur
        JOIN public.seg_roles r ON r.id_rol=ur.id_rol
        WHERE ur.id_usuario=p_actor AND ur.activo AND ur.fecha_revocacion IS NULL
          AND r.activo
          AND r.codigo IN ('ADMINISTRADOR','GERENCIA','SUPERVISOR_COMERCIAL','ADMINISTRACION')
    ) INTO v_global;

    WITH base AS (
        SELECT
            c.id_cliente,
            c.codigo AS codigo_cliente,
            TRIM(CONCAT_WS(' ',per.nombres,per.apellido_paterno,per.apellido_materno)) AS nombre_completo,
            pr.id_prospecto,
            v.id_venta,
            v.codigo AS codigo_venta,
            v.fecha_venta,
            v.precio_venta,
            ct.id_contrato,
            ct.codigo AS codigo_contrato,
            ec.codigo AS estado_contrato,
            l.codigo AS codigo_lote,
            l.id_proyecto,
            pro.nombre AS proyecto_nombre,
            mv.codigo AS modalidad,
            COALESCE(ct.fecha_firma::TIMESTAMP AT TIME ZONE 'America/Lima',ct.fecha_creacion) AS fecha_formalizacion

        FROM public.crm_clientes c
        JOIN public.core_personas per ON per.id_persona=c.id_persona
        JOIN public.ven_ventas_clientes vc ON vc.id_cliente=c.id_cliente
        JOIN public.ven_ventas v ON v.id_venta=vc.id_venta
        JOIN public.cfg_estados_venta es ON es.id_estado_venta=v.id_estado_venta
        JOIN public.ven_contratos ct ON ct.id_venta=v.id_venta
        JOIN public.cfg_estados_contrato ec ON ec.id_estado_contrato=ct.id_estado_contrato
        JOIN public.inm_lotes l ON l.id_lote=v.id_lote
        JOIN public.inm_proyectos pro ON pro.id_proyecto=l.id_proyecto
        JOIN public.cfg_modalidades_venta mv ON mv.id_modalidad_venta=v.id_modalidad_venta
        LEFT JOIN LATERAL (
            SELECT cp.id_prospecto
            FROM public.crm_prospectos cp
            WHERE cp.id_persona=c.id_persona AND cp.activo AND
               (v_global OR COALESCE(public.fn_crm_puede_consultar_prospecto(p_actor,cp.id_prospecto),false))
            ORDER BY cp.id_prospecto DESC
            LIMIT 1
        ) pr ON TRUE
        WHERE c.activo AND per.activo
          AND es.codigo IN ('CONFIRMADA','CONTRATADA','COMPLETADA')
          AND ec.codigo IN ('VIGENTE','FINALIZADO')
          AND (v_global OR pr.id_prospecto IS NOT NULL)
          AND (p_proyecto IS NULL OR l.id_proyecto=p_proyecto)
          AND (p_modalidad IS NULL OR mv.codigo=p_modalidad)
          AND (p_desde IS NULL OR COALESCE(ct.fecha_firma::TIMESTAMP AT TIME ZONE 'America/Lima',ct.fecha_creacion) >= p_desde::TIMESTAMP AT TIME ZONE 'America/Lima')
          AND (p_hasta IS NULL OR COALESCE(ct.fecha_firma::TIMESTAMP AT TIME ZONE 'America/Lima',ct.fecha_creacion) < (p_hasta + 1)::TIMESTAMP AT TIME ZONE 'America/Lima')
          AND (
            NULLIF(BTRIM(p_busqueda),'') IS NULL OR
            per.nombres ILIKE '%'||BTRIM(p_busqueda)||'%' OR
            TRIM(CONCAT_WS(' ',per.nombres,per.apellido_paterno,per.apellido_materno)) ILIKE '%'||BTRIM(p_busqueda)||'%' OR
            c.codigo ILIKE '%'||BTRIM(p_busqueda)||'%' OR
            v.codigo ILIKE '%'||BTRIM(p_busqueda)||'%' OR
            ct.codigo ILIKE '%'||BTRIM(p_busqueda)||'%' OR
            l.codigo ILIKE '%'||BTRIM(p_busqueda)||'%'
          )
    ), pagina AS (
        SELECT * FROM base
        ORDER BY fecha_formalizacion DESC,id_venta DESC,id_contrato DESC
        LIMIT p_tamano OFFSET (p_pagina::BIGINT-1)*p_tamano
    )
    SELECT jsonb_build_object(
       'items',COALESCE((SELECT jsonb_agg(to_jsonb(x) ORDER BY x.fecha_formalizacion DESC,x.id_venta DESC,x.id_contrato DESC) FROM pagina x),'[]'::jsonb),
       'total',(SELECT COUNT(*) FROM base),
       'pagina',p_pagina,'tamano',p_tamano,
       'paginas',CEIL((SELECT COUNT(*)::NUMERIC FROM base)/p_tamano)::INTEGER
    ) INTO v_resultado;
    RETURN v_resultado;
END;
$func$;
REVOKE ALL ON FUNCTION public.sp_crm_compradores_filtros_v2(BIGINT,VARCHAR,INTEGER,INTEGER,BIGINT,VARCHAR,DATE,DATE) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.sp_crm_compradores_filtros_v2(BIGINT,VARCHAR,INTEGER,INTEGER,BIGINT,VARCHAR,DATE,DATE) TO sigi_app_user;


-- Eliminar el componente externo únicamente si todavía no hay evaluaciones.
-- Ante datos inesperados, toda la transacción se revierte.
DO $guard$
BEGIN
  IF EXISTS (SELECT 1 FROM public.crm_evaluaciones_crediticias) THEN
    RAISE EXCEPTION 'No se puede retirar evaluación externa: existen resultados que requieren conservación';
  END IF;
END
$guard$;

DROP TRIGGER IF EXISTS trg_crm_notificar_alerta_crediticia_v1
  ON public.crm_evaluaciones_crediticias;
DROP FUNCTION IF EXISTS public.fn_crm_notificar_alerta_crediticia_v1();
DROP FUNCTION IF EXISTS public.sp_crm_compradores_filtros_v1(
  BIGINT,VARCHAR,INTEGER,INTEGER,BIGINT,VARCHAR,VARCHAR,DATE,DATE
);
DROP TABLE IF EXISTS public.crm_evaluaciones_crediticias;
COMMIT;
