-- ==============================================================================
-- SGI-MONOLITHE: MIGRACION 69 - PROCEDIMIENTOS DE DASHBOARD E INDICADORES INTEGRALES
-- Modulo: dashboard / kpis / analitica gerencial
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.sp_obtener_kpis_gerenciales()
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_total_lotes BIGINT;
    v_lotes_disponibles BIGINT;
    v_lotes_reservados BIGINT;
    v_lotes_vendidos BIGINT;
    v_total_ventas NUMERIC;
    v_total_recaudado NUMERIC;
    v_saldo_cartera NUMERIC;
    v_comisiones_generadas NUMERIC;
    v_comisiones_aprobadas NUMERIC;
    v_clientes_activos BIGINT;
    v_cuotas_vencidas_monto NUMERIC;
    v_cuotas_vencidas_cantidad BIGINT;
BEGIN
    SELECT COUNT(*) INTO v_total_lotes FROM public.inm_lotes;
    SELECT COUNT(*) INTO v_lotes_disponibles FROM public.inm_lotes WHERE id_estado_lote = 6;
    SELECT COUNT(*) INTO v_lotes_reservados FROM public.inm_lotes WHERE id_estado_lote = 7;
    SELECT COUNT(*) INTO v_lotes_vendidos FROM public.inm_lotes WHERE id_estado_lote = 8;

    SELECT COALESCE(SUM(precio_venta), 0) INTO v_total_ventas FROM public.ven_ventas;
    SELECT COALESCE(SUM(monto), 0) INTO v_total_recaudado FROM public.pag_pagos WHERE id_estado_pago = 5;

    v_saldo_cartera := GREATEST(0, v_total_ventas - v_total_recaudado);

    SELECT COALESCE(SUM(monto_comision_final), 0) INTO v_comisiones_generadas FROM public.com_comisiones;
    SELECT COALESCE(SUM(monto_comision_final), 0) INTO v_comisiones_aprobadas FROM public.com_comisiones WHERE id_estado_comision = 6;

    SELECT COUNT(*) INTO v_clientes_activos FROM public.crm_clientes WHERE activo = TRUE;

    SELECT
        COALESCE(SUM(monto_cuota), 0),
        COUNT(*)
    INTO
        v_cuotas_vencidas_monto,
        v_cuotas_vencidas_cantidad
    FROM public.pag_cuotas
    WHERE id_estado_cuota = 9
       OR (id_estado_cuota = 6 AND fecha_vencimiento < CURRENT_DATE);

    RETURN jsonb_build_object(
        'total_lotes', v_total_lotes,
        'lotes_disponibles', v_lotes_disponibles,
        'lotes_reservados', v_lotes_reservados,
        'lotes_vendidos', v_lotes_vendidos,
        'total_ventas', v_total_ventas,
        'total_recaudado', v_total_recaudado,
        'saldo_cartera', v_saldo_cartera,
        'comisiones_generadas', v_comisiones_generadas,
        'comisiones_aprobadas', v_comisiones_aprobadas,
        'clientes_activos', v_clientes_activos,
        'cuotas_vencidas_monto', v_cuotas_vencidas_monto,
        'cuotas_vencidas_cantidad', v_cuotas_vencidas_cantidad
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.sp_obtener_kpis_gerenciales() TO anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.sp_obtener_dashboard_resumen()
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_res JSONB;
BEGIN
    SELECT jsonb_build_object(
        'kpis', (
            SELECT public.sp_obtener_kpis_gerenciales()
        ),
        'operaciones_pendientes', (
            SELECT jsonb_build_object(
                'vouchers_por_validar', (SELECT COUNT(*) FROM public.pag_vouchers WHERE id_estado_voucher = 4),
                'cuotas_vencidas', (SELECT COUNT(*) FROM public.pag_cuotas WHERE id_estado_cuota = 9 OR (id_estado_cuota = 6 AND fecha_vencimiento < CURRENT_DATE)),
                'separaciones_por_vencer', (SELECT COUNT(*) FROM public.ven_reservas WHERE id_estado_reserva = 7 AND fecha_vencimiento <= NOW() + INTERVAL '3 days'),
                'leads_sin_asignar', (SELECT COUNT(*) FROM public.crm_prospectos WHERE activo = TRUE AND id_estado_prospecto = 9),
                'comisiones_por_aprobar', (SELECT COUNT(*) FROM public.com_comisiones WHERE id_estado_comision = 5)
            )
        ),
        'proyectos', (
            SELECT COALESCE(jsonb_agg(p_item), '[]'::jsonb)
            FROM (
                SELECT
                    p.id_proyecto,
                    p.nombre,
                    COALESCE(COUNT(l.id_lote), 0) AS total_lotes,
                    COALESCE(COUNT(l.id_lote) FILTER (WHERE l.id_estado_lote = 8), 0) AS vendidos,
                    COALESCE(COUNT(l.id_lote) FILTER (WHERE l.id_estado_lote = 7), 0) AS reservados,
                    COALESCE(COUNT(l.id_lote) FILTER (WHERE l.id_estado_lote = 6), 0) AS disponibles
                FROM public.inm_proyectos p
                LEFT JOIN public.inm_manzanas m ON m.id_proyecto = p.id_proyecto
                LEFT JOIN public.inm_lotes l ON l.id_manzana = m.id_manzana
                WHERE p.activo = TRUE
                GROUP BY p.id_proyecto, p.nombre
                ORDER BY total_lotes DESC, p.id_proyecto
            ) p_item
        ),
        'tendencia_mensual', (
            SELECT COALESCE(jsonb_agg(t_item), '[]'::jsonb)
            FROM (
                WITH meses AS (
                    SELECT generate_series(
                        DATE_TRUNC('month', CURRENT_DATE) - INTERVAL '5 months',
                        DATE_TRUNC('month', CURRENT_DATE),
                        INTERVAL '1 month'
                    )::DATE AS mes_inicio
                )
                SELECT
                    TO_CHAR(m.mes_inicio, 'Mon') AS mes,
                    COALESCE(COUNT(DISTINCT r.id_reserva), 0) AS separaciones,
                    COALESCE(COUNT(DISTINCT v.id_venta), 0) AS ventas
                FROM meses m
                LEFT JOIN public.ven_reservas r
                    ON DATE_TRUNC('month', r.fecha_reserva) = m.mes_inicio
                LEFT JOIN public.ven_ventas v
                    ON DATE_TRUNC('month', v.fecha_venta) = m.mes_inicio
                GROUP BY m.mes_inicio
                ORDER BY m.mes_inicio ASC
            ) t_item
        ),
        'actividad_reciente', (
            SELECT COALESCE(jsonb_agg(a_item), '[]'::jsonb)
            FROM (
                SELECT
                    a.id_evento AS id,
                    TRIM(COALESCE(per.nombres, 'Sistema') || ' ' || COALESCE(per.apellido_paterno, '')) AS user,
                    UPPER(LEFT(COALESCE(per.nombres, 'S'), 1) || LEFT(COALESCE(per.apellido_paterno, 'S'), 1)) AS initials,
                    LOWER(REPLACE(a.accion, '_', ' ')) AS action,
                    COALESCE(a.descripcion, a.entidad) AS target,
                    a.modulo AS module,
                    TO_CHAR(a.fecha_evento, 'DD/MM HH24:MI') AS time
                FROM public.aud_eventos a
                LEFT JOIN public.seg_usuarios u ON u.id_usuario = a.id_usuario
                LEFT JOIN public.core_personas per ON per.id_persona = u.id_persona
                ORDER BY a.fecha_evento DESC
                LIMIT 5
            ) a_item
        )
    ) INTO v_res;
    RETURN v_res;
END;
$$;

GRANT EXECUTE ON FUNCTION public.sp_obtener_dashboard_resumen() TO anon, authenticated, service_role;

