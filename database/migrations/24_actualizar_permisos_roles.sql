BEGIN;

DROP PROCEDURE IF EXISTS public.sp_actualizar_permisos_rol_seguridad(
    BIGINT,
    VARCHAR,
    TEXT[]
);

CREATE PROCEDURE public.sp_actualizar_permisos_rol_seguridad(
    IN p_id_actor BIGINT,
    IN p_codigo_rol VARCHAR,
    IN p_codigos_permisos TEXT[],
    OUT p_estado VARCHAR,
    OUT p_mensaje VARCHAR
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_id_rol INTEGER;
    v_codigo_rol VARCHAR;
    v_codigo_permiso TEXT;
    v_permisos TEXT[];
BEGIN
    /* 1. El actor debe poder administrar permisos de roles */
    IF NOT public.fn_usuario_tiene_permiso_seguridad(
        p_id_actor,
        'roles.assign_permissions'
    ) THEN
        p_estado := 'DENEGADO';
        p_mensaje := 'No tiene permiso para modificar permisos de roles.';
        RETURN;
    END IF;

    /* 2. Buscar el rol */
    SELECT id_rol, codigo
    INTO v_id_rol, v_codigo_rol
    FROM seg_roles
    WHERE UPPER(codigo) = UPPER(BTRIM(p_codigo_rol))
      AND activo = TRUE;

    IF v_id_rol IS NULL THEN
        p_estado := 'NO_ENCONTRADO';
        p_mensaje := 'El rol indicado no existe o está inactivo.';
        RETURN;
    END IF;

    /* 3. GERENCIA es administrado automáticamente */
    IF v_codigo_rol = 'GERENCIA' THEN
        p_estado := 'PROTEGIDO';
        p_mensaje := 'Los permisos de GERENCIA se asignan automáticamente y no pueden modificarse manualmente.';
        RETURN;
    END IF;

    /* 4. CLIENTE pertenece al Portal del Cliente */
    IF v_codigo_rol = 'CLIENTE' THEN
        p_estado := 'PROTEGIDO';
        p_mensaje := 'El rol CLIENTE no se administra desde el Backoffice.';
        RETURN;
    END IF;

    /* 5. Solo GERENCIA puede modificar al ADMINISTRADOR */
    IF v_codigo_rol = 'ADMINISTRADOR'
       AND NOT EXISTS (
           SELECT 1
           FROM seg_usuarios_roles ur
           INNER JOIN seg_roles r
               ON r.id_rol = ur.id_rol
           WHERE ur.id_usuario = p_id_actor
             AND ur.activo = TRUE
             AND r.activo = TRUE
             AND r.codigo = 'GERENCIA'
       ) THEN

        p_estado := 'DENEGADO';
        p_mensaje := 'Solo GERENCIA puede modificar los permisos del rol ADMINISTRADOR.';
        RETURN;
    END IF;

    /* 6. Normalizar lista recibida */
    SELECT COALESCE(
        ARRAY_AGG(DISTINCT BTRIM(x)),
        ARRAY[]::TEXT[]
    )
    INTO v_permisos
    FROM UNNEST(
        COALESCE(
            p_codigos_permisos,
            ARRAY[]::TEXT[]
        )
    ) AS x
    WHERE BTRIM(x) <> '';

    /* 7. Validar que todos los permisos existan y estén activos */
    FOREACH v_codigo_permiso IN ARRAY v_permisos
    LOOP
        IF NOT EXISTS (
            SELECT 1
            FROM seg_permisos
            WHERE codigo = v_codigo_permiso
              AND activo = TRUE
        ) THEN
            p_estado := 'PERMISO_INVALIDO';
            p_mensaje :=
                'El permiso ' ||
                v_codigo_permiso ||
                ' no existe o está inactivo.';
            RETURN;
        END IF;
    END LOOP;

    /*
     * 8. Desactivar las asignaciones actuales.
     * No hacemos DELETE físico.
     */
    UPDATE seg_roles_permisos
    SET activo = FALSE
    WHERE id_rol = v_id_rol
      AND activo = TRUE;

    /*
     * 9. Activar/asignar los permisos seleccionados.
     * UNIQUE(id_rol,id_permiso) evita duplicados.
     */
    IF CARDINALITY(v_permisos) > 0 THEN

        INSERT INTO seg_roles_permisos (
            id_rol,
            id_permiso,
            fecha_asignacion,
            asignado_por,
            activo
        )
        SELECT
            v_id_rol,
            p.id_permiso,
            NOW(),
            p_id_actor,
            TRUE
        FROM seg_permisos p
        WHERE p.codigo = ANY(v_permisos)
          AND p.activo = TRUE

        ON CONFLICT (id_rol, id_permiso)
        DO UPDATE
        SET
            activo = TRUE,
            fecha_asignacion = EXCLUDED.fecha_asignacion,
            asignado_por = EXCLUDED.asignado_por;

    END IF;
    /* 10. Revocar sesiones activas de usuarios afectados */
    UPDATE seg_sesiones s
    SET
       fecha_revocacion = NOW(),
       motivo_revocacion = 'PERMISOS_ROL_ACTUALIZADOS'
    WHERE s.fecha_revocacion IS NULL
      AND EXISTS (
         SELECT 1
         FROM seg_usuarios_roles ur
          WHERE ur.id_usuario = s.id_usuario
            AND ur.id_rol = v_id_rol
            AND ur.activo = TRUE
  );

    p_estado := 'OK';
    p_mensaje := 'Permisos del rol actualizados correctamente.';
END;
$$;


/* Solo el backend debe ejecutar el procedimiento */

REVOKE ALL
ON PROCEDURE public.sp_actualizar_permisos_rol_seguridad(
    BIGINT,
    VARCHAR,
    TEXT[]
)
FROM PUBLIC;

REVOKE ALL
ON PROCEDURE public.sp_actualizar_permisos_rol_seguridad(
    BIGINT,
    VARCHAR,
    TEXT[]
)
FROM anon;

REVOKE ALL
ON PROCEDURE public.sp_actualizar_permisos_rol_seguridad(
    BIGINT,
    VARCHAR,
    TEXT[]
)
FROM authenticated;

COMMIT;