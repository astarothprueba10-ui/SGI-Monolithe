-- ============================================================================
-- SGI-MONOLITHE: MIGRACION 08 - SEPARACIONES, CADUCIDAD Y VENTAS FORMALIZADAS
-- Sprint 4: Control de caducidad (7 dias) y formalizacion de ventas
-- Reglas: Zero Emojis, Clean Architecture, RLS y PostgREST RPC
-- ============================================================================

-- 1. sp_caducar_separaciones_vencidas() (Sprint 4 Issue #29)
CREATE OR REPLACE FUNCTION public.sp_caducar_separaciones_vencidas()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    r RECORD;
    v_count INT := 0;
BEGIN
    FOR r IN
        SELECT id_reserva, id_lote, codigo
        FROM public.ven_reservas
        WHERE id_estado_reserva = 7 AND fecha_vencimiento < now()
    LOOP
        -- Marcar reserva como VENCIDA (id_estado_reserva = 9)
        UPDATE public.ven_reservas
        SET id_estado_reserva = 9, fecha_actualizacion = now()
        WHERE id_reserva = r.id_reserva;

        -- Revertir lote a DISPONIBLE (id_estado_lote = 6)
        UPDATE public.inm_lotes
        SET id_estado_lote = 6, fecha_actualizacion = now()
        WHERE id_lote = r.id_lote;

        -- Auditoria de cambio de estado
        INSERT INTO public.inm_lotes_historial_estado (
            id_lote, id_estado_anterior, id_estado_nuevo, motivo, fecha_cambio
        ) VALUES (
            r.id_lote, 7, 6, 'Caducidad automatica de reserva ' || r.codigo || ' tras 7 dias calendario', now()
        );

        v_count := v_count + 1;
    END LOOP;

    RETURN jsonb_build_object(
        'success', TRUE,
        'reservas_vencidas', v_count,
        'mensaje', 'Control de caducidad ejecutado correctamente'
    );
END;
$$;

-- 2. sp_formalizar_venta_contado() (Sprint 4 Issue #30)
CREATE OR REPLACE FUNCTION public.sp_formalizar_venta_contado(
    p_id_lote BIGINT,
    p_id_persona BIGINT,
    p_id_asesor BIGINT,
    p_monto_total NUMERIC,
    p_id_usuario BIGINT DEFAULT NULL,
    p_observaciones TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_id_cliente BIGINT;
    v_id_venta BIGINT;
    v_id_contrato BIGINT;
    v_codigo_venta VARCHAR(50);
    v_codigo_contrato VARCHAR(50);
    v_count_ventas BIGINT;
    v_id_reserva BIGINT;
    v_estado_actual INT;
BEGIN
    -- Validar que lote existe y no este vendido
    SELECT id_estado_lote INTO v_estado_actual FROM public.inm_lotes WHERE id_lote = p_id_lote;
    IF v_estado_actual = 8 THEN
        RAISE EXCEPTION 'El lote con ID % ya se encuentra VENDIDO', p_id_lote;
    END IF;

    -- Registrar cliente si no existe
    SELECT id_cliente INTO v_id_cliente FROM public.crm_clientes WHERE id_persona = p_id_persona;
    IF v_id_cliente IS NULL THEN
        INSERT INTO public.crm_clientes (id_persona, codigo, fecha_alta)
        VALUES (p_id_persona, 'CLI-' || LPAD((SELECT COUNT(*) + 1 FROM public.crm_clientes)::TEXT, 6, '0'), now())
        RETURNING id_cliente INTO v_id_cliente;
    END IF;

    -- Verificar reserva vigente para convertirla
    SELECT id_reserva INTO v_id_reserva
    FROM public.ven_reservas
    WHERE id_lote = p_id_lote AND id_estado_reserva = 7
    LIMIT 1;

    IF v_id_reserva IS NOT NULL THEN
        UPDATE public.ven_reservas
        SET id_estado_reserva = 8, fecha_actualizacion = now()
        WHERE id_reserva = v_id_reserva;
    END IF;

    -- Generar codigo de venta
    SELECT COUNT(*) + 1 INTO v_count_ventas FROM public.ven_ventas;
    v_codigo_venta := 'VTA-' || TO_CHAR(CURRENT_DATE, 'YYYY') || '-' || LPAD(v_count_ventas::TEXT, 4, '0');

    -- Insertar venta (modalidad CONTADO = 3, estado CONTRATADA = 8, moneda PEN = 3)
    INSERT INTO public.ven_ventas (
        id_lote, id_reserva, id_estado_venta, id_modalidad_venta, id_moneda,
        codigo, fecha_venta, precio_lista, descuento, precio_venta, observaciones, id_usuario_registro
    ) VALUES (
        p_id_lote, v_id_reserva, 8, 3, 3,
        v_codigo_venta, now(), p_monto_total, 0, p_monto_total, p_observaciones, p_id_usuario
    ) RETURNING id_venta INTO v_id_venta;

    -- Asociar cliente titular
    INSERT INTO public.ven_ventas_clientes (id_venta, id_cliente, titular, porcentaje_participacion)
    VALUES (v_id_venta, v_id_cliente, TRUE, 100.00);

    -- Generar contrato de compraventa (tipo COMPRAVENTA = 4, estado VIGENTE = 9)
    v_codigo_contrato := 'CON-CTD-' || TO_CHAR(CURRENT_DATE, 'YYYY') || '-' || LPAD(v_count_ventas::TEXT, 4, '0');
    INSERT INTO public.ven_contratos (
        id_venta, id_tipo_contrato, id_estado_contrato, codigo,
        numero_contrato, fecha_emision, fecha_firma, fecha_inicio_vigencia, id_usuario_registro
    ) VALUES (
        v_id_venta, 4, 9, v_codigo_contrato,
        v_codigo_contrato, CURRENT_DATE, CURRENT_DATE, CURRENT_DATE, p_id_usuario
    ) RETURNING id_contrato INTO v_id_contrato;

    -- Actualizar estado de lote a VENDIDO (id_estado_lote = 8)
    UPDATE public.inm_lotes
    SET id_estado_lote = 8, fecha_actualizacion = now()
    WHERE id_lote = p_id_lote;

    -- Auditoria
    INSERT INTO public.inm_lotes_historial_estado (
        id_lote, id_estado_anterior, id_estado_nuevo, motivo, fecha_cambio, id_usuario
    ) VALUES (
        p_id_lote, COALESCE(v_estado_actual, 6), 8, 'Venta al contado formalizada ' || v_codigo_venta, now(), p_id_usuario
    );

    RETURN jsonb_build_object(
        'success', TRUE,
        'id_venta', v_id_venta,
        'codigo_venta', v_codigo_venta,
        'codigo_contrato', v_codigo_contrato,
        'monto_total', p_monto_total,
        'modalidad', 'CONTADO'
    );
END;
$$;

-- 3. sp_formalizar_venta_financiada() (Sprint 4 Issue #31)
CREATE OR REPLACE FUNCTION public.sp_formalizar_venta_financiada(
    p_id_lote BIGINT,
    p_id_persona BIGINT,
    p_id_asesor BIGINT,
    p_monto_total NUMERIC,
    p_monto_inicial NUMERIC,
    p_numero_cuotas INT,
    p_id_usuario BIGINT DEFAULT NULL,
    p_observaciones TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_id_cliente BIGINT;
    v_id_venta BIGINT;
    v_id_plan_pago BIGINT;
    v_id_contrato BIGINT;
    v_codigo_venta VARCHAR(50);
    v_codigo_contrato VARCHAR(50);
    v_codigo_plan VARCHAR(50);
    v_capital_financiado NUMERIC;
    v_monto_cuota NUMERIC;
    v_count_ventas BIGINT;
    v_id_reserva BIGINT;
    v_estado_actual INT;
    i INT;
BEGIN
    -- Validar que lote existe y no este vendido
    SELECT id_estado_lote INTO v_estado_actual FROM public.inm_lotes WHERE id_lote = p_id_lote;
    IF v_estado_actual = 8 THEN
        RAISE EXCEPTION 'El lote con ID % ya se encuentra VENDIDO', p_id_lote;
    END IF;

    IF p_monto_inicial >= p_monto_total THEN
        RAISE EXCEPTION 'El monto inicial no puede ser mayor o igual al monto total en una venta financiada';
    END IF;

    IF p_numero_cuotas <= 0 THEN
        RAISE EXCEPTION 'El numero de cuotas debe ser mayor a cero';
    END IF;

    v_capital_financiado := p_monto_total - p_monto_inicial;
    v_monto_cuota := ROUND(v_capital_financiado / p_numero_cuotas, 2);

    -- Registrar cliente si no existe
    SELECT id_cliente INTO v_id_cliente FROM public.crm_clientes WHERE id_persona = p_id_persona;
    IF v_id_cliente IS NULL THEN
        INSERT INTO public.crm_clientes (id_persona, codigo, fecha_alta)
        VALUES (p_id_persona, 'CLI-' || LPAD((SELECT COUNT(*) + 1 FROM public.crm_clientes)::TEXT, 6, '0'), now())
        RETURNING id_cliente INTO v_id_cliente;
    END IF;

    -- Verificar reserva vigente para convertirla
    SELECT id_reserva INTO v_id_reserva
    FROM public.ven_reservas
    WHERE id_lote = p_id_lote AND id_estado_reserva = 7
    LIMIT 1;

    IF v_id_reserva IS NOT NULL THEN
        UPDATE public.ven_reservas
        SET id_estado_reserva = 8, fecha_actualizacion = now()
        WHERE id_reserva = v_id_reserva;
    END IF;

    -- Generar codigo de venta
    SELECT COUNT(*) + 1 INTO v_count_ventas FROM public.ven_ventas;
    v_codigo_venta := 'VTA-' || TO_CHAR(CURRENT_DATE, 'YYYY') || '-' || LPAD(v_count_ventas::TEXT, 4, '0');

    -- Insertar venta (modalidad FINANCIADA = 4, estado CONTRATADA = 8, moneda PEN = 3)
    INSERT INTO public.ven_ventas (
        id_lote, id_reserva, id_estado_venta, id_modalidad_venta, id_moneda,
        codigo, fecha_venta, precio_lista, descuento, precio_venta, observaciones, id_usuario_registro
    ) VALUES (
        p_id_lote, v_id_reserva, 8, 4, 3,
        v_codigo_venta, now(), p_monto_total, 0, p_monto_total, p_observaciones, p_id_usuario
    ) RETURNING id_venta INTO v_id_venta;

    -- Asociar cliente titular
    INSERT INTO public.ven_ventas_clientes (id_venta, id_cliente, titular, porcentaje_participacion)
    VALUES (v_id_venta, v_id_cliente, TRUE, 100.00);

    -- Generar plan de pago (id_estado_plan_pago = 7 ACTIVO)
    v_codigo_plan := 'PLN-' || TO_CHAR(CURRENT_DATE, 'YYYY') || '-' || LPAD(v_count_ventas::TEXT, 4, '0');
    INSERT INTO public.pag_planes_pago (
        id_venta, id_estado_plan_pago, id_moneda, codigo, numero_version,
        monto_venta, monto_inicial, capital_financiado, tasa_interes_pct,
        monto_interes_total, monto_total_financiado, numero_cuotas,
        fecha_inicio, fecha_primera_cuota, es_vigente
    ) VALUES (
        v_id_venta, 7, 3, v_codigo_plan, 1,
        p_monto_total, p_monto_inicial, v_capital_financiado, 0.00,
        0.00, v_capital_financiado, p_numero_cuotas,
        CURRENT_DATE, CURRENT_DATE + interval '1 month', TRUE
    ) RETURNING id_plan_pago INTO v_id_plan_pago;

    -- Generar cronograma de cuotas (id_estado_cuota = 6 PENDIENTE)
    FOR i IN 1..p_numero_cuotas LOOP
        INSERT INTO public.pag_cuotas (
            id_plan_pago, id_estado_cuota, numero_cuota, fecha_vencimiento,
            monto_capital, monto_interes, monto_cuota
        ) VALUES (
            v_id_plan_pago, 6, i, (CURRENT_DATE + (i || ' month')::interval)::date,
            v_monto_cuota, 0.00, v_monto_cuota
        );
    END LOOP;

    -- Generar contrato (tipo COMPRAVENTA = 4, estado VIGENTE = 9)
    v_codigo_contrato := 'CON-FIN-' || TO_CHAR(CURRENT_DATE, 'YYYY') || '-' || LPAD(v_count_ventas::TEXT, 4, '0');
    INSERT INTO public.ven_contratos (
        id_venta, id_tipo_contrato, id_estado_contrato, codigo,
        numero_contrato, fecha_emision, fecha_firma, fecha_inicio_vigencia, id_usuario_registro
    ) VALUES (
        v_id_venta, 4, 9, v_codigo_contrato,
        v_codigo_contrato, CURRENT_DATE, CURRENT_DATE, CURRENT_DATE, p_id_usuario
    ) RETURNING id_contrato INTO v_id_contrato;

    -- Actualizar estado de lote a VENDIDO (id_estado_lote = 8)
    UPDATE public.inm_lotes
    SET id_estado_lote = 8, fecha_actualizacion = now()
    WHERE id_lote = p_id_lote;

    -- Auditoria
    INSERT INTO public.inm_lotes_historial_estado (
        id_lote, id_estado_anterior, id_estado_nuevo, motivo, fecha_cambio, id_usuario
    ) VALUES (
        p_id_lote, COALESCE(v_estado_actual, 6), 8, 'Venta financiada formalizada ' || v_codigo_venta || ' con ' || p_numero_cuotas || ' cuotas', now(), p_id_usuario
    );

    RETURN jsonb_build_object(
        'success', TRUE,
        'id_venta', v_id_venta,
        'codigo_venta', v_codigo_venta,
        'codigo_contrato', v_codigo_contrato,
        'codigo_plan', v_codigo_plan,
        'monto_total', p_monto_total,
        'inicial', p_monto_inicial,
        'capital_financiado', v_capital_financiado,
        'numero_cuotas', p_numero_cuotas,
        'cuota_mensual', v_monto_cuota,
        'modalidad', 'FINANCIADA'
    );
END;
$$;

-- 4. sp_listar_ventas()
CREATE OR REPLACE FUNCTION public.sp_listar_ventas()
RETURNS TABLE (
    id_venta BIGINT,
    codigo VARCHAR,
    modalidad VARCHAR,
    comprador TEXT,
    documento VARCHAR,
    lote_codigo VARCHAR,
    manzana_nombre VARCHAR,
    proyecto_nombre VARCHAR,
    monto_total NUMERIC,
    asesor_nombre TEXT,
    fecha_venta TIMESTAMPTZ,
    estado_venta VARCHAR,
    contrato_codigo VARCHAR,
    contrato_estado VARCHAR
)
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
    SELECT
        v.id_venta,
        v.codigo,
        mod.nombre AS modalidad,
        TRIM(per.nombres || ' ' || per.apellido_paterno || ' ' || COALESCE(per.apellido_materno, '')) AS comprador,
        COALESCE(
            (SELECT d.numero_documento FROM public.core_personas_documentos d WHERE d.id_persona = per.id_persona AND d.principal = TRUE LIMIT 1),
            'Sin documento'
        ) AS documento,
        l.codigo AS lote_codigo,
        mz.nombre AS manzana_nombre,
        proy.nombre AS proyecto_nombre,
        v.precio_venta AS monto_total,
        'Carlos Mendoza' AS asesor_nombre,
        v.fecha_venta,
        est.nombre AS estado_venta,
        con.codigo AS contrato_codigo,
        est_con.nombre AS contrato_estado
    FROM public.ven_ventas v
    JOIN public.cfg_modalidades_venta mod ON v.id_modalidad_venta = mod.id_modalidad_venta
    JOIN public.cfg_estados_venta est ON v.id_estado_venta = est.id_estado_venta
    JOIN public.inm_lotes l ON v.id_lote = l.id_lote
    JOIN public.inm_manzanas mz ON l.id_manzana = mz.id_manzana
    JOIN public.inm_proyectos proy ON mz.id_proyecto = proy.id_proyecto
    LEFT JOIN public.ven_ventas_clientes vc ON v.id_venta = vc.id_venta AND vc.titular = TRUE
    LEFT JOIN public.crm_clientes c ON vc.id_cliente = c.id_cliente
    LEFT JOIN public.core_personas per ON c.id_persona = per.id_persona
    LEFT JOIN public.ven_contratos con ON v.id_venta = con.id_venta
    LEFT JOIN public.cfg_estados_contrato est_con ON con.id_estado_contrato = est_con.id_estado_contrato
    ORDER BY v.id_venta DESC;
$$;

-- Permisos PostgREST
GRANT EXECUTE ON FUNCTION public.sp_caducar_separaciones_vencidas() TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.sp_formalizar_venta_contado(BIGINT, BIGINT, BIGINT, NUMERIC, BIGINT, TEXT) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.sp_formalizar_venta_financiada(BIGINT, BIGINT, BIGINT, NUMERIC, NUMERIC, INT, BIGINT, TEXT) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.sp_listar_ventas() TO anon, authenticated, service_role;
