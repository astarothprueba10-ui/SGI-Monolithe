-- ============================================================================
-- SIGI MONOLITHE - PROCEDIMIENTOS ALMACENADOS Y FUNCIONES (RPC)
-- Módulo 1: Inventario, Lotes y Transición de Estados
-- ============================================================================

-- 1. FUNCION: Listar Lotes para el Plano Interactivo (Con datos formateados para SVG)
CREATE OR REPLACE FUNCTION sp_listar_lotes_plano(p_id_proyecto BIGINT DEFAULT NULL)
RETURNS TABLE (
    id_lote BIGINT,
    id_proyecto BIGINT,
    proyecto_nombre TEXT,
    manzana_nombre TEXT,
    numero_lote TEXT,
    codigo_lote TEXT,
    area_m2 DECIMAL,
    precio_base DECIMAL,
    estado_codigo TEXT,
    estado_nombre TEXT,
    estado_color TEXT
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        l.id_lote,
        p.id_proyecto,
        p.nombre::TEXT AS proyecto_nombre,
        m.nombre::TEXT AS manzana_nombre,
        l.numero::TEXT AS numero_lote,
        l.codigo::TEXT AS codigo_lote,
        l.area_m2::DECIMAL AS area_m2,
        COALESCE(lp.precio, 0.00)::DECIMAL AS precio_base,
        el.codigo::TEXT AS estado_codigo,
        el.nombre::TEXT AS estado_nombre,
        (CASE 
            WHEN el.codigo = 'DISPONIBLE' THEN '#22C55E' -- Verde
            WHEN el.codigo = 'SEPARADO'   THEN '#EAB308' -- Amarillo
            WHEN el.codigo = 'VENDIDO'    THEN '#EF4444' -- Rojo
            ELSE '#64748B'                              -- Gris (Bloqueado/Otro)
        END)::TEXT AS estado_color
    FROM inm_lotes l
    JOIN inm_manzanas m ON l.id_manzana = m.id_manzana
    JOIN inm_proyectos p ON m.id_proyecto = p.id_proyecto
    JOIN cfg_estados_lote el ON l.id_estado_lote = el.id_estado_lote
    LEFT JOIN inm_lotes_precios lp ON l.id_lote = lp.id_lote AND lp.activo = TRUE AND lp.fecha_hasta IS NULL
    WHERE (p_id_proyecto IS NULL OR p.id_proyecto = p_id_proyecto)
      AND l.activo = TRUE
    ORDER BY m.nombre, l.numero;
END;
$$;

-- 2. FUNCION TRANSACCIONAL: Cambiar Estado de un Lote con Historial de Auditoría
CREATE OR REPLACE FUNCTION sp_cambiar_estado_lote(
    p_id_lote BIGINT,
    p_codigo_nuevo_estado VARCHAR,
    p_id_usuario BIGINT DEFAULT NULL,
    p_motivo VARCHAR DEFAULT 'Cambio de estado operativo'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_id_estado_actual INT;
    v_id_nuevo_estado INT;
    v_estado_actual_cod VARCHAR;
BEGIN
    -- 1. Obtener estado actual
    SELECT id_estado_lote INTO v_id_estado_actual
    FROM inm_lotes WHERE id_lote = p_id_lote;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'message', 'El lote especificado no existe.');
    END IF;

    -- 2. Obtener id del nuevo estado
    SELECT id_estado_lote INTO v_id_nuevo_estado
    FROM cfg_estados_lote WHERE codigo = UPPER(p_codigo_nuevo_estado);

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'message', 'El estado especificado no es válido.');
    END IF;

    -- 3. Si ya tiene ese estado, no hacer nada
    IF v_id_estado_actual = v_id_nuevo_estado THEN
        RETURN jsonb_build_object('success', true, 'message', 'El lote ya se encuentra en dicho estado.');
    END IF;

    -- 4. Cerrar vigencia en historial anterior
    UPDATE inm_lotes_historial_estado
    SET fecha_hasta = timezone('utc'::text, now()),
        observaciones = CONCAT(observaciones, ' | Cerrado por nueva transición')
    WHERE id_lote = p_id_lote AND fecha_hasta IS NULL;

    -- 5. Actualizar el lote
    UPDATE inm_lotes
    SET id_estado_lote = v_id_nuevo_estado,
        fecha_actualizacion = timezone('utc'::text, now())
    WHERE id_lote = p_id_lote;

    -- 6. Insertar en historial de estados
    INSERT INTO inm_lotes_historial_estado (
        id_lote,
        id_estado_lote,
        id_usuario_cambio,
        fecha_desde,
        observaciones
    ) VALUES (
        p_id_lote,
        v_id_nuevo_estado,
        p_id_usuario,
        timezone('utc'::text, now()),
        p_motivo
    );

    RETURN jsonb_build_object(
        'success', true, 
        'message', 'Estado del lote actualizado correctamente.',
        'id_lote', p_id_lote,
        'nuevo_estado', UPPER(p_codigo_nuevo_estado)
    );
