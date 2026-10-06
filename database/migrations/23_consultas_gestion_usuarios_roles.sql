-- ==============================================================================
-- MIGRACION 23 - CONSULTAS PARA GESTION DE USUARIOS, ROLES Y PERMISOS
-- ==============================================================================

BEGIN;

-- ------------------------------------------------------------------------------
-- 1. LISTAR USUARIOS INTERNOS
-- ------------------------------------------------------------------------------
CREATE OR REPLACE PROCEDURE public.sp_listar_usuarios_seguridad(
    IN p_id_actor BIGINT,
    OUT p_resultado JSONB,
    OUT p_estado VARCHAR,
    OUT p_mensaje VARCHAR
)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
    p_resultado := '[]'::jsonb;

    IF NOT public.fn_usuario_tiene_permiso_seguridad(p_id_actor, 'users.view') THEN
        p_estado := 'DENEGADO'; p_mensaje := 'No tiene permisos para consultar usuarios.'; RETURN;
    END IF;

    SELECT COALESCE(jsonb_agg(x.dato ORDER BY x.nombre_completo), '[]'::jsonb)
    INTO p_resultado
    FROM (
        SELECT
            CONCAT_WS(' ', p.nombres, p.apellido_paterno, p.apellido_materno) AS nombre_completo,
            jsonb_build_object(
                'idUsuario', u.id_usuario,
                'idPersona', u.id_persona,
                'nombreCompleto', CONCAT_WS(' ', p.nombres, p.apellido_paterno, p.apellido_materno),
                'usuarioLogin', u.usuario_login,
                'correo', (
                    SELECT pc.valor
                    FROM public.core_personas_contactos pc
                    JOIN public.cfg_tipos_contacto tc ON tc.id_tipo_contacto = pc.id_tipo_contacto
                    WHERE pc.id_persona = p.id_persona AND tc.codigo = 'EMAIL'
                      AND tc.activo = TRUE AND pc.principal = TRUE AND pc.activo = TRUE
                    LIMIT 1
                ),
                'estado', eu.codigo,
                'estadoNombre', eu.nombre,
                'ultimoAcceso', u.ultimo_acceso,
                'requiereCambioPassword', u.requiere_cambio_password,
                'passwordTemporalExpiraEn', u.password_temporal_expira_en,
                'roles', COALESCE((
                    SELECT jsonb_agg(jsonb_build_object(
                        'idRol', r.id_rol,
                        'codigo', r.codigo,
                        'nombre', r.nombre
                    ) ORDER BY r.nombre)
                    FROM public.seg_usuarios_roles ur
                    JOIN public.seg_roles r ON r.id_rol = ur.id_rol
                    WHERE ur.id_usuario = u.id_usuario AND ur.activo = TRUE AND r.activo = TRUE
                ), '[]'::jsonb),
                'gestionable', public.fn_usuario_objetivo_gestionable(p_id_actor, u.id_usuario)
            ) AS dato
        FROM public.seg_usuarios u
        JOIN public.core_personas p ON p.id_persona = u.id_persona
        JOIN public.cfg_estados_usuario eu ON eu.id_estado_usuario = u.id_estado_usuario
        WHERE p.activo = TRUE
          AND NOT EXISTS (
              SELECT 1 FROM public.seg_usuarios_roles ur
              JOIN public.seg_roles r ON r.id_rol = ur.id_rol
              WHERE ur.id_usuario = u.id_usuario AND ur.activo = TRUE
                AND r.activo = TRUE AND r.es_interno = FALSE
          )
          AND public.fn_usuario_objetivo_gestionable(p_id_actor, u.id_usuario)
    ) x;

    p_estado := 'OK'; p_mensaje := 'Usuarios consultados correctamente.';
END;
$$;


-- ------------------------------------------------------------------------------
-- 2. LISTAR ROLES DISPONIBLES
-- ADMIN/GERENCIA: todos los roles internos.
-- RRHH: solamente roles marcados asignable_rrhh.
-- ------------------------------------------------------------------------------
CREATE OR REPLACE PROCEDURE public.sp_listar_roles_seguridad(
    IN p_id_actor BIGINT,
    OUT p_resultado JSONB,
    OUT p_estado VARCHAR,
    OUT p_mensaje VARCHAR
)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_privilegiado BOOLEAN;
BEGIN
    p_resultado := '[]'::jsonb;

    IF NOT (
        public.fn_usuario_tiene_permiso_seguridad(p_id_actor, 'roles.view')
        OR public.fn_usuario_tiene_permiso_seguridad(p_id_actor, 'users.assign_role')
    ) THEN
        p_estado := 'DENEGADO'; p_mensaje := 'No tiene permisos para consultar roles.'; RETURN;
    END IF;

    v_privilegiado := public.fn_usuario_tiene_permiso_seguridad(p_id_actor, 'roles.assign_permissions');

    SELECT COALESCE(jsonb_agg(
        jsonb_build_object(
            'idRol', r.id_rol,
            'codigo', r.codigo,
            'nombre', r.nombre,
            'descripcion', r.descripcion,
            'esSistema', r.es_sistema,
            'activo', r.activo,
            'asignableRrhh', r.asignable_rrhh,
            'cantidadPermisos', (
                SELECT COUNT(*) FROM public.seg_roles_permisos rp
                JOIN public.seg_permisos p ON p.id_permiso = rp.id_permiso
                WHERE rp.id_rol = r.id_rol AND rp.activo = TRUE AND p.activo = TRUE
            ),
            'cantidadUsuarios', (
                SELECT COUNT(*) FROM public.seg_usuarios_roles ur
                WHERE ur.id_rol = r.id_rol AND ur.activo = TRUE
            )
        ) ORDER BY r.nombre
    ), '[]'::jsonb)
    INTO p_resultado
    FROM public.seg_roles r
    WHERE r.es_interno = TRUE
      AND (v_privilegiado = TRUE OR (r.activo = TRUE AND r.asignable_rrhh = TRUE));

    p_estado := 'OK'; p_mensaje := 'Roles consultados correctamente.';
END;
$$;


-- ------------------------------------------------------------------------------
-- 3. LISTAR CATALOGO DE PERMISOS + ASIGNACION DEL ROL
-- ------------------------------------------------------------------------------
CREATE OR REPLACE PROCEDURE public.sp_listar_permisos_rol_seguridad(
    IN p_id_actor BIGINT,
    IN p_codigo_rol VARCHAR,
    OUT p_resultado JSONB,
    OUT p_estado VARCHAR,
    OUT p_mensaje VARCHAR
)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_id_rol INT;
BEGIN
    p_resultado := '[]'::jsonb;

    IF NOT public.fn_usuario_tiene_permiso_seguridad(p_id_actor, 'permissions.view') THEN
        p_estado := 'DENEGADO'; p_mensaje := 'No tiene permisos para consultar permisos.'; RETURN;
    END IF;

    SELECT id_rol INTO v_id_rol
    FROM public.seg_roles
    WHERE UPPER(codigo) = UPPER(BTRIM(p_codigo_rol)) AND es_interno = TRUE
    LIMIT 1;

    IF v_id_rol IS NULL THEN
        p_estado := 'ROL_NO_ENCONTRADO'; p_mensaje := 'El rol indicado no existe.'; RETURN;
    END IF;

    SELECT COALESCE(jsonb_agg(
        jsonb_build_object(
            'idPermiso', p.id_permiso,
            'codigo', p.codigo,
            'modulo', p.modulo,
            'recurso', p.recurso,
            'accion', p.accion,
            'nombre', p.nombre,
            'descripcion', p.descripcion,
            'asignado', EXISTS (
                SELECT 1 FROM public.seg_roles_permisos rp
                WHERE rp.id_rol = v_id_rol AND rp.id_permiso = p.id_permiso AND rp.activo = TRUE
            )
        ) ORDER BY p.modulo, p.recurso, p.accion
    ), '[]'::jsonb)
    INTO p_resultado
    FROM public.seg_permisos p
    WHERE p.activo = TRUE;

    p_estado := 'OK'; p_mensaje := 'Permisos consultados correctamente.';
END;
$$;


-- ------------------------------------------------------------------------------
-- 4. PERSONAS DISPONIBLES PARA CREAR CUENTA
-- ------------------------------------------------------------------------------
CREATE OR REPLACE PROCEDURE public.sp_listar_personas_sin_usuario(
    IN p_id_actor BIGINT,
    OUT p_resultado JSONB,
    OUT p_estado VARCHAR,
    OUT p_mensaje VARCHAR
)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
    p_resultado := '[]'::jsonb;

    IF NOT public.fn_usuario_tiene_permiso_seguridad(p_id_actor, 'users.create') THEN
        p_estado := 'DENEGADO'; p_mensaje := 'No tiene permisos para crear usuarios.'; RETURN;
    END IF;

    SELECT COALESCE(jsonb_agg(x.dato ORDER BY x.nombre_completo), '[]'::jsonb)
    INTO p_resultado
    FROM (
        SELECT
            CONCAT_WS(' ', p.nombres, p.apellido_paterno, p.apellido_materno) AS nombre_completo,
            jsonb_build_object(
                'idPersona', p.id_persona,
                'nombres', p.nombres,
                'apellidoPaterno', p.apellido_paterno,
                'apellidoMaterno', p.apellido_materno,
                'nombreCompleto', CONCAT_WS(' ', p.nombres, p.apellido_paterno, p.apellido_materno),
                'correo', pc.valor,
                'correoVerificado', COALESCE(pc.verificado, FALSE),
                'elegible', COALESCE(pc.verificado, FALSE) AND pc.activo = TRUE
            ) AS dato
        FROM public.core_personas p
        LEFT JOIN LATERAL (
            SELECT c.valor, c.verificado, c.activo
            FROM public.core_personas_contactos c
            JOIN public.cfg_tipos_contacto tc ON tc.id_tipo_contacto = c.id_tipo_contacto
            WHERE c.id_persona = p.id_persona AND tc.codigo = 'EMAIL'
              AND tc.activo = TRUE AND c.principal = TRUE AND c.activo = TRUE
            LIMIT 1
        ) pc ON TRUE
        WHERE p.activo = TRUE
          AND NOT EXISTS (
              SELECT 1 FROM public.seg_usuarios u WHERE u.id_persona = p.id_persona
          )
    ) x;

    p_estado := 'OK'; p_mensaje := 'Personas disponibles consultadas correctamente.';
END;
$$;


-- ------------------------------------------------------------------------------
-- 5. HARDENING
-- ------------------------------------------------------------------------------
REVOKE ALL ON PROCEDURE public.sp_listar_usuarios_seguridad(BIGINT) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON PROCEDURE public.sp_listar_roles_seguridad(BIGINT) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON PROCEDURE public.sp_listar_permisos_rol_seguridad(BIGINT, VARCHAR) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON PROCEDURE public.sp_listar_personas_sin_usuario(BIGINT) FROM PUBLIC, anon, authenticated;

COMMIT;