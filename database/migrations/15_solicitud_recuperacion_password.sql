-- ==============================================================================
-- SGI-MONOLITHE: MIGRACION 15 - PROCEDIMIENTO SOLICITUD DE RECUPERACION DE CONTRASEÑA
-- Modulo: auth-service / Recuperación de Contraseña (Primer Paso: Generación de Link)
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. PROCEDIMIENTO DE SOLICITUD DE RECUPERACION DE CONTRASEÑA
-- Proposito: Valida el acceso del usuario por portal (BACKOFFICE / PORTAL_CLIENTE),
-- obtiene su correo verificado de forma segura desde BD, invalida solicitudes previas
-- e inserta el hash del nuevo token de enlace.
-- ------------------------------------------------------------------------------
CREATE OR REPLACE PROCEDURE public.sp_solicitar_recuperacion_password(
    IN p_usuario_login VARCHAR,
    IN p_origen VARCHAR,
    IN p_token_hash VARCHAR,
    IN p_fecha_expiracion TIMESTAMPTZ,
    IN p_ip_solicitud VARCHAR,
    IN p_user_agent VARCHAR,
    OUT p_id_usuario BIGINT,
    OUT p_correo VARCHAR
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_id_usuario BIGINT;
    v_id_persona BIGINT;
    v_correo VARCHAR;
BEGIN
    IF p_origen IS NULL OR p_origen NOT IN ('BACKOFFICE', 'PORTAL_CLIENTE') THEN
        RAISE EXCEPTION 'Origen invalido para recuperacion de contrasena';
    END IF;

    IF p_token_hash IS NULL OR length(p_token_hash) <> 64 OR p_fecha_expiracion IS NULL OR p_fecha_expiracion <= now() THEN
        RAISE EXCEPTION 'Parametros de recuperacion invalidos';
    END IF;

    SELECT u.id_usuario, u.id_persona
    INTO v_id_usuario, v_id_persona
    FROM public.seg_usuarios u
    JOIN public.cfg_estados_usuario e ON e.id_estado_usuario = u.id_estado_usuario
    WHERE u.usuario_login = p_usuario_login
      AND e.activo = TRUE
      AND e.permite_acceso = TRUE
      AND EXISTS (
          SELECT 1
          FROM public.seg_usuarios_roles ur
          JOIN public.seg_roles r ON r.id_rol = ur.id_rol
          WHERE ur.id_usuario = u.id_usuario
            AND ur.activo = TRUE
            AND r.activo = TRUE
            AND (
                (p_origen = 'BACKOFFICE' AND r.codigo IN ('ADMINISTRADOR', 'GERENCIA', 'MARKETING', 'ASESOR', 'FINANZAS', 'RRHH'))
                OR
                (p_origen = 'PORTAL_CLIENTE' AND r.codigo = 'CLIENTE')
            )
      );

    IF v_id_usuario IS NULL THEN
        p_id_usuario := NULL;
        p_correo := NULL;
        RETURN;
    END IF;

    SELECT pc.valor
    INTO v_correo
    FROM public.core_personas_contactos pc
    JOIN public.cfg_tipos_contacto tc ON tc.id_tipo_contacto = pc.id_tipo_contacto
    WHERE pc.id_persona = v_id_persona
      AND tc.codigo = 'EMAIL'
      AND tc.activo = TRUE
      AND pc.principal = TRUE
      AND pc.verificado = TRUE
      AND pc.activo = TRUE
    LIMIT 1;

    IF v_correo IS NULL OR TRIM(v_correo) = '' THEN
        p_id_usuario := NULL;
        p_correo := NULL;
        RETURN;
    END IF;

    PERFORM 1
    FROM public.seg_usuarios
    WHERE id_usuario = v_id_usuario
    FOR UPDATE;

    v_id_persona := NULL;
    SELECT u.id_persona
    INTO v_id_persona
    FROM public.seg_usuarios u
    JOIN public.cfg_estados_usuario e ON e.id_estado_usuario = u.id_estado_usuario
    WHERE u.id_usuario = v_id_usuario
      AND e.activo = TRUE
      AND e.permite_acceso = TRUE
      AND EXISTS (
          SELECT 1
          FROM public.seg_usuarios_roles ur
          JOIN public.seg_roles r ON r.id_rol = ur.id_rol
          WHERE ur.id_usuario = u.id_usuario
            AND ur.activo = TRUE
            AND r.activo = TRUE
            AND (
                (p_origen = 'BACKOFFICE' AND r.codigo IN ('ADMINISTRADOR', 'GERENCIA', 'MARKETING', 'ASESOR', 'FINANZAS', 'RRHH'))
                OR
                (p_origen = 'PORTAL_CLIENTE' AND r.codigo = 'CLIENTE')
            )
      );

    IF v_id_persona IS NULL THEN
        p_id_usuario := NULL;
        p_correo := NULL;
        RETURN;
    END IF;

    v_correo := NULL;
    SELECT pc.valor
    INTO v_correo
    FROM public.core_personas_contactos pc
    JOIN public.cfg_tipos_contacto tc ON tc.id_tipo_contacto = pc.id_tipo_contacto
    WHERE pc.id_persona = v_id_persona
      AND tc.codigo = 'EMAIL'
      AND tc.activo = TRUE
      AND pc.principal = TRUE
      AND pc.verificado = TRUE
      AND pc.activo = TRUE
    LIMIT 1;

    IF v_correo IS NULL OR TRIM(v_correo) = '' THEN
        p_id_usuario := NULL;
        p_correo := NULL;
        RETURN;
    END IF;

    UPDATE public.seg_tokens_recuperacion
    SET fecha_uso = now()
    WHERE id_usuario = v_id_usuario
      AND fecha_uso IS NULL;

    INSERT INTO public.seg_tokens_recuperacion (
        id_usuario,
        token_hash,
        fecha_expiracion,
        ip_solicitud,
        user_agent
    ) VALUES (
        v_id_usuario,
        p_token_hash,
        p_fecha_expiracion,
        LEFT(p_ip_solicitud, 45),
        LEFT(p_user_agent, 500)
    );

    p_id_usuario := v_id_usuario;
    p_correo := v_correo;
END;
$$;

-- ------------------------------------------------------------------------------
-- 2. SEGURIDAD - REVOCAR EJECUCION A ROLES PUBLICOS DE SUPABASE
-- ------------------------------------------------------------------------------
REVOKE ALL ON PROCEDURE public.sp_solicitar_recuperacion_password(
    VARCHAR,
    VARCHAR,
    VARCHAR,
    TIMESTAMPTZ,
    VARCHAR,
    VARCHAR
) FROM PUBLIC, anon, authenticated;
