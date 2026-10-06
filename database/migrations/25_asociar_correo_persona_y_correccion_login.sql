-- ==============================================================================
-- SGI MONOLITHE
-- MIGRACION 25
-- ASOCIACION DE CORREO A PERSONA, CLASIFICACION DE PERSONA
-- Y CORRECCION DE LOGIN PARA USUARIOS INHABILITADOS
-- ==============================================================================

BEGIN;

-- ==============================================================================
-- 1. CORREGIR CONTEXTO DE AUTENTICACION
-- ==============================================================================
--
-- OBJETIVO:
-- Diferenciar correctamente:
--
--   A) Usuario realmente inhabilitado:
--      p_estado_activo = FALSE
--
--   B) Usuario activo pero con acceso restringido
--      (por ejemplo contraseña temporal vencida):
--      p_estado_activo = TRUE
--      p_permite_acceso = FALSE
--
-- PROBLEMA ANTERIOR:
-- cfg_estados_usuario.activo indica si el registro del catálogo está habilitado,
-- no si el usuario se encuentra en estado ACTIVO.
--
-- Por eso un estado catalogado como INACTIVO podía tener e.activo = TRUE.
-- ==============================================================================

CREATE OR REPLACE PROCEDURE public.sp_obtener_contexto_autenticacion(
    IN p_login VARCHAR,
    OUT p_id_usuario BIGINT,
    OUT p_usuario_login VARCHAR,
    OUT p_password_hash VARCHAR,
    OUT p_requiere_cambio_password BOOLEAN,
    OUT p_bloqueado_hasta TIMESTAMP,
    OUT p_estado_activo BOOLEAN,
    OUT p_permite_acceso BOOLEAN,
    OUT p_authorities TEXT[]
)
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN

    SELECT
        u.id_usuario,
        u.usuario_login,
        u.password_hash,
        u.requiere_cambio_password,
        u.bloqueado_hasta,

        -- El usuario está realmente activo únicamente cuando su estado
        -- corresponde al código ACTIVO y dicho estado del catálogo está vigente.
        (
            e.codigo = 'ACTIVO'
            AND COALESCE(e.activo, FALSE) = TRUE
        ) AS estado_activo,

        -- Permite acceso únicamente si:
        -- 1. El usuario está realmente ACTIVO.
        -- 2. El estado permite acceso.
        -- 3. La contraseña temporal no está vencida.
        (
            e.codigo = 'ACTIVO'
            AND COALESCE(e.activo, FALSE) = TRUE
            AND COALESCE(e.permite_acceso, FALSE) = TRUE
            AND NOT (
                COALESCE(u.requiere_cambio_password, FALSE) = TRUE
                AND u.password_temporal_expira_en IS NOT NULL
                AND u.password_temporal_expira_en <= NOW()
            )
        ) AS permite_acceso,

        COALESCE(
            (
                SELECT ARRAY_AGG(
                    DISTINCT autoridad
                    ORDER BY autoridad
                )
                FROM (
                    -- Roles
                    SELECT
                        'ROLE_' || r.codigo AS autoridad
                    FROM public.seg_usuarios_roles ur
                    INNER JOIN public.seg_roles r
                        ON r.id_rol = ur.id_rol
                    WHERE ur.id_usuario = u.id_usuario
                      AND ur.activo = TRUE
                      AND r.activo = TRUE

                    UNION

                    -- Permisos
                    SELECT
                        p.codigo AS autoridad
                    FROM public.seg_usuarios_roles ur
                    INNER JOIN public.seg_roles r
                        ON r.id_rol = ur.id_rol
                    INNER JOIN public.seg_roles_permisos rp
                        ON rp.id_rol = r.id_rol
                    INNER JOIN public.seg_permisos p
                        ON p.id_permiso = rp.id_permiso
                    WHERE ur.id_usuario = u.id_usuario
                      AND ur.activo = TRUE
                      AND r.activo = TRUE
                      AND rp.activo = TRUE
                      AND p.activo = TRUE
                ) autoridades
            ),
            ARRAY[]::TEXT[]
        ) AS authorities

    INTO
        p_id_usuario,
        p_usuario_login,
        p_password_hash,
        p_requiere_cambio_password,
        p_bloqueado_hasta,
        p_estado_activo,
        p_permite_acceso,
        p_authorities

    FROM public.seg_usuarios u
    LEFT JOIN public.cfg_estados_usuario e
        ON e.id_estado_usuario = u.id_estado_usuario

    WHERE LOWER(BTRIM(u.usuario_login)) = LOWER(BTRIM(p_login))
    LIMIT 1;

END;
$$;


-- ==============================================================================
-- 2. ASOCIAR CORREO PRINCIPAL A UNA PERSONA
-- ==============================================================================
--
-- Este procedimiento se utiliza durante el alta administrativa de usuarios.
--
-- Flujo esperado:
--
--   asociar correo
--       ->
--   crear usuario
--       ->
--   asignar rol
--       ->
--   activar usuario
--       ->
--   enviar contraseña temporal al correo principal
--
-- El correo registrado administrativamente se considera verificado porque
-- solamente un actor con users.create puede ejecutar esta operación.
--
-- React NO escribe directamente sobre core_personas_contactos.
-- ==============================================================================

CREATE OR REPLACE PROCEDURE public.sp_asociar_correo_persona_seguridad(
    IN p_id_actor BIGINT,
    IN p_id_persona BIGINT,
    IN p_correo VARCHAR,
    OUT p_estado VARCHAR,
    OUT p_mensaje VARCHAR
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_correo_limpio TEXT;
    v_id_tipo_email INT;
    v_id_persona_contacto BIGINT;
BEGIN

    -- --------------------------------------------------------------------------
    -- 2.1. Validar autorización
    -- --------------------------------------------------------------------------

    IF p_id_actor IS NULL
       OR NOT public.fn_usuario_tiene_permiso_seguridad(
            p_id_actor,
            'users.create'
       )
    THEN
        p_estado := 'DENEGADO';
        p_mensaje := 'No posee autorización para gestionar usuarios o contactos.';
        RETURN;
    END IF;


    -- --------------------------------------------------------------------------
    -- 2.2. Validar persona
    -- --------------------------------------------------------------------------
    --
    -- Se bloquea la fila durante esta operación para evitar dos modificaciones
    -- simultáneas del correo principal de la misma persona.
    -- --------------------------------------------------------------------------

    PERFORM 1
    FROM public.core_personas
    WHERE id_persona = p_id_persona
      AND activo = TRUE
    FOR UPDATE;

    IF NOT FOUND THEN
        p_estado := 'PERSONA_NO_ENCONTRADA';
        p_mensaje := 'La persona especificada no existe o se encuentra inactiva.';
        RETURN;
    END IF;


    -- --------------------------------------------------------------------------
    -- 2.3. Normalizar y validar correo
    -- --------------------------------------------------------------------------

    v_correo_limpio := LOWER(BTRIM(p_correo));

    IF v_correo_limpio IS NULL
       OR v_correo_limpio = ''
       OR LENGTH(v_correo_limpio) > 180
       OR v_correo_limpio !~* '^[A-Z0-9._%+\-]+@[A-Z0-9.\-]+\.[A-Z]{2,}$'
    THEN
        p_estado := 'EMAIL_INVALIDO';
        p_mensaje := 'El formato del correo electrónico es inválido.';
        RETURN;
    END IF;


    -- --------------------------------------------------------------------------
    -- 2.4. Obtener tipo de contacto EMAIL
    -- --------------------------------------------------------------------------

    SELECT tc.id_tipo_contacto
    INTO v_id_tipo_email
    FROM public.cfg_tipos_contacto tc
    WHERE tc.codigo = 'EMAIL'
      AND tc.activo = TRUE
    LIMIT 1;

    IF v_id_tipo_email IS NULL THEN
        p_estado := 'CONFIGURACION_INVALIDA';
        p_mensaje := 'No existe el tipo de contacto EMAIL en la configuración del sistema.';
        RETURN;
    END IF;


    -- --------------------------------------------------------------------------
    -- 2.5. Buscar si la persona ya posee exactamente ese correo
    -- --------------------------------------------------------------------------

    SELECT pc.id_persona_contacto
    INTO v_id_persona_contacto
    FROM public.core_personas_contactos pc
    WHERE pc.id_persona = p_id_persona
      AND pc.id_tipo_contacto = v_id_tipo_email
      AND LOWER(BTRIM(pc.valor)) = v_correo_limpio
    ORDER BY
        pc.activo DESC,
        pc.principal DESC,
        pc.id_persona_contacto DESC
    LIMIT 1;


    -- --------------------------------------------------------------------------
    -- 2.6. El correo nuevo será el único EMAIL principal de esta persona
    -- --------------------------------------------------------------------------

    UPDATE public.core_personas_contactos
    SET
        principal = FALSE,
        fecha_actualizacion = timezone('utc'::text, NOW())
    WHERE id_persona = p_id_persona
      AND id_tipo_contacto = v_id_tipo_email
      AND principal = TRUE
      AND (
            v_id_persona_contacto IS NULL
            OR id_persona_contacto <> v_id_persona_contacto
          );


    -- --------------------------------------------------------------------------
    -- 2.7. Reactivar/actualizar o insertar el correo
    -- --------------------------------------------------------------------------

    IF v_id_persona_contacto IS NOT NULL THEN

        UPDATE public.core_personas_contactos
        SET
            valor = v_correo_limpio,
            principal = TRUE,
            verificado = TRUE,
            permite_notificaciones = TRUE,
            activo = TRUE,
            fecha_actualizacion = timezone('utc'::text, NOW())
        WHERE id_persona_contacto = v_id_persona_contacto;

    ELSE

        INSERT INTO public.core_personas_contactos (
            id_persona,
            id_tipo_contacto,
            valor,
            principal,
            verificado,
            permite_notificaciones,
            activo,
            fecha_creacion,
            fecha_actualizacion
        )
        VALUES (
            p_id_persona,
            v_id_tipo_email,
            v_correo_limpio,
            TRUE,
            TRUE,
            TRUE,
            TRUE,
            timezone('utc'::text, NOW()),
            timezone('utc'::text, NOW())
        );

    END IF;


    p_estado := 'OK';
    p_mensaje := 'Correo asociado correctamente a la persona.';

END;
$$;


-- ==============================================================================
-- 3. LISTAR PERSONAS DISPONIBLES PARA CREACION DE USUARIO
-- ==============================================================================
--
-- Devuelve personas activas que todavía no poseen cuenta en seg_usuarios.
--
-- tipoPersona:
--
--   CLIENTE
--      Si la persona está registrada en crm_clientes.
--
--   TRABAJADOR
--      Si actualmente no está registrada en crm_clientes.
--
-- IMPORTANTE:
-- Esta clasificación corresponde al modelo disponible actualmente.
-- No se introduce una tabla de trabajadores no confirmada.
--
-- El correo puede ser NULL porque ahora puede registrarse durante el proceso
-- de creación del usuario.
-- ==============================================================================

CREATE OR REPLACE PROCEDURE public.sp_listar_personas_sin_usuario(
    IN p_id_actor BIGINT,
    OUT p_resultado JSONB,
    OUT p_estado VARCHAR,
    OUT p_mensaje VARCHAR
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN

    p_resultado := '[]'::JSONB;


    -- --------------------------------------------------------------------------
    -- 3.1. Autorización
    -- --------------------------------------------------------------------------

    IF p_id_actor IS NULL
       OR NOT public.fn_usuario_tiene_permiso_seguridad(
            p_id_actor,
            'users.create'
       )
    THEN
        p_estado := 'DENEGADO';
        p_mensaje := 'No tiene permisos para crear usuarios.';
        RETURN;
    END IF;


    -- --------------------------------------------------------------------------
    -- 3.2. Personas disponibles
    -- --------------------------------------------------------------------------

    SELECT
        COALESCE(
            JSONB_AGG(
                x.dato
                ORDER BY x.nombre_completo
            ),
            '[]'::JSONB
        )
    INTO p_resultado

    FROM (
        SELECT
            CONCAT_WS(
                ' ',
                p.nombres,
                p.apellido_paterno,
                p.apellido_materno
            ) AS nombre_completo,

            JSONB_BUILD_OBJECT(
                'idPersona',
                p.id_persona,

                'nombres',
                p.nombres,

                'apellidoPaterno',
                p.apellido_paterno,

                'apellidoMaterno',
                p.apellido_materno,

                'nombreCompleto',
                CONCAT_WS(
                    ' ',
                    p.nombres,
                    p.apellido_paterno,
                    p.apellido_materno
                ),

                'correo',
                pc.valor,

                'correoVerificado',
                COALESCE(pc.verificado, FALSE),

                'tipoPersona',
                CASE
                    WHEN EXISTS (
                        SELECT 1
                        FROM public.crm_clientes c
                        WHERE c.id_persona = p.id_persona
                    )
                    THEN 'CLIENTE'
                    ELSE 'TRABAJADOR'
                END,

                -- La existencia previa de correo ya NO es requisito.
                -- El correo puede registrarse durante el alta.
                'elegible',
                p.activo = TRUE
            ) AS dato

        FROM public.core_personas p

        LEFT JOIN LATERAL (
            SELECT
                c.valor,
                c.verificado
            FROM public.core_personas_contactos c
            INNER JOIN public.cfg_tipos_contacto tc
                ON tc.id_tipo_contacto = c.id_tipo_contacto
            WHERE c.id_persona = p.id_persona
              AND tc.codigo = 'EMAIL'
              AND tc.activo = TRUE
              AND c.principal = TRUE
              AND c.activo = TRUE
            ORDER BY c.id_persona_contacto DESC
            LIMIT 1
        ) pc
            ON TRUE

        WHERE p.activo = TRUE

          -- Solo personas que todavía no poseen usuario.
          AND NOT EXISTS (
              SELECT 1
              FROM public.seg_usuarios u
              WHERE u.id_persona = p.id_persona
          )

    ) x;


    p_estado := 'OK';
    p_mensaje := 'Personas disponibles consultadas correctamente.';

END;
$$;


-- ==============================================================================
-- 4. HARDENING DE PROCEDIMIENTOS
-- ==============================================================================
--
-- Los procedimientos no deben quedar ejecutables directamente por roles
-- públicos de Supabase.
-- El backend accede mediante la conexión autorizada del servicio.
-- ==============================================================================

REVOKE ALL
ON PROCEDURE public.sp_asociar_correo_persona_seguridad(
    BIGINT,
    BIGINT,
    VARCHAR
)
FROM PUBLIC, anon, authenticated;


REVOKE ALL
ON PROCEDURE public.sp_listar_personas_sin_usuario(
    BIGINT
)
FROM PUBLIC, anon, authenticated;


REVOKE ALL
ON PROCEDURE public.sp_obtener_contexto_autenticacion(
    VARCHAR
)
FROM PUBLIC, anon, authenticated;


COMMIT;