-- ==============================================================================
-- MIGRACION 06: SEED DE DATOS OPERATIVOS Y CORRECCIONES DE SEGURIDAD
-- Fecha: 2026-09-25
-- Tareas: DB-01, DB-02, SEC-01 a SEC-05
-- ==============================================================================

-- ==========================================================================
-- [DB-02] Poblar cfg_tipos_lote (catalogo vacio critico)
-- ==========================================================================
INSERT INTO cfg_tipos_lote (codigo, nombre, descripcion, orden)
VALUES
('REGULAR', 'Regular', 'Lote estandar sin caracteristica especial', 1),
('ESQUINA', 'Esquina', 'Lote ubicado en esquina con doble frente', 2),
('FRENTE_PARQUE', 'Frente a Parque', 'Lote con vista directa al parque o area verde', 3),
('FRENTE_AVENIDA', 'Frente a Avenida', 'Lote con acceso vehicular directo desde avenida principal', 4),
('INTERIOR', 'Interior', 'Lote ubicado en pasaje interior', 5)
ON CONFLICT DO NOTHING;

-- ==========================================================================
-- [DB-01] Seed del proyecto base de habilitacion urbana
-- ==========================================================================

-- 1. Proyecto principal
INSERT INTO inm_proyectos (
    id_estado_proyecto, codigo, nombre, descripcion,
    direccion, ubicacion_referencia,
    distrito, provincia, departamento, pais,
    latitud, longitud, area_total_m2,
    fecha_inicio, fecha_fin_estimada
)
VALUES (
    9, -- ACTIVO
    'PROY-HAB-001',
    'Habilitacion Urbana Los Jardines de Lurin',
    'Proyecto de habilitacion urbana de 70 lotes residenciales en el distrito de Lurin, Lima. Infraestructura completa con agua, desague, electricidad y areas verdes.',
    'Av. Los Eucaliptos s/n, Sector B4',
    'A 500 metros del peaje de Lurin, ingreso por la Antigua Panamericana Sur',
    'Lurin', 'Lima', 'Lima', 'Peru',
    -12.2694, -76.8688,
    28000.00,
    '2026-08-17',
    '2027-06-30'
)
ON CONFLICT (codigo) DO NOTHING;

-- 2. Etapa unica
INSERT INTO inm_etapas (
    id_proyecto, id_estado_etapa,
    codigo, nombre, descripcion, numero_orden,
    fecha_inicio, fecha_fin_estimada
)
SELECT
    p.id_proyecto, 7, -- ACTIVA
    'ETAPA-01', 'Etapa Unica', 'Etapa unica del proyecto de habilitacion urbana', 1,
    '2026-08-17', '2027-06-30'
FROM inm_proyectos p WHERE p.codigo = 'PROY-HAB-001'
ON CONFLICT (id_proyecto, codigo) DO NOTHING;

-- 3. Zona unica
INSERT INTO inm_zonas (id_proyecto, codigo, nombre, descripcion, numero_orden)
SELECT
    p.id_proyecto,
    'ZONA-01', 'Zona Principal', 'Zona residencial principal del proyecto', 1
FROM inm_proyectos p WHERE p.codigo = 'PROY-HAB-001'
ON CONFLICT (id_proyecto, codigo) DO NOTHING;

-- 4. Manzanas (A hasta G = 7 manzanas)
INSERT INTO inm_manzanas (id_etapa, id_proyecto, id_estado_manzana, codigo, nombre, descripcion, numero_orden)
SELECT
    e.id_etapa, e.id_proyecto, 6, -- ACTIVA
    'MZ-' || letra.val,
    'Manzana ' || letra.val,
    'Manzana ' || letra.val || ' del proyecto',
    letra.ord
FROM inm_etapas e
CROSS JOIN (VALUES ('A',1),('B',2),('C',3),('D',4),('E',5),('F',6),('G',7)) AS letra(val, ord)
WHERE e.codigo = 'ETAPA-01'
ON CONFLICT (id_etapa, codigo) DO NOTHING;

-- 5. Los 70 lotes (10 por manzana, 7 manzanas)
DO $$
DECLARE
    v_id_manzana BIGINT;
    v_id_proyecto BIGINT;
    v_mz_codigo VARCHAR;
    v_lote_num INT;
    v_area DECIMAL(12,2);
    v_frente DECIMAL(10,2);
    v_fondo DECIMAL(10,2);
    v_id_tipo_lote INT;
    v_id_estado_disponible INT;
    v_codigo_lote VARCHAR;
BEGIN
    SELECT id_estado_lote INTO v_id_estado_disponible
    FROM cfg_estados_lote WHERE codigo = 'DISPONIBLE';

    FOR v_id_manzana, v_id_proyecto, v_mz_codigo IN
        SELECT m.id_manzana, m.id_proyecto, m.codigo
        FROM inm_manzanas m
        JOIN inm_proyectos p ON m.id_proyecto = p.id_proyecto
        WHERE p.codigo = 'PROY-HAB-001'
        ORDER BY m.numero_orden
    LOOP
        FOR v_lote_num IN 1..10 LOOP
            v_area := 90 + (v_lote_num * 6.5)::DECIMAL(12,2);
            v_frente := 7.00::DECIMAL(10,2);
            v_fondo := ROUND(v_area / v_frente, 2);

            IF v_lote_num = 1 OR v_lote_num = 10 THEN
                SELECT id_tipo_lote INTO v_id_tipo_lote
                FROM cfg_tipos_lote WHERE codigo = 'ESQUINA';
            ELSIF v_lote_num = 5 THEN
                SELECT id_tipo_lote INTO v_id_tipo_lote
                FROM cfg_tipos_lote WHERE codigo = 'FRENTE_PARQUE';
            ELSE
                SELECT id_tipo_lote INTO v_id_tipo_lote
                FROM cfg_tipos_lote WHERE codigo = 'REGULAR';
            END IF;

            v_codigo_lote := v_mz_codigo || '-L' || LPAD(v_lote_num::TEXT, 2, '0');

            INSERT INTO inm_lotes (
                id_manzana, id_proyecto, id_tipo_lote, id_estado_lote,
                codigo, numero, area_m2, frente_m, fondo_m
            ) VALUES (
                v_id_manzana, v_id_proyecto, v_id_tipo_lote, v_id_estado_disponible,
                v_codigo_lote,
                v_lote_num::TEXT,
                ROUND(v_area, 2),
                ROUND(v_frente, 2),
                ROUND(v_fondo, 2)
            )
            ON CONFLICT (codigo) DO NOTHING;
        END LOOP;
    END LOOP;
END $$;

-- 6. Precios para los 70 lotes (en Soles)
INSERT INTO inm_lotes_precios (
    id_lote, id_moneda,
    area_m2_aplicada, precio_base, precio, observaciones
)
SELECT
    l.id_lote,
    3, -- PEN
    l.area_m2,
    CASE
        WHEN tl.codigo = 'ESQUINA' THEN 550.00
        WHEN tl.codigo = 'FRENTE_PARQUE' THEN 600.00
        WHEN tl.codigo = 'FRENTE_AVENIDA' THEN 580.00
        ELSE 480.00
    END,
    ROUND(l.area_m2 * CASE
        WHEN tl.codigo = 'ESQUINA' THEN 550.00
        WHEN tl.codigo = 'FRENTE_PARQUE' THEN 600.00
        WHEN tl.codigo = 'FRENTE_AVENIDA' THEN 580.00
        ELSE 480.00
    END, 2),
    'Precio inicial de comercializacion - ' || tl.nombre
FROM inm_lotes l
JOIN cfg_tipos_lote tl ON l.id_tipo_lote = tl.id_tipo_lote
JOIN inm_proyectos p ON l.id_proyecto = p.id_proyecto
WHERE p.codigo = 'PROY-HAB-001'
ON CONFLICT (clave_precio_vigente) DO NOTHING;

-- ==========================================================================
-- [DB-01] Seed de personas, usuarios y asesor
-- ==========================================================================

-- Persona Admin
INSERT INTO core_personas (nombres, apellido_paterno, apellido_materno, fecha_nacimiento)
VALUES ('Admin', 'Sistema', 'SIGI', '1990-01-01')
ON CONFLICT DO NOTHING;

-- Documento DNI del admin
INSERT INTO core_personas_documentos (id_persona, id_tipo_documento, numero_documento, principal, verificado)
SELECT p.id_persona, 5, '99999999', TRUE, TRUE
FROM core_personas p WHERE p.nombres = 'Admin' AND p.apellido_paterno = 'Sistema'
ON CONFLICT (id_tipo_documento, numero_documento) DO NOTHING;

-- Usuario admin
INSERT INTO seg_usuarios (id_persona, id_estado_usuario, usuario_login, password_hash, requiere_cambio_password)
SELECT
    p.id_persona, 5, 'admin@sigi.pe',
    crypt('Admin2026!', gen_salt('bf', 12)), TRUE
FROM core_personas p WHERE p.nombres = 'Admin' AND p.apellido_paterno = 'Sistema'
ON CONFLICT (usuario_login) DO NOTHING;

-- Rol Administrador
INSERT INTO seg_usuarios_roles (id_usuario, id_rol)
SELECT u.id_usuario, 7
FROM seg_usuarios u WHERE u.usuario_login = 'admin@sigi.pe'
ON CONFLICT DO NOTHING;

-- Persona Asesor Carlos Mendoza
INSERT INTO core_personas (nombres, apellido_paterno, apellido_materno, fecha_nacimiento)
VALUES ('Carlos', 'Mendoza', 'Torres', '1995-03-15')
ON CONFLICT DO NOTHING;

INSERT INTO core_personas_documentos (id_persona, id_tipo_documento, numero_documento, principal, verificado)
SELECT p.id_persona, 5, '76543210', TRUE, TRUE
FROM core_personas p WHERE p.nombres = 'Carlos' AND p.apellido_paterno = 'Mendoza'
ON CONFLICT (id_tipo_documento, numero_documento) DO NOTHING;

INSERT INTO seg_usuarios (id_persona, id_estado_usuario, usuario_login, password_hash, requiere_cambio_password)
SELECT
    p.id_persona, 5, 'cmendoza@sigi.pe',
    crypt('Asesor2026!', gen_salt('bf', 12)), TRUE
FROM core_personas p WHERE p.nombres = 'Carlos' AND p.apellido_paterno = 'Mendoza'
ON CONFLICT (usuario_login) DO NOTHING;

INSERT INTO seg_usuarios_roles (id_usuario, id_rol)
SELECT u.id_usuario, 10
FROM seg_usuarios u WHERE u.usuario_login = 'cmendoza@sigi.pe'
ON CONFLICT DO NOTHING;

-- Registro en com_asesores (referencia id_persona)
INSERT INTO com_asesores (
    id_persona, id_tipo_asesor, id_estado_asesor,
    codigo, fecha_inicio, observaciones
)
SELECT
    p.id_persona,
    (SELECT id_tipo_asesor FROM cfg_tipos_asesor WHERE codigo = 'INTERNO' LIMIT 1),
    (SELECT id_estado_asesor FROM cfg_estados_asesor WHERE codigo = 'ACTIVO' LIMIT 1),
    'ASE-001',
    CURRENT_DATE,
    'Asesor comercial principal de ventas'
FROM core_personas p WHERE p.nombres = 'Carlos' AND p.apellido_paterno = 'Mendoza'
ON CONFLICT (codigo) DO NOTHING;


-- ==========================================================================
-- [SEC-01] Validacion de rol en sp_cambiar_estado_lote
-- ==========================================================================
CREATE OR REPLACE FUNCTION sp_cambiar_estado_lote(
    p_id_lote BIGINT,
    p_codigo_nuevo_estado VARCHAR,
    p_id_usuario BIGINT DEFAULT NULL,
    p_motivo VARCHAR DEFAULT 'Cambio de estado operativo'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_id_estado_actual INT;
    v_id_nuevo_estado INT;
    v_rol_usuario VARCHAR;
BEGIN
    -- Validar rol del usuario si se proporciona
    IF p_id_usuario IS NOT NULL THEN
        SELECT r.codigo INTO v_rol_usuario
        FROM seg_usuarios_roles ur
        JOIN seg_roles r ON ur.id_rol = r.id_rol
        WHERE ur.id_usuario = p_id_usuario
          AND r.codigo IN ('ADMINISTRADOR', 'GERENCIA')
        LIMIT 1;

        IF v_rol_usuario IS NULL THEN
            RETURN jsonb_build_object(
                'success', false,
                'message', 'Permiso denegado: solo ADMINISTRADOR o GERENCIA pueden cambiar estados de lote.'
            );
        END IF;
    END IF;

    -- Obtener estado actual
    SELECT id_estado_lote INTO v_id_estado_actual
    FROM inm_lotes WHERE id_lote = p_id_lote;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'message', 'El lote especificado no existe.');
    END IF;

    -- Obtener id del nuevo estado
    SELECT id_estado_lote INTO v_id_nuevo_estado
    FROM cfg_estados_lote WHERE codigo = UPPER(p_codigo_nuevo_estado);

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'message', 'El estado especificado no es valido.');
    END IF;

    IF v_id_estado_actual = v_id_nuevo_estado THEN
        RETURN jsonb_build_object('success', true, 'message', 'El lote ya se encuentra en dicho estado.');
    END IF;

    -- Actualizar el lote
    UPDATE inm_lotes
    SET id_estado_lote = v_id_nuevo_estado,
        fecha_actualizacion = timezone('utc'::text, now())
    WHERE id_lote = p_id_lote;

    -- Insertar en historial de estados
    INSERT INTO inm_lotes_historial_estado (
        id_lote, id_estado_anterior, id_estado_nuevo, motivo, fecha_cambio, id_usuario
    ) VALUES (
        p_id_lote, v_id_estado_actual, v_id_nuevo_estado, p_motivo,
        timezone('utc'::text, now()), p_id_usuario
    );

    RETURN jsonb_build_object(
        'success', true,
        'message', 'Estado del lote actualizado correctamente.',
        'id_lote', p_id_lote,
        'nuevo_estado', UPPER(p_codigo_nuevo_estado)
    );
END;
$$;


-- ==========================================================================
-- [SEC-02] sp_registrar_separacion (S/ 500 y 7 dias fijos)
-- ==========================================================================
CREATE OR REPLACE FUNCTION sp_registrar_separacion(
    p_id_lote BIGINT,
    p_id_persona BIGINT,
    p_id_usuario BIGINT DEFAULT NULL,
    p_observaciones VARCHAR DEFAULT 'Separacion regular de lote'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_estado_actual VARCHAR;
    v_id_estado_reserva_activa INT;
    v_id_reserva BIGINT;
    v_fecha_vencimiento TIMESTAMPTZ;
    v_monto_reserva CONSTANT DECIMAL := 500.00;
BEGIN
    -- Validar que el lote este DISPONIBLE
    SELECT el.codigo INTO v_estado_actual
    FROM inm_lotes l
    JOIN cfg_estados_lote el ON l.id_estado_lote = el.id_estado_lote
    WHERE l.id_lote = p_id_lote;

    IF v_estado_actual != 'DISPONIBLE' THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', CONCAT('No se puede separar. El lote esta en estado: ', v_estado_actual)
        );
    END IF;

    -- 7 dias calendario exactos
    v_fecha_vencimiento := timezone('utc'::text, now()) + INTERVAL '7 days';

    SELECT id_estado_reserva INTO v_id_estado_reserva_activa
    FROM cfg_estados_reserva WHERE codigo = 'ACTIVA';

    INSERT INTO ven_reservas (
        id_lote, id_persona, id_moneda, id_estado_reserva,
        codigo, monto_reserva, fecha_reserva, fecha_vencimiento,
        observaciones, id_usuario_registro
    ) VALUES (
        p_id_lote, p_id_persona, 3, -- Soles
        v_id_estado_reserva_activa,
        CONCAT('RES-', p_id_lote, '-', EXTRACT(EPOCH FROM now())::BIGINT),
        v_monto_reserva,
        timezone('utc'::text, now()),
        v_fecha_vencimiento,
        p_observaciones, p_id_usuario
    ) RETURNING id_reserva INTO v_id_reserva;

    -- Cambiar estado del lote a RESERVADO
    PERFORM sp_cambiar_estado_lote(
        p_id_lote,
        'RESERVADO',
        p_id_usuario,
        CONCAT('Separacion generada: #', v_id_reserva, ' con vigencia de 7 dias')
    );

    RETURN jsonb_build_object(
        'success', true,
        'message', 'Lote separado exitosamente por 7 dias calendario.',
        'id_reserva', v_id_reserva,
        'fecha_vencimiento', v_fecha_vencimiento,
        'monto_reserva', v_monto_reserva
    );
END;
$$;


-- ==========================================================================
-- [SEC-05] sp_listar_lotes_plano con search_path
-- ==========================================================================
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
SET search_path = public
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
            WHEN el.codigo = 'DISPONIBLE' THEN '#22C55E'
            WHEN el.codigo IN ('SEPARADO', 'RESERVADO') THEN '#EAB308'
            WHEN el.codigo = 'VENDIDO' THEN '#EF4444'
            ELSE '#64748B'
        END)::TEXT AS estado_color
    FROM inm_lotes l
    JOIN inm_manzanas m ON l.id_manzana = m.id_manzana
    JOIN inm_proyectos p ON m.id_proyecto = p.id_proyecto
    JOIN cfg_estados_lote el ON l.id_estado_lote = el.id_estado_lote
    LEFT JOIN inm_lotes_precios lp ON l.id_lote = lp.id_lote
        AND lp.activo = TRUE AND lp.fecha_hasta IS NULL
    WHERE (p_id_proyecto IS NULL OR p.id_proyecto = p_id_proyecto)
      AND l.activo = TRUE
    ORDER BY m.nombre, l.numero::INT;
END;
$$;
