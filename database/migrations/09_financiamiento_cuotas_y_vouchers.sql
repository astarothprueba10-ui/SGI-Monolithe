-- ==========================================================================
-- SGI-MONOLITHE: MIGRACION 09 - FINANCIAMIENTO, CUOTAS Y VOUCHERS
-- Reglas: Metodos <= 20 lineas, Cero Emojis, Clean Architecture, RLS & PostgREST
-- Modulo: Sprint 5 - Financiamiento y Tesoreria
-- ==========================================================================

-- 1. Actualizacion automatica del semaforo de cuotas (Pendiente -> Vencida)
CREATE OR REPLACE FUNCTION public.sp_actualizar_estados_cuotas()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_actualizadas INT := 0;
BEGIN
    UPDATE public.pag_cuotas
    SET id_estado_cuota = 9, fecha_actualizacion = now()
    WHERE id_estado_cuota = 6 AND fecha_vencimiento < CURRENT_DATE;

    GET DIAGNOSTICS v_actualizadas = ROW_COUNT;

    RETURN jsonb_build_object(
        'success', TRUE,
        'cuotas_vencidas', v_actualizadas,
        'mensaje', 'Semaforo de cuotas actualizado exitosamente'
    );
END;
$$;

-- 2. sp_listar_cronograma_venta(p_id_venta)
CREATE OR REPLACE FUNCTION public.sp_listar_cronograma_venta(p_id_venta BIGINT)
RETURNS TABLE (
    id_cuota BIGINT,
    id_plan_pago BIGINT,
    numero_cuota INT,
    fecha_vencimiento DATE,
    monto_capital NUMERIC,
    monto_interes NUMERIC,
    monto_cuota NUMERIC,
    id_estado_cuota INT,
    estado_codigo VARCHAR,
    estado_nombre VARCHAR,
    dias_mora INT,
    semaforo VARCHAR,
    fecha_pago_completo TIMESTAMPTZ
)
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
    SELECT
        c.id_cuota,
        c.id_plan_pago,
        c.numero_cuota,
        c.fecha_vencimiento,
        c.monto_capital,
        c.monto_interes,
        c.monto_cuota,
        c.id_estado_cuota,
        ec.codigo AS estado_codigo,
        ec.nombre AS estado_nombre,
        CASE
            WHEN c.id_estado_cuota = 8 THEN 0
            WHEN CURRENT_DATE > c.fecha_vencimiento THEN (CURRENT_DATE - c.fecha_vencimiento)
            ELSE 0
        END AS dias_mora,
        CASE
            WHEN c.id_estado_cuota = 8 THEN 'PAGADA'
            WHEN CURRENT_DATE > c.fecha_vencimiento THEN 'ROJO'
            WHEN c.fecha_vencimiento <= (CURRENT_DATE + INTERVAL '7 days') THEN 'AMARILLO'
            ELSE 'VERDE'
        END AS semaforo,
        c.fecha_pago_completo
    FROM public.pag_cuotas c
    JOIN public.pag_planes_pago pp ON c.id_plan_pago = pp.id_plan_pago
    JOIN public.cfg_estados_cuota ec ON c.id_estado_cuota = ec.id_estado_cuota
    WHERE pp.id_venta = p_id_venta
    ORDER BY c.numero_cuota ASC;
$$;

-- 3. sp_evaluar_clausula_resolutoria()
CREATE OR REPLACE FUNCTION public.sp_evaluar_clausula_resolutoria()
RETURNS TABLE (
    id_venta BIGINT,
    codigo_venta VARCHAR,
    lote_codigo VARCHAR,
    comprador TEXT,
    cuotas_vencidas BIGINT,
    monto_mora NUMERIC,
    clausula_aplicable BOOLEAN,
    estado_contrato VARCHAR
)
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
    SELECT
        v.id_venta,
        v.codigo AS codigo_venta,
        l.codigo AS lote_codigo,
        TRIM(per.nombres || ' ' || per.apellido_paterno || ' ' || COALESCE(per.apellido_materno, '')) AS comprador,
        COUNT(c.id_cuota) AS cuotas_vencidas,
        COALESCE(SUM(c.monto_cuota), 0) AS monto_mora,
        (COUNT(c.id_cuota) >= 3) AS clausula_aplicable,
        COALESCE(ec.nombre, 'Sin contrato') AS estado_contrato
    FROM public.ven_ventas v
    JOIN public.inm_lotes l ON v.id_lote = l.id_lote
    JOIN public.ven_ventas_clientes vc ON v.id_venta = vc.id_venta AND vc.titular = TRUE
    JOIN public.crm_clientes cli ON vc.id_cliente = cli.id_cliente
    JOIN public.core_personas per ON cli.id_persona = per.id_persona
    JOIN public.pag_planes_pago pp ON v.id_venta = pp.id_venta
    JOIN public.pag_cuotas c ON pp.id_plan_pago = c.id_plan_pago AND (c.id_estado_cuota = 9 OR (c.id_estado_cuota = 6 AND c.fecha_vencimiento < CURRENT_DATE))
    LEFT JOIN public.ven_contratos con ON v.id_venta = con.id_venta
    LEFT JOIN public.cfg_estados_contrato ec ON con.id_estado_contrato = ec.id_estado_contrato
    GROUP BY v.id_venta, v.codigo, l.codigo, per.nombres, per.apellido_paterno, per.apellido_materno, ec.nombre
    ORDER BY cuotas_vencidas DESC;
$$;

