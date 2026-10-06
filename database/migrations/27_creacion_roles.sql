-- ==============================================================================
-- SGI MONOLITHE
-- MIGRACION 27 - CREACION DE ROLES
-- ==============================================================================

BEGIN;


-- ==============================================================================
-- 1. CREAR ROL DE SEGURIDAD
-- ==============================================================================

CREATE OR REPLACE PROCEDURE public.sp_crear_rol_seguridad(
    IN p_id_actor BIGINT,
    IN p_nombre VARCHAR,
    OUT p_estado VARCHAR,
    OUT p_mensaje VARCHAR
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_nombre VARCHAR(100);
    v_codigo VARCHAR(40);
    v_id_rol INT;
BEGIN

    -- --------------------------------------------------------------------------
    -- 1.1. Autorizacion
    -- --------------------------------------------------------------------------

    IF p_id_actor IS NULL
       OR NOT public.fn_usuario_tiene_permiso_seguridad(
            p_id_actor,
            'roles.create'
       )
    THEN
        p_estado := 'DENEGADO';
        p_mensaje := 'No posee autorizacion para crear roles.';
        RETURN;
    END IF;


    -- --------------------------------------------------------------------------
    -- 1.2. Normalizar nombre
    -- --------------------------------------------------------------------------

    v_nombre := BTRIM(p_nombre);

    IF v_nombre IS NULL
       OR v_nombre = ''
       OR CHAR_LENGTH(v_nombre) < 2
       OR CHAR_LENGTH(v_nombre) > 100
    THEN
        p_estado := 'INVALIDO';
        p_mensaje := 'El nombre del rol debe tener entre 2 y 100 caracteres.';
        RETURN;
    END IF;


    -- --------------------------------------------------------------------------
    -- 1.3. Generar codigo automaticamente
    -- --------------------------------------------------------------------------
    --
    -- Ejemplo:
    --   Supervisor Comercial -> SUPERVISOR_COMERCIAL
    -- ==========================================================================

    v_codigo := UPPER(
        REGEXP_REPLACE(
            TRANSLATE(
                v_nombre,
                'áéíóúÁÉÍÓÚñÑüÜ',
                'aeiouAEIOUnNuU'
            ),
            '[^A-Za-z0-9]+',
            '_',
            'g'
        )
    );

    v_codigo := TRIM(BOTH '_' FROM v_codigo);

    IF CHAR_LENGTH(v_codigo) > 40 THEN
        v_codigo := LEFT(v_codigo, 40);
        v_codigo := TRIM(BOTH '_' FROM v_codigo);
    END IF;

    IF v_codigo IS NULL OR v_codigo = '' THEN
        p_estado := 'INVALIDO';
        p_mensaje := 'No fue posible generar un codigo valido para el rol.';
        RETURN;
    END IF;


    -- --------------------------------------------------------------------------
    -- 1.4. Evitar roles duplicados
    -- --------------------------------------------------------------------------

    IF EXISTS (
        SELECT 1
        FROM public.seg_roles r
        WHERE UPPER(BTRIM(r.codigo)) = v_codigo
           OR LOWER(BTRIM(r.nombre)) = LOWER(v_nombre)
    ) THEN
        p_estado := 'ROL_EXISTENTE';
        p_mensaje := 'Ya existe un rol con ese nombre.';
        RETURN;
    END IF;


    -- --------------------------------------------------------------------------
    -- 1.5. Crear rol
    -- --------------------------------------------------------------------------

    BEGIN

        INSERT INTO public.seg_roles (
            codigo,
            nombre,
            descripcion,
            es_sistema,
            activo,
            asignable_rrhh,
            es_interno,
            fecha_creacion,
            fecha_actualizacion
        )
        VALUES (
            v_codigo,
            v_nombre,
            NULL,
            FALSE,
            TRUE,
            FALSE,
            TRUE,
            timezone('utc'::text, NOW()),
            timezone('utc'::text, NOW())
        )
        RETURNING id_rol
        INTO v_id_rol;

    EXCEPTION
        WHEN unique_violation THEN
            p_estado := 'ROL_EXISTENTE';
            p_mensaje := 'Ya existe un rol con ese nombre o codigo.';
            RETURN;
    END;


    -- --------------------------------------------------------------------------
    -- 1.6. Auditoria
    -- --------------------------------------------------------------------------

    PERFORM public.sp_registrar_auditoria(
        p_id_actor,
        'SEGURIDAD',
        'CREAR_ROL',
        'seg_roles',
        v_id_rol::VARCHAR,
        'EXITOSO',
        'Se creo un nuevo rol de seguridad.',
        jsonb_build_object(
            'id_rol', v_id_rol,
            'codigo', v_codigo,
            'nombre', v_nombre,
            'es_sistema', FALSE,
            'es_interno', TRUE,
            'asignable_rrhh', FALSE
        )
    );


    -- --------------------------------------------------------------------------
    -- 1.7. Respuesta
    -- --------------------------------------------------------------------------

    p_estado := 'CREADO';
    p_mensaje := 'Rol creado correctamente.';

END;
$$;


-- ==============================================================================
-- 2. HARDENING
-- ==============================================================================

REVOKE ALL
ON PROCEDURE public.sp_crear_rol_seguridad(
    BIGINT,
    VARCHAR
)
FROM PUBLIC, anon, authenticated;


COMMIT;