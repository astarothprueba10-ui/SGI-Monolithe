-- ==============================================================================
-- SGI-MONOLITHE: MIGRACION 70 - PROCEDIMIENTOS ALMACENADOS DE LOGIN DOCUMENTAL
-- Modulo: auth-service (Resolucion documental, identidad visual y bloqueo de intentos)
-- ==============================================================================

CREATE OR REPLACE PROCEDURE public.sp_obtener_identidad_visual_usuario(
    IN p_id_usuario BIGINT,
    OUT p_nombre_mostrar CHARACTER VARYING,
    OUT p_iniciales CHARACTER VARYING
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
    v_nombres VARCHAR;
    v_apellido_paterno VARCHAR;
    v_primer_nombre TEXT;
    v_inicial_apellido TEXT;
BEGIN
    SELECT
        p.nombres,
        p.apellido_paterno
    INTO
        v_nombres,
        v_apellido_paterno
    FROM public.seg_usuarios u
    INNER JOIN public.core_personas p
        ON p.id_persona = u.id_persona
    WHERE u.id_usuario = p_id_usuario;

    IF NOT FOUND THEN
        p_nombre_mostrar := NULL;
        p_iniciales := NULL;
        RETURN;
    END IF;

    v_primer_nombre :=
        SPLIT_PART(BTRIM(COALESCE(v_nombres, '')), ' ', 1);

    v_inicial_apellido :=
        UPPER(LEFT(BTRIM(COALESCE(v_apellido_paterno, '')), 1));

    IF v_primer_nombre = '' THEN
        p_nombre_mostrar := NULL;
        p_iniciales := NULL;
        RETURN;
    END IF;

    IF v_inicial_apellido <> '' THEN
        p_nombre_mostrar :=
            v_primer_nombre || ' ' || v_inicial_apellido || '.';
    ELSE
        p_nombre_mostrar := v_primer_nombre;
    END IF;

    p_iniciales :=
        UPPER(LEFT(v_primer_nombre, 1)) || v_inicial_apellido;
END;
$$;

CREATE OR REPLACE PROCEDURE public.sp_registrar_intento_login_fallido(
    IN p_login CHARACTER VARYING,
    IN p_max_intentos INTEGER,
    IN p_duracion_bloqueo_segundos BIGINT,
    OUT p_id_usuario BIGINT,
    OUT p_intentos_fallidos INTEGER,
    OUT p_bloqueado_ahora BOOLEAN,
    OUT p_bloqueado_hasta TIMESTAMP WITH TIME ZONE
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    v_id_usuario BIGINT;
    v_intentos_actuales INTEGER;
    v_bloqueado_hasta TIMESTAMPTZ;
    v_ahora TIMESTAMPTZ;
BEGIN
    p_id_usuario := NULL;
    p_intentos_fallidos := 0;
    p_bloqueado_ahora := FALSE;
    p_bloqueado_hasta := NULL;

    IF p_max_intentos IS NULL
       OR p_max_intentos < 1
       OR p_duracion_bloqueo_segundos IS NULL
       OR p_duracion_bloqueo_segundos < 1
    THEN
        RAISE EXCEPTION
            'Configuracion de bloqueo de autenticacion invalida.';
    END IF;

    IF NULLIF(BTRIM(p_login), '') IS NULL THEN
        RETURN;
    END IF;

    v_ahora := NOW();

    SELECT
        u.id_usuario,
        u.intentos_fallidos,
        u.bloqueado_hasta
    INTO
        v_id_usuario,
        v_intentos_actuales,
        v_bloqueado_hasta
    FROM public.seg_usuarios u
    WHERE LOWER(BTRIM(u.usuario_login))
        = LOWER(BTRIM(p_login))
    FOR UPDATE OF u;

    IF NOT FOUND THEN
        RETURN;
    END IF;

    p_id_usuario := v_id_usuario;

    IF v_bloqueado_hasta IS NOT NULL
       AND v_bloqueado_hasta > v_ahora
    THEN
        p_intentos_fallidos := v_intentos_actuales;
        p_bloqueado_hasta := v_bloqueado_hasta;
        RETURN;
    END IF;

    IF v_bloqueado_hasta IS NOT NULL
       AND v_bloqueado_hasta <= v_ahora
    THEN
        v_intentos_actuales := 0;
    END IF;

    p_intentos_fallidos :=
        COALESCE(v_intentos_actuales, 0) + 1;

    IF p_intentos_fallidos >= p_max_intentos THEN
        p_bloqueado_ahora := TRUE;
        p_bloqueado_hasta :=
            v_ahora
            + (
                p_duracion_bloqueo_segundos
                * INTERVAL '1 second'
            );
    ELSE
        p_bloqueado_ahora := FALSE;
        p_bloqueado_hasta := NULL;
    END IF;

    UPDATE public.seg_usuarios
    SET
        intentos_fallidos = p_intentos_fallidos,
        bloqueado_hasta = p_bloqueado_hasta
    WHERE id_usuario = v_id_usuario;
END;
$$;

CREATE OR REPLACE PROCEDURE public.sp_resolver_login_documento(
    IN p_tipo_documento CHARACTER VARYING,
    IN p_numero_documento CHARACTER VARYING,
    OUT p_usuario_login CHARACTER VARYING
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'pg_catalog', 'public', 'pg_temp'
AS $$
DECLARE
    v_tipo_documento TEXT;
    v_numero_documento TEXT;
BEGIN
    p_usuario_login := NULL;

    v_tipo_documento :=
        UPPER(BTRIM(p_tipo_documento));

    v_numero_documento :=
        UPPER(BTRIM(p_numero_documento));

    IF NULLIF(v_tipo_documento, '') IS NULL
       OR NULLIF(v_numero_documento, '') IS NULL
    THEN
        RETURN;
    END IF;

    IF v_tipo_documento NOT IN (
        'DNI',
        'CE',
        'RUC',
        'PASAPORTE'
    ) THEN
        RETURN;
    END IF;

    SELECT
        u.usuario_login
    INTO
        p_usuario_login
    FROM public.core_personas_documentos d
    JOIN public.cfg_tipos_documento t
        ON t.id_tipo_documento = d.id_tipo_documento
    JOIN public.core_personas p
        ON p.id_persona = d.id_persona
    JOIN public.seg_usuarios u
        ON u.id_persona = p.id_persona
    WHERE
        t.codigo = v_tipo_documento
        AND t.activo = TRUE
        AND p.activo = TRUE
        AND d.principal = TRUE
        AND d.activo = TRUE
        AND (
            d.verificado = TRUE
            OR (
                NOT EXISTS (
                    SELECT 1
                    FROM public.crm_clientes c
                    WHERE c.id_persona = p.id_persona
                )
                AND EXISTS (
                    SELECT 1
                    FROM public.rrhh_trabajadores tr
                    JOIN public.cfg_estados_trabajador et
                      ON et.id_estado_trabajador = tr.id_estado_trabajador
                    WHERE tr.id_persona = p.id_persona
                      AND et.codigo = 'ACTIVO'
                      AND et.activo IS TRUE
                )
            )
        )
        AND UPPER(BTRIM(d.numero_documento)) = v_numero_documento
        AND CHAR_LENGTH(v_numero_documento)
            BETWEEN t.longitud_minima AND t.longitud_maxima
        AND (
            (
                t.solo_numerico = TRUE
                AND v_numero_documento ~ '^[0-9]+$'
            )
            OR
            (
                t.solo_numerico = FALSE
                AND v_numero_documento ~ '^[A-Z0-9]+$'
            )
        )
    LIMIT 1;
END;
$$;

GRANT EXECUTE ON PROCEDURE public.sp_obtener_identidad_visual_usuario(BIGINT, CHARACTER VARYING, CHARACTER VARYING) TO anon, authenticated, service_role;
GRANT EXECUTE ON PROCEDURE public.sp_registrar_intento_login_fallido(CHARACTER VARYING, INTEGER, BIGINT, BIGINT, INTEGER, BOOLEAN, TIMESTAMP WITH TIME ZONE) TO anon, authenticated, service_role;
GRANT EXECUTE ON PROCEDURE public.sp_resolver_login_documento(CHARACTER VARYING, CHARACTER VARYING, CHARACTER VARYING) TO anon, authenticated, service_role;

