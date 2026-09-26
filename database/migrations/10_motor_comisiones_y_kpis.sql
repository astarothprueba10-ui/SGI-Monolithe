-- ==========================================================================
-- SGI-MONOLITHE: MIGRACION 10 - MOTOR DE COMISIONES Y KPIS GERENCIALES
-- Reglas: Metodos <= 20 lineas, Cero Emojis, Clean Architecture, RLS & PostgREST
-- Modulo: Sprint 7 - Comisiones y Dashboard Ejecutivo
-- ==========================================================================

-- 1. Reglas de comision comercial (3% Contado, 2% Financiado)
INSERT INTO public.com_reglas_comision (
    id_proyecto, id_tipo_asesor, id_modalidad_venta, id_tipo_calculo_comision, id_moneda,
    codigo, nombre, descripcion, valor, prioridad, fecha_desde, activo
) VALUES
(2, 3, 3, 3, 3, 'RGL-COM-CTD-01', 'Comision 3% Venta al Contado', 'Comision del 3% sobre el valor total de venta al contado', 3.00, 1, now(), TRUE),
(2, 3, 4, 3, 3, 'RGL-COM-FIN-01', 'Comision 2% Venta Financiada', 'Comision del 2% sobre el valor total de venta financiada', 2.00, 1, now(), TRUE)
ON CONFLICT (codigo) DO UPDATE
SET valor = EXCLUDED.valor, activo = EXCLUDED.activo;

-- 2. sp_calcular_comision_venta(p_id_venta, p_id_asesor)
CREATE OR REPLACE FUNCTION public.sp_calcular_comision_venta(
    p_id_venta BIGINT,
    p_id_asesor BIGINT DEFAULT 1
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_id_modalidad INT;
    v_monto_base NUMERIC;
    v_id_moneda INT;
    v_id_regla BIGINT;
    v_porcentaje NUMERIC;
    v_id_venta_asesor BIGINT;
    v_id_comision BIGINT;
    v_monto_comision NUMERIC;
    v_codigo_comision VARCHAR(50);
    v_count BIGINT;
    v_usuario_valido BIGINT;
BEGIN
    SELECT id_usuario INTO v_usuario_valido FROM public.seg_usuarios ORDER BY id_usuario ASC LIMIT 1;
    SELECT id_modalidad_venta, precio_venta, id_moneda
    INTO v_id_modalidad, v_monto_base, v_id_moneda
    FROM public.ven_ventas WHERE id_venta = p_id_venta;

    -- Obtener regla de comision activa
    SELECT id_regla_comision, valor INTO v_id_regla, v_porcentaje
    FROM public.com_reglas_comision
    WHERE id_modalidad_venta = v_id_modalidad AND activo = TRUE
    ORDER BY prioridad ASC LIMIT 1;

    IF v_id_regla IS NULL THEN
        RAISE EXCEPTION 'No se encontro regla de comision aplicable para la venta %', p_id_venta;
    END IF;

    -- Registrar asesor en venta si no existe
    SELECT id_venta_asesor INTO v_id_venta_asesor
    FROM public.com_ventas_asesores WHERE id_venta = p_id_venta AND id_asesor = p_id_asesor;

    IF v_id_venta_asesor IS NULL THEN
        INSERT INTO public.com_ventas_asesores (
            id_venta, id_asesor, es_principal, porcentaje_participacion,
            fecha_asignacion, id_usuario_registro
        ) VALUES (
            p_id_venta, p_id_asesor, TRUE, 100.00,
            now(), v_usuario_valido
        ) RETURNING id_venta_asesor INTO v_id_venta_asesor;
    END IF;

    v_monto_comision := ROUND(v_monto_base * (v_porcentaje / 100.0), 2);
    SELECT COUNT(*) + 1 INTO v_count FROM public.com_comisiones;
    v_codigo_comision := 'CMS-' || TO_CHAR(CURRENT_DATE, 'YYYY') || '-' || LPAD(v_count::TEXT, 4, '0');

    INSERT INTO public.com_comisiones (
        id_venta_asesor, id_regla_comision, id_estado_comision, id_moneda,
        codigo, monto_base, valor_regla_aplicado, porcentaje_participacion_aplicado,
        monto_comision_calculada, monto_comision_final, fecha_generacion
    ) VALUES (
        v_id_venta_asesor, v_id_regla, 5, v_id_moneda,
        v_codigo_comision, v_monto_base, v_porcentaje, 100.00,
        v_monto_comision, v_monto_comision, now()
    )
    ON CONFLICT (id_venta_asesor) DO UPDATE
    SET monto_comision_calculada = EXCLUDED.monto_comision_calculada,
        monto_comision_final = EXCLUDED.monto_comision_final
    RETURNING id_comision INTO v_id_comision;

    RETURN jsonb_build_object(
        'success', TRUE,
        'id_comision', v_id_comision,
        'codigo_comision', v_codigo_comision,
        'monto_base', v_monto_base,
        'porcentaje', v_porcentaje,
        'monto_comision', v_monto_comision,
        'estado', 'PENDIENTE'
    );
END;
$$;

-- 3. sp_aprobar_devengo_comision(p_id_comision)
CREATE OR REPLACE FUNCTION public.sp_aprobar_devengo_comision(
    p_id_comision BIGINT,
    p_id_usuario BIGINT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_id_venta BIGINT;
    v_id_estado_contrato INT;
    v_usuario_valido BIGINT;
BEGIN
    SELECT va.id_venta INTO v_id_venta
    FROM public.com_comisiones c
    JOIN public.com_ventas_asesores va ON c.id_venta_asesor = va.id_venta_asesor
    WHERE c.id_comision = p_id_comision;

    IF v_id_venta IS NULL THEN
        RAISE EXCEPTION 'Comision con ID % no encontrada', p_id_comision;
    END IF;

    -- Validar que el contrato este VIGENTE (id_estado_contrato = 9)
    SELECT con.id_estado_contrato INTO v_id_estado_contrato
    FROM public.ven_contratos con
    WHERE con.id_venta = v_id_venta;

    IF v_id_estado_contrato IS NULL OR v_id_estado_contrato != 9 THEN
        RAISE EXCEPTION 'No se puede devengar comision: la venta requiere contrato formal firmado y vigente';
    END IF;

    SELECT id_usuario INTO v_usuario_valido
    FROM public.seg_usuarios
    WHERE id_usuario = p_id_usuario;

    IF v_usuario_valido IS NULL THEN
        SELECT id_usuario INTO v_usuario_valido FROM public.seg_usuarios ORDER BY id_usuario ASC LIMIT 1;
    END IF;

    UPDATE public.com_comisiones
    SET id_estado_comision = 6, fecha_aprobacion = now(), id_usuario_aprobacion = v_usuario_valido, fecha_actualizacion = now()
    WHERE id_comision = p_id_comision;

    RETURN jsonb_build_object(
        'success', TRUE,
        'id_comision', p_id_comision,
        'estado', 'APROBADA',
        'mensaje', 'Devengo de comision aprobado conforme a contrato formal vigente'
    );
END;
$$;

-- 4. sp_obtener_kpis_gerenciales()
CREATE OR REPLACE FUNCTION public.sp_obtener_kpis_gerenciales()
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
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

    RETURN jsonb_build_object(
        'total_lotes', v_total_lotes,
        'lotes_disponibles', v_lotes_disponibles,
        'lotes_reservados', v_lotes_reservados,
        'lotes_vendidos', v_lotes_vendidos,
        'total_ventas', v_total_ventas,
        'total_recaudado', v_total_recaudado,
        'saldo_cartera', v_saldo_cartera,
        'comisiones_generadas', v_comisiones_generadas,
        'comisiones_aprobadas', v_comisiones_aprobadas
    );
END;
$$;

-- 5. sp_listar_liquidaciones_asesores()
CREATE OR REPLACE FUNCTION public.sp_listar_liquidaciones_asesores()
RETURNS TABLE (
    id_comision BIGINT,
    codigo_comision VARCHAR,
    codigo_venta VARCHAR,
    lote_codigo VARCHAR,
    asesor_nombre TEXT,
    modalidad VARCHAR,
    precio_venta NUMERIC,
    porcentaje_comision NUMERIC,
    monto_comision NUMERIC,
    estado_comision VARCHAR,
    contrato_codigo VARCHAR,
    contrato_estado VARCHAR,
    fecha_generacion TIMESTAMPTZ,
    fecha_aprobacion TIMESTAMPTZ
)
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
    SELECT
        c.id_comision,
        c.codigo AS codigo_comision,
        v.codigo AS codigo_venta,
        l.codigo AS lote_codigo,
        TRIM(per.nombres || ' ' || per.apellido_paterno || ' ' || COALESCE(per.apellido_materno, '')) AS asesor_nombre,
        mod.nombre AS modalidad,
        c.monto_base AS precio_venta,
        c.valor_regla_aplicado AS porcentaje_comision,
        c.monto_comision_final AS monto_comision,
        ec.nombre AS estado_comision,
        con.codigo AS contrato_codigo,
        est_con.nombre AS contrato_estado,
        c.fecha_generacion,
        c.fecha_aprobacion
    FROM public.com_comisiones c
    JOIN public.com_ventas_asesores va ON c.id_venta_asesor = va.id_venta_asesor
    JOIN public.com_asesores a ON va.id_asesor = a.id_asesor
    JOIN public.core_personas per ON a.id_persona = per.id_persona
    JOIN public.ven_ventas v ON va.id_venta = v.id_venta
    JOIN public.inm_lotes l ON v.id_lote = l.id_lote
    JOIN public.cfg_modalidades_venta mod ON v.id_modalidad_venta = mod.id_modalidad_venta
    JOIN public.cfg_estados_comision ec ON c.id_estado_comision = ec.id_estado_comision
    LEFT JOIN public.ven_contratos con ON v.id_venta = con.id_venta
    LEFT JOIN public.cfg_estados_contrato est_con ON con.id_estado_contrato = est_con.id_estado_contrato
    ORDER BY c.id_comision DESC;
$$;

-- Permisos PostgREST
GRANT EXECUTE ON FUNCTION public.sp_calcular_comision_venta(BIGINT, BIGINT) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.sp_aprobar_devengo_comision(BIGINT, BIGINT) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.sp_obtener_kpis_gerenciales() TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.sp_listar_liquidaciones_asesores() TO anon, authenticated, service_role;
