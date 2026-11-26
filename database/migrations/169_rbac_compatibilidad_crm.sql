-- 169: compatibilidad de versiones anteriores con las mismas capacidades RBAC.
BEGIN;
CREATE OR REPLACE FUNCTION public.sp_crm_asesores_periodo_v6(p_actor bigint, p_desde timestamp with time zone, p_hasta_exclusivo timestamp with time zone)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'pg_temp'
AS $function$
DECLARE
    v_resultado JSONB;
    v_acceso_global BOOLEAN := FALSE;
BEGIN
    IF p_actor IS NULL
       OR p_actor <= 0
       OR NOT COALESCE(
           public.fn_usuario_tiene_permiso_seguridad(
               p_actor, 'crm.view'
           ), FALSE
       )
    THEN
        RAISE EXCEPTION
            'DENEGADO|Se requiere crm.view.';
    END IF;

    IF p_desde IS NULL
       OR p_hasta_exclusivo IS NULL
       OR p_hasta_exclusivo <= p_desde
       OR p_hasta_exclusivo > p_desde + INTERVAL '10 years'
    THEN
        RAISE EXCEPTION
            'DATOS_INVALIDOS|Rango de fechas invalido.';
    END IF;

    -- Identificar roles con acceso al equipo completo.
    SELECT EXISTS (
        SELECT 1
        FROM public.seg_usuarios_roles ur
        JOIN public.seg_roles r
            ON r.id_rol = ur.id_rol
        WHERE ur.id_usuario = p_actor
          AND ur.activo
          AND ur.fecha_revocacion IS NULL
          AND r.activo
          AND coalesce(public.fn_usuario_tiene_permiso_seguridad(ur.id_usuario,'crm.scope_all'::varchar),false)
    )
    INTO v_acceso_global;

    WITH asignaciones_periodo AS (
        SELECT
            ap.id_asesor,
            COUNT(*)::INTEGER AS asignaciones_periodo
        FROM public.com_asignaciones_prospecto ap
        WHERE ap.fecha_asignacion >= p_desde
          AND ap.fecha_asignacion < p_hasta_exclusivo
        GROUP BY ap.id_asesor
    ),

    equipo AS (
        SELECT
            a.id_asesor,
            a.codigo,
            a.nombre_completo,
            a.email,
            a.telefono,
            a.activo,
            a.leads_activos,
            COALESCE(
                ap.asignaciones_periodo, 0
            ) AS asignaciones_periodo

        FROM public.sp_listar_asesores() a

        LEFT JOIN asignaciones_periodo ap
            ON ap.id_asesor = a.id_asesor

        WHERE
            v_acceso_global

            -- Sin acceso global: mostrar solo al asesor
            -- vinculado a la identidad autenticada.
            OR EXISTS (
                SELECT 1
                FROM public.seg_usuarios u
                JOIN public.com_asesores ca
                    ON ca.id_persona = u.id_persona
                WHERE u.id_usuario = p_actor
                  AND ca.id_asesor = a.id_asesor
            )
    )

    SELECT jsonb_build_object(
        'total', COUNT(*),
        'items', COALESCE(
            jsonb_agg(
                jsonb_build_object(
                    'id_asesor', id_asesor,
                    'codigo', codigo,
                    'nombre_completo', nombre_completo,
                    'email', email,
                    'telefono', telefono,
                    'activo', activo,
                    'leads_activos', leads_activos,
                    'asignaciones_periodo',
                        asignaciones_periodo
                )
                ORDER BY codigo
            ),
            '[]'::jsonb
        )
    )
    INTO v_resultado
    FROM equipo;

    RETURN v_resultado;
END;
$function$;

CREATE OR REPLACE FUNCTION public.sp_crm_buscar_v6(p_actor bigint, p_busqueda character varying, p_etapa character varying, p_origen character varying, p_asesor bigint, p_sin_asignar boolean, p_categoria character varying, p_pagina integer, p_tamano integer, p_proyecto bigint, p_desde timestamp with time zone, p_hasta_exclusivo timestamp with time zone)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'pg_temp'
AS $function$
DECLARE
    v_resultado JSONB;
    v_es_asesor BOOLEAN := FALSE;
    v_es_global BOOLEAN := FALSE;
    v_asesor_propio BIGINT;
BEGIN
    IF p_actor IS NULL
       OR p_actor <= 0
       OR NOT COALESCE(
           public.fn_usuario_tiene_permiso_seguridad(
               p_actor, 'crm.view'
           ), FALSE
       )
    THEN
        RAISE EXCEPTION
            'DENEGADO|Se requiere crm.view.';
    END IF;

    IF p_pagina IS NULL
       OR p_pagina < 1
       OR p_pagina > 100000
       OR p_tamano IS NULL
       OR p_tamano < 1
       OR p_tamano > 100
       OR LENGTH(p_busqueda) > 120
       OR LENGTH(p_etapa) > 40
       OR LENGTH(p_origen) > 40
       OR p_categoria IS NULL
       OR p_categoria NOT IN (
           'TODOS',
           'LEAD',
           'POTENCIAL',
           'COMPRADOR',
           'CERRADO'
       )
       OR (p_asesor IS NOT NULL AND p_asesor <= 0)
       OR (p_proyecto IS NOT NULL AND p_proyecto <= 0)
       OR p_desde IS NULL
       OR p_hasta_exclusivo IS NULL
       OR p_hasta_exclusivo <= p_desde
       OR p_hasta_exclusivo > p_desde + INTERVAL '10 years'
    THEN
        RAISE EXCEPTION
            'DATOS_INVALIDOS|Filtros, fechas o paginacion invalidos.';
    END IF;

    -- Identificar roles con alcance global.
    SELECT EXISTS (
        SELECT 1
        FROM public.seg_usuarios_roles ur
        JOIN public.seg_roles r
            ON r.id_rol = ur.id_rol
        WHERE ur.id_usuario = p_actor
          AND ur.activo
          AND ur.fecha_revocacion IS NULL
          AND r.activo
          AND coalesce(public.fn_usuario_tiene_permiso_seguridad(ur.id_usuario,'crm.scope_all'::varchar),false)
    )
    INTO v_es_global;

    -- Conservar la identificacion del asesor.
    IF NOT v_es_global THEN

        SELECT EXISTS (
            SELECT 1
            FROM public.seg_usuarios_roles ur
            JOIN public.seg_roles r
                ON r.id_rol = ur.id_rol
            WHERE ur.id_usuario = p_actor
              AND ur.activo
              AND ur.fecha_revocacion IS NULL
              AND r.activo
              AND coalesce(public.fn_usuario_tiene_permiso_seguridad(ur.id_usuario,'crm.scope_assigned'::varchar),false)
        )
        INTO v_es_asesor;

        IF v_es_asesor THEN

            SELECT a.id_asesor
            INTO v_asesor_propio
            FROM public.seg_usuarios u
            JOIN public.com_asesores ca
                ON ca.id_persona = u.id_persona
            JOIN public.sp_listar_asesores() a
                ON a.id_asesor = ca.id_asesor
            WHERE u.id_usuario = p_actor
            LIMIT 1;

            IF v_asesor_propio IS NULL THEN
                RAISE EXCEPTION
                    'DENEGADO|El asesor autenticado no tiene identidad comercial operativa.';
            END IF;
        END IF;
    END IF;

    WITH base AS (
        SELECT
            x.*,

            (
                SELECT d.numero_documento
                FROM public.core_personas_documentos d
                WHERE d.id_persona = x.id_persona
                  AND d.activo
                ORDER BY
                    d.principal DESC,
                    d.id_persona_documento DESC
                LIMIT 1
            ) AS numero_documento,

            CASE
                WHEN EXISTS (
                    SELECT 1
                    FROM public.crm_clientes c
                    JOIN public.ven_ventas_clientes vc
                        ON vc.id_cliente = c.id_cliente
                    JOIN public.ven_ventas v
                        ON v.id_venta = vc.id_venta
                    JOIN public.cfg_estados_venta ev
                        ON ev.id_estado_venta =
                           v.id_estado_venta
                    JOIN public.ven_contratos ct
                        ON ct.id_venta = v.id_venta
                    JOIN public.cfg_estados_contrato ec
                        ON ec.id_estado_contrato =
                           ct.id_estado_contrato
                    WHERE c.id_persona = x.id_persona
                      AND c.activo
                      AND ev.codigo IN (
                          'CONFIRMADA',
                          'CONTRATADA',
                          'COMPLETADA'
                      )
                      AND ec.codigo IN (
                          'VIGENTE',
                          'FINALIZADO'
                      )
                ) THEN 'COMPRADOR'

                WHEN x.estado_codigo IN (
                    'INTERESADO',
                    'NEGOCIACION','CON_RESERVA'
                ) THEN 'POTENCIAL'

                WHEN x.estado_codigo IN (
                    'NUEVO',
                    'CONTACTADO',
                    'EN_SEGUIMIENTO'
                ) THEN 'LEAD'

                ELSE 'CERRADO'
            END AS categoria

        FROM public.sp_listar_prospectos() x
    ),

    filtrado AS (
        SELECT *
        FROM base b

        WHERE b.fecha_registro >= p_desde
          AND b.fecha_registro < p_hasta_exclusivo

          -- NUEVA VALIDACION OBLIGATORIA.
          -- El usuario debe estar autorizado para
          -- consultar cada prospecto individualmente.
          AND COALESCE(
              public.fn_crm_puede_consultar_prospecto(
                  p_actor,
                  b.id_prospecto
              ),
              FALSE
          )

          AND (
              NULLIF(BTRIM(p_busqueda), '') IS NULL
              OR b.nombre_completo ILIKE
                  '%' || BTRIM(p_busqueda) || '%'
              OR b.codigo ILIKE
                  '%' || BTRIM(p_busqueda) || '%'
              OR b.telefono ILIKE
                  '%' || BTRIM(p_busqueda) || '%'
              OR b.email ILIKE
                  '%' || BTRIM(p_busqueda) || '%'
              OR EXISTS (
                  SELECT 1
                  FROM public.core_personas_documentos d
                  WHERE d.id_persona = b.id_persona
                    AND d.activo
                    AND d.numero_documento ILIKE
                        '%' || BTRIM(p_busqueda) || '%'
              )
          )

          AND (
              NULLIF(BTRIM(p_etapa), '') IS NULL
              OR b.estado_codigo = UPPER(BTRIM(p_etapa))
          )

          AND (
              NULLIF(BTRIM(p_origen), '') IS NULL
              OR b.origen_codigo = UPPER(BTRIM(p_origen))
          )

          AND (
              p_asesor IS NULL
              OR b.id_asesor = p_asesor
          )

          AND (
              NOT v_es_asesor
              OR b.id_asesor = v_asesor_propio
          )

          AND (
              COALESCE(p_sin_asignar, FALSE) = FALSE
              OR b.id_asesor IS NULL
          )

          AND (
              p_categoria = 'TODOS'
              OR b.categoria = p_categoria
          )

          AND (
              p_proyecto IS NULL
              OR EXISTS (
                  SELECT 1
                  FROM public.crm_prospectos_intereses pi
                  WHERE pi.id_prospecto = b.id_prospecto
                    AND pi.id_proyecto = p_proyecto
                    AND pi.activo
              )
          )
    ),

    pagina AS (
        SELECT *
        FROM filtrado
        ORDER BY id_prospecto DESC
        LIMIT p_tamano
        OFFSET (
            (p_pagina::BIGINT - 1) * p_tamano
        )
    )

    SELECT jsonb_build_object(
        'items', (
            SELECT COALESCE(
                jsonb_agg(
                    to_jsonb(x)
                    ORDER BY x.id_prospecto DESC
                ),
                '[]'::jsonb
            )
            FROM pagina x
        ),

        'total', (
            SELECT COUNT(*)
            FROM filtrado
        ),

        'pagina', p_pagina,
        'tamano', p_tamano,

        'paginas', CEIL(
            (
                SELECT COUNT(*)::NUMERIC
                FROM filtrado
            ) / p_tamano
        )::INTEGER
    )
    INTO v_resultado;

    RETURN v_resultado;
END;
$function$;

CREATE OR REPLACE FUNCTION public.sp_crm_evolucion_mensual_v6(p_actor bigint, p_desde timestamp with time zone, p_hasta_exclusivo timestamp with time zone)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'pg_temp'
AS $function$
DECLARE
    v_resultado JSONB;
    v_acceso_global BOOLEAN := FALSE;
BEGIN
    -- Validar identidad y permiso.
    IF p_actor IS NULL
       OR p_actor <= 0
       OR NOT COALESCE(
           public.fn_usuario_tiene_permiso_seguridad(
               p_actor, 'crm.view'
           ),
           FALSE
       )
    THEN
        RAISE EXCEPTION
            'DENEGADO|Se requiere crm.view.';
    END IF;

    -- Conservar validaciones originales.
    IF p_desde IS NULL
       OR p_hasta_exclusivo IS NULL
       OR p_hasta_exclusivo <= p_desde
       OR p_hasta_exclusivo >
          p_desde + INTERVAL '3 years'
    THEN
        RAISE EXCEPTION
            'DATOS_INVALIDOS|Rango de fechas invalido para evolucion comercial.';
    END IF;

    -- Identificar usuarios con acceso global.
    SELECT EXISTS (
        SELECT 1
        FROM public.seg_usuarios_roles ur
        JOIN public.seg_roles r
            ON r.id_rol = ur.id_rol
        WHERE ur.id_usuario = p_actor
          AND ur.activo
          AND ur.fecha_revocacion IS NULL
          AND r.activo
          AND coalesce(public.fn_usuario_tiene_permiso_seguridad(ur.id_usuario,'crm.scope_all'::varchar),false)
    )
    INTO v_acceso_global;

    WITH prospectos AS (
        SELECT
            x.estado_codigo,
            p.fecha_registro,

            EXISTS (
                SELECT 1
                FROM public.crm_clientes cl
                JOIN public.ven_ventas_clientes vc
                    ON vc.id_cliente = cl.id_cliente
                JOIN public.ven_ventas v
                    ON v.id_venta = vc.id_venta
                JOIN public.cfg_estados_venta ev
                    ON ev.id_estado_venta = v.id_estado_venta
                JOIN public.ven_contratos ct
                    ON ct.id_venta = v.id_venta
                JOIN public.cfg_estados_contrato ec
                    ON ec.id_estado_contrato =
                       ct.id_estado_contrato
                WHERE cl.id_persona = x.id_persona
                  AND cl.activo
                  AND ev.codigo IN (
                      'CONFIRMADA',
                      'CONTRATADA',
                      'COMPLETADA'
                  )
                  AND ec.codigo IN (
                      'VIGENTE',
                      'FINALIZADO'
                  )
            ) AS comprado

        FROM public.sp_listar_prospectos() x

        JOIN public.crm_prospectos p
            ON p.id_prospecto = x.id_prospecto

        -- NUEVO: limitar a prospectos autorizados.
        WHERE COALESCE(
            public.fn_crm_puede_consultar_prospecto(
                p_actor,
                x.id_prospecto
            ),
            FALSE
        )
    ),

    meses AS (
        SELECT gs::DATE AS mes
        FROM generate_series(
            date_trunc(
                'month',
                p_desde AT TIME ZONE 'America/Lima'
            ),
            date_trunc(
                'month',
                (p_hasta_exclusivo - INTERVAL '1 microsecond')
                    AT TIME ZONE 'America/Lima'
            ),
            INTERVAL '1 month'
        ) gs
    ),

    registros AS (
        SELECT
            date_trunc(
                'month',
                fecha_registro AT TIME ZONE 'America/Lima'
            )::DATE AS mes,

            COUNT(*) FILTER (
                WHERE NOT comprado
                  AND estado_codigo IN (
                      'NUEVO',
                      'CONTACTADO',
                      'EN_SEGUIMIENTO'
                  )
            )::INTEGER AS leads,

            COUNT(*) FILTER (
                WHERE NOT comprado
                  AND estado_codigo IN (
                      'INTERESADO',
                      'NEGOCIACION','CON_RESERVA'
                  )
            )::INTEGER AS potenciales

        FROM prospectos

        WHERE fecha_registro >= p_desde
          AND fecha_registro < p_hasta_exclusivo

        GROUP BY 1
    ),

    primeras_compras AS (
        SELECT
            c.id_cliente,

            MIN(
                COALESCE(
                    ct.fecha_firma::TIMESTAMP
                        AT TIME ZONE 'America/Lima',
                    ct.fecha_creacion
                )
            ) AS fecha_primera_formalizacion

        FROM public.crm_clientes c

        JOIN public.core_personas per
            ON per.id_persona = c.id_persona

        JOIN public.ven_ventas_clientes vc
            ON vc.id_cliente = c.id_cliente

        JOIN public.ven_ventas v
            ON v.id_venta = vc.id_venta

        JOIN public.cfg_estados_venta ev
            ON ev.id_estado_venta = v.id_estado_venta

        JOIN public.ven_contratos ct
            ON ct.id_venta = v.id_venta

        JOIN public.cfg_estados_contrato ec
            ON ec.id_estado_contrato =
               ct.id_estado_contrato

        WHERE c.activo
          AND per.activo

          AND ev.codigo IN (
              'CONFIRMADA',
              'CONTRATADA',
              'COMPLETADA'
          )

          AND ec.codigo IN (
              'VIGENTE',
              'FINALIZADO'
          )

          -- NUEVO: proteger compradores.
          AND (
              v_acceso_global

              OR EXISTS (
                  SELECT 1
                  FROM public.crm_prospectos cp
                  WHERE cp.id_persona = c.id_persona

                    AND COALESCE(
                        public.fn_crm_puede_consultar_prospecto(
                            p_actor,
                            cp.id_prospecto
                        ),
                        FALSE
                    )
              )
          )

        GROUP BY c.id_cliente
    ),

    compras AS (
        SELECT
            date_trunc(
                'month',
                fecha_primera_formalizacion
                    AT TIME ZONE 'America/Lima'
            )::DATE AS mes,

            COUNT(*)::INTEGER AS compradores

        FROM primeras_compras

        WHERE fecha_primera_formalizacion >= p_desde
          AND fecha_primera_formalizacion < p_hasta_exclusivo

        GROUP BY 1
    )

    SELECT COALESCE(
        jsonb_agg(
            jsonb_build_object(
                'mes', to_char(m.mes, 'YYYY-MM'),
                'leads', COALESCE(r.leads, 0),
                'potenciales', COALESCE(r.potenciales, 0),
                'compradores', COALESCE(c.compradores, 0)
            )
            ORDER BY m.mes
        ),
        '[]'::jsonb
    )
    INTO v_resultado

    FROM meses m

    LEFT JOIN registros r
        ON r.mes = m.mes

    LEFT JOIN compras c
        ON c.mes = m.mes;

    RETURN jsonb_build_object(
        'items', v_resultado
    );
END;
$function$;

CREATE OR REPLACE FUNCTION public.sp_crm_indicadores_periodo_v6(p_actor bigint, p_desde timestamp with time zone, p_hasta_exclusivo timestamp with time zone)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'pg_temp'
AS $function$
DECLARE
    v_resultado JSONB;
    v_acceso_global BOOLEAN := FALSE;
BEGIN
    -- Validar permiso de consulta.
    IF p_actor IS NULL
       OR p_actor <= 0
       OR NOT COALESCE(
           public.fn_usuario_tiene_permiso_seguridad(
               p_actor, 'crm.view'
           ), FALSE
       )
    THEN
        RAISE EXCEPTION
            'DENEGADO|Se requiere crm.view.';
    END IF;

    -- Validar periodo.
    IF p_desde IS NULL
       OR p_hasta_exclusivo IS NULL
       OR p_hasta_exclusivo <= p_desde
       OR p_hasta_exclusivo > p_desde + INTERVAL '10 years'
    THEN
        RAISE EXCEPTION
            'DATOS_INVALIDOS|Rango de fechas invalido.';
    END IF;

    -- Identificar usuarios con visibilidad global.
    SELECT EXISTS (
        SELECT 1
        FROM public.seg_usuarios_roles ur
        JOIN public.seg_roles r
            ON r.id_rol = ur.id_rol
        WHERE ur.id_usuario = p_actor
          AND ur.activo
          AND ur.fecha_revocacion IS NULL
          AND r.activo
          AND coalesce(public.fn_usuario_tiene_permiso_seguridad(ur.id_usuario,'crm.scope_all'::varchar),false)
    )
    INTO v_acceso_global;

    WITH prospectos AS (
        SELECT
            x.id_prospecto,
            x.estado_codigo,
            x.id_asesor,
            p.fecha_registro,

            EXISTS (
                SELECT 1
                FROM public.crm_clientes c
                JOIN public.ven_ventas_clientes vc
                    ON vc.id_cliente = c.id_cliente
                JOIN public.ven_ventas v
                    ON v.id_venta = vc.id_venta
                JOIN public.cfg_estados_venta ev
                    ON ev.id_estado_venta = v.id_estado_venta
                JOIN public.ven_contratos ct
                    ON ct.id_venta = v.id_venta
                JOIN public.cfg_estados_contrato ec
                    ON ec.id_estado_contrato =
                       ct.id_estado_contrato
                WHERE c.id_persona = x.id_persona
                  AND c.activo
                  AND ev.codigo IN (
                      'CONFIRMADA',
                      'CONTRATADA',
                      'COMPLETADA'
                  )
                  AND ec.codigo IN (
                      'VIGENTE',
                      'FINALIZADO'
                  )
            ) AS comprado

        FROM public.sp_listar_prospectos() x

        JOIN public.crm_prospectos p
            ON p.id_prospecto = x.id_prospecto

        -- NUEVO: incluir solo prospectos autorizados.
        WHERE COALESCE(
            public.fn_crm_puede_consultar_prospecto(
                p_actor,
                x.id_prospecto
            ),
            FALSE
        )
    ),

    registrados AS (
        SELECT *
        FROM prospectos
        WHERE fecha_registro >= p_desde
          AND fecha_registro < p_hasta_exclusivo
    ),

    compradores AS (
        SELECT
            c.id_cliente,
            MIN(
                COALESCE(
                    ct.fecha_firma::TIMESTAMP
                        AT TIME ZONE 'America/Lima',
                    ct.fecha_creacion
                )
            ) AS fecha_primera_formalizacion

        FROM public.crm_clientes c

        JOIN public.core_personas per
            ON per.id_persona = c.id_persona

        JOIN public.ven_ventas_clientes vc
            ON vc.id_cliente = c.id_cliente

        JOIN public.ven_ventas v
            ON v.id_venta = vc.id_venta

        JOIN public.cfg_estados_venta ev
            ON ev.id_estado_venta = v.id_estado_venta

        JOIN public.ven_contratos ct
            ON ct.id_venta = v.id_venta

        JOIN public.cfg_estados_contrato ec
            ON ec.id_estado_contrato =
               ct.id_estado_contrato

        WHERE c.activo
          AND per.activo
          AND ev.codigo IN (
              'CONFIRMADA',
              'CONTRATADA',
              'COMPLETADA'
          )
          AND ec.codigo IN (
              'VIGENTE',
              'FINALIZADO'
          )

          -- NUEVO: Gerencia y administracion pueden
          -- consultar todos los compradores.
          -- Los asesores solo los vinculados a
          -- prospectos de su cartera actual.
          AND (
              v_acceso_global

              OR EXISTS (
                  SELECT 1
                  FROM public.crm_prospectos cp
                  WHERE cp.id_persona = c.id_persona
                    AND COALESCE(
                        public.fn_crm_puede_consultar_prospecto(
                            p_actor,
                            cp.id_prospecto
                        ),
                        FALSE
                    )
              )
          )

        GROUP BY c.id_cliente
    )

    SELECT jsonb_build_object(
        'total', COUNT(*),

        'leads', COUNT(*) FILTER (
            WHERE NOT comprado
              AND estado_codigo IN (
                  'NUEVO',
                  'CONTACTADO',
                  'EN_SEGUIMIENTO'
              )
        ),

        'potenciales', COUNT(*) FILTER (
            WHERE NOT comprado
              AND estado_codigo IN (
                  'INTERESADO',
                  'NEGOCIACION','CON_RESERVA'
              )
        ),

        'cerrados', COUNT(*) FILTER (
            WHERE NOT comprado
              AND estado_codigo NOT IN (
                  'NUEVO',
                  'CONTACTADO',
                  'EN_SEGUIMIENTO',
                  'INTERESADO',
                  'NEGOCIACION','CON_RESERVA'
              )
        ),

        'sinAsesor', COUNT(*) FILTER (
            WHERE id_asesor IS NULL
        ),

        'compradores', (
            SELECT COUNT(*)
            FROM compradores
            WHERE fecha_primera_formalizacion >= p_desde
              AND fecha_primera_formalizacion < p_hasta_exclusivo
        )
    )
    INTO v_resultado
    FROM registrados;

    RETURN v_resultado;
END;
$function$;

CREATE OR REPLACE FUNCTION public.sp_crm_indicadores_retroceso_v1(p_actor bigint, p_desde timestamp with time zone, p_hasta_exclusivo timestamp with time zone)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'pg_temp'
AS $function$
DECLARE
    v_resultado jsonb;
BEGIN
    IF p_actor IS NULL OR p_actor<=0
      OR NOT COALESCE(public.fn_usuario_tiene_permiso_seguridad(p_actor,'crm.view'::varchar),false)
      OR NOT EXISTS (
        SELECT 1 FROM public.seg_usuarios_roles ur
        JOIN public.seg_roles r ON r.id_rol=ur.id_rol
        WHERE ur.id_usuario=p_actor AND ur.activo AND ur.fecha_revocacion IS NULL
          AND r.activo AND coalesce(public.fn_usuario_tiene_permiso_seguridad(ur.id_usuario,'crm.approve_stage_change'::varchar),false)
      ) THEN
      RAISE EXCEPTION 'DENEGADO|Solo Gerencia o Supervisor comercial pueden consultar indicadores de retrocesos.';
    END IF;

    IF p_desde IS NULL OR p_hasta_exclusivo IS NULL
      OR p_hasta_exclusivo<=p_desde
      OR p_hasta_exclusivo>p_desde+interval '10 years' THEN
      RAISE EXCEPTION 'DATOS_INVALIDOS|Rango de fechas invalido.';
    END IF;

    WITH base AS (
      SELECT s.id_solicitud,s.estado,s.fecha_solicitud,s.fecha_resolucion,
             s.id_asesor_solicitante AS id_asesor, 
             concat_ws(' ',per.nombres,per.apellido_paterno,per.apellido_materno) AS asesor,
             m.codigo AS motivo_codigo,m.nombre AS motivo_nombre
      FROM public.crm_solicitudes_retroceso_etapa s
      JOIN public.cfg_motivos_retroceso_crm m ON m.id_motivo=s.id_motivo
      JOIN public.com_asesores a ON a.id_asesor=s.id_asesor_solicitante
      JOIN public.core_personas per ON per.id_persona=a.id_persona
      WHERE s.fecha_solicitud >= p_desde
        AND s.fecha_solicitud < p_hasta_exclusivo
    ),
    motivos_aprobados AS (
       SELECT motivo_codigo AS codigo,motivo_nombre AS nombre,count(*) AS cantidad
       FROM base WHERE estado='APROBADA'
       GROUP BY motivo_codigo,motivo_nombre
    ),
    motivos_solicitados AS (
       SELECT motivo_codigo AS codigo,motivo_nombre AS nombre,count(*) AS cantidad
       FROM base GROUP BY motivo_codigo,motivo_nombre
    ),
    asesores_aprobados AS (
       SELECT id_asesor,asesor AS nombre,count(*) AS cantidad
       FROM base WHERE estado='APROBADA'
       GROUP BY id_asesor,asesor
    ),
    meses AS (
       SELECT to_char(fecha_solicitud AT TIME ZONE 'America/Lima','YYYY-MM') AS mes,
              count(*) AS solicitudes,
              count(*) FILTER (WHERE estado='PENDIENTE') AS pendientes,
              count(*) FILTER (WHERE estado='APROBADA') AS aprobadas,
              count(*) FILTER (WHERE estado='RECHAZADA') AS rechazadas
       FROM base
       GROUP BY to_char(fecha_solicitud AT TIME ZONE 'America/Lima','YYYY-MM')
    ),
    resumen AS (
       SELECT count(*) AS total,
              count(*) FILTER (WHERE estado='PENDIENTE') AS pendientes,
              count(*) FILTER (WHERE estado='APROBADA') AS aprobadas,
              count(*) FILTER (WHERE estado='RECHAZADA') AS rechazadas,
              COALESCE(
                  round(
                    100.0 * count(*) FILTER (WHERE estado='APROBADA')
                    / NULLIF(count(*) FILTER (WHERE estado IN ('APROBADA','RECHAZADA')),0),
                    1
                  ),0
              ) AS tasa_aprobacion
       FROM base
    )
    SELECT jsonb_build_object(
       'totalSolicitudes',r.total,
       'pendientes',r.pendientes,
       'aprobadas',r.aprobadas,
       'rechazadas',r.rechazadas,
       'totalRetornos',r.aprobadas,
       'tasaAprobacion',r.tasa_aprobacion,
       'motivoMasComun',(
          SELECT jsonb_build_object('codigo',m.codigo,'nombre',m.nombre,'cantidad',m.cantidad)
          FROM motivos_aprobados m ORDER BY m.cantidad DESC,m.codigo LIMIT 1
       ),
       'asesorMasRetornos',(
          SELECT jsonb_build_object('idAsesor',a.id_asesor,'nombre',a.nombre,'cantidad',a.cantidad)
          FROM asesores_aprobados a ORDER BY a.cantidad DESC,a.id_asesor LIMIT 1
       ),
       'motivos',COALESCE((
          SELECT jsonb_agg(jsonb_build_object('codigo',x.codigo,'nombre',x.nombre,'cantidad',x.cantidad)
                           ORDER BY x.cantidad DESC,x.codigo)
          FROM motivos_aprobados x
       ),'[]'::jsonb),
       'motivosSolicitudes',COALESCE((
          SELECT jsonb_agg(jsonb_build_object('codigo',x.codigo,'nombre',x.nombre,'cantidad',x.cantidad)
                           ORDER BY x.cantidad DESC,x.codigo)
          FROM motivos_solicitados x
       ),'[]'::jsonb),
       'rankingAsesores',COALESCE((
          SELECT jsonb_agg(jsonb_build_object('idAsesor',x.id_asesor,'nombre',x.nombre,'retornos',x.cantidad)
                           ORDER BY x.cantidad DESC,x.id_asesor)
          FROM (SELECT * FROM asesores_aprobados ORDER BY cantidad DESC,id_asesor LIMIT 10) x
       ),'[]'::jsonb),
       'evolucionMensual',COALESCE((
          SELECT jsonb_agg(jsonb_build_object(
            'mes',x.mes,'solicitudes',x.solicitudes,
            'pendientes',x.pendientes,'aprobadas',x.aprobadas,'rechazadas',x.rechazadas
          ) ORDER BY x.mes)
          FROM meses x
       ),'[]'::jsonb)
    )
    INTO v_resultado FROM resumen r;

    RETURN v_resultado;
END;
$function$;

CREATE OR REPLACE FUNCTION public.sp_crm_listar_solicitudes_retroceso_v1(p_actor bigint, p_desde timestamp with time zone, p_hasta_exclusivo timestamp with time zone, p_estado character varying DEFAULT NULL::character varying, p_busqueda character varying DEFAULT NULL::character varying, p_pagina integer DEFAULT 1, p_tamano integer DEFAULT 20)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'pg_temp'
AS $function$
DECLARE
    v_resultado jsonb;
BEGIN
    IF p_actor IS NULL OR p_actor <= 0
       OR NOT COALESCE(public.fn_usuario_tiene_permiso_seguridad(p_actor,'crm.view'::varchar),false)
       OR NOT EXISTS (
           SELECT 1
           FROM public.seg_usuarios_roles ur
           JOIN public.seg_roles r ON r.id_rol=ur.id_rol
           WHERE ur.id_usuario=p_actor AND ur.activo
             AND ur.fecha_revocacion IS NULL AND r.activo
             AND coalesce(public.fn_usuario_tiene_permiso_seguridad(ur.id_usuario,'crm.approve_stage_change'::varchar),false)
       ) THEN
        RAISE EXCEPTION 'DENEGADO|Solo Gerencia o Supervisor comercial pueden consultar la bandeja de retrocesos.';
    END IF;

    IF p_desde IS NULL OR p_hasta_exclusivo IS NULL
       OR p_hasta_exclusivo <= p_desde
       OR p_hasta_exclusivo > p_desde + interval '10 years'
       OR p_pagina IS NULL OR p_pagina < 1 OR p_pagina > 100000
       OR p_tamano IS NULL OR p_tamano < 1 OR p_tamano > 100
       OR length(p_busqueda)>120 OR length(p_estado)>12
       OR (p_estado IS NOT NULL AND upper(btrim(p_estado)) NOT IN ('TODAS','PENDIENTE','APROBADA','RECHAZADA'))
    THEN
        RAISE EXCEPTION 'DATOS_INVALIDOS|Filtros, fechas o paginacion invalidos.';
    END IF;

    WITH filtrado AS (
        SELECT
            s.id_solicitud,
            s.id_prospecto,
            cp.codigo AS codigo_prospecto,
            concat_ws(' ',pper.nombres,pper.apellido_paterno,pper.apellido_materno) AS nombre_prospecto,
            s.id_usuario_solicitante,
            concat_ws(' ',psol.nombres,psol.apellido_paterno,psol.apellido_materno) AS nombre_solicitante,
            s.id_asesor_solicitante AS id_asesor,
            concat_ws(' ',pase.nombres,pase.apellido_paterno,pase.apellido_materno) AS nombre_asesor,
            orig.codigo AS etapa_origen,
            orig.nombre AS nombre_etapa_origen,
            dest.codigo AS etapa_destino,
            dest.nombre AS nombre_etapa_destino,
            actual.codigo AS etapa_actual,
            s.id_motivo,
            m.codigo AS motivo_codigo,
            m.nombre AS motivo_nombre,
            s.motivo_detallado,
            (s.evidencia_storage_path IS NOT NULL) AS tiene_evidencia,
            s.estado,
            s.id_usuario_revisor,
            concat_ws(' ',prev.nombres,prev.apellido_paterno,prev.apellido_materno) AS nombre_revisor,
            s.observacion_revision,
            s.fecha_solicitud,
            s.fecha_resolucion
        FROM public.crm_solicitudes_retroceso_etapa s
        JOIN public.crm_prospectos cp ON cp.id_prospecto=s.id_prospecto
        JOIN public.core_personas pper ON pper.id_persona=cp.id_persona
        JOIN public.seg_usuarios usol ON usol.id_usuario=s.id_usuario_solicitante
        JOIN public.core_personas psol ON psol.id_persona=usol.id_persona
        JOIN public.com_asesores a ON a.id_asesor=s.id_asesor_solicitante
        JOIN public.core_personas pase ON pase.id_persona=a.id_persona
        JOIN public.cfg_estados_prospecto orig ON orig.id_estado_prospecto=s.id_estado_origen
        JOIN public.cfg_estados_prospecto dest ON dest.id_estado_prospecto=s.id_estado_destino
        JOIN public.cfg_estados_prospecto actual ON actual.id_estado_prospecto=cp.id_estado_prospecto
        JOIN public.cfg_motivos_retroceso_crm m ON m.id_motivo=s.id_motivo
        LEFT JOIN public.seg_usuarios urev ON urev.id_usuario=s.id_usuario_revisor
        LEFT JOIN public.core_personas prev ON prev.id_persona=urev.id_persona
        WHERE s.fecha_solicitud >= p_desde
          AND s.fecha_solicitud < p_hasta_exclusivo
          AND (
            p_estado IS NULL OR upper(btrim(p_estado))='TODAS'
            OR s.estado=upper(btrim(p_estado))
          )
          AND (
             NULLIF(btrim(p_busqueda),'') IS NULL
             OR concat_ws(' ',pper.nombres,pper.apellido_paterno,pper.apellido_materno) ILIKE '%'||btrim(p_busqueda)||'%'
             OR concat_ws(' ',pase.nombres,pase.apellido_paterno,pase.apellido_materno) ILIKE '%'||btrim(p_busqueda)||'%'
             OR cp.codigo ILIKE '%'||btrim(p_busqueda)||'%'
             OR m.nombre ILIKE '%'||btrim(p_busqueda)||'%'
             OR s.motivo_detallado ILIKE '%'||btrim(p_busqueda)||'%'
          )
    ),
    pagina AS (
        SELECT * FROM filtrado
        ORDER BY CASE WHEN estado='PENDIENTE' THEN 0 ELSE 1 END,
                 fecha_solicitud DESC,id_solicitud DESC
        LIMIT p_tamano OFFSET ((p_pagina::bigint-1)*p_tamano)
    )
    SELECT jsonb_build_object(
        'items',COALESCE((
           SELECT jsonb_agg(to_jsonb(pg)
             ORDER BY CASE WHEN pg.estado='PENDIENTE' THEN 0 ELSE 1 END,
                      pg.fecha_solicitud DESC,pg.id_solicitud DESC)
           FROM pagina pg
        ),'[]'::jsonb),
        'total',(SELECT count(*) FROM filtrado),
        'pagina',p_pagina,
        'tamano',p_tamano,
        'paginas',ceil((SELECT count(*)::numeric FROM filtrado)/p_tamano)::integer
    )
    INTO v_resultado;

    RETURN v_resultado;
END;
$function$;

CREATE OR REPLACE FUNCTION public.sp_crm_registrar_venta_pendiente_v11(p_actor bigint, p_prospecto bigint, p_lote bigint, p_modalidad character varying, p_monto_total numeric, p_monto_inicial numeric, p_numero_cuotas integer, p_tasa_mensual_pct numeric, p_observaciones text, p_datos jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'pg_temp'
AS $function$
DECLARE
 v_persona bigint; v_origen integer; v_doc_tipo integer; v_asignado bigint; v_nuevo_asesor bigint;
 v_nombre text; v_paterno text; v_materno text; v_email text; v_telefono text;
 v_doc text; v_tipo text; v_direccion text; v_motivo text; v_mensaje text;
 v_proyecto bigint; v_contacto_id bigint; v_doc_id bigint; v_dir_id bigint;
 v_valor text; v_verificado boolean; v_actual_tipo integer;
 v_resultado jsonb; v_tipo_contacto integer;
 v_referencia text; v_pais text; v_departamento text;
 v_provincia text; v_distrito text;
 v_id_pais bigint; v_id_departamento bigint; v_id_provincia bigint; v_id_distrito bigint;
BEGIN
 IF NOT coalesce(public.fn_usuario_tiene_permiso_seguridad(p_actor,'sales.create'::varchar),false)
    OR NOT coalesce(public.fn_crm_puede_consultar_prospecto(p_actor,p_prospecto),false)
 THEN RAISE EXCEPTION 'DENEGADO|No puede registrar esta venta.'; END IF;
 IF p_datos IS NULL OR jsonb_typeof(p_datos)<>'object'
    OR (p_datos->>'idProspecto') IS DISTINCT FROM p_prospecto::text
 THEN RAISE EXCEPTION 'DATOS_COMPRADOR_REQUERIDOS|Revise los datos del cliente antes de registrar.'; END IF;
 PERFORM 1 FROM public.inm_lotes WHERE id_lote=p_lote FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'LOTE_NO_DISPONIBLE|Lote inexistente.'; END IF;
 SELECT id_persona INTO STRICT v_persona FROM public.crm_prospectos
 WHERE id_prospecto=p_prospecto AND activo FOR UPDATE;
 PERFORM 1 FROM public.core_personas
 WHERE id_persona=v_persona AND activo FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'PERSONA_INVALIDA|La persona no esta activa.'; END IF;

 v_nombre:=btrim(coalesce(p_datos->>'nombres',''));
 v_paterno:=btrim(coalesce(p_datos->>'apellidoPaterno',''));
 v_materno:=btrim(coalesce(p_datos->>'apellidoMaterno',''));
 v_email:=lower(btrim(coalesce(p_datos->>'correo','')));
 v_telefono:=btrim(coalesce(p_datos->>'telefono',''));
 v_tipo:=upper(btrim(coalesce(p_datos->>'tipoDocumento','')));
 v_doc:=upper(btrim(coalesce(p_datos->>'numeroDocumento','')));
 v_direccion:=btrim(coalesce(p_datos->>'direccion',''));
 v_referencia:=btrim(coalesce(p_datos->>'referencia',''));
 v_motivo:=btrim(coalesce(p_datos->>'motivoContacto',''));
 v_mensaje:=btrim(coalesce(p_datos->>'mensaje',''));
 IF v_nombre !~ '^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ]+([ -][A-Za-zÁÉÍÓÚÜÑáéíóúüñ]+)*$'
    OR length(v_nombre)<2 OR length(v_nombre)>120
    OR v_paterno !~ '^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ]+([ -][A-Za-zÁÉÍÓÚÜÑáéíóúüñ]+)*$'
    OR length(v_paterno)<2 OR length(v_paterno)>80
    OR (v_materno<>'' AND
       (v_materno !~ '^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ]+([ -][A-Za-zÁÉÍÓÚÜÑáéíóúüñ]+)*$'
       OR length(v_materno)>80))
    OR length(concat_ws(' ',v_nombre,v_paterno,nullif(v_materno,'')))>150
    OR v_email !~ '^[a-z0-9._%+\-]+@[a-z0-9.\-]+\.[a-z]{2,}$'
    OR length(v_email)>180 OR v_telefono !~ '^([0-9]{7,15}|\+[1-9][0-9]{6,14})$'
    OR length(v_direccion)=0 OR length(v_direccion)>255
    OR length(v_referencia)>255 OR length(v_motivo)>150
    OR length(v_mensaje)>4000
 THEN RAISE EXCEPTION 'DATOS_COMPRADOR_INVALIDOS|Revise los datos personales, contacto y dirección del comprador.'; END IF;
 IF NOT (CASE v_tipo
   WHEN 'DNI' THEN v_doc ~ '^[0-9]{8}$'
   WHEN 'RUC' THEN v_doc ~ '^[0-9]{11}$'
   WHEN 'CE' THEN v_doc ~ '^[0-9]{9,12}$'
   WHEN 'PASAPORTE' THEN v_doc ~ '^[A-Z0-9]{6,20}$'
   ELSE false END)
 THEN RAISE EXCEPTION 'DOCUMENTO_INVALIDO|El documento no cumple el formato indicado.'; END IF;
 SELECT id_tipo_documento INTO v_doc_tipo FROM public.cfg_tipos_documento
 WHERE codigo=v_tipo AND activo;
 SELECT id_origen_prospecto INTO v_origen FROM public.cfg_origenes_prospecto
 WHERE codigo=p_datos->>'origenCodigo' AND activo;
 IF v_doc_tipo IS NULL OR v_origen IS NULL
 THEN RAISE EXCEPTION 'CATALOGO_INVALIDO|Documento u origen no valido.'; END IF;
 IF coalesce(p_datos->>'idProyectoInteres','') !~ '^[0-9]+$'
 THEN RAISE EXCEPTION 'PROYECTO_INVALIDO|Seleccione un proyecto.'; END IF;
 v_proyecto:=(p_datos->>'idProyectoInteres')::bigint;
 IF NOT EXISTS(SELECT 1 FROM public.inm_proyectos WHERE id_proyecto=v_proyecto AND activo)
 THEN RAISE EXCEPTION 'PROYECTO_INVALIDO|Proyecto inactivo o inexistente.'; END IF;

 -- Un cambio en documentos/contactos verificados requiere su flujo formal de evidencias.
 SELECT d.id_persona_documento,d.id_tipo_documento,d.numero_documento,d.verificado
 INTO v_doc_id,v_actual_tipo,v_valor,v_verificado
 FROM public.core_personas_documentos d
 WHERE d.id_persona=v_persona AND d.activo
 ORDER BY d.principal DESC,d.id_persona_documento DESC LIMIT 1 FOR UPDATE;
 IF v_doc_id IS NOT NULL AND
     (v_actual_tipo<>v_doc_tipo OR upper(btrim(v_valor))<>v_doc) THEN
   IF v_verificado THEN
     RAISE EXCEPTION 'DOCUMENTO_VERIFICADO|El cambio requiere revision documental con evidencias.';
   END IF;
   UPDATE public.core_personas_documentos SET
     id_tipo_documento=v_doc_tipo,numero_documento=v_doc,verificado=false,
     fecha_actualizacion=now()
   WHERE id_persona_documento=v_doc_id;
 ELSIF v_doc_id IS NULL THEN
   INSERT INTO public.core_personas_documentos(
     id_persona,id_tipo_documento,numero_documento,principal,verificado
   ) VALUES(v_persona,v_doc_tipo,v_doc,true,false);
 END IF;

 SELECT id_tipo_contacto INTO STRICT v_tipo_contacto FROM public.cfg_tipos_contacto
 WHERE codigo='EMAIL' AND activo;
 SELECT id_persona_contacto,valor,verificado INTO v_contacto_id,v_valor,v_verificado
 FROM public.core_personas_contactos
 WHERE id_persona=v_persona AND id_tipo_contacto=v_tipo_contacto AND activo
 ORDER BY principal DESC,id_persona_contacto DESC LIMIT 1 FOR UPDATE;
 IF v_contacto_id IS NOT NULL AND lower(btrim(v_valor))<>v_email THEN
   IF v_verificado THEN
     RAISE EXCEPTION 'CORREO_VERIFICADO|El cambio de correo requiere confirmacion de identidad.';
   END IF;
   UPDATE public.core_personas_contactos SET valor=v_email,verificado=false,
      fecha_actualizacion=now() WHERE id_persona_contacto=v_contacto_id;
 ELSIF v_contacto_id IS NULL THEN
   INSERT INTO public.core_personas_contactos(
     id_persona,id_tipo_contacto,valor,principal,verificado,permite_notificaciones)
   VALUES(v_persona,v_tipo_contacto,v_email,true,false,false);
 END IF;

 SELECT id_tipo_contacto INTO STRICT v_tipo_contacto FROM public.cfg_tipos_contacto
 WHERE codigo='CELULAR' AND activo;
 v_contacto_id:=NULL;v_valor:=NULL;v_verificado:=NULL;
 SELECT id_persona_contacto,valor,verificado INTO v_contacto_id,v_valor,v_verificado
 FROM public.core_personas_contactos
 WHERE id_persona=v_persona AND id_tipo_contacto=v_tipo_contacto AND activo
 ORDER BY principal DESC,id_persona_contacto DESC LIMIT 1 FOR UPDATE;
 IF v_contacto_id IS NOT NULL AND regexp_replace(v_valor,'[ ()-]','','g')<>v_telefono THEN
   IF v_verificado THEN
     RAISE EXCEPTION 'TELEFONO_VERIFICADO|El cambio de telefono requiere verificacion.';
   END IF;
   UPDATE public.core_personas_contactos SET valor=v_telefono,verificado=false,
      fecha_actualizacion=now() WHERE id_persona_contacto=v_contacto_id;
 ELSIF v_contacto_id IS NULL THEN
   INSERT INTO public.core_personas_contactos(
     id_persona,id_tipo_contacto,valor,principal,verificado,permite_notificaciones)
   VALUES(v_persona,v_tipo_contacto,v_telefono,true,false,false);
 END IF;

 -- Resolver jerarquía real desde el catálogo de ubicaciones:
 IF coalesce(p_datos->>'idPais','') !~ '^[0-9]+$'
    OR coalesce(p_datos->>'idDepartamento','') !~ '^[0-9]+$'
    OR coalesce(p_datos->>'idProvincia','') !~ '^[0-9]+$'
    OR coalesce(p_datos->>'idDistrito','') !~ '^[0-9]+$'
 THEN
   RAISE EXCEPTION 'UBICACION_INVALIDA|Seleccione país, departamento, provincia y distrito.';
 END IF;
 v_id_pais:=(p_datos->>'idPais')::bigint;
 v_id_departamento:=(p_datos->>'idDepartamento')::bigint;
 v_id_provincia:=(p_datos->>'idProvincia')::bigint;
 v_id_distrito:=(p_datos->>'idDistrito')::bigint;

 SELECT pais.nombre,dep.nombre,prov.nombre,dist.nombre
 INTO v_pais,v_departamento,v_provincia,v_distrito
 FROM public.cfg_ubicaciones_geograficas pais
 JOIN public.cfg_ubicaciones_geograficas dep
   ON dep.id_ubicacion_padre=pais.id_ubicacion
 JOIN public.cfg_ubicaciones_geograficas prov
   ON prov.id_ubicacion_padre=dep.id_ubicacion
 JOIN public.cfg_ubicaciones_geograficas dist
   ON dist.id_ubicacion_padre=prov.id_ubicacion
 WHERE pais.id_ubicacion=v_id_pais AND pais.tipo='PAIS'
   AND pais.pais_iso2='PE'
   AND dep.id_ubicacion=v_id_departamento AND dep.tipo='DEPARTAMENTO'
   AND prov.id_ubicacion=v_id_provincia AND prov.tipo='PROVINCIA'
   AND dist.id_ubicacion=v_id_distrito AND dist.tipo='DISTRITO'
   AND pais.activo AND dep.activo AND prov.activo AND dist.activo
   AND pais.estado_verificacion='VALIDADO'
   AND dep.estado_verificacion='VALIDADO'
   AND prov.estado_verificacion='VALIDADO'
   AND dist.estado_verificacion='VALIDADO';
 IF NOT FOUND THEN
   RAISE EXCEPTION 'UBICACION_INVALIDA|La ubicación no corresponde a la jerarquía seleccionada.';
 END IF;

 UPDATE public.core_personas SET nombres=v_nombre,apellido_paterno=v_paterno,
   apellido_materno=nullif(v_materno,''),fecha_actualizacion=now()
 WHERE id_persona=v_persona;

 SELECT id_persona_direccion INTO v_dir_id
 FROM public.core_personas_direcciones WHERE id_persona=v_persona AND activo
 ORDER BY principal DESC,id_persona_direccion DESC LIMIT 1 FOR UPDATE;
 IF v_dir_id IS NOT NULL THEN
   UPDATE public.core_personas_direcciones
   SET direccion=v_direccion,referencia=nullif(v_referencia,''),
       pais=v_pais,departamento=v_departamento,
       provincia=v_provincia,distrito=v_distrito,
       fecha_actualizacion=now()
   WHERE id_persona_direccion=v_dir_id;
 ELSE
   INSERT INTO public.core_personas_direcciones(
     id_persona,tipo,direccion,referencia,pais,departamento,
     provincia,distrito,principal
   ) VALUES(
     v_persona,'DOMICILIO',v_direccion,nullif(v_referencia,''),
     v_pais,v_departamento,v_provincia,v_distrito,true);
 END IF;
 UPDATE public.crm_prospectos SET id_origen_prospecto=v_origen,
   fecha_actualizacion=now() WHERE id_prospecto=p_prospecto;
 UPDATE public.crm_prospectos_intereses
   SET fecha_interes=now(),fecha_actualizacion=now()
 WHERE id_prospecto=p_prospecto AND id_proyecto=v_proyecto AND activo;
 IF NOT FOUND THEN
   INSERT INTO public.crm_prospectos_intereses(id_prospecto,id_proyecto,activo)
   VALUES(p_prospecto,v_proyecto,true);
 END IF;

 SELECT id_asesor INTO v_asignado FROM public.com_asignaciones_prospecto
 WHERE id_prospecto_vigente=p_prospecto AND fecha_fin IS NULL LIMIT 1;
 IF p_datos ? 'idAsesor' AND p_datos->>'idAsesor' IS NOT NULL THEN
   IF (p_datos->>'idAsesor') !~ '^[0-9]+$'
   THEN RAISE EXCEPTION 'ASESOR_INVALIDO|Seleccione un asesor valido.'; END IF;
   v_nuevo_asesor:=(p_datos->>'idAsesor')::bigint;
   IF v_nuevo_asesor IS DISTINCT FROM v_asignado THEN
     IF NOT coalesce(public.fn_usuario_tiene_permiso_seguridad(p_actor,'crm.edit'::varchar),false)
       OR NOT EXISTS(
         SELECT 1 FROM public.seg_usuarios_roles ur JOIN public.seg_roles r ON r.id_rol=ur.id_rol
         WHERE ur.id_usuario=p_actor AND ur.activo AND ur.fecha_revocacion IS NULL AND r.activo
           AND coalesce(public.fn_usuario_tiene_permiso_seguridad(ur.id_usuario,'sales.reassign_advisor'::varchar),false)
       ) THEN RAISE EXCEPTION 'DENEGADO|Solo Gerencia o Supervisor comercial pueden reasignar asesor.'; END IF;
     PERFORM public.sp_crm_asignar_asesor_v3(
       p_actor,p_prospecto,v_nuevo_asesor,'Reasignacion durante validacion contractual');
   END IF;
 END IF;

 -- Crear una venta y vincular su cliente en el mismo contexto transaccional.
 v_resultado:=public.sp_crm_registrar_venta_pendiente_v9(
   p_actor,p_prospecto,p_lote,p_modalidad,p_monto_total,
   p_monto_inicial,p_numero_cuotas,p_tasa_mensual_pct,p_observaciones);
 INSERT INTO public.crm_ventas_datos_comprador(
   id_venta,id_prospecto,id_persona,id_usuario_revision,datos_revisados
 ) VALUES(
   (v_resultado->>'idVenta')::bigint,p_prospecto,v_persona,p_actor,
   p_datos||jsonb_build_object('revisadoEn',now(),'modalidad',p_modalidad,
     'idLote',p_lote,'precioVenta',p_monto_total)
 );
 RETURN v_resultado||jsonb_build_object('datosCompradorRevisados',true);
END $function$;

CREATE OR REPLACE FUNCTION public.sp_crm_registrar_venta_pendiente_v12(p_actor bigint, p_prospecto bigint, p_lote bigint, p_modalidad character varying, p_monto_total numeric, p_monto_inicial numeric, p_numero_cuotas integer, p_tasa_mensual_pct numeric, p_observaciones text, p_datos jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'pg_temp'
AS $function$
DECLARE
 v_persona bigint; v_origen integer; v_doc_tipo integer; v_asignado bigint; v_nuevo_asesor bigint;
 v_nombre text; v_paterno text; v_materno text; v_email text; v_telefono text;
 v_doc text; v_tipo text; v_direccion text; v_motivo text; v_mensaje text;
 v_proyecto bigint; v_contacto_id bigint; v_doc_id bigint; v_dir_id bigint;
 v_valor text; v_verificado boolean; v_actual_tipo integer;
 v_resultado jsonb; v_tipo_contacto integer;
 v_estado_civil text; v_conyuge jsonb;
 v_conyuge_nombres text; v_conyuge_paterno text;
 v_conyuge_materno text; v_conyuge_telefono text;
 v_conyuge_correo text; v_conyuge_tipo text;
 v_conyuge_documento text;
 v_referencia text; v_pais text; v_departamento text;
 v_provincia text; v_distrito text;
 v_id_pais bigint; v_id_departamento bigint; v_id_provincia bigint; v_id_distrito bigint;
BEGIN
 IF NOT coalesce(public.fn_usuario_tiene_permiso_seguridad(p_actor,'sales.create'::varchar),false)
    OR NOT coalesce(public.fn_crm_puede_consultar_prospecto(p_actor,p_prospecto),false)
 THEN RAISE EXCEPTION 'DENEGADO|No puede registrar esta venta.'; END IF;
 IF p_datos IS NULL OR jsonb_typeof(p_datos)<>'object'
    OR (p_datos->>'idProspecto') IS DISTINCT FROM p_prospecto::text
 THEN RAISE EXCEPTION 'DATOS_COMPRADOR_REQUERIDOS|Revise los datos del cliente antes de registrar.'; END IF;
 PERFORM 1 FROM public.inm_lotes WHERE id_lote=p_lote FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'LOTE_NO_DISPONIBLE|Lote inexistente.'; END IF;
 SELECT id_persona INTO STRICT v_persona FROM public.crm_prospectos
 WHERE id_prospecto=p_prospecto AND activo FOR UPDATE;
 PERFORM 1 FROM public.core_personas
 WHERE id_persona=v_persona AND activo FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'PERSONA_INVALIDA|La persona no esta activa.'; END IF;

 v_nombre:=btrim(coalesce(p_datos->>'nombres',''));
 v_paterno:=btrim(coalesce(p_datos->>'apellidoPaterno',''));
 v_materno:=btrim(coalesce(p_datos->>'apellidoMaterno',''));
 v_email:=lower(btrim(coalesce(p_datos->>'correo','')));
 v_telefono:=btrim(coalesce(p_datos->>'telefono',''));
 v_tipo:=upper(btrim(coalesce(p_datos->>'tipoDocumento','')));
 v_doc:=upper(btrim(coalesce(p_datos->>'numeroDocumento','')));
 v_direccion:=btrim(coalesce(p_datos->>'direccion',''));
 v_referencia:=btrim(coalesce(p_datos->>'referencia',''));
 v_motivo:=btrim(coalesce(p_datos->>'motivoContacto',''));
 v_mensaje:=btrim(coalesce(p_datos->>'mensaje',''));
 IF v_nombre !~ '^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ]+([ -][A-Za-zÁÉÍÓÚÜÑáéíóúüñ]+)*$'
    OR length(v_nombre)<2 OR length(v_nombre)>120
    OR v_paterno !~ '^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ]+([ -][A-Za-zÁÉÍÓÚÜÑáéíóúüñ]+)*$'
    OR length(v_paterno)<2 OR length(v_paterno)>80
    OR (v_materno<>'' AND
       (v_materno !~ '^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ]+([ -][A-Za-zÁÉÍÓÚÜÑáéíóúüñ]+)*$'
       OR length(v_materno)>80))
    OR length(concat_ws(' ',v_nombre,v_paterno,nullif(v_materno,'')))>150
    OR v_email !~ '^[a-z0-9._%+\-]+@[a-z0-9.\-]+\.[a-z]{2,}$'
    OR length(v_email)>180 OR v_telefono !~ '^([0-9]{7,15}|\+[1-9][0-9]{6,14})$'
    OR length(v_direccion)=0 OR length(v_direccion)>255
    OR length(v_referencia)>255 OR length(v_motivo)>150
    OR length(v_mensaje)>4000
 THEN RAISE EXCEPTION 'DATOS_COMPRADOR_INVALIDOS|Revise los datos personales, contacto y dirección del comprador.'; END IF;
 IF NOT (CASE v_tipo
   WHEN 'DNI' THEN v_doc ~ '^[0-9]{8}$'
   WHEN 'RUC' THEN v_doc ~ '^[0-9]{11}$'
   WHEN 'CE' THEN v_doc ~ '^[0-9]{9,12}$'
   WHEN 'PASAPORTE' THEN v_doc ~ '^[A-Z0-9]{6,20}$'
   ELSE false END)
 THEN RAISE EXCEPTION 'DOCUMENTO_INVALIDO|El documento no cumple el formato indicado.'; END IF;
 SELECT id_tipo_documento INTO v_doc_tipo FROM public.cfg_tipos_documento
 WHERE codigo=v_tipo AND activo;
 SELECT id_origen_prospecto INTO v_origen FROM public.cfg_origenes_prospecto
 WHERE codigo=p_datos->>'origenCodigo' AND activo;
 IF v_doc_tipo IS NULL OR v_origen IS NULL
 THEN RAISE EXCEPTION 'CATALOGO_INVALIDO|Documento u origen no valido.'; END IF;
 IF coalesce(p_datos->>'idProyectoInteres','') !~ '^[0-9]+$'
 THEN RAISE EXCEPTION 'PROYECTO_INVALIDO|Seleccione un proyecto.'; END IF;
 v_proyecto:=(p_datos->>'idProyectoInteres')::bigint;
 IF NOT EXISTS(SELECT 1 FROM public.inm_proyectos WHERE id_proyecto=v_proyecto AND activo)
 THEN RAISE EXCEPTION 'PROYECTO_INVALIDO|Proyecto inactivo o inexistente.'; END IF;

 -- Un cambio en documentos/contactos verificados requiere su flujo formal de evidencias.
 SELECT d.id_persona_documento,d.id_tipo_documento,d.numero_documento,d.verificado
 INTO v_doc_id,v_actual_tipo,v_valor,v_verificado
 FROM public.core_personas_documentos d
 WHERE d.id_persona=v_persona AND d.activo
 ORDER BY d.principal DESC,d.id_persona_documento DESC LIMIT 1 FOR UPDATE;
 IF v_doc_id IS NOT NULL AND
     (v_actual_tipo<>v_doc_tipo OR upper(btrim(v_valor))<>v_doc) THEN
   IF v_verificado THEN
     RAISE EXCEPTION 'DOCUMENTO_VERIFICADO|El cambio requiere revision documental con evidencias.';
   END IF;
   UPDATE public.core_personas_documentos SET
     id_tipo_documento=v_doc_tipo,numero_documento=v_doc,verificado=false,
     fecha_actualizacion=now()
   WHERE id_persona_documento=v_doc_id;
 ELSIF v_doc_id IS NULL THEN
   INSERT INTO public.core_personas_documentos(
     id_persona,id_tipo_documento,numero_documento,principal,verificado
   ) VALUES(v_persona,v_doc_tipo,v_doc,true,false);
 END IF;

 SELECT id_tipo_contacto INTO STRICT v_tipo_contacto FROM public.cfg_tipos_contacto
 WHERE codigo='EMAIL' AND activo;
 SELECT id_persona_contacto,valor,verificado INTO v_contacto_id,v_valor,v_verificado
 FROM public.core_personas_contactos
 WHERE id_persona=v_persona AND id_tipo_contacto=v_tipo_contacto AND activo
 ORDER BY principal DESC,id_persona_contacto DESC LIMIT 1 FOR UPDATE;
 IF v_contacto_id IS NOT NULL AND lower(btrim(v_valor))<>v_email THEN
   IF v_verificado THEN
     RAISE EXCEPTION 'CORREO_VERIFICADO|El cambio de correo requiere confirmacion de identidad.';
   END IF;
   UPDATE public.core_personas_contactos SET valor=v_email,verificado=false,
      fecha_actualizacion=now() WHERE id_persona_contacto=v_contacto_id;
 ELSIF v_contacto_id IS NULL THEN
   INSERT INTO public.core_personas_contactos(
     id_persona,id_tipo_contacto,valor,principal,verificado,permite_notificaciones)
   VALUES(v_persona,v_tipo_contacto,v_email,true,false,false);
 END IF;

 SELECT id_tipo_contacto INTO STRICT v_tipo_contacto FROM public.cfg_tipos_contacto
 WHERE codigo='CELULAR' AND activo;
 v_contacto_id:=NULL;v_valor:=NULL;v_verificado:=NULL;
 SELECT id_persona_contacto,valor,verificado INTO v_contacto_id,v_valor,v_verificado
 FROM public.core_personas_contactos
 WHERE id_persona=v_persona AND id_tipo_contacto=v_tipo_contacto AND activo
 ORDER BY principal DESC,id_persona_contacto DESC LIMIT 1 FOR UPDATE;
 IF v_contacto_id IS NOT NULL AND regexp_replace(v_valor,'[ ()-]','','g')<>v_telefono THEN
   IF v_verificado THEN
     RAISE EXCEPTION 'TELEFONO_VERIFICADO|El cambio de telefono requiere verificacion.';
   END IF;
   UPDATE public.core_personas_contactos SET valor=v_telefono,verificado=false,
      fecha_actualizacion=now() WHERE id_persona_contacto=v_contacto_id;
 ELSIF v_contacto_id IS NULL THEN
   INSERT INTO public.core_personas_contactos(
     id_persona,id_tipo_contacto,valor,principal,verificado,permite_notificaciones)
   VALUES(v_persona,v_tipo_contacto,v_telefono,true,false,false);
 END IF;

 -- Resolver jerarquía real desde el catálogo de ubicaciones:
 IF coalesce(p_datos->>'idPais','') !~ '^[0-9]+$'
    OR coalesce(p_datos->>'idDepartamento','') !~ '^[0-9]+$'
    OR coalesce(p_datos->>'idProvincia','') !~ '^[0-9]+$'
    OR coalesce(p_datos->>'idDistrito','') !~ '^[0-9]+$'
 THEN
   RAISE EXCEPTION 'UBICACION_INVALIDA|Seleccione país, departamento, provincia y distrito.';
 END IF;
 v_id_pais:=(p_datos->>'idPais')::bigint;
 v_id_departamento:=(p_datos->>'idDepartamento')::bigint;
 v_id_provincia:=(p_datos->>'idProvincia')::bigint;
 v_id_distrito:=(p_datos->>'idDistrito')::bigint;

 SELECT pais.nombre,dep.nombre,prov.nombre,dist.nombre
 INTO v_pais,v_departamento,v_provincia,v_distrito
 FROM public.cfg_ubicaciones_geograficas pais
 JOIN public.cfg_ubicaciones_geograficas dep
   ON dep.id_ubicacion_padre=pais.id_ubicacion
 JOIN public.cfg_ubicaciones_geograficas prov
   ON prov.id_ubicacion_padre=dep.id_ubicacion
 JOIN public.cfg_ubicaciones_geograficas dist
   ON dist.id_ubicacion_padre=prov.id_ubicacion
 WHERE pais.id_ubicacion=v_id_pais AND pais.tipo='PAIS'
   AND pais.pais_iso2='PE'
   AND dep.id_ubicacion=v_id_departamento AND dep.tipo='DEPARTAMENTO'
   AND prov.id_ubicacion=v_id_provincia AND prov.tipo='PROVINCIA'
   AND dist.id_ubicacion=v_id_distrito AND dist.tipo='DISTRITO'
   AND pais.activo AND dep.activo AND prov.activo AND dist.activo
   AND pais.estado_verificacion='VALIDADO'
   AND dep.estado_verificacion='VALIDADO'
   AND prov.estado_verificacion='VALIDADO'
   AND dist.estado_verificacion='VALIDADO';
 IF NOT FOUND THEN
   RAISE EXCEPTION 'UBICACION_INVALIDA|La ubicación no corresponde a la jerarquía seleccionada.';
 END IF;

 -- Estado civil solicitado para la preparación contractual.
 v_estado_civil:=upper(trim(coalesce(p_datos->>'estadoCivil','')));
 IF v_estado_civil NOT IN ('SOLTERO','CASADO','DIVORCIADO','VIUDO') THEN
    RAISE EXCEPTION 'ESTADO_CIVIL_INVALIDO|Seleccione un estado civil válido.';
 END IF;
 IF v_estado_civil='CASADO' THEN
    v_conyuge:=p_datos->'conyuge';
    IF v_conyuge IS NULL OR jsonb_typeof(v_conyuge)<>'object' THEN
      RAISE EXCEPTION 'CONYUGE_REQUERIDO|Complete la información del cónyuge.';
    END IF;
    v_conyuge_nombres:=trim(coalesce(v_conyuge->>'nombres',''));
    v_conyuge_paterno:=trim(coalesce(v_conyuge->>'apellidoPaterno',''));
    v_conyuge_materno:=trim(coalesce(v_conyuge->>'apellidoMaterno',''));
    v_conyuge_telefono:=trim(coalesce(v_conyuge->>'telefono',''));
    v_conyuge_correo:=lower(trim(coalesce(v_conyuge->>'correo','')));
    v_conyuge_tipo:=upper(trim(coalesce(v_conyuge->>'tipoDocumento','')));
    v_conyuge_documento:=upper(trim(coalesce(v_conyuge->>'numeroDocumento','')));
    IF v_conyuge_nombres !~ '^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ]+([ -][A-Za-zÁÉÍÓÚÜÑáéíóúüñ]+)*$'
       OR length(v_conyuge_nombres)<2 OR length(v_conyuge_nombres)>120
       OR v_conyuge_paterno !~ '^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ]+([ -][A-Za-zÁÉÍÓÚÜÑáéíóúüñ]+)*$'
       OR length(v_conyuge_paterno)<2 OR length(v_conyuge_paterno)>80
       OR (v_conyuge_materno<>'' AND (length(v_conyuge_materno)>80 OR
          v_conyuge_materno !~ '^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ]+([ -][A-Za-zÁÉÍÓÚÜÑáéíóúüñ]+)*$'))
       OR v_conyuge_telefono !~ '^([0-9]{7,15}|\+[1-9][0-9]{6,14})$'
       OR v_conyuge_correo !~ '^[a-z0-9._%+\-]+@[a-z0-9.\-]+\.[a-z]{2,}$'
       OR length(v_conyuge_correo)>180
       OR NOT (CASE v_conyuge_tipo
         WHEN 'DNI' THEN v_conyuge_documento ~ '^[0-9]{8}$'
         WHEN 'RUC' THEN v_conyuge_documento ~ '^[0-9]{11}$'
         WHEN 'CE' THEN v_conyuge_documento ~ '^[0-9]{9,12}$'
         WHEN 'PASAPORTE' THEN v_conyuge_documento ~ '^[A-Z0-9]{6,20}$'
         ELSE false END)
       OR (v_conyuge_tipo=v_tipo AND v_conyuge_documento=v_doc)
    THEN
      RAISE EXCEPTION 'CONYUGE_INVALIDO|Revise nombres, contacto y documento del cónyuge.';
    END IF;
 END IF;

 UPDATE public.core_personas SET estado_civil_codigo=v_estado_civil
  WHERE id_persona=v_persona;
 IF v_estado_civil='CASADO' THEN
   INSERT INTO public.core_personas_conyuges(
    id_persona,nombres,apellido_paterno,apellido_materno,
    telefono,correo,tipo_documento,numero_documento,activo,fecha_actualizacion)
   VALUES(v_persona,v_conyuge_nombres,v_conyuge_paterno,nullif(v_conyuge_materno,''),
     v_conyuge_telefono,v_conyuge_correo,v_conyuge_tipo,v_conyuge_documento,true,now())
   ON CONFLICT(id_persona) DO UPDATE SET
     nombres=excluded.nombres,apellido_paterno=excluded.apellido_paterno,
     apellido_materno=excluded.apellido_materno,telefono=excluded.telefono,
     correo=excluded.correo,tipo_documento=excluded.tipo_documento,
     numero_documento=excluded.numero_documento,activo=true,fecha_actualizacion=now();
 ELSE
   UPDATE public.core_personas_conyuges SET activo=false,fecha_actualizacion=now()
   WHERE id_persona=v_persona;
 END IF;

 UPDATE public.core_personas SET nombres=v_nombre,apellido_paterno=v_paterno,
   apellido_materno=nullif(v_materno,''),fecha_actualizacion=now()
 WHERE id_persona=v_persona;

 SELECT id_persona_direccion INTO v_dir_id
 FROM public.core_personas_direcciones WHERE id_persona=v_persona AND activo
 ORDER BY principal DESC,id_persona_direccion DESC LIMIT 1 FOR UPDATE;
 IF v_dir_id IS NOT NULL THEN
   UPDATE public.core_personas_direcciones
   SET direccion=v_direccion,referencia=nullif(v_referencia,''),
       pais=v_pais,departamento=v_departamento,
       provincia=v_provincia,distrito=v_distrito,
       fecha_actualizacion=now()
   WHERE id_persona_direccion=v_dir_id;
 ELSE
   INSERT INTO public.core_personas_direcciones(
     id_persona,tipo,direccion,referencia,pais,departamento,
     provincia,distrito,principal
   ) VALUES(
     v_persona,'DOMICILIO',v_direccion,nullif(v_referencia,''),
     v_pais,v_departamento,v_provincia,v_distrito,true);
 END IF;
 UPDATE public.crm_prospectos SET id_origen_prospecto=v_origen,
   fecha_actualizacion=now() WHERE id_prospecto=p_prospecto;
 UPDATE public.crm_prospectos_intereses
   SET fecha_interes=now(),fecha_actualizacion=now()
 WHERE id_prospecto=p_prospecto AND id_proyecto=v_proyecto AND activo;
 IF NOT FOUND THEN
   INSERT INTO public.crm_prospectos_intereses(id_prospecto,id_proyecto,activo)
   VALUES(p_prospecto,v_proyecto,true);
 END IF;

 SELECT id_asesor INTO v_asignado FROM public.com_asignaciones_prospecto
 WHERE id_prospecto_vigente=p_prospecto AND fecha_fin IS NULL LIMIT 1;
 IF p_datos ? 'idAsesor' AND p_datos->>'idAsesor' IS NOT NULL THEN
   IF (p_datos->>'idAsesor') !~ '^[0-9]+$'
   THEN RAISE EXCEPTION 'ASESOR_INVALIDO|Seleccione un asesor valido.'; END IF;
   v_nuevo_asesor:=(p_datos->>'idAsesor')::bigint;
   IF v_nuevo_asesor IS DISTINCT FROM v_asignado THEN
     IF NOT coalesce(public.fn_usuario_tiene_permiso_seguridad(p_actor,'crm.edit'::varchar),false)
       OR NOT EXISTS(
         SELECT 1 FROM public.seg_usuarios_roles ur JOIN public.seg_roles r ON r.id_rol=ur.id_rol
         WHERE ur.id_usuario=p_actor AND ur.activo AND ur.fecha_revocacion IS NULL AND r.activo
           AND coalesce(public.fn_usuario_tiene_permiso_seguridad(ur.id_usuario,'sales.reassign_advisor'::varchar),false)
       ) THEN RAISE EXCEPTION 'DENEGADO|Solo Gerencia o Supervisor comercial pueden reasignar asesor.'; END IF;
     PERFORM public.sp_crm_asignar_asesor_v3(
       p_actor,p_prospecto,v_nuevo_asesor,'Reasignacion durante validacion contractual');
   END IF;
 END IF;

 -- Crear una venta y vincular su cliente en el mismo contexto transaccional.
 v_resultado:=public.sp_crm_registrar_venta_pendiente_v9(
   p_actor,p_prospecto,p_lote,p_modalidad,p_monto_total,
   p_monto_inicial,p_numero_cuotas,p_tasa_mensual_pct,p_observaciones);
 INSERT INTO public.crm_ventas_datos_comprador(
   id_venta,id_prospecto,id_persona,id_usuario_revision,datos_revisados
 ) VALUES(
   (v_resultado->>'idVenta')::bigint,p_prospecto,v_persona,p_actor,
   p_datos||jsonb_build_object('revisadoEn',now(),'modalidad',p_modalidad,
     'idLote',p_lote,'precioVenta',p_monto_total)
 );
 RETURN v_resultado||jsonb_build_object('datosCompradorRevisados',true);
END $function$;

CREATE OR REPLACE FUNCTION public.sp_crm_registrar_venta_pendiente_v13(p_actor bigint, p_prospecto bigint, p_lote bigint, p_modalidad character varying, p_monto_total numeric, p_monto_inicial numeric, p_numero_cuotas integer, p_tasa_mensual_pct numeric, p_observaciones text, p_datos jsonb, p_pago jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'pg_temp'
AS $function$
DECLARE
 v_persona bigint; v_origen integer; v_doc_tipo integer; v_asignado bigint; v_nuevo_asesor bigint;
 v_nombre text; v_paterno text; v_materno text; v_email text; v_telefono text;
 v_doc text; v_tipo text; v_direccion text; v_motivo text; v_mensaje text;
 v_proyecto bigint; v_contacto_id bigint; v_doc_id bigint; v_dir_id bigint;
 v_valor text; v_verificado boolean; v_actual_tipo integer;
 v_resultado jsonb; v_tipo_contacto integer;
 v_metodo text; v_id_metodo integer; v_requiere_numero boolean;
 v_numero_operacion text; v_archivos jsonb; v_archivo jsonb;
 v_key text; v_nombre_archivo text; v_mime text; v_size bigint;
 v_archivos_vistos text[]:='{}'::text[];
 v_cantidad integer; v_id_venta bigint; v_monto_objetivo numeric;
 v_estado_civil text; v_conyuge jsonb;
 v_conyuge_nombres text; v_conyuge_paterno text;
 v_conyuge_materno text; v_conyuge_telefono text;
 v_conyuge_correo text; v_conyuge_tipo text;
 v_conyuge_documento text;
 v_referencia text; v_pais text; v_departamento text;
 v_provincia text; v_distrito text;
 v_id_pais bigint; v_id_departamento bigint; v_id_provincia bigint; v_id_distrito bigint;
BEGIN
 IF NOT coalesce(public.fn_usuario_tiene_permiso_seguridad(p_actor,'sales.create'::varchar),false)
    OR NOT coalesce(public.fn_crm_puede_consultar_prospecto(p_actor,p_prospecto),false)
 THEN RAISE EXCEPTION 'DENEGADO|No puede registrar esta venta.'; END IF;
 IF p_pago IS NULL OR jsonb_typeof(p_pago)<>'object' THEN
   RAISE EXCEPTION 'PAGO_INVALIDO|Seleccione método de pago y adjunte los comprobantes necesarios.';
 END IF;
 v_metodo:=upper(trim(coalesce(p_pago->>'metodoPago','')));
 SELECT id_metodo_pago,requiere_numero_operacion
  INTO v_id_metodo,v_requiere_numero
 FROM public.cfg_metodos_pago WHERE codigo=v_metodo AND activo;
 IF v_id_metodo IS NULL THEN
   RAISE EXCEPTION 'METODO_PAGO_INVALIDO|Seleccione un método de pago activo.';
 END IF;
 v_numero_operacion:=trim(coalesce(p_pago->>'numeroOperacion',''));
 IF length(v_numero_operacion)>80 OR
    (v_requiere_numero AND v_numero_operacion='')
 THEN RAISE EXCEPTION 'OPERACION_REQUERIDA|Indique el número de operación del pago.';
 END IF;
 v_archivos:=p_pago->'comprobantes';
 IF v_archivos IS NULL OR jsonb_typeof(v_archivos)<>'array'
 THEN RAISE EXCEPTION 'ARCHIVOS_INVALIDOS|Se esperaba lista de comprobantes.';
 END IF;
 v_cantidad:=jsonb_array_length(v_archivos);
 IF v_cantidad>8 OR (v_metodo<>'EFECTIVO' AND v_cantidad=0)
 THEN RAISE EXCEPTION 'VOUCHER_REQUERIDO|Adjunte de 1 a 8 comprobantes, excepto si paga en efectivo.';
 END IF;
 FOR v_archivo IN SELECT value FROM jsonb_array_elements(v_archivos) LOOP
   v_key:=coalesce(v_archivo->>'claveArchivo','');
   v_nombre_archivo:=coalesce(v_archivo->>'nombreArchivo','');
   v_mime:=coalesce(v_archivo->>'tipoMime','');
   IF coalesce(v_archivo->>'tamanioBytes','') !~ '^[0-9]+$' THEN
     RAISE EXCEPTION 'ARCHIVO_INVALIDO|Tamaño de comprobante inválido.';
   END IF;
   v_size:=(v_archivo->>'tamanioBytes')::bigint;
   IF v_key !~ ('^ventas/p-'||p_prospecto::text||'/l-'||
       p_lote::text||'/[a-f0-9-]{36}\.(pdf|jpg|png|webp)$')
      OR v_nombre_archivo='' OR length(v_nombre_archivo)>255
      OR v_mime NOT IN('application/pdf','image/jpeg','image/png','image/webp')
      OR v_size<1 OR v_size>5242880 OR v_key=ANY(v_archivos_vistos)
      OR EXISTS(SELECT 1 FROM public.ven_ventas_comprobantes WHERE clave_archivo=v_key)
   THEN RAISE EXCEPTION 'ARCHIVO_INVALIDO|Referencia de comprobante inválida o duplicada.';
   END IF;
   IF NOT EXISTS (
      SELECT 1 FROM storage.objects obj WHERE obj.bucket_id='vouchers-ventas-private'
       AND obj.name=v_key AND obj.metadata->>'mimetype'=v_mime
       AND (obj.metadata->>'size') ~ '^[0-9]+$'
       AND (obj.metadata->>'size')::bigint=v_size
   ) THEN RAISE EXCEPTION 'VOUCHER_NO_CARGADO|Archivo no encontrado o distinto del enviado.';
   END IF;
   v_archivos_vistos:=array_append(v_archivos_vistos,v_key);
 END LOOP;

 IF p_datos IS NULL OR jsonb_typeof(p_datos)<>'object'
    OR (p_datos->>'idProspecto') IS DISTINCT FROM p_prospecto::text
 THEN RAISE EXCEPTION 'DATOS_COMPRADOR_REQUERIDOS|Revise los datos del cliente antes de registrar.'; END IF;
 PERFORM 1 FROM public.inm_lotes WHERE id_lote=p_lote FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'LOTE_NO_DISPONIBLE|Lote inexistente.'; END IF;
 SELECT id_persona INTO STRICT v_persona FROM public.crm_prospectos
 WHERE id_prospecto=p_prospecto AND activo FOR UPDATE;
 PERFORM 1 FROM public.core_personas
 WHERE id_persona=v_persona AND activo FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'PERSONA_INVALIDA|La persona no esta activa.'; END IF;

 v_nombre:=btrim(coalesce(p_datos->>'nombres',''));
 v_paterno:=btrim(coalesce(p_datos->>'apellidoPaterno',''));
 v_materno:=btrim(coalesce(p_datos->>'apellidoMaterno',''));
 v_email:=lower(btrim(coalesce(p_datos->>'correo','')));
 v_telefono:=btrim(coalesce(p_datos->>'telefono',''));
 v_tipo:=upper(btrim(coalesce(p_datos->>'tipoDocumento','')));
 v_doc:=upper(btrim(coalesce(p_datos->>'numeroDocumento','')));
 v_direccion:=btrim(coalesce(p_datos->>'direccion',''));
 v_referencia:=btrim(coalesce(p_datos->>'referencia',''));
 v_motivo:=btrim(coalesce(p_datos->>'motivoContacto',''));
 v_mensaje:=btrim(coalesce(p_datos->>'mensaje',''));
 IF v_nombre !~ '^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ]+([ -][A-Za-zÁÉÍÓÚÜÑáéíóúüñ]+)*$'
    OR length(v_nombre)<2 OR length(v_nombre)>120
    OR v_paterno !~ '^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ]+([ -][A-Za-zÁÉÍÓÚÜÑáéíóúüñ]+)*$'
    OR length(v_paterno)<2 OR length(v_paterno)>80
    OR (v_materno<>'' AND
       (v_materno !~ '^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ]+([ -][A-Za-zÁÉÍÓÚÜÑáéíóúüñ]+)*$'
       OR length(v_materno)>80))
    OR length(concat_ws(' ',v_nombre,v_paterno,nullif(v_materno,'')))>150
    OR v_email !~ '^[a-z0-9._%+\-]+@[a-z0-9.\-]+\.[a-z]{2,}$'
    OR length(v_email)>180 OR v_telefono !~ '^([0-9]{7,15}|\+[1-9][0-9]{6,14})$'
    OR length(v_direccion)=0 OR length(v_direccion)>255
    OR length(v_referencia)>255 OR length(v_motivo)>150
    OR length(v_mensaje)>4000
 THEN RAISE EXCEPTION 'DATOS_COMPRADOR_INVALIDOS|Revise los datos personales, contacto y dirección del comprador.'; END IF;
 IF NOT (CASE v_tipo
   WHEN 'DNI' THEN v_doc ~ '^[0-9]{8}$'
   WHEN 'RUC' THEN v_doc ~ '^[0-9]{11}$'
   WHEN 'CE' THEN v_doc ~ '^[0-9]{9,12}$'
   WHEN 'PASAPORTE' THEN v_doc ~ '^[A-Z0-9]{6,20}$'
   ELSE false END)
 THEN RAISE EXCEPTION 'DOCUMENTO_INVALIDO|El documento no cumple el formato indicado.'; END IF;
 SELECT id_tipo_documento INTO v_doc_tipo FROM public.cfg_tipos_documento
 WHERE codigo=v_tipo AND activo;
 SELECT id_origen_prospecto INTO v_origen FROM public.cfg_origenes_prospecto
 WHERE codigo=p_datos->>'origenCodigo' AND activo;
 IF v_doc_tipo IS NULL OR v_origen IS NULL
 THEN RAISE EXCEPTION 'CATALOGO_INVALIDO|Documento u origen no valido.'; END IF;
 IF coalesce(p_datos->>'idProyectoInteres','') !~ '^[0-9]+$'
 THEN RAISE EXCEPTION 'PROYECTO_INVALIDO|Seleccione un proyecto.'; END IF;
 v_proyecto:=(p_datos->>'idProyectoInteres')::bigint;
 IF NOT EXISTS(SELECT 1 FROM public.inm_proyectos WHERE id_proyecto=v_proyecto AND activo)
 THEN RAISE EXCEPTION 'PROYECTO_INVALIDO|Proyecto inactivo o inexistente.'; END IF;

 -- Un cambio en documentos/contactos verificados requiere su flujo formal de evidencias.
 SELECT d.id_persona_documento,d.id_tipo_documento,d.numero_documento,d.verificado
 INTO v_doc_id,v_actual_tipo,v_valor,v_verificado
 FROM public.core_personas_documentos d
 WHERE d.id_persona=v_persona AND d.activo
 ORDER BY d.principal DESC,d.id_persona_documento DESC LIMIT 1 FOR UPDATE;
 IF v_doc_id IS NOT NULL AND
     (v_actual_tipo<>v_doc_tipo OR upper(btrim(v_valor))<>v_doc) THEN
   IF v_verificado THEN
     RAISE EXCEPTION 'DOCUMENTO_VERIFICADO|El cambio requiere revision documental con evidencias.';
   END IF;
   UPDATE public.core_personas_documentos SET
     id_tipo_documento=v_doc_tipo,numero_documento=v_doc,verificado=false,
     fecha_actualizacion=now()
   WHERE id_persona_documento=v_doc_id;
 ELSIF v_doc_id IS NULL THEN
   INSERT INTO public.core_personas_documentos(
     id_persona,id_tipo_documento,numero_documento,principal,verificado
   ) VALUES(v_persona,v_doc_tipo,v_doc,true,false);
 END IF;

 SELECT id_tipo_contacto INTO STRICT v_tipo_contacto FROM public.cfg_tipos_contacto
 WHERE codigo='EMAIL' AND activo;
 SELECT id_persona_contacto,valor,verificado INTO v_contacto_id,v_valor,v_verificado
 FROM public.core_personas_contactos
 WHERE id_persona=v_persona AND id_tipo_contacto=v_tipo_contacto AND activo
 ORDER BY principal DESC,id_persona_contacto DESC LIMIT 1 FOR UPDATE;
 IF v_contacto_id IS NOT NULL AND lower(btrim(v_valor))<>v_email THEN
   IF v_verificado THEN
     RAISE EXCEPTION 'CORREO_VERIFICADO|El cambio de correo requiere confirmacion de identidad.';
   END IF;
   UPDATE public.core_personas_contactos SET valor=v_email,verificado=false,
      fecha_actualizacion=now() WHERE id_persona_contacto=v_contacto_id;
 ELSIF v_contacto_id IS NULL THEN
   INSERT INTO public.core_personas_contactos(
     id_persona,id_tipo_contacto,valor,principal,verificado,permite_notificaciones)
   VALUES(v_persona,v_tipo_contacto,v_email,true,false,false);
 END IF;

 SELECT id_tipo_contacto INTO STRICT v_tipo_contacto FROM public.cfg_tipos_contacto
 WHERE codigo='CELULAR' AND activo;
 v_contacto_id:=NULL;v_valor:=NULL;v_verificado:=NULL;
 SELECT id_persona_contacto,valor,verificado INTO v_contacto_id,v_valor,v_verificado
 FROM public.core_personas_contactos
 WHERE id_persona=v_persona AND id_tipo_contacto=v_tipo_contacto AND activo
 ORDER BY principal DESC,id_persona_contacto DESC LIMIT 1 FOR UPDATE;
 IF v_contacto_id IS NOT NULL AND regexp_replace(v_valor,'[ ()-]','','g')<>v_telefono THEN
   IF v_verificado THEN
     RAISE EXCEPTION 'TELEFONO_VERIFICADO|El cambio de telefono requiere verificacion.';
   END IF;
   UPDATE public.core_personas_contactos SET valor=v_telefono,verificado=false,
      fecha_actualizacion=now() WHERE id_persona_contacto=v_contacto_id;
 ELSIF v_contacto_id IS NULL THEN
   INSERT INTO public.core_personas_contactos(
     id_persona,id_tipo_contacto,valor,principal,verificado,permite_notificaciones)
   VALUES(v_persona,v_tipo_contacto,v_telefono,true,false,false);
 END IF;

 -- Resolver jerarquía real desde el catálogo de ubicaciones:
 IF coalesce(p_datos->>'idPais','') !~ '^[0-9]+$'
    OR coalesce(p_datos->>'idDepartamento','') !~ '^[0-9]+$'
    OR coalesce(p_datos->>'idProvincia','') !~ '^[0-9]+$'
    OR coalesce(p_datos->>'idDistrito','') !~ '^[0-9]+$'
 THEN
   RAISE EXCEPTION 'UBICACION_INVALIDA|Seleccione país, departamento, provincia y distrito.';
 END IF;
 v_id_pais:=(p_datos->>'idPais')::bigint;
 v_id_departamento:=(p_datos->>'idDepartamento')::bigint;
 v_id_provincia:=(p_datos->>'idProvincia')::bigint;
 v_id_distrito:=(p_datos->>'idDistrito')::bigint;

 SELECT pais.nombre,dep.nombre,prov.nombre,dist.nombre
 INTO v_pais,v_departamento,v_provincia,v_distrito
 FROM public.cfg_ubicaciones_geograficas pais
 JOIN public.cfg_ubicaciones_geograficas dep
   ON dep.id_ubicacion_padre=pais.id_ubicacion
 JOIN public.cfg_ubicaciones_geograficas prov
   ON prov.id_ubicacion_padre=dep.id_ubicacion
 JOIN public.cfg_ubicaciones_geograficas dist
   ON dist.id_ubicacion_padre=prov.id_ubicacion
 WHERE pais.id_ubicacion=v_id_pais AND pais.tipo='PAIS'
   AND pais.pais_iso2='PE'
   AND dep.id_ubicacion=v_id_departamento AND dep.tipo='DEPARTAMENTO'
   AND prov.id_ubicacion=v_id_provincia AND prov.tipo='PROVINCIA'
   AND dist.id_ubicacion=v_id_distrito AND dist.tipo='DISTRITO'
   AND pais.activo AND dep.activo AND prov.activo AND dist.activo
   AND pais.estado_verificacion='VALIDADO'
   AND dep.estado_verificacion='VALIDADO'
   AND prov.estado_verificacion='VALIDADO'
   AND dist.estado_verificacion='VALIDADO';
 IF NOT FOUND THEN
   RAISE EXCEPTION 'UBICACION_INVALIDA|La ubicación no corresponde a la jerarquía seleccionada.';
 END IF;

 -- Estado civil solicitado para la preparación contractual.
 v_estado_civil:=upper(trim(coalesce(p_datos->>'estadoCivil','')));
 IF v_estado_civil NOT IN ('SOLTERO','CASADO','DIVORCIADO','VIUDO') THEN
    RAISE EXCEPTION 'ESTADO_CIVIL_INVALIDO|Seleccione un estado civil válido.';
 END IF;
 IF v_estado_civil='CASADO' THEN
    v_conyuge:=p_datos->'conyuge';
    IF v_conyuge IS NULL OR jsonb_typeof(v_conyuge)<>'object' THEN
      RAISE EXCEPTION 'CONYUGE_REQUERIDO|Complete la información del cónyuge.';
    END IF;
    v_conyuge_nombres:=trim(coalesce(v_conyuge->>'nombres',''));
    v_conyuge_paterno:=trim(coalesce(v_conyuge->>'apellidoPaterno',''));
    v_conyuge_materno:=trim(coalesce(v_conyuge->>'apellidoMaterno',''));
    v_conyuge_telefono:=trim(coalesce(v_conyuge->>'telefono',''));
    v_conyuge_correo:=lower(trim(coalesce(v_conyuge->>'correo','')));
    v_conyuge_tipo:=upper(trim(coalesce(v_conyuge->>'tipoDocumento','')));
    v_conyuge_documento:=upper(trim(coalesce(v_conyuge->>'numeroDocumento','')));
    IF v_conyuge_nombres !~ '^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ]+([ -][A-Za-zÁÉÍÓÚÜÑáéíóúüñ]+)*$'
       OR length(v_conyuge_nombres)<2 OR length(v_conyuge_nombres)>120
       OR v_conyuge_paterno !~ '^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ]+([ -][A-Za-zÁÉÍÓÚÜÑáéíóúüñ]+)*$'
       OR length(v_conyuge_paterno)<2 OR length(v_conyuge_paterno)>80
       OR (v_conyuge_materno<>'' AND (length(v_conyuge_materno)>80 OR
          v_conyuge_materno !~ '^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ]+([ -][A-Za-zÁÉÍÓÚÜÑáéíóúüñ]+)*$'))
       OR v_conyuge_telefono !~ '^([0-9]{7,15}|\+[1-9][0-9]{6,14})$'
       OR v_conyuge_correo !~ '^[a-z0-9._%+\-]+@[a-z0-9.\-]+\.[a-z]{2,}$'
       OR length(v_conyuge_correo)>180
       OR NOT (CASE v_conyuge_tipo
         WHEN 'DNI' THEN v_conyuge_documento ~ '^[0-9]{8}$'
         WHEN 'RUC' THEN v_conyuge_documento ~ '^[0-9]{11}$'
         WHEN 'CE' THEN v_conyuge_documento ~ '^[0-9]{9,12}$'
         WHEN 'PASAPORTE' THEN v_conyuge_documento ~ '^[A-Z0-9]{6,20}$'
         ELSE false END)
       OR (v_conyuge_tipo=v_tipo AND v_conyuge_documento=v_doc)
    THEN
      RAISE EXCEPTION 'CONYUGE_INVALIDO|Revise nombres, contacto y documento del cónyuge.';
    END IF;
 END IF;

 UPDATE public.core_personas SET estado_civil_codigo=v_estado_civil
  WHERE id_persona=v_persona;
 IF v_estado_civil='CASADO' THEN
   INSERT INTO public.core_personas_conyuges(
    id_persona,nombres,apellido_paterno,apellido_materno,
    telefono,correo,tipo_documento,numero_documento,activo,fecha_actualizacion)
   VALUES(v_persona,v_conyuge_nombres,v_conyuge_paterno,nullif(v_conyuge_materno,''),
     v_conyuge_telefono,v_conyuge_correo,v_conyuge_tipo,v_conyuge_documento,true,now())
   ON CONFLICT(id_persona) DO UPDATE SET
     nombres=excluded.nombres,apellido_paterno=excluded.apellido_paterno,
     apellido_materno=excluded.apellido_materno,telefono=excluded.telefono,
     correo=excluded.correo,tipo_documento=excluded.tipo_documento,
     numero_documento=excluded.numero_documento,activo=true,fecha_actualizacion=now();
 ELSE
   UPDATE public.core_personas_conyuges SET activo=false,fecha_actualizacion=now()
   WHERE id_persona=v_persona;
 END IF;

 UPDATE public.core_personas SET nombres=v_nombre,apellido_paterno=v_paterno,
   apellido_materno=nullif(v_materno,''),fecha_actualizacion=now()
 WHERE id_persona=v_persona;

 SELECT id_persona_direccion INTO v_dir_id
 FROM public.core_personas_direcciones WHERE id_persona=v_persona AND activo
 ORDER BY principal DESC,id_persona_direccion DESC LIMIT 1 FOR UPDATE;
 IF v_dir_id IS NOT NULL THEN
   UPDATE public.core_personas_direcciones
   SET direccion=v_direccion,referencia=nullif(v_referencia,''),
       pais=v_pais,departamento=v_departamento,
       provincia=v_provincia,distrito=v_distrito,
       fecha_actualizacion=now()
   WHERE id_persona_direccion=v_dir_id;
 ELSE
   INSERT INTO public.core_personas_direcciones(
     id_persona,tipo,direccion,referencia,pais,departamento,
     provincia,distrito,principal
   ) VALUES(
     v_persona,'DOMICILIO',v_direccion,nullif(v_referencia,''),
     v_pais,v_departamento,v_provincia,v_distrito,true);
 END IF;
 UPDATE public.crm_prospectos SET id_origen_prospecto=v_origen,
   fecha_actualizacion=now() WHERE id_prospecto=p_prospecto;
 UPDATE public.crm_prospectos_intereses
   SET fecha_interes=now(),fecha_actualizacion=now()
 WHERE id_prospecto=p_prospecto AND id_proyecto=v_proyecto AND activo;
 IF NOT FOUND THEN
   INSERT INTO public.crm_prospectos_intereses(id_prospecto,id_proyecto,activo)
   VALUES(p_prospecto,v_proyecto,true);
 END IF;

 SELECT id_asesor INTO v_asignado FROM public.com_asignaciones_prospecto
 WHERE id_prospecto_vigente=p_prospecto AND fecha_fin IS NULL LIMIT 1;
 IF p_datos ? 'idAsesor' AND p_datos->>'idAsesor' IS NOT NULL THEN
   IF (p_datos->>'idAsesor') !~ '^[0-9]+$'
   THEN RAISE EXCEPTION 'ASESOR_INVALIDO|Seleccione un asesor valido.'; END IF;
   v_nuevo_asesor:=(p_datos->>'idAsesor')::bigint;
   IF v_nuevo_asesor IS DISTINCT FROM v_asignado THEN
     IF NOT coalesce(public.fn_usuario_tiene_permiso_seguridad(p_actor,'crm.edit'::varchar),false)
       OR NOT EXISTS(
         SELECT 1 FROM public.seg_usuarios_roles ur JOIN public.seg_roles r ON r.id_rol=ur.id_rol
         WHERE ur.id_usuario=p_actor AND ur.activo AND ur.fecha_revocacion IS NULL AND r.activo
           AND coalesce(public.fn_usuario_tiene_permiso_seguridad(ur.id_usuario,'sales.reassign_advisor'::varchar),false)
       ) THEN RAISE EXCEPTION 'DENEGADO|Solo Gerencia o Supervisor comercial pueden reasignar asesor.'; END IF;
     PERFORM public.sp_crm_asignar_asesor_v3(
       p_actor,p_prospecto,v_nuevo_asesor,'Reasignacion durante validacion contractual');
   END IF;
 END IF;

 -- Crear una venta y vincular su cliente en el mismo contexto transaccional.
 v_resultado:=public.sp_crm_registrar_venta_pendiente_v9(
   p_actor,p_prospecto,p_lote,p_modalidad,p_monto_total,
   p_monto_inicial,p_numero_cuotas,p_tasa_mensual_pct,p_observaciones);
 -- El registro sigue siendo pendiente de auditoría; no constituye pago aprobado.
 v_id_venta:=(v_resultado->>'idVenta')::bigint;
 v_monto_objetivo:=CASE WHEN p_modalidad='FINANCIADA'
   THEN p_monto_inicial
   ELSE (v_resultado->>'saldoContado')::numeric END;
 IF v_monto_objetivo IS NULL THEN
   v_monto_objetivo:=p_monto_total-coalesce((v_resultado->>'montoReservaAplicable')::numeric,0);
 END IF;
 INSERT INTO public.ven_ventas_medios_pago(
   id_venta,id_metodo_pago,numero_operacion,monto_pendiente_revision,
   tipo_abono,id_usuario_registro
 ) VALUES (v_id_venta,v_id_metodo,nullif(v_numero_operacion,''),
   v_monto_objetivo,CASE WHEN p_modalidad='FINANCIADA' THEN 'INICIAL' ELSE 'CONTADO' END,p_actor);
 FOR v_archivo IN SELECT value FROM jsonb_array_elements(v_archivos) LOOP
   INSERT INTO public.ven_ventas_comprobantes(
     id_venta,clave_archivo,nombre_archivo,tipo_mime,tamanio_bytes)
   VALUES (v_id_venta,v_archivo->>'claveArchivo',
     v_archivo->>'nombreArchivo',v_archivo->>'tipoMime',
     (v_archivo->>'tamanioBytes')::bigint);
 END LOOP;
 INSERT INTO public.crm_ventas_datos_comprador(
   id_venta,id_prospecto,id_persona,id_usuario_revision,datos_revisados
 ) VALUES(
   (v_resultado->>'idVenta')::bigint,p_prospecto,v_persona,p_actor,
   p_datos||jsonb_build_object('revisadoEn',now(),'modalidad',p_modalidad,
     'idLote',p_lote,'precioVenta',p_monto_total)
 );
 RETURN v_resultado||jsonb_build_object('datosCompradorRevisados',true);
END $function$;

COMMIT;
