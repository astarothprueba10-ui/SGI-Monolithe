-- ==============================================================================
-- SGI MONOLITHE
-- MIGRACION 22 - VALIDACION DE VENCIMIENTO DE PASSWORD TEMPORAL
-- ==============================================================================

BEGIN;

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
        e.activo,

        e.permite_acceso
        AND NOT (
            u.requiere_cambio_password = TRUE
            AND u.password_temporal_expira_en IS NOT NULL
            AND u.password_temporal_expira_en <= now()
        ),

        COALESCE((
            SELECT array_agg(DISTINCT autoridad ORDER BY autoridad)
            FROM (
                SELECT 'ROLE_' || r.codigo AS autoridad
                FROM public.seg_usuarios_roles ur
                JOIN public.seg_roles r ON r.id_rol = ur.id_rol
                WHERE ur.id_usuario = u.id_usuario
                  AND ur.activo = TRUE
                  AND r.activo = TRUE

                UNION

                SELECT p.codigo
                FROM public.seg_usuarios_roles ur
                JOIN public.seg_roles r ON r.id_rol = ur.id_rol
                JOIN public.seg_roles_permisos rp ON rp.id_rol = r.id_rol
                JOIN public.seg_permisos p ON p.id_permiso = rp.id_permiso
                WHERE ur.id_usuario = u.id_usuario
                  AND ur.activo = TRUE
                  AND r.activo = TRUE
                  AND rp.activo = TRUE
                  AND p.activo = TRUE
            ) autoridades
        ), ARRAY[]::TEXT[])

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

COMMIT;