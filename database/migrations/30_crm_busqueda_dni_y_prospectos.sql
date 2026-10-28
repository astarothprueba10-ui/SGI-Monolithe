-- ============================================================================
-- SGI-MONOLITHE: MIGRACION 30 - EXTENSION DE BUSQUEDA POR DNI EN CRM
-- Modulo: CRM Comercial (Sprint 3 - Bloque 3)
-- Reglas: Zero Emojis, Clean Architecture, RLS, Safe Extension
-- NOTA DE SEGURIDAD: NO EJECUTAR AUTOMATICAMENTE. ARCHIVO PREPARADO PARA REVISION DEL DBA.
-- ============================================================================

-- 1. INDICE PARA OPTIMIZAR BUSQUEDA POR NUMERO DE DOCUMENTO (DNI/CE/RUC)
CREATE INDEX IF NOT EXISTS idx_core_personas_documentos_busqueda_num
ON public.core_personas_documentos (numero_documento)
WHERE activo = TRUE;

-- 2. ACTUALIZACION DE FUNCION sp_crm_buscar_v5 CON SOPORTE PARA BUSQUEDA POR DNI
-- Permite que el parametro p_consulta coincida con:
--   a) Codigo de prospecto (LD-xxxx)
--   b) Nombres y apellidos de la persona
--   c) Numero de documento de identidad (DNI, Carnet de Extranjeria o RUC)
CREATE OR REPLACE FUNCTION public.sp_crm_buscar_v5(
    p_actor BIGINT,
    p_consulta VARCHAR,
    p_etapa VARCHAR,
    p_origen VARCHAR,
    p_asesor BIGINT,
    p_sin_asignar BOOLEAN,
    p_categoria VARCHAR,
    p_pagina INTEGER,
    p_tamano INTEGER
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_offset INTEGER;
    v_total BIGINT;
    v_items JSONB;
    v_paginas INTEGER;
    v_tiene_permiso BOOLEAN;
    v_consulta_norm VARCHAR;
BEGIN
    -- Validacion de permisos de seguridad
    SELECT public.fn_usuario_tiene_permiso_seguridad(p_actor, 'crm.view'::varchar)
    INTO v_tiene_permiso;

    IF NOT COALESCE(v_tiene_permiso, FALSE) THEN
        RAISE EXCEPTION 'Acceso denegado: el usuario no cuenta con permiso crm.view'
            USING ERRCODE = '42501';
    END IF;

    -- Normalizacion de parametros de paginacion
    p_pagina := GREATEST(1, COALESCE(p_pagina, 1));
    p_tamano := LEAST(100, GREATEST(1, COALESCE(p_tamano, 20)));
    v_offset := (p_pagina - 1) * p_tamano;
    v_consulta_norm := TRIM(COALESCE(p_consulta, ''));

    -- Conteo total considerando codigo, nombre o DNI
    SELECT COUNT(DISTINCT p.id_prospecto)
    INTO v_total
    FROM public.crm_prospectos p
    JOIN public.core_personas per ON p.id_persona = per.id_persona
    JOIN public.cfg_estados_prospecto est ON p.id_estado_prospecto = est.id_estado_prospecto
    JOIN public.cfg_origenes_prospecto orig ON p.id_origen_prospecto = orig.id_origen_prospecto
    LEFT JOIN public.com_asignaciones_prospecto asig ON p.id_prospecto = asig.id_prospecto_vigente
    LEFT JOIN public.core_personas_documentos doc ON per.id_persona = doc.id_persona AND doc.activo = TRUE
    WHERE p.activo = TRUE
      AND (
          v_consulta_norm = ''
          OR p.codigo ILIKE '%' || v_consulta_norm || '%'
          OR TRIM(per.nombres || ' ' || per.apellido_paterno || ' ' || COALESCE(per.apellido_materno, '')) ILIKE '%' || v_consulta_norm || '%'
          OR doc.numero_documento ILIKE '%' || v_consulta_norm || '%'
      )
      AND (p_etapa IS NULL OR p_etapa = '' OR UPPER(est.codigo) = UPPER(p_etapa))
      AND (p_origen IS NULL OR p_origen = '' OR UPPER(orig.codigo) = UPPER(p_origen))
      AND (p_asesor IS NULL OR asig.id_asesor = p_asesor)
      AND (NOT p_sin_asignar OR asig.id_asesor IS NULL)
      AND (
          p_categoria IS NULL OR p_categoria = '' OR UPPER(p_categoria) = 'TODOS'
          OR (UPPER(p_categoria) = 'LEAD' AND p.id_estado_prospecto IN (9, 10))
          OR (UPPER(p_categoria) = 'POTENCIAL' AND p.id_estado_prospecto IN (11, 12))
          OR (UPPER(p_categoria) = 'COMPRADOR' AND p.id_estado_prospecto = 13)
          OR (UPPER(p_categoria) = 'CERRADO' AND p.id_estado_prospecto = 14)
      );

    v_paginas := CEIL(v_total::numeric / p_tamano::numeric);

    -- Extraccion de items con numero de documento principal incluido
    SELECT COALESCE(
        jsonb_agg(
            jsonb_build_object(
                'id_prospecto', sub.id_prospecto,
                'id_persona', sub.id_persona,
                'codigo', sub.codigo,
                'nombre_completo', sub.nombre_completo,
                'telefono', sub.telefono,
                'email', sub.email,
                'numero_documento', sub.numero_documento,
                'dni', sub.numero_documento,
                'id_origen', sub.id_origen,
                'origen_codigo', sub.origen_codigo,
                'origen_nombre', sub.origen_nombre,
                'id_estado', sub.id_estado,
                'estado_codigo', sub.estado_codigo,
                'estado_nombre', sub.estado_nombre,
                'categoria', sub.categoria,
                'interes', sub.interes,
                'puntuacion', sub.puntuacion,
                'id_asesor', sub.id_asesor,
                'asesor_nombre', sub.asesor_nombre,
                'fecha_registro', sub.fecha_registro,
                'ultimo_contacto', sub.ultimo_contacto,
                'observaciones', sub.observaciones
            )
            ORDER BY sub.id_prospecto DESC
        ),
        '[]'::jsonb
    )
    INTO v_items
    FROM (
        SELECT DISTINCT ON (p.id_prospecto)
            p.id_prospecto,
            p.id_persona,
            p.codigo,
            TRIM(per.nombres || ' ' || per.apellido_paterno || ' ' || COALESCE(per.apellido_materno, '')) AS nombre_completo,
            COALESCE(
                (SELECT c.valor FROM public.core_personas_contactos c WHERE c.id_persona = per.id_persona AND c.id_tipo_contacto IN (6, 8) ORDER BY c.principal DESC, c.id_persona_contacto DESC LIMIT 1),
                'Sin telefono'
            ) AS telefono,
            COALESCE(
                (SELECT c.valor FROM public.core_personas_contactos c WHERE c.id_persona = per.id_persona AND c.id_tipo_contacto = 5 ORDER BY c.principal DESC, c.id_persona_contacto DESC LIMIT 1),
                'Sin correo'
            ) AS email,
            (SELECT d.numero_documento FROM public.core_personas_documentos d WHERE d.id_persona = per.id_persona AND d.activo = TRUE ORDER BY d.principal DESC LIMIT 1) AS numero_documento,
            p.id_origen_prospecto AS id_origen,
            orig.codigo AS origen_codigo,
            orig.nombre AS origen_nombre,
            p.id_estado_prospecto AS id_estado,
            est.codigo AS estado_codigo,
            est.nombre AS estado_nombre,
            CASE
                WHEN p.id_estado_prospecto = 13 THEN 'COMPRADOR'
                WHEN p.id_estado_prospecto = 14 THEN 'CERRADO'
                WHEN p.id_estado_prospecto IN (11, 12) THEN 'POTENCIAL'
                ELSE 'LEAD'
            END AS categoria,
            COALESCE(
                (SELECT int.comentario FROM public.crm_prospectos_intereses int WHERE int.id_prospecto = p.id_prospecto AND int.activo = TRUE ORDER BY int.id_prospecto_interes DESC LIMIT 1),
                'Interes general'
            ) AS interes,
            CASE
                WHEN p.id_estado_prospecto IN (11, 12, 13, 14) THEN 'Alto'
                WHEN p.id_estado_prospecto IN (9, 10) THEN 'Medio'
                ELSE 'Bajo'
            END AS puntuacion,
            asig.id_asesor,
            COALESCE(
                TRIM(per_ase.nombres || ' ' || per_ase.apellido_paterno),
                'Sin asignar'
            ) AS asesor_nombre,
            p.fecha_registro,
            COALESCE(
                (SELECT TO_CHAR(seg.fecha_seguimiento, 'DD/MM/YYYY HH24:MI') FROM public.crm_seguimientos seg WHERE seg.id_prospecto = p.id_prospecto ORDER BY seg.fecha_seguimiento DESC LIMIT 1),
                'Sin contacto'
            ) AS ultimo_contacto,
            p.observaciones
        FROM public.crm_prospectos p
        JOIN public.core_personas per ON p.id_persona = per.id_persona
        JOIN public.cfg_estados_prospecto est ON p.id_estado_prospecto = est.id_estado_prospecto
        JOIN public.cfg_origenes_prospecto orig ON p.id_origen_prospecto = orig.id_origen_prospecto
        LEFT JOIN public.com_asignaciones_prospecto asig ON p.id_prospecto = asig.id_prospecto_vigente
        LEFT JOIN public.com_asesores ase ON asig.id_asesor = ase.id_asesor
        LEFT JOIN public.core_personas per_ase ON ase.id_persona = per_ase.id_persona
        LEFT JOIN public.core_personas_documentos doc ON per.id_persona = doc.id_persona AND doc.activo = TRUE
        WHERE p.activo = TRUE
          AND (
              v_consulta_norm = ''
              OR p.codigo ILIKE '%' || v_consulta_norm || '%'
              OR TRIM(per.nombres || ' ' || per.apellido_paterno || ' ' || COALESCE(per.apellido_materno, '')) ILIKE '%' || v_consulta_norm || '%'
              OR doc.numero_documento ILIKE '%' || v_consulta_norm || '%'
          )
          AND (p_etapa IS NULL OR p_etapa = '' OR UPPER(est.codigo) = UPPER(p_etapa))
          AND (p_origen IS NULL OR p_origen = '' OR UPPER(orig.codigo) = UPPER(p_origen))
          AND (p_asesor IS NULL OR asig.id_asesor = p_asesor)
          AND (NOT p_sin_asignar OR asig.id_asesor IS NULL)
          AND (
              p_categoria IS NULL OR p_categoria = '' OR UPPER(p_categoria) = 'TODOS'
              OR (UPPER(p_categoria) = 'LEAD' AND p.id_estado_prospecto IN (9, 10))
              OR (UPPER(p_categoria) = 'POTENCIAL' AND p.id_estado_prospecto IN (11, 12))
              OR (UPPER(p_categoria) = 'COMPRADOR' AND p.id_estado_prospecto = 13)
              OR (UPPER(p_categoria) = 'CERRADO' AND p.id_estado_prospecto = 14)
          )
        ORDER BY p.id_prospecto DESC
        OFFSET v_offset
        LIMIT p_tamano
    ) sub;

    RETURN jsonb_build_object(
        'items', v_items,
        'total', v_total,
        'pagina', p_pagina,
        'tamano', p_tamano,
        'paginas', v_paginas
    );
END;
$$;
