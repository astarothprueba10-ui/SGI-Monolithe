-- 128 | Métricas CRM segmentadas por proyecto sin alterar las rutinas vigentes.
-- Solo base de pruebas hasta aprobación de despliegue.
BEGIN;
CREATE OR REPLACE FUNCTION public.sp_crm_indicadores_periodo_v7(p_actor bigint, p_desde timestamp with time zone, p_hasta_exclusivo timestamp with time zone, p_id_proyecto bigint)
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
          AND r.codigo IN (
              'ADMINISTRADOR',
              'GERENCIA',
              'SUPERVISOR_COMERCIAL',
              'ADMINISTRACION'
          )
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
                WHERE c.id_persona = x.id_persona AND (p_id_proyecto IS NULL OR EXISTS (
            SELECT 1 FROM public.inm_lotes lp
            WHERE lp.id_lote=v.id_lote AND lp.id_proyecto=p_id_proyecto
        ))
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
        WHERE (p_id_proyecto IS NULL OR EXISTS (
            SELECT 1 FROM public.crm_prospectos_intereses pi
            WHERE pi.id_prospecto=x.id_prospecto
              AND pi.id_proyecto=p_id_proyecto AND pi.activo
        ))
          AND COALESCE(
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
          AND (p_id_proyecto IS NULL OR EXISTS (
            SELECT 1 FROM public.inm_lotes lp
            WHERE lp.id_lote=v.id_lote AND lp.id_proyecto=p_id_proyecto
        ))
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

REVOKE ALL ON FUNCTION public.sp_crm_indicadores_periodo_v7(BIGINT,TIMESTAMPTZ,TIMESTAMPTZ,BIGINT) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.sp_crm_indicadores_periodo_v7(BIGINT,TIMESTAMPTZ,TIMESTAMPTZ,BIGINT) TO sigi_app_user;

CREATE OR REPLACE FUNCTION public.sp_crm_evolucion_mensual_v7(p_actor bigint, p_desde timestamp with time zone, p_hasta_exclusivo timestamp with time zone, p_id_proyecto bigint)
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
          AND r.codigo IN (
              'ADMINISTRADOR',
              'GERENCIA',
              'SUPERVISOR_COMERCIAL',
              'ADMINISTRACION'
          )
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
                WHERE cl.id_persona = x.id_persona AND (p_id_proyecto IS NULL OR EXISTS (
            SELECT 1 FROM public.inm_lotes lp
            WHERE lp.id_lote=v.id_lote AND lp.id_proyecto=p_id_proyecto
        ))
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
        WHERE (p_id_proyecto IS NULL OR EXISTS (
            SELECT 1 FROM public.crm_prospectos_intereses pi
            WHERE pi.id_prospecto=x.id_prospecto
              AND pi.id_proyecto=p_id_proyecto AND pi.activo
        ))
          AND COALESCE(
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
          AND (p_id_proyecto IS NULL OR EXISTS (
            SELECT 1 FROM public.inm_lotes lp
            WHERE lp.id_lote=v.id_lote AND lp.id_proyecto=p_id_proyecto
        ))
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

REVOKE ALL ON FUNCTION public.sp_crm_evolucion_mensual_v7(BIGINT,TIMESTAMPTZ,TIMESTAMPTZ,BIGINT) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.sp_crm_evolucion_mensual_v7(BIGINT,TIMESTAMPTZ,TIMESTAMPTZ,BIGINT) TO sigi_app_user;

CREATE OR REPLACE FUNCTION public.sp_crm_fuentes_periodo_v7(p_actor bigint, p_desde timestamp with time zone, p_hasta_exclusivo timestamp with time zone, p_id_proyecto bigint)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'pg_temp'
AS $function$
DECLARE
    v_resultado JSONB;
BEGIN
    IF p_actor IS NULL OR p_actor <= 0
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

    WITH base AS (
        SELECT
            x.id_prospecto,
            x.origen_codigo,
            x.estado_codigo,
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
                WHERE c.id_persona = x.id_persona AND (p_id_proyecto IS NULL OR EXISTS (
            SELECT 1 FROM public.inm_lotes lp
            WHERE lp.id_lote=v.id_lote AND lp.id_proyecto=p_id_proyecto
        ))
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
            ) AS convertido

        FROM public.sp_listar_prospectos() x

        WHERE (p_id_proyecto IS NULL OR EXISTS (
            SELECT 1 FROM public.crm_prospectos_intereses pi
            WHERE pi.id_prospecto=x.id_prospecto
              AND pi.id_proyecto=p_id_proyecto AND pi.activo
        ))
          AND x.fecha_registro >= p_desde
          AND x.fecha_registro < p_hasta_exclusivo

          -- NUEVA VALIDACION DE CARTERA COMERCIAL.
          AND COALESCE(
              public.fn_crm_puede_consultar_prospecto(
                  p_actor,
                  x.id_prospecto
              ),
              FALSE
          )
    ),

    agregados AS (
        SELECT
            origen_codigo,
            COUNT(*)::INTEGER AS total,

            COUNT(*) FILTER (
                WHERE NOT convertido
                  AND estado_codigo IN (
                      'NUEVO',
                      'CONTACTADO',
                      'EN_SEGUIMIENTO',
                      'INTERESADO',
                      'NEGOCIACION','CON_RESERVA'
                  )
            )::INTEGER AS activos,

            COUNT(*) FILTER (
                WHERE convertido
            )::INTEGER AS convertidos

        FROM base
        GROUP BY origen_codigo
    ),

    total_periodo AS (
        SELECT COALESCE(
            SUM(total), 0
        )::INTEGER AS total
        FROM agregados
    )

    SELECT jsonb_build_object(
        'total', tp.total,
        'items', COALESCE(
            jsonb_agg(
                jsonb_build_object(
                    'codigo', o.codigo,
                    'nombre', o.nombre,
                    'total', COALESCE(a.total, 0),
                    'activos', COALESCE(a.activos, 0),
                    'convertidos', COALESCE(a.convertidos, 0),
                    'participacion',
                        CASE
                            WHEN tp.total > 0 THEN
                                ROUND(
                                    100.0 *
                                    COALESCE(a.total, 0) /
                                    tp.total,
                                    2
                                )
                            ELSE 0
                        END
                )
                ORDER BY o.orden, o.codigo
            ),
            '[]'::jsonb
        )
    )
    INTO v_resultado

    FROM public.cfg_origenes_prospecto o

    LEFT JOIN agregados a
        ON a.origen_codigo = o.codigo

    CROSS JOIN total_periodo tp

    WHERE o.activo = TRUE

    GROUP BY tp.total;

    RETURN COALESCE(
        v_resultado,
        jsonb_build_object(
            'total', 0,
            'items', '[]'::jsonb
        )
    );
END;
$function$;

REVOKE ALL ON FUNCTION public.sp_crm_fuentes_periodo_v7(BIGINT,TIMESTAMPTZ,TIMESTAMPTZ,BIGINT) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.sp_crm_fuentes_periodo_v7(BIGINT,TIMESTAMPTZ,TIMESTAMPTZ,BIGINT) TO sigi_app_user;

CREATE OR REPLACE FUNCTION public.sp_crm_asesores_periodo_v7(p_actor bigint, p_desde timestamp with time zone, p_hasta_exclusivo timestamp with time zone, p_id_proyecto bigint)
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
          AND r.codigo IN (
              'ADMINISTRADOR',
              'GERENCIA',
              'SUPERVISOR_COMERCIAL',
              'ADMINISTRACION'
          )
    )
    INTO v_acceso_global;

    WITH asignaciones_periodo AS (
        SELECT
            ap.id_asesor,
            COUNT(*)::INTEGER AS asignaciones_periodo
        FROM public.com_asignaciones_prospecto ap
        WHERE (p_id_proyecto IS NULL OR EXISTS (
              SELECT 1 FROM public.crm_prospectos_intereses pi
              WHERE pi.id_prospecto=ap.id_prospecto AND pi.activo AND pi.id_proyecto=p_id_proyecto
          )) AND ap.fecha_asignacion >= p_desde
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

REVOKE ALL ON FUNCTION public.sp_crm_asesores_periodo_v7(BIGINT,TIMESTAMPTZ,TIMESTAMPTZ,BIGINT) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.sp_crm_asesores_periodo_v7(BIGINT,TIMESTAMPTZ,TIMESTAMPTZ,BIGINT) TO sigi_app_user;
COMMIT;
