-- ==============================================================================
-- SGI MONOLITHE
-- MIGRACION 26 - EDICION DE USUARIO
-- ==============================================================================
--
-- Objetivo:
--   Permitir modificar de forma controlada el usuario_login de una cuenta
--   existente desde el modulo de Usuarios, Roles y Permisos.
--
-- Reglas:
--   - El actor debe poseer users.edit.
--   - El usuario objetivo debe existir.
--   - El actor debe poder gestionar la cuenta objetivo.
--   - El login se normaliza en minusculas.
--   - El login debe pertenecer al dominio corporativo @monolithe.pe.
--   - El login debe ser unico sin distinguir mayusculas/minusculas.
--   - No modifica password, estado, persona ni roles.
--   - La operacion queda registrada en auditoria.
--
-- Dependencias:
--   - fn_usuario_tiene_permiso_seguridad
--   - fn_usuario_objetivo_gestionable
--   - fn_login_corporativo_valido
--   - sp_registrar_auditoria
--   - uk_seg_usuarios_login_ci
-- ==============================================================================

BEGIN;


-- ==============================================================================
-- 1. ACTUALIZAR LOGIN DE USUARIO
-- ==============================================================================

CREATE OR REPLACE PROCEDURE public.sp_actualizar_login_usuario(
    IN p_id_actor      BIGINT,
    IN p_id_usuario    BIGINT,
    IN p_nuevo_login   VARCHAR,
    OUT p_estado       VARCHAR,
    OUT p_mensaje      VARCHAR
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_login_limpio     VARCHAR(120);
    v_login_anterior   VARCHAR(120);
BEGIN

    -- --------------------------------------------------------------------------
    -- 1.1. Validar actor y permiso
    -- --------------------------------------------------------------------------

    IF p_id_actor IS NULL
       OR NOT public.fn_usuario_tiene_permiso_seguridad(
            p_id_actor,
            'users.edit'
       )
    THEN
        p_estado  := 'DENEGADO';
        p_mensaje := 'No posee autorizacion para editar usuarios.';
        RETURN;
    END IF;


    -- --------------------------------------------------------------------------
    -- 1.2. Validar identificador del usuario
    -- --------------------------------------------------------------------------

    IF p_id_usuario IS NULL THEN
        p_estado  := 'USUARIO_NO_ENCONTRADO';
        p_mensaje := 'El usuario indicado no existe.';
        RETURN;
    END IF;


    -- --------------------------------------------------------------------------
    -- 1.3. Verificar que el actor pueda gestionar la cuenta
    -- --------------------------------------------------------------------------

    IF NOT COALESCE(
        public.fn_usuario_objetivo_gestionable(
            p_id_actor,
            p_id_usuario
        ),
        FALSE
    ) THEN

        p_estado  := 'USUARIO_PROTEGIDO';
        p_mensaje := 'No posee autorizacion para modificar este usuario.';
        RETURN;

    END IF;


    -- --------------------------------------------------------------------------
    -- 1.4. Obtener y bloquear usuario objetivo
    -- --------------------------------------------------------------------------
    --
    -- FOR UPDATE evita modificaciones concurrentes sobre la misma cuenta
    -- durante esta operacion.
    -- --------------------------------------------------------------------------

    SELECT
        LOWER(BTRIM(u.usuario_login))
    INTO
        v_login_anterior
    FROM public.seg_usuarios u
    WHERE u.id_usuario = p_id_usuario
    FOR UPDATE;

    IF NOT FOUND THEN
        p_estado  := 'USUARIO_NO_ENCONTRADO';
        p_mensaje := 'El usuario indicado no existe.';
        RETURN;
    END IF;


    -- --------------------------------------------------------------------------
    -- 1.5. Normalizar login
    -- --------------------------------------------------------------------------

    v_login_limpio := LOWER(BTRIM(p_nuevo_login));


    -- --------------------------------------------------------------------------
    -- 1.6. Validaciones basicas
    -- --------------------------------------------------------------------------

    IF v_login_limpio IS NULL
       OR v_login_limpio = ''
       OR CHAR_LENGTH(v_login_limpio) < 3
       OR CHAR_LENGTH(v_login_limpio) > 120
    THEN

        p_estado  := 'LOGIN_INVALIDO';
        p_mensaje := 'El usuario debe tener entre 3 y 120 caracteres.';
        RETURN;

    END IF;


    -- --------------------------------------------------------------------------
    -- 1.7. Validar dominio corporativo
    -- --------------------------------------------------------------------------

    IF NOT public.fn_login_corporativo_valido(v_login_limpio) THEN

        p_estado  := 'LOGIN_INVALIDO';
        p_mensaje :=
            'El usuario debe utilizar el dominio corporativo @monolithe.pe.';
        RETURN;

    END IF;


    -- --------------------------------------------------------------------------
    -- 1.8. Si no hubo cambio, finalizar correctamente
    -- --------------------------------------------------------------------------

    IF v_login_anterior = v_login_limpio THEN

        p_estado  := 'ACTUALIZADO';
        p_mensaje := 'El usuario ya posee el login indicado.';
        RETURN;

    END IF;


    -- --------------------------------------------------------------------------
    -- 1.9. Validar unicidad excluyendo la misma cuenta
    -- --------------------------------------------------------------------------

    IF EXISTS (
        SELECT 1
        FROM public.seg_usuarios u
        WHERE LOWER(BTRIM(u.usuario_login)) = v_login_limpio
          AND u.id_usuario <> p_id_usuario
    ) THEN

        p_estado  := 'LOGIN_EXISTENTE';
        p_mensaje := 'El usuario indicado ya se encuentra en uso.';
        RETURN;

    END IF;


    -- --------------------------------------------------------------------------
    -- 1.10. Actualizar login
    -- --------------------------------------------------------------------------

    BEGIN

        UPDATE public.seg_usuarios
        SET
            usuario_login = v_login_limpio,
            fecha_actualizacion = timezone(
                'utc'::text,
                NOW()
            )
        WHERE id_usuario = p_id_usuario;

    EXCEPTION
        WHEN unique_violation THEN

            p_estado  := 'LOGIN_EXISTENTE';
            p_mensaje := 'El usuario indicado ya se encuentra en uso.';
            RETURN;

    END;


    -- --------------------------------------------------------------------------
    -- 1.11. Registrar auditoria
    -- --------------------------------------------------------------------------

    PERFORM public.sp_registrar_auditoria(
        p_id_actor,
        'SEGURIDAD',
        'ACTUALIZAR_LOGIN_USUARIO',
        'seg_usuarios',
        p_id_usuario::VARCHAR,
        'EXITOSO',
        'Se actualizo el login de una cuenta de usuario.',
        jsonb_build_object(
            'id_usuario_objetivo', p_id_usuario,
            'login_anterior', v_login_anterior,
            'login_nuevo', v_login_limpio
        )
    );


    -- --------------------------------------------------------------------------
    -- 1.12. Respuesta
    -- --------------------------------------------------------------------------

    p_estado  := 'ACTUALIZADO';
    p_mensaje := 'Usuario actualizado correctamente.';

END;
$$;


-- ==============================================================================
-- 2. HARDENING DE EJECUCION
-- ==============================================================================
--
-- El procedimiento no debe invocarse directamente desde clientes Supabase.
-- Se utiliza desde auth-service mediante la conexion autorizada del backend.
-- ==============================================================================

REVOKE ALL
ON PROCEDURE public.sp_actualizar_login_usuario(
    BIGINT,
    BIGINT,
    VARCHAR
)
FROM PUBLIC, anon, authenticated;


COMMIT;