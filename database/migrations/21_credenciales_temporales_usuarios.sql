-- ==============================================================================
-- SGI MONOLITHE
-- MIGRACION 21 - CREDENCIALES TEMPORALES PARA USUARIOS INTERNOS
--
-- Objetivos:
--   1. Registrar vencimiento de contraseña temporal.
--   2. Modificar la activación de usuarios para recibir el hash temporal.
--   3. Exigir correo principal verificado antes de activar.
--   4. Devolver login + correo al backend para enviar las credenciales.
--   5. Mantener la contraseña temporal únicamente como BCrypt en BD.
-- ==============================================================================

BEGIN;


-- ==============================================================================
-- 1. VENCIMIENTO DE CREDENCIAL TEMPORAL
-- ==============================================================================

ALTER TABLE public.seg_usuarios
    ADD COLUMN IF NOT EXISTS password_temporal_expira_en TIMESTAMPTZ(6);

COMMENT ON COLUMN public.seg_usuarios.password_temporal_expira_en IS
    'Fecha límite para utilizar la contraseña temporal de primer acceso.';


-- ==============================================================================
-- 2. REEMPLAZAR PROCEDIMIENTO DE ACTIVACION
--
-- El procedimiento anterior recibía solamente:
--   p_id_actor
--   p_id_usuario
--
-- Ahora también recibe:
--   p_password_hash
--   p_password_temporal_expira_en
--
-- Y devuelve:
--   p_usuario_login
--   p_correo
--   p_estado
--   p_mensaje
-- ==============================================================================

DROP PROCEDURE IF EXISTS
    public.sp_activar_usuario_seguridad(
        BIGINT,
        BIGINT
    );


CREATE OR REPLACE PROCEDURE public.sp_activar_usuario_seguridad(
    IN p_id_actor BIGINT,
    IN p_id_usuario BIGINT,
    IN p_password_hash VARCHAR,
    IN p_password_temporal_expira_en TIMESTAMPTZ,

    OUT p_usuario_login VARCHAR,
    OUT p_correo VARCHAR,
    OUT p_estado VARCHAR,
    OUT p_mensaje VARCHAR
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_id_estado_activo INT;
    v_id_estado_actual INT;
    v_codigo_estado_actual VARCHAR(40);

    v_usuario_login VARCHAR(120);
    v_correo VARCHAR(180);

    v_id_persona BIGINT;
BEGIN

    p_usuario_login := NULL;
    p_correo := NULL;
    p_estado := NULL;
    p_mensaje := NULL;


    -- --------------------------------------------------------------------------
    -- 2.1. Validar permiso del actor
    -- --------------------------------------------------------------------------

    IF NOT public.fn_usuario_tiene_permiso_seguridad(
        p_id_actor,
        'users.activate'
    ) THEN

        p_estado := 'DENEGADO';
        p_mensaje :=
            'No tiene permisos para activar usuarios.';

        RETURN;
    END IF;


    -- --------------------------------------------------------------------------
    -- 2.2. Validar usuario objetivo
    -- --------------------------------------------------------------------------

    SELECT
        u.id_persona,
        u.id_estado_usuario,
        u.usuario_login,
        eu.codigo
    INTO
        v_id_persona,
        v_id_estado_actual,
        v_usuario_login,
        v_codigo_estado_actual
    FROM public.seg_usuarios u
    JOIN public.cfg_estados_usuario eu
        ON eu.id_estado_usuario = u.id_estado_usuario
    WHERE u.id_usuario = p_id_usuario
    FOR UPDATE OF u;


    IF v_id_persona IS NULL THEN

        p_estado := 'USUARIO_NO_ENCONTRADO';
        p_mensaje :=
            'El usuario indicado no existe.';

        RETURN;
    END IF;


    -- --------------------------------------------------------------------------
    -- 2.3. Validar que el actor pueda gestionar este usuario
    -- --------------------------------------------------------------------------

    IF NOT public.fn_usuario_objetivo_gestionable(
        p_id_actor,
        p_id_usuario
    ) THEN

        p_estado := 'DENEGADO';
        p_mensaje :=
            'No tiene permisos para gestionar este usuario.';

        RETURN;
    END IF;


    -- --------------------------------------------------------------------------
    -- 2.4. No regenerar credenciales de una cuenta ya activa
    --
    -- Esto evita que ACTIVAR pueda utilizarse como mecanismo para tomar
    -- control de una cuenta existente.
    -- --------------------------------------------------------------------------

    IF v_codigo_estado_actual = 'ACTIVO' THEN

        p_estado := 'YA_ACTIVO';
        p_mensaje :=
            'El usuario ya se encuentra activo.';

        RETURN;
    END IF;


    -- --------------------------------------------------------------------------
    -- 2.5. El usuario debe tener al menos un rol activo
    -- --------------------------------------------------------------------------

    IF NOT EXISTS (
        SELECT 1
        FROM public.seg_usuarios_roles ur
        JOIN public.seg_roles r
            ON r.id_rol = ur.id_rol
        WHERE ur.id_usuario = p_id_usuario
          AND ur.activo = TRUE
          AND r.activo = TRUE
    ) THEN

        p_estado := 'SIN_ROL';
        p_mensaje :=
            'Debe asignarse al menos un rol antes de activar el usuario.';

        RETURN;
    END IF;


    -- --------------------------------------------------------------------------
    -- 2.6. Validar hash BCrypt recibido desde auth-service
    -- --------------------------------------------------------------------------

    IF p_password_hash IS NULL
       OR BTRIM(p_password_hash) = ''
       OR p_password_hash !~ '^\$2[aby]\$[0-9]{2}\$.{53}$'
    THEN

        p_estado := 'PASSWORD_HASH_INVALIDO';
        p_mensaje :=
            'La credencial temporal no posee un hash válido.';

        RETURN;
    END IF;


    -- --------------------------------------------------------------------------
    -- 2.7. Validar vencimiento
    -- --------------------------------------------------------------------------

    IF p_password_temporal_expira_en IS NULL
       OR p_password_temporal_expira_en <= timezone(
            'utc'::text,
            now()
       )
    THEN

        p_estado := 'EXPIRACION_INVALIDA';
        p_mensaje :=
            'La fecha de expiración de la contraseña temporal es inválida.';

        RETURN;
    END IF;


    -- --------------------------------------------------------------------------
    -- 2.8. Obtener correo principal, verificado y activo
    -- --------------------------------------------------------------------------

    SELECT pc.valor
    INTO v_correo
    FROM public.core_personas_contactos pc
    JOIN public.cfg_tipos_contacto tc
        ON tc.id_tipo_contacto = pc.id_tipo_contacto
    WHERE pc.id_persona = v_id_persona
      AND tc.codigo = 'EMAIL'
      AND tc.activo = TRUE
      AND pc.principal = TRUE
      AND pc.verificado = TRUE
      AND pc.activo = TRUE
      AND BTRIM(pc.valor) <> ''
    LIMIT 1;


    IF v_correo IS NULL THEN

        p_estado := 'CORREO_NO_VERIFICADO';
        p_mensaje :=
            'El usuario requiere un correo principal verificado antes de ser activado.';

        RETURN;
    END IF;


    -- --------------------------------------------------------------------------
    -- 2.9. Obtener estado ACTIVO
    -- --------------------------------------------------------------------------

    SELECT id_estado_usuario
    INTO v_id_estado_activo
    FROM public.cfg_estados_usuario
    WHERE codigo = 'ACTIVO'
      AND activo = TRUE
      AND permite_acceso = TRUE
    LIMIT 1;


    IF v_id_estado_activo IS NULL THEN

        p_estado := 'CONFIGURACION_INVALIDA';
        p_mensaje :=
            'No se encontró configurado el estado ACTIVO.';

        RETURN;
    END IF;


    -- --------------------------------------------------------------------------
    -- 2.10. Activar y establecer contraseña temporal
    -- --------------------------------------------------------------------------

    UPDATE public.seg_usuarios
    SET
        id_estado_usuario = v_id_estado_activo,
        password_hash = p_password_hash,
        requiere_cambio_password = TRUE,
        password_temporal_expira_en =
            p_password_temporal_expira_en,
        intentos_fallidos = 0,
        bloqueado_hasta = NULL,
        password_actualizado_en =
            timezone('utc'::text, now()),
        fecha_actualizacion =
            timezone('utc'::text, now())
    WHERE id_usuario = p_id_usuario;


    -- --------------------------------------------------------------------------
    -- 2.11. Invalidar sesiones previas
    -- --------------------------------------------------------------------------

    UPDATE public.seg_sesiones
    SET
        fecha_revocacion =
            timezone('utc'::text, now()),
        motivo_revocacion =
            'ACTIVACION_CREDENCIAL_TEMPORAL'
    WHERE id_usuario = p_id_usuario
      AND fecha_revocacion IS NULL;


    -- --------------------------------------------------------------------------
    -- 2.12. Invalidar recuperaciones anteriores
    -- --------------------------------------------------------------------------

    UPDATE public.seg_tokens_recuperacion
    SET
        fecha_uso =
            timezone('utc'::text, now())
    WHERE id_usuario = p_id_usuario
      AND fecha_uso IS NULL;


    -- --------------------------------------------------------------------------
    -- 2.13. Auditoría
    -- --------------------------------------------------------------------------

    PERFORM public.sp_registrar_auditoria(
        p_id_actor,
        'SEGURIDAD',
        'ACTIVAR_USUARIO',
        'seg_usuarios',
        p_id_usuario::VARCHAR,
        'EXITOSO',
        'Usuario activado con credencial temporal y cambio obligatorio de contraseña.',
        jsonb_build_object(
            'requiere_cambio_password',
            TRUE,
            'password_temporal_expira_en',
            p_password_temporal_expira_en,
            'usuario_login',
            v_usuario_login
        )
    );


    p_usuario_login := v_usuario_login;
    p_correo := v_correo;
    p_estado := 'ACTIVADO';
    p_mensaje :=
        'Usuario activado correctamente con credencial temporal.';

END;
$$;


-- ==============================================================================
-- 3. HARDENING
-- ==============================================================================

REVOKE ALL ON PROCEDURE
    public.sp_activar_usuario_seguridad(
        BIGINT,
        BIGINT,
        VARCHAR,
        TIMESTAMPTZ
    )
FROM PUBLIC, anon, authenticated;


COMMIT;

-- ==============================================================================
-- FIN MIGRACION 21
-- ==============================================================================