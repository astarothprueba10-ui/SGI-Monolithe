-- ==============================================================================
-- SGI-MONOLITHE: MIGRACION 14 - PROCEDIMIENTOS ALMACENADOS RECUPERACION DE CONTRASEÑA POR OTP
-- Modulo: auth-service / Recuperación de Contraseña (Segunda Verificación OTP)
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. CONSULTA DE CONTEXTO DE TOKEN DE RECUPERACION
-- Proposito: Verifica la validez del token de enlace y obtiene el hash de la
-- contraseña actual para validar que la nueva contraseña sea diferente.
-- ------------------------------------------------------------------------------
CREATE OR REPLACE PROCEDURE public.sp_obtener_contexto_token_recuperacion(
    IN p_token_hash VARCHAR,
    OUT p_id_token BIGINT,
    OUT p_id_usuario BIGINT,
    OUT p_password_actual_hash VARCHAR
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    SELECT 
        t.id_token, 
        t.id_usuario, 
        u.password_hash
    INTO 
        p_id_token, 
        p_id_usuario, 
        p_password_actual_hash
    FROM public.seg_tokens_recuperacion t
    JOIN public.seg_usuarios u ON u.id_usuario = t.id_usuario
    WHERE t.token_hash = p_token_hash
      AND t.fecha_uso IS NULL
      AND t.fecha_expiracion > now();
END;
$$;

-- ------------------------------------------------------------------------------
-- 2. INICIO DE VERIFICACION DE RECUPERACION (REGISTRO OTP Y CONSUMO DE TOKEN)
-- Proposito: Consume el token de enlace, invalida flujos anteriores no confirmados,
-- e inserta el ticket_hash, otp_hash y password_pendiente_hash de forma atómica.
-- ------------------------------------------------------------------------------
CREATE OR REPLACE PROCEDURE public.sp_iniciar_verificacion_recuperacion(
    IN p_token_hash VARCHAR,
    IN p_ticket_hash VARCHAR,
    IN p_otp_hash VARCHAR,
    IN p_password_pendiente_hash VARCHAR,
    IN p_fecha_expiracion TIMESTAMPTZ,
    OUT p_id_verificacion BIGINT,
    OUT p_id_usuario BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_id_token BIGINT;
    v_id_usuario BIGINT;
    v_fecha_uso TIMESTAMPTZ;
    v_fecha_expiracion TIMESTAMPTZ;
BEGIN
    SELECT id_token, id_usuario
    INTO v_id_token, v_id_usuario
    FROM public.seg_tokens_recuperacion
    WHERE token_hash = p_token_hash;

    IF v_id_token IS NULL THEN
        RAISE EXCEPTION 'Token de recuperacion invalido, usado o expirado';
    END IF;

   PERFORM 1
    FROM public.seg_usuarios
    WHERE id_usuario = v_id_usuario
    FOR UPDATE;

    SELECT fecha_uso, fecha_expiracion
    INTO v_fecha_uso, v_fecha_expiracion
    FROM public.seg_tokens_recuperacion
    WHERE id_token = v_id_token
      AND id_usuario = v_id_usuario
    FOR UPDATE;

     IF NOT FOUND
       OR v_fecha_uso IS NOT NULL
       OR v_fecha_expiracion <= now() THEN
        RAISE EXCEPTION 'Token de recuperacion invalido, usado o expirado';
    END IF;

    UPDATE public.seg_verificaciones_recuperacion
    SET fecha_bloqueo = now()
    WHERE id_token IN (
        SELECT id_token 
        FROM public.seg_tokens_recuperacion 
        WHERE id_usuario = v_id_usuario
    )
    AND fecha_confirmacion IS NULL
    AND fecha_bloqueo IS NULL;

    UPDATE public.seg_tokens_recuperacion
    SET fecha_uso = now()
    WHERE id_token = v_id_token;

    INSERT INTO public.seg_verificaciones_recuperacion (
        id_token,
        ticket_hash,
        otp_hash,
        password_pendiente_hash,
        intentos_fallidos,
        fecha_expiracion
    ) VALUES (
        v_id_token,
        p_ticket_hash,
        p_otp_hash,
        p_password_pendiente_hash,
        0,
        p_fecha_expiracion
    ) RETURNING id_verificacion INTO p_id_verificacion;

    p_id_usuario := v_id_usuario;
END;
$$;

-- ------------------------------------------------------------------------------
-- 3. CONSULTA DE CONTEXTO DE VERIFICACION OTP
-- Proposito: Retorna el hash del OTP y de la contraseña pendiente asociados al ticket
-- para su posterior validación en Java mediante BCrypt.
-- ------------------------------------------------------------------------------
CREATE OR REPLACE PROCEDURE public.sp_obtener_contexto_verificacion_recuperacion(
    IN p_ticket_hash VARCHAR,
    OUT p_id_verificacion BIGINT,
    OUT p_id_usuario BIGINT,
    OUT p_otp_hash VARCHAR,
    OUT p_password_pendiente_hash VARCHAR,
    OUT p_intentos_fallidos SMALLINT,
    OUT p_fecha_expiracion TIMESTAMPTZ,
    OUT p_fecha_confirmacion TIMESTAMPTZ,
    OUT p_fecha_bloqueo TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    SELECT 
        v.id_verificacion,
        t.id_usuario,
        v.otp_hash,
        v.password_pendiente_hash,
        v.intentos_fallidos,
        v.fecha_expiracion,
        v.fecha_confirmacion,
        v.fecha_bloqueo
    INTO 
        p_id_verificacion,
        p_id_usuario,
        p_otp_hash,
        p_password_pendiente_hash,
        p_intentos_fallidos,
        p_fecha_expiracion,
        p_fecha_confirmacion,
        p_fecha_bloqueo
    FROM public.seg_verificaciones_recuperacion v
    JOIN public.seg_tokens_recuperacion t ON t.id_token = v.id_token
    WHERE v.ticket_hash = p_ticket_hash;
END;
$$;

-- ------------------------------------------------------------------------------
-- 4. REGISTRO DE INTENTO OTP FALLIDO
-- Proposito: Incrementa atómicamente el contador de intentos del OTP y aplica
-- bloqueo al llegar a 5 intentos.
-- ------------------------------------------------------------------------------
CREATE OR REPLACE PROCEDURE public.sp_registrar_intento_otp_fallido(
    IN p_ticket_hash VARCHAR,
    OUT p_intentos_fallidos SMALLINT,
    OUT p_intentos_restantes SMALLINT,
    OUT p_bloqueado BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_id_verificacion BIGINT;
    v_intentos SMALLINT;
    v_fecha_confirmacion TIMESTAMPTZ;
    v_fecha_expiracion TIMESTAMPTZ;
    v_fecha_bloqueo TIMESTAMPTZ;
BEGIN
    SELECT id_verificacion, intentos_fallidos, fecha_confirmacion, fecha_expiracion, fecha_bloqueo
    INTO v_id_verificacion, v_intentos, v_fecha_confirmacion, v_fecha_expiracion, v_fecha_bloqueo
    FROM public.seg_verificaciones_recuperacion
    WHERE ticket_hash = p_ticket_hash
    FOR UPDATE;

    IF v_id_verificacion IS NULL 
       OR v_fecha_confirmacion IS NOT NULL 
       OR v_fecha_expiracion <= now() 
       OR v_fecha_bloqueo IS NOT NULL 
       OR v_intentos >= 5 THEN
        RAISE EXCEPTION 'Verificacion invalida, expirada, confirmada o bloqueada';
    END IF;

    v_intentos := v_intentos + 1;

    IF v_intentos >= 5 THEN
        UPDATE public.seg_verificaciones_recuperacion
        SET intentos_fallidos = 5,
            fecha_bloqueo = now()
        WHERE id_verificacion = v_id_verificacion;

        p_intentos_fallidos := 5;
        p_intentos_restantes := 0;
        p_bloqueado := TRUE;
    ELSE
        UPDATE public.seg_verificaciones_recuperacion
        SET intentos_fallidos = v_intentos
        WHERE id_verificacion = v_id_verificacion;

        p_intentos_fallidos := v_intentos;
        p_intentos_restantes := 5 - v_intentos;
        p_bloqueado := FALSE;
    END IF;
END;
$$;

-- ------------------------------------------------------------------------------
-- 5. CONFIRMACION DE RECUPERACION DE CONTRASEÑA
-- Proposito: Aplica de forma atómica la nueva contraseña en seg_usuarios, resetea
-- bloqueos previa autenticación, confirma la verificación, revoca sesiones activas
-- e invalida tokens residuales.
-- ------------------------------------------------------------------------------
CREATE OR REPLACE PROCEDURE public.sp_confirmar_recuperacion_password(
    IN p_ticket_hash VARCHAR,
    OUT p_id_usuario BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_id_verificacion BIGINT;
    v_id_token BIGINT;
    v_id_usuario BIGINT;
    v_password_pendiente_hash VARCHAR;
    v_fecha_confirmacion TIMESTAMPTZ;
    v_fecha_bloqueo TIMESTAMPTZ;
    v_intentos SMALLINT;
    v_fecha_expiracion TIMESTAMPTZ;
BEGIN
     SELECT
        v.id_verificacion,
        t.id_usuario
    INTO
        v_id_verificacion,
        v_id_usuario
    FROM public.seg_verificaciones_recuperacion v
    JOIN public.seg_tokens_recuperacion t
        ON t.id_token = v.id_token
    WHERE v.ticket_hash = p_ticket_hash;

    IF v_id_verificacion IS NULL THEN
        RAISE EXCEPTION 'Verificacion invalida, expirada, confirmada o bloqueada';
    END IF;

    PERFORM 1
    FROM public.seg_usuarios
    WHERE id_usuario = v_id_usuario
    FOR UPDATE;

    SELECT
        v.id_token,
        t.id_usuario,
        v.password_pendiente_hash,
        v.fecha_confirmacion,
        v.fecha_bloqueo,
        v.intentos_fallidos,
        v.fecha_expiracion
    INTO
        v_id_token,
        v_id_usuario,
        v_password_pendiente_hash,
        v_fecha_confirmacion,
        v_fecha_bloqueo,
        v_intentos,
        v_fecha_expiracion
    FROM public.seg_verificaciones_recuperacion v
    JOIN public.seg_tokens_recuperacion t
        ON t.id_token = v.id_token
    WHERE v.id_verificacion = v_id_verificacion
    FOR UPDATE OF v;

    IF NOT FOUND
       OR v_fecha_confirmacion IS NOT NULL
       OR v_fecha_bloqueo IS NOT NULL
       OR v_intentos >= 5
       OR v_fecha_expiracion <= now() THEN
        RAISE EXCEPTION 'Verificacion invalida, expirada, confirmada o bloqueada';
    END IF;

    UPDATE public.seg_verificaciones_recuperacion vr
    SET fecha_bloqueo = now()
    WHERE vr.id_verificacion <> v_id_verificacion
      AND vr.fecha_confirmacion IS NULL
      AND vr.fecha_bloqueo IS NULL
      AND vr.id_token IN (
          SELECT tr.id_token
          FROM public.seg_tokens_recuperacion tr
          WHERE tr.id_usuario = v_id_usuario
      );

    UPDATE public.seg_usuarios
    SET password_hash = v_password_pendiente_hash,
        password_actualizado_en = now(),
        requiere_cambio_password = FALSE,
        intentos_fallidos = 0,
        bloqueado_hasta = NULL,
        fecha_actualizacion = now()
    WHERE id_usuario = v_id_usuario;

    UPDATE public.seg_verificaciones_recuperacion
    SET fecha_confirmacion = now()
    WHERE id_verificacion = v_id_verificacion;

    UPDATE public.seg_sesiones
    SET fecha_revocacion = now(),
        motivo_revocacion = 'RECUPERACION_PASSWORD'
    WHERE id_usuario = v_id_usuario
      AND fecha_revocacion IS NULL;

    UPDATE public.seg_tokens_recuperacion
    SET fecha_uso = now()
    WHERE id_usuario = v_id_usuario
      AND fecha_uso IS NULL;

    p_id_usuario := v_id_usuario;
END;
$$;

-- ------------------------------------------------------------------------------
-- 6. SEGURIDAD - REVOCAR EJECUCION A ROLES PUBLICOS DE SUPABASE
-- ------------------------------------------------------------------------------
REVOKE ALL ON PROCEDURE
public.sp_obtener_contexto_token_recuperacion(VARCHAR)
FROM PUBLIC, anon, authenticated;

REVOKE ALL ON PROCEDURE
public.sp_iniciar_verificacion_recuperacion(
    VARCHAR,
    VARCHAR,
    VARCHAR,
    VARCHAR,
    TIMESTAMPTZ
)
FROM PUBLIC, anon, authenticated;

REVOKE ALL ON PROCEDURE
public.sp_obtener_contexto_verificacion_recuperacion(VARCHAR)
FROM PUBLIC, anon, authenticated;

REVOKE ALL ON PROCEDURE
public.sp_registrar_intento_otp_fallido(VARCHAR)
FROM PUBLIC, anon, authenticated;

REVOKE ALL ON PROCEDURE
public.sp_confirmar_recuperacion_password(VARCHAR)
FROM PUBLIC, anon, authenticated;