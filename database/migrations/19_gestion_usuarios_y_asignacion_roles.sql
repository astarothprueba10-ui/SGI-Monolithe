-- ==============================================================================
-- SGI MONOLITHE
-- MIGRACION 19 - GESTION SEGURA DE USUARIOS Y ASIGNACION DE ROLES
--
-- Objetivos:
--   1. Crear cuentas de acceso para personas ya registradas.
--   2. Activar y desactivar cuentas sin eliminarlas.
--   3. Asignar y revocar roles de forma controlada.
--   4. Evitar escalamiento de privilegios desde RRHH.
--   5. Revocar sesiones cuando cambian estados o roles.
--   6. Mantener auditoria de operaciones de seguridad.
--
-- IMPORTANTE:
--   - Java genera el BCrypt. La BD nunca recibe passwords en texto plano.
--   - Las cuentas nuevas nacen INACTIVAS.
--   - Deben recibir al menos un rol antes de ser activadas.
--   - RRHH solo puede asignar roles expresamente habilitados para RRHH.
-- ==============================================================================

BEGIN;


-- ==============================================================================
-- 1. CLASIFICAR ROLES QUE RRHH PUEDE ASIGNAR
--
-- Los roles creados en el futuro quedan NO asignables por RRHH por defecto.
-- El modulo de administracion de roles podra decidir explicitamente si un
-- nuevo rol puede ser utilizado por RRHH.
-- ==============================================================================

ALTER TABLE public.seg_roles
    ADD COLUMN IF NOT EXISTS asignable_rrhh BOOLEAN NOT NULL DEFAULT FALSE;

COMMENT ON COLUMN public.seg_roles.asignable_rrhh IS
    'Indica si RRHH puede asignar este rol a cuentas internas. No implica permisos sobre la definicion del rol.';


-- Los roles sensibles nunca son asignables por RRHH.
UPDATE public.seg_roles
SET
    asignable_rrhh = FALSE,
    fecha_actualizacion = timezone('utc'::text, now())
WHERE codigo IN (
    'ADMINISTRADOR',
    'GERENCIA',
    'CLIENTE'
);


-- Roles internos operativos que RRHH si puede asignar.
UPDATE public.seg_roles
SET
    asignable_rrhh = TRUE,
    fecha_actualizacion = timezone('utc'::text, now())
WHERE codigo IN (
    'ASESOR',
    'FINANZAS',
    'MARKETING',
    'RRHH'
);


-- ==============================================================================
-- 2. INDICE UNIQUE CASE-INSENSITIVE PARA LOGIN
--
-- Evita que existan:
--   usuario@sigi.pe
--   Usuario@sigi.pe
--
-- como dos cuentas distintas.
-- ==============================================================================

CREATE UNIQUE INDEX IF NOT EXISTS uk_seg_usuarios_login_ci
    ON public.seg_usuarios (LOWER(BTRIM(usuario_login)));


-- ==============================================================================
-- 3. FUNCION INTERNA: ¿EL USUARIO TIENE UN PERMISO?
--
-- Centraliza la comprobacion RBAC para los procedimientos de seguridad.
-- Comprueba:
--   - usuario existente
--   - persona activa
--   - estado habilitado
--   - bloqueo temporal vencido/inexistente
--   - rol activo
--   - asignacion activa
--   - permiso activo
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.fn_usuario_tiene_permiso_seguridad(
    p_id_usuario BIGINT,
    p_codigo_permiso VARCHAR
)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN

    IF p_id_usuario IS NULL
       OR NULLIF(BTRIM(p_codigo_permiso), '') IS NULL THEN
        RETURN FALSE;
    END IF;

    RETURN EXISTS (
        SELECT 1
        FROM public.seg_usuarios u

        INNER JOIN public.core_personas persona
            ON persona.id_persona = u.id_persona

        INNER JOIN public.cfg_estados_usuario eu
            ON eu.id_estado_usuario = u.id_estado_usuario

        INNER JOIN public.seg_usuarios_roles ur
            ON ur.id_usuario = u.id_usuario

        INNER JOIN public.seg_roles r
            ON r.id_rol = ur.id_rol

        INNER JOIN public.seg_roles_permisos rp
            ON rp.id_rol = r.id_rol

        INNER JOIN public.seg_permisos p
            ON p.id_permiso = rp.id_permiso

        WHERE u.id_usuario = p_id_usuario
          AND persona.activo = TRUE
          AND eu.activo = TRUE
          AND eu.permite_acceso = TRUE

          AND (
                u.bloqueado_hasta IS NULL
                OR u.bloqueado_hasta <= timezone('utc'::text, now())
          )

          AND ur.activo = TRUE
          AND r.activo = TRUE
          AND rp.activo = TRUE
          AND p.activo = TRUE

          AND p.codigo = BTRIM(p_codigo_permiso)
    );

END;
$$;


-- ==============================================================================
-- 4. FUNCION INTERNA: ¿EL ACTOR PUEDE ADMINISTRAR ESTE USUARIO?
--
-- GERENCIA posee roles.assign_permissions + permisos de usuarios, por lo que
-- puede gestionar cualquier cuenta.
--
-- RRHH no posee roles.assign_permissions.
-- Por ello solo puede administrar usuarios que no tengan roles sensibles.
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.fn_usuario_objetivo_gestionable(
    p_id_actor BIGINT,
    p_id_usuario_objetivo BIGINT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN

    IF p_id_actor IS NULL
       OR p_id_usuario_objetivo IS NULL THEN
        RETURN FALSE;
    END IF;


    -- Un actor con capacidad administrativa avanzada sobre roles
    -- no queda limitado por asignable_rrhh.
    IF public.fn_usuario_tiene_permiso_seguridad(
        p_id_actor,
        'roles.assign_permissions'
    ) THEN
        RETURN TRUE;
    END IF;


    -- Un actor restringido solo puede administrar cuentas que:
    --   - aun no posean roles, o
    --   - posean exclusivamente roles asignables por RRHH.
    RETURN NOT EXISTS (
        SELECT 1
        FROM public.seg_usuarios_roles ur
        INNER JOIN public.seg_roles r
            ON r.id_rol = ur.id_rol
        WHERE ur.id_usuario = p_id_usuario_objetivo
          AND ur.activo = TRUE
          AND (
                r.activo = FALSE
                OR r.asignable_rrhh = FALSE
          )
    );

END;
$$;


-- ==============================================================================
-- 5. CREAR CUENTA DE USUARIO
--
-- La persona ya debe existir en core_personas.
--
-- La cuenta nace INACTIVA para impedir acceso antes de completar:
--
--   Persona
--      ↓
--   Crear cuenta INACTIVA
--      ↓
--   Asignar rol
--      ↓
--   Activar cuenta
--
-- La contraseña llega YA codificada con BCrypt desde auth-service.
-- ==============================================================================

CREATE OR REPLACE PROCEDURE public.sp_crear_usuario_seguridad(
    IN p_id_actor BIGINT,
    IN p_id_persona BIGINT,
    IN p_usuario_login VARCHAR,
    IN p_password_hash VARCHAR,

    OUT p_id_usuario BIGINT,
    OUT p_estado VARCHAR,
    OUT p_mensaje VARCHAR
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_login VARCHAR(120);
    v_id_estado_inactivo INT;
BEGIN

    p_id_usuario := NULL;
    p_estado := 'INVALIDO';
    p_mensaje := 'No fue posible crear la cuenta.';


    -- --------------------------------------------------------------------------
    -- AUTORIZACION
    -- --------------------------------------------------------------------------

    IF NOT public.fn_usuario_tiene_permiso_seguridad(
        p_id_actor,
        'users.create'
    ) THEN

        p_estado := 'DENEGADO';
        p_mensaje := 'No posee permiso para crear usuarios.';
        RETURN;

    END IF;


    -- --------------------------------------------------------------------------
    -- VALIDAR PERSONA
    -- --------------------------------------------------------------------------

    IF NOT EXISTS (
        SELECT 1
        FROM public.core_personas
        WHERE id_persona = p_id_persona
          AND activo = TRUE
    ) THEN

        p_estado := 'PERSONA_INVALIDA';
        p_mensaje := 'La persona indicada no existe o se encuentra inactiva.';
        RETURN;

    END IF;


    -- Una persona solo puede tener una cuenta.
    IF EXISTS (
        SELECT 1
        FROM public.seg_usuarios
        WHERE id_persona = p_id_persona
    ) THEN

        p_estado := 'PERSONA_CON_USUARIO';
        p_mensaje := 'La persona ya posee una cuenta de acceso.';
        RETURN;

    END IF;


    -- --------------------------------------------------------------------------
    -- VALIDAR LOGIN
    -- --------------------------------------------------------------------------

    v_login := LOWER(BTRIM(p_usuario_login));

    IF v_login IS NULL
       OR CHAR_LENGTH(v_login) < 3
       OR CHAR_LENGTH(v_login) > 120 THEN

        p_estado := 'LOGIN_INVALIDO';
        p_mensaje := 'El nombre de usuario no es valido.';
        RETURN;

    END IF;


    IF EXISTS (
        SELECT 1
        FROM public.seg_usuarios
        WHERE LOWER(BTRIM(usuario_login)) = v_login
    ) THEN

        p_estado := 'LOGIN_EXISTENTE';
        p_mensaje := 'El nombre de usuario ya se encuentra registrado.';
        RETURN;

    END IF;


    -- --------------------------------------------------------------------------
    -- VALIDAR HASH BCRYPT
    --
    -- Nunca se acepta una contraseña en texto plano.
    -- --------------------------------------------------------------------------

    IF p_password_hash IS NULL
       OR p_password_hash !~
          '^\$2[aby]\$[0-9]{2}\$[./A-Za-z0-9]{53}$' THEN

        p_estado := 'PASSWORD_HASH_INVALIDO';
        p_mensaje := 'La contraseña debe llegar codificada de forma segura.';
        RETURN;

    END IF;


    -- --------------------------------------------------------------------------
    -- ESTADO INICIAL: INACTIVO
    -- --------------------------------------------------------------------------

    SELECT id_estado_usuario
    INTO v_id_estado_inactivo
    FROM public.cfg_estados_usuario
    WHERE codigo = 'INACTIVO'
      AND activo = TRUE
    LIMIT 1;

    IF v_id_estado_inactivo IS NULL THEN

        p_estado := 'CONFIGURACION_INVALIDA';
        p_mensaje := 'No existe el estado INACTIVO para usuarios.';
        RETURN;

    END IF;


    -- --------------------------------------------------------------------------
    -- CREACION
    -- --------------------------------------------------------------------------

    BEGIN

        INSERT INTO public.seg_usuarios (
            id_persona,
            id_estado_usuario,
            usuario_login,
            password_hash,
            requiere_cambio_password,
            intentos_fallidos,
            bloqueado_hasta,
            password_actualizado_en
        )
        VALUES (
            p_id_persona,
            v_id_estado_inactivo,
            v_login,
            p_password_hash,
            TRUE,
            0,
            NULL,
            timezone('utc'::text, now())
        )
        RETURNING id_usuario
        INTO p_id_usuario;

    EXCEPTION
        WHEN unique_violation THEN

            p_id_usuario := NULL;
            p_estado := 'CONFLICTO';
            p_mensaje := 'La persona o el usuario ya posee una cuenta registrada.';
            RETURN;

    END;


    -- --------------------------------------------------------------------------
    -- AUDITORIA
    -- --------------------------------------------------------------------------

    PERFORM public.sp_registrar_auditoria(
        p_id_actor,
        'SEGURIDAD',
        'CREAR_USUARIO',
        'seg_usuarios',
        p_id_usuario::VARCHAR,
        'EXITOSO',
        'Cuenta de usuario creada en estado INACTIVO.',
        jsonb_build_object(
            'id_persona', p_id_persona,
            'usuario_login', v_login
        )
    );


    p_estado := 'CREADO';
    p_mensaje := 'Usuario creado correctamente en estado INACTIVO.';

END;
$$;


-- ==============================================================================
-- 6. ACTIVAR USUARIO
--
-- Para activar:
--   - actor debe tener users.activate
--   - cuenta debe ser gestionable por el actor
--   - usuario debe poseer al menos un rol activo
--
-- ACTIVAR no cambia contraseña ni roles.
-- ==============================================================================

CREATE OR REPLACE PROCEDURE public.sp_activar_usuario_seguridad(
    IN p_id_actor BIGINT,
    IN p_id_usuario BIGINT,

    OUT p_estado VARCHAR,
    OUT p_mensaje VARCHAR
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_id_estado_activo INT;
    v_estado_actual VARCHAR;
BEGIN

    p_estado := 'INVALIDO';
    p_mensaje := 'No fue posible activar el usuario.';


    IF NOT public.fn_usuario_tiene_permiso_seguridad(
        p_id_actor,
        'users.activate'
    ) THEN

        p_estado := 'DENEGADO';
        p_mensaje := 'No posee permiso para activar usuarios.';
        RETURN;

    END IF;


    SELECT eu.codigo
    INTO v_estado_actual
    FROM public.seg_usuarios u
    INNER JOIN public.cfg_estados_usuario eu
        ON eu.id_estado_usuario = u.id_estado_usuario
    WHERE u.id_usuario = p_id_usuario
    FOR UPDATE OF u;

    IF NOT FOUND THEN

        p_estado := 'NO_ENCONTRADO';
        p_mensaje := 'El usuario no existe.';
        RETURN;

    END IF;


    IF NOT public.fn_usuario_objetivo_gestionable(
        p_id_actor,
        p_id_usuario
    ) THEN

        p_estado := 'USUARIO_PROTEGIDO';
        p_mensaje := 'No posee autorizacion para administrar esta cuenta.';
        RETURN;

    END IF;


    -- Una cuenta activa debe tener al menos un rol utilizable.
    IF NOT EXISTS (
        SELECT 1
        FROM public.seg_usuarios_roles ur
        INNER JOIN public.seg_roles r
            ON r.id_rol = ur.id_rol
        WHERE ur.id_usuario = p_id_usuario
          AND ur.activo = TRUE
          AND r.activo = TRUE
    ) THEN

        p_estado := 'SIN_ROL';
        p_mensaje := 'Debe asignar al menos un rol antes de activar la cuenta.';
        RETURN;

    END IF;


    SELECT id_estado_usuario
    INTO v_id_estado_activo
    FROM public.cfg_estados_usuario
    WHERE codigo = 'ACTIVO'
      AND activo = TRUE
    LIMIT 1;

    IF v_id_estado_activo IS NULL THEN

        p_estado := 'CONFIGURACION_INVALIDA';
        p_mensaje := 'No existe el estado ACTIVO para usuarios.';
        RETURN;

    END IF;


    IF v_estado_actual = 'ACTIVO' THEN

        p_estado := 'YA_ACTIVO';
        p_mensaje := 'El usuario ya se encuentra activo.';
        RETURN;

    END IF;


    UPDATE public.seg_usuarios
    SET
        id_estado_usuario = v_id_estado_activo,
        intentos_fallidos = 0,
        bloqueado_hasta = NULL,
        fecha_actualizacion = timezone('utc'::text, now())
    WHERE id_usuario = p_id_usuario;


    PERFORM public.sp_registrar_auditoria(
        p_id_actor,
        'SEGURIDAD',
        'ACTIVAR_USUARIO',
        'seg_usuarios',
        p_id_usuario::VARCHAR,
        'EXITOSO',
        'Cuenta de usuario activada.',
        jsonb_build_object(
            'estado_anterior', v_estado_actual,
            'estado_nuevo', 'ACTIVO'
        )
    );


    p_estado := 'ACTIVADO';
    p_mensaje := 'Usuario activado correctamente.';

END;
$$;


-- ==============================================================================
-- 7. DESACTIVAR USUARIO
--
-- La cuenta pasa a INACTIVO.
--
-- Adicionalmente:
--   - se revocan refresh tokens/sesiones
--   - se invalidan recuperaciones de contraseña pendientes
--   - no se borra absolutamente ningun historial
-- ==============================================================================

CREATE OR REPLACE PROCEDURE public.sp_desactivar_usuario_seguridad(
    IN p_id_actor BIGINT,
    IN p_id_usuario BIGINT,

    OUT p_estado VARCHAR,
    OUT p_mensaje VARCHAR
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_id_estado_inactivo INT;
    v_estado_actual VARCHAR;
BEGIN

    p_estado := 'INVALIDO';
    p_mensaje := 'No fue posible desactivar el usuario.';


    IF NOT public.fn_usuario_tiene_permiso_seguridad(
        p_id_actor,
        'users.deactivate'
    ) THEN

        p_estado := 'DENEGADO';
        p_mensaje := 'No posee permiso para desactivar usuarios.';
        RETURN;

    END IF;


    -- Evita que el usuario cierre accidentalmente su propia cuenta.
    IF p_id_actor = p_id_usuario THEN

        p_estado := 'OPERACION_NO_PERMITIDA';
        p_mensaje := 'No puede desactivar su propia cuenta.';
        RETURN;

    END IF;


    SELECT eu.codigo
    INTO v_estado_actual
    FROM public.seg_usuarios u
    INNER JOIN public.cfg_estados_usuario eu
        ON eu.id_estado_usuario = u.id_estado_usuario
    WHERE u.id_usuario = p_id_usuario
    FOR UPDATE OF u;

    IF NOT FOUND THEN

        p_estado := 'NO_ENCONTRADO';
        p_mensaje := 'El usuario no existe.';
        RETURN;

    END IF;


    IF NOT public.fn_usuario_objetivo_gestionable(
        p_id_actor,
        p_id_usuario
    ) THEN

        p_estado := 'USUARIO_PROTEGIDO';
        p_mensaje := 'No posee autorizacion para administrar esta cuenta.';
        RETURN;

    END IF;


    SELECT id_estado_usuario
    INTO v_id_estado_inactivo
    FROM public.cfg_estados_usuario
    WHERE codigo = 'INACTIVO'
      AND activo = TRUE
    LIMIT 1;

    IF v_id_estado_inactivo IS NULL THEN

        p_estado := 'CONFIGURACION_INVALIDA';
        p_mensaje := 'No existe el estado INACTIVO para usuarios.';
        RETURN;

    END IF;


    IF v_estado_actual = 'INACTIVO' THEN

        p_estado := 'YA_INACTIVO';
        p_mensaje := 'El usuario ya se encuentra inactivo.';
        RETURN;

    END IF;


    UPDATE public.seg_usuarios
    SET
        id_estado_usuario = v_id_estado_inactivo,
        intentos_fallidos = 0,
        bloqueado_hasta = NULL,
        fecha_actualizacion = timezone('utc'::text, now())
    WHERE id_usuario = p_id_usuario;


    -- Revocar sesiones activas.
    UPDATE public.seg_sesiones
    SET
        fecha_revocacion = timezone('utc'::text, now()),
        motivo_revocacion = 'USUARIO_DESACTIVADO'
    WHERE id_usuario = p_id_usuario
      AND fecha_revocacion IS NULL;


    -- Invalidar links de recuperacion pendientes.
    UPDATE public.seg_tokens_recuperacion
    SET fecha_uso = timezone('utc'::text, now())
    WHERE id_usuario = p_id_usuario
      AND fecha_uso IS NULL;


    PERFORM public.sp_registrar_auditoria(
        p_id_actor,
        'SEGURIDAD',
        'DESACTIVAR_USUARIO',
        'seg_usuarios',
        p_id_usuario::VARCHAR,
        'EXITOSO',
        'Cuenta de usuario desactivada y sesiones revocadas.',
        jsonb_build_object(
            'estado_anterior', v_estado_actual,
            'estado_nuevo', 'INACTIVO'
        )
    );


    p_estado := 'DESACTIVADO';
    p_mensaje := 'Usuario desactivado correctamente.';

END;
$$;


-- ==============================================================================
-- 8. ASIGNAR ROL A USUARIO
--
-- Reglas:
--
-- GERENCIA:
--   posee users.assign_role + roles.assign_permissions
--   puede asignar cualquier rol activo.
--
-- RRHH:
--   posee users.assign_role
--   NO posee roles.assign_permissions
--   solo puede asignar roles asignable_rrhh = TRUE.
--
-- ADMINISTRADOR:
--   NO posee users.assign_role
--   por tanto no administra cuentas de trabajadores.
-- ==============================================================================

CREATE OR REPLACE PROCEDURE public.sp_asignar_rol_usuario(
    IN p_id_actor BIGINT,
    IN p_id_usuario BIGINT,
    IN p_codigo_rol VARCHAR,

    OUT p_estado VARCHAR,
    OUT p_mensaje VARCHAR
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_id_rol INT;
    v_codigo_rol VARCHAR(40);
    v_asignable_rrhh BOOLEAN;
    v_actor_privilegiado BOOLEAN;
BEGIN

    p_estado := 'INVALIDO';
    p_mensaje := 'No fue posible asignar el rol.';


    IF NOT public.fn_usuario_tiene_permiso_seguridad(
        p_id_actor,
        'users.assign_role'
    ) THEN

        p_estado := 'DENEGADO';
        p_mensaje := 'No posee permiso para asignar roles a usuarios.';
        RETURN;

    END IF;


    IF NOT EXISTS (
        SELECT 1
        FROM public.seg_usuarios
        WHERE id_usuario = p_id_usuario
    ) THEN

        p_estado := 'USUARIO_NO_ENCONTRADO';
        p_mensaje := 'El usuario no existe.';
        RETURN;

    END IF;


    v_codigo_rol := UPPER(BTRIM(p_codigo_rol));

    SELECT
        id_rol,
        asignable_rrhh
    INTO
        v_id_rol,
        v_asignable_rrhh
    FROM public.seg_roles
    WHERE codigo = v_codigo_rol
      AND activo = TRUE
    LIMIT 1;

    IF v_id_rol IS NULL THEN

        p_estado := 'ROL_NO_ENCONTRADO';
        p_mensaje := 'El rol indicado no existe o se encuentra inactivo.';
        RETURN;

    END IF;


    v_actor_privilegiado :=
        public.fn_usuario_tiene_permiso_seguridad(
            p_id_actor,
            'roles.assign_permissions'
        );


    -- Actor restringido: RRHH u otro rol delegado.
    IF NOT v_actor_privilegiado THEN

        -- No puede operar cuentas que ya poseen un rol protegido.
        IF NOT public.fn_usuario_objetivo_gestionable(
            p_id_actor,
            p_id_usuario
        ) THEN

            p_estado := 'USUARIO_PROTEGIDO';
            p_mensaje := 'No posee autorizacion para modificar los roles de esta cuenta.';
            RETURN;

        END IF;


        -- Tampoco puede asignar roles sensibles.
        IF NOT COALESCE(v_asignable_rrhh, FALSE) THEN

            p_estado := 'ROL_PROTEGIDO';
            p_mensaje := 'El rol solicitado no puede ser asignado por RRHH.';
            RETURN;

        END IF;

    END IF;


    INSERT INTO public.seg_usuarios_roles (
        id_usuario,
        id_rol,
        fecha_asignacion,
        fecha_revocacion,
        activo,
        asignado_por
    )
    VALUES (
        p_id_usuario,
        v_id_rol,
        timezone('utc'::text, now()),
        NULL,
        TRUE,
        p_id_actor
    )
    ON CONFLICT (id_usuario, id_rol)
    DO UPDATE SET
        fecha_asignacion = timezone('utc'::text, now()),
        fecha_revocacion = NULL,
        activo = TRUE,
        asignado_por = p_id_actor;


    -- El refresh token anterior contiene authorities antiguas.
    UPDATE public.seg_sesiones
    SET
        fecha_revocacion = timezone('utc'::text, now()),
        motivo_revocacion = 'CAMBIO_ROLES'
    WHERE id_usuario = p_id_usuario
      AND fecha_revocacion IS NULL;


    PERFORM public.sp_registrar_auditoria(
        p_id_actor,
        'SEGURIDAD',
        'ASIGNAR_ROL',
        'seg_usuarios_roles',
        p_id_usuario::VARCHAR,
        'EXITOSO',
        'Rol asignado a usuario.',
        jsonb_build_object(
            'id_usuario', p_id_usuario,
            'rol', v_codigo_rol
        )
    );


    p_estado := 'ASIGNADO';
    p_mensaje := 'Rol asignado correctamente.';

END;
$$;


-- ==============================================================================
-- 9. REVOCAR ROL DE USUARIO
--
-- Una cuenta con acceso habilitado nunca puede quedar sin roles activos.
-- ==============================================================================

CREATE OR REPLACE PROCEDURE public.sp_revocar_rol_usuario(
    IN p_id_actor BIGINT,
    IN p_id_usuario BIGINT,
    IN p_codigo_rol VARCHAR,

    OUT p_estado VARCHAR,
    OUT p_mensaje VARCHAR
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_id_rol INT;
    v_codigo_rol VARCHAR(40);
    v_asignable_rrhh BOOLEAN;
    v_actor_privilegiado BOOLEAN;
    v_permite_acceso BOOLEAN;
    v_roles_restantes INTEGER;
BEGIN

    p_estado := 'INVALIDO';
    p_mensaje := 'No fue posible revocar el rol.';


    IF NOT public.fn_usuario_tiene_permiso_seguridad(
        p_id_actor,
        'users.assign_role'
    ) THEN

        p_estado := 'DENEGADO';
        p_mensaje := 'No posee permiso para modificar roles de usuarios.';
        RETURN;

    END IF;


    SELECT eu.permite_acceso
    INTO v_permite_acceso
    FROM public.seg_usuarios u
    INNER JOIN public.cfg_estados_usuario eu
        ON eu.id_estado_usuario = u.id_estado_usuario
    WHERE u.id_usuario = p_id_usuario
    FOR UPDATE OF u;

    IF NOT FOUND THEN

        p_estado := 'USUARIO_NO_ENCONTRADO';
        p_mensaje := 'El usuario no existe.';
        RETURN;

    END IF;


    v_codigo_rol := UPPER(BTRIM(p_codigo_rol));

    SELECT
        id_rol,
        asignable_rrhh
    INTO
        v_id_rol,
        v_asignable_rrhh
    FROM public.seg_roles
    WHERE codigo = v_codigo_rol
    LIMIT 1;

    IF v_id_rol IS NULL THEN

        p_estado := 'ROL_NO_ENCONTRADO';
        p_mensaje := 'El rol indicado no existe.';
        RETURN;

    END IF;


    IF NOT EXISTS (
        SELECT 1
        FROM public.seg_usuarios_roles
        WHERE id_usuario = p_id_usuario
          AND id_rol = v_id_rol
          AND activo = TRUE
    ) THEN

        p_estado := 'ROL_NO_ASIGNADO';
        p_mensaje := 'El usuario no posee actualmente ese rol.';
        RETURN;

    END IF;


    v_actor_privilegiado :=
        public.fn_usuario_tiene_permiso_seguridad(
            p_id_actor,
            'roles.assign_permissions'
        );


    IF NOT v_actor_privilegiado THEN

        IF NOT public.fn_usuario_objetivo_gestionable(
            p_id_actor,
            p_id_usuario
        ) THEN

            p_estado := 'USUARIO_PROTEGIDO';
            p_mensaje := 'No posee autorizacion para modificar los roles de esta cuenta.';
            RETURN;

        END IF;


        IF NOT COALESCE(v_asignable_rrhh, FALSE) THEN

            p_estado := 'ROL_PROTEGIDO';
            p_mensaje := 'El rol indicado no puede ser administrado por RRHH.';
            RETURN;

        END IF;

    END IF;


    -- --------------------------------------------------------------------------
    -- UNA CUENTA ACTIVA NO PUEDE QUEDAR SIN ROL
    -- --------------------------------------------------------------------------

    SELECT COUNT(*)
    INTO v_roles_restantes
    FROM public.seg_usuarios_roles ur
    INNER JOIN public.seg_roles r
        ON r.id_rol = ur.id_rol
    WHERE ur.id_usuario = p_id_usuario
      AND ur.activo = TRUE
      AND r.activo = TRUE
      AND ur.id_rol <> v_id_rol;


    IF COALESCE(v_permite_acceso, FALSE)
       AND v_roles_restantes = 0 THEN

        p_estado := 'ULTIMO_ROL';
        p_mensaje := 'No puede retirar el ultimo rol de una cuenta activa.';
        RETURN;

    END IF;


    UPDATE public.seg_usuarios_roles
    SET
        activo = FALSE,
        fecha_revocacion = timezone('utc'::text, now())
    WHERE id_usuario = p_id_usuario
      AND id_rol = v_id_rol
      AND activo = TRUE;


    UPDATE public.seg_sesiones
    SET
        fecha_revocacion = timezone('utc'::text, now()),
        motivo_revocacion = 'CAMBIO_ROLES'
    WHERE id_usuario = p_id_usuario
      AND fecha_revocacion IS NULL;


    PERFORM public.sp_registrar_auditoria(
        p_id_actor,
        'SEGURIDAD',
        'REVOCAR_ROL',
        'seg_usuarios_roles',
        p_id_usuario::VARCHAR,
        'EXITOSO',
        'Rol revocado de usuario.',
        jsonb_build_object(
            'id_usuario', p_id_usuario,
            'rol', v_codigo_rol
        )
    );


    p_estado := 'REVOCADO';
    p_mensaje := 'Rol revocado correctamente.';

END;
$$;


-- ==============================================================================
-- 10. HABILITAR ASIGNACION DE ROLES PARA RRHH
--
-- En migracion 18 se dejo deliberadamente fuera hasta disponer de una capa
-- segura contra escalamiento de privilegios.
--
-- Ahora RRHH obtiene users.assign_role, pero el procedimiento anterior limita
-- los roles que puede asignar usando seg_roles.asignable_rrhh.
-- ==============================================================================

INSERT INTO public.seg_roles_permisos (
    id_rol,
    id_permiso,
    activo
)
SELECT
    r.id_rol,
    p.id_permiso,
    TRUE
FROM public.seg_roles r
INNER JOIN public.seg_permisos p
    ON p.codigo = 'users.assign_role'
WHERE r.codigo = 'RRHH'
  AND r.activo = TRUE
  AND p.activo = TRUE
ON CONFLICT (id_rol, id_permiso)
DO UPDATE SET
    activo = TRUE;


-- ==============================================================================
-- 11. ENDURECIMIENTO
--
-- Estas funciones/procedimientos son exclusivamente para el backend.
-- No se exponen directamente a usuarios de Supabase.
-- ==============================================================================

REVOKE ALL ON FUNCTION public.fn_usuario_tiene_permiso_seguridad(
    BIGINT,
    VARCHAR
) FROM PUBLIC, anon, authenticated;

REVOKE ALL ON FUNCTION public.fn_usuario_objetivo_gestionable(
    BIGINT,
    BIGINT
) FROM PUBLIC, anon, authenticated;


REVOKE ALL ON PROCEDURE public.sp_crear_usuario_seguridad(
    BIGINT,
    BIGINT,
    VARCHAR,
    VARCHAR
) FROM PUBLIC, anon, authenticated;


REVOKE ALL ON PROCEDURE public.sp_activar_usuario_seguridad(
    BIGINT,
    BIGINT
) FROM PUBLIC, anon, authenticated;


REVOKE ALL ON PROCEDURE public.sp_desactivar_usuario_seguridad(
    BIGINT,
    BIGINT
) FROM PUBLIC, anon, authenticated;


REVOKE ALL ON PROCEDURE public.sp_asignar_rol_usuario(
    BIGINT,
    BIGINT,
    VARCHAR
) FROM PUBLIC, anon, authenticated;


REVOKE ALL ON PROCEDURE public.sp_revocar_rol_usuario(
    BIGINT,
    BIGINT,
    VARCHAR
) FROM PUBLIC, anon, authenticated;


COMMIT;

-- ==============================================================================
-- FIN MIGRACION 19
-- ==============================================================================