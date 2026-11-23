-- 132: Captacion historica por canal y proyecto; mantener consultas acotadas por periodo intactas.
-- Mismos criterios de permisos, conversion y canales que sp_crm_fuentes_periodo_v7.
-- No modifica prospectos, ventas, seguimientos, clientes, contratos ni datos existentes.
BEGIN;

CREATE OR REPLACE FUNCTION public.sp_crm_fuentes_historico_v1(p_actor bigint, p_id_proyecto bigint DEFAULT NULL)
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

    IF p_id_proyecto IS NOT NULL AND p_id_proyecto <= 0 THEN
        RAISE EXCEPTION 'DATOS_INVALIDOS|Proyecto invalido.';
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

REVOKE ALL ON FUNCTION public.sp_crm_fuentes_historico_v1(BIGINT,BIGINT)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.sp_crm_fuentes_historico_v1(BIGINT,BIGINT)
  TO sigi_app_user;
COMMIT;