-- 4. sp_registrar_pago_voucher()
CREATE OR REPLACE FUNCTION public.sp_registrar_pago_voucher(
    p_id_venta BIGINT,
    p_id_cuota BIGINT,
    p_monto NUMERIC,
    p_id_metodo_pago INT,
    p_numero_operacion VARCHAR,
    p_nombre_archivo VARCHAR,
    p_clave_archivo VARCHAR,
    p_hash_sha256 VARCHAR,
    p_id_usuario BIGINT DEFAULT 1
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_id_moneda INT;
    v_id_plan_pago BIGINT;
    v_id_pago BIGINT;
    v_id_voucher BIGINT;
    v_codigo_pago VARCHAR(50);
    v_codigo_voucher VARCHAR(50);
    v_count BIGINT;
    v_usuario_valido BIGINT;
BEGIN
    SELECT id_moneda INTO v_id_moneda FROM public.ven_ventas WHERE id_venta = p_id_venta;
    SELECT id_plan_pago INTO v_id_plan_pago FROM public.pag_cuotas WHERE id_cuota = p_id_cuota;

    SELECT id_usuario INTO v_usuario_valido
    FROM public.seg_usuarios
    WHERE id_usuario = p_id_usuario;

    IF v_usuario_valido IS NULL THEN
        SELECT id_usuario INTO v_usuario_valido FROM public.seg_usuarios ORDER BY id_usuario ASC LIMIT 1;
    END IF;

    SELECT COUNT(*) + 1 INTO v_count FROM public.pag_pagos;
    v_codigo_pago := 'PAG-' || TO_CHAR(CURRENT_DATE, 'YYYY') || '-' || LPAD(v_count::TEXT, 4, '0');

    INSERT INTO public.pag_pagos (
        id_venta, id_plan_pago, id_estado_pago, id_metodo_pago, id_moneda,
        codigo, monto, fecha_operacion, numero_operacion, id_usuario_registro
    ) VALUES (
        p_id_venta, v_id_plan_pago, 4, p_id_metodo_pago, v_id_moneda,
        v_codigo_pago, p_monto, now(), p_numero_operacion, v_usuario_valido
    ) RETURNING id_pago INTO v_id_pago;

    v_codigo_voucher := 'VOU-' || TO_CHAR(CURRENT_DATE, 'YYYY') || '-' || LPAD(v_count::TEXT, 4, '0');

    INSERT INTO public.pag_vouchers (
        id_pago, id_estado_voucher, codigo, numero_version,
        nombre_archivo_original, clave_archivo, hash_sha256,
        fecha_carga, id_usuario_carga, activo
    ) VALUES (
        v_id_pago, 4, v_codigo_voucher, 1,
        p_nombre_archivo, p_clave_archivo, p_hash_sha256,
        now(), v_usuario_valido, TRUE
    ) RETURNING id_voucher INTO v_id_voucher;

    RETURN jsonb_build_object(
        'success', TRUE,
        'id_pago', v_id_pago,
        'id_voucher', v_id_voucher,
        'codigo_pago', v_codigo_pago,
        'codigo_voucher', v_codigo_voucher,
        'monto', p_monto
    );
END;
$$;

-- 5. sp_validar_voucher()
CREATE OR REPLACE FUNCTION public.sp_validar_voucher(
    p_id_voucher BIGINT,
    p_accion VARCHAR, -- 'APROBAR' o 'RECHAZAR'
    p_id_usuario BIGINT DEFAULT 1,
    p_motivo_rechazo VARCHAR DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_id_pago BIGINT;
    v_id_plan_pago BIGINT;
    v_id_cuota BIGINT;
    v_monto NUMERIC;
    v_id_aplicacion BIGINT;
    v_usuario_valido BIGINT;
BEGIN
    SELECT id_pago INTO v_id_pago FROM public.pag_vouchers WHERE id_voucher = p_id_voucher;
    IF v_id_pago IS NULL THEN
        RAISE EXCEPTION 'Voucher con ID % no encontrado', p_id_voucher;
    END IF;

    SELECT id_usuario INTO v_usuario_valido
    FROM public.seg_usuarios
    WHERE id_usuario = p_id_usuario;

    IF v_usuario_valido IS NULL THEN
        SELECT id_usuario INTO v_usuario_valido FROM public.seg_usuarios ORDER BY id_usuario ASC LIMIT 1;
    END IF;

    SELECT id_plan_pago, monto INTO v_id_plan_pago, v_monto FROM public.pag_pagos WHERE id_pago = v_id_pago;

    IF UPPER(p_accion) = 'APROBAR' THEN
        -- 1. Actualizar voucher a APROBADO (5)
        UPDATE public.pag_vouchers
        SET id_estado_voucher = 5, fecha_validacion = now(), id_usuario_validacion = v_usuario_valido, fecha_actualizacion = now()
        WHERE id_voucher = p_id_voucher;

        -- 2. Actualizar pago a CONFIRMADO (5)
        UPDATE public.pag_pagos
        SET id_estado_pago = 5, fecha_confirmacion = now(), id_usuario_confirmacion = v_usuario_valido, fecha_actualizacion = now()
        WHERE id_pago = v_id_pago;

        -- 3. Identificar la primera cuota impaga (PENDIENTE = 6 o VENCIDA = 9)
        SELECT id_cuota INTO v_id_cuota
        FROM public.pag_cuotas
        WHERE id_plan_pago = v_id_plan_pago AND id_estado_cuota IN (6, 9)
        ORDER BY numero_cuota ASC LIMIT 1;

        IF v_id_cuota IS NOT NULL THEN
            UPDATE public.pag_cuotas
            SET id_estado_cuota = 8, fecha_pago_completo = now(), fecha_actualizacion = now()
            WHERE id_cuota = v_id_cuota;

            INSERT INTO public.pag_aplicaciones_pago (
                id_pago, id_tipo_aplicacion_pago, id_plan_pago, id_cuota,
                monto_aplicado, fecha_aplicacion, activo, id_usuario_aplicacion
            ) VALUES (
                v_id_pago, 7, v_id_plan_pago, v_id_cuota,
                v_monto, now(), TRUE, v_usuario_valido
            ) RETURNING id_aplicacion_pago INTO v_id_aplicacion;
        END IF;

        RETURN jsonb_build_object(
            'success', TRUE,
            'accion', 'APROBADO',
            'id_voucher', p_id_voucher,
            'id_cuota_amortizada', v_id_cuota
        );
    ELSE
        -- RECHAZAR (voucher = 6, pago = 6)
        UPDATE public.pag_vouchers
        SET id_estado_voucher = 6, fecha_validacion = now(), id_usuario_validacion = v_usuario_valido,
            motivo_rechazo = COALESCE(p_motivo_rechazo, 'Voucher observado por tesoreria'), fecha_actualizacion = now()
        WHERE id_voucher = p_id_voucher;

        UPDATE public.pag_pagos
        SET id_estado_pago = 6, fecha_anulacion = now(), id_usuario_anulacion = v_usuario_valido,
            motivo_anulacion = COALESCE(p_motivo_rechazo, 'Voucher observado por tesoreria'), fecha_actualizacion = now()
        WHERE id_pago = v_id_pago;

        RETURN jsonb_build_object(
            'success', TRUE,
            'accion', 'RECHAZADO',
            'id_voucher', p_id_voucher,
            'motivo', p_motivo_rechazo
        );
    END IF;
END;
$$;

-- 6. sp_listar_vouchers_tesoreria()
CREATE OR REPLACE FUNCTION public.sp_listar_vouchers_tesoreria()
RETURNS TABLE (
    id_voucher BIGINT,
    codigo_voucher VARCHAR,
    codigo_pago VARCHAR,
    comprador TEXT,
    lote_codigo VARCHAR,
    codigo_contrato VARCHAR,
    metodo_pago VARCHAR,
    monto NUMERIC,
    fecha_carga TIMESTAMPTZ,
    estado_voucher VARCHAR,
    nombre_archivo VARCHAR,
    hash_sha256 VARCHAR,
    motivo_rechazo VARCHAR
)
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
    SELECT
        v.id_voucher,
        v.codigo AS codigo_voucher,
        p.codigo AS codigo_pago,
        TRIM(per.nombres || ' ' || per.apellido_paterno || ' ' || COALESCE(per.apellido_materno, '')) AS comprador,
        l.codigo AS lote_codigo,
        con.codigo AS codigo_contrato,
        mp.nombre AS metodo_pago,
        p.monto,
        v.fecha_carga,
        ev.nombre AS estado_voucher,
        v.nombre_archivo_original AS nombre_archivo,
        v.hash_sha256::VARCHAR,
        v.motivo_rechazo
    FROM public.pag_vouchers v
    JOIN public.pag_pagos p ON v.id_pago = p.id_pago
    JOIN public.cfg_estados_voucher ev ON v.id_estado_voucher = ev.id_estado_voucher
    JOIN public.cfg_metodos_pago mp ON p.id_metodo_pago = mp.id_metodo_pago
    JOIN public.ven_ventas vent ON p.id_venta = vent.id_venta
    JOIN public.inm_lotes l ON vent.id_lote = l.id_lote
    JOIN public.ven_ventas_clientes vc ON vent.id_venta = vc.id_venta AND vc.titular = TRUE
    JOIN public.crm_clientes c ON vc.id_cliente = c.id_cliente
    JOIN public.core_personas per ON c.id_persona = per.id_persona
    LEFT JOIN public.ven_contratos con ON vent.id_venta = con.id_venta
    ORDER BY v.id_voucher DESC;
$$;

-- Permisos PostgREST
GRANT EXECUTE ON FUNCTION public.sp_actualizar_estados_cuotas() TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.sp_listar_cronograma_venta(BIGINT) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.sp_evaluar_clausula_resolutoria() TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.sp_registrar_pago_voucher(BIGINT, BIGINT, NUMERIC, INT, VARCHAR, VARCHAR, VARCHAR, VARCHAR, BIGINT) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.sp_validar_voucher(BIGINT, VARCHAR, BIGINT, VARCHAR) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.sp_listar_vouchers_tesoreria() TO anon, authenticated, service_role;