END;
$$;

-- 3. FUNCION TRANSACCIONAL: Registrar Separación de Lote (Regla S/ 500 y 7 días)
CREATE OR REPLACE FUNCTION sp_registrar_separacion(
    p_id_lote BIGINT,
    p_id_prospecto BIGINT,
    p_id_asesor BIGINT,
    p_monto_reserva DECIMAL DEFAULT 500.00,
    p_id_usuario BIGINT DEFAULT NULL,
    p_observaciones VARCHAR DEFAULT 'Separación regular de lote'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_estado_actual VARCHAR;
    v_id_estado_reserva_activa INT;
    v_id_reserva BIGINT;
    v_fecha_vencimiento TIMESTAMPTZ;
BEGIN
    -- 1. Validar que el lote esté DISPONIBLE
    SELECT el.codigo INTO v_estado_actual
    FROM inm_lotes l
    JOIN cfg_estados_lote el ON l.id_estado_lote = el.id_estado_lote
    WHERE l.id_lote = p_id_lote;

    IF v_estado_actual != 'DISPONIBLE' THEN
        RETURN jsonb_build_object(
            'success', false, 
            'message', CONCAT('No se puede separar. El lote está en estado: ', v_estado_actual)
        );
    END IF;

    -- 2. Calcular vigencia de 7 días exactos
    v_fecha_vencimiento := timezone('utc'::text, now()) + INTERVAL '7 days';

    -- 3. Obtener id de estado de reserva ACTIVA
    SELECT id_estado_reserva INTO v_id_estado_reserva_activa
    FROM cfg_estados_reserva WHERE codigo = 'ACTIVA';

    -- 4. Crear registro en ven_reservas
    INSERT INTO ven_reservas (
        id_lote,
        id_prospecto,
        id_asesor,
        id_estado_reserva,
        codigo,
        monto_reserva,
        fecha_reserva,
        fecha_vencimiento,
        observaciones,
        id_usuario_registro
    ) VALUES (
        p_id_lote,
        p_id_prospecto,
        p_id_asesor,
        v_id_estado_reserva_activa,
        CONCAT('RES-', p_id_lote, '-', EXTRACT(EPOCH FROM now())::BIGINT),
        p_monto_reserva,
        timezone('utc'::text, now()),
        v_fecha_vencimiento,
        p_observaciones,
        p_id_usuario
    ) RETURNING id_reserva INTO v_id_reserva;

    -- 5. Cambiar el lote a estado SEPARADO
    PERFORM sp_cambiar_estado_lote(
        p_id_lote, 
        'SEPARADO', 
        p_id_usuario, 
        CONCAT('Separación generada: #', v_id_reserva, ' con vigencia de 7 días')
    );

    RETURN jsonb_build_object(
        'success', true,
        'message', 'Lote separado exitosamente por 7 días calendario.',
        'id_reserva', v_id_reserva,
        'fecha_vencimiento', v_fecha_vencimiento,
        'monto_reserva', p_monto_reserva
    );
END;
$$;
