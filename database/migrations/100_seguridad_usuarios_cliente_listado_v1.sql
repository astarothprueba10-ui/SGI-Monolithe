-- 100 - Incluir cuentas CLIENTE en Usuarios y Roles (Supabase TESTEO).
-- Conserva la autorizacion users.view y la politica de gestionabilidad por actor.
-- No modifica credenciales, cuentas ni los requisitos de documento verificado.
BEGIN;

-- RRHH puede gestionar una cuenta exclusivamente CLIENTE; las cuentas con
-- roles internos protegidos siguen exigiendo ADMINISTRADOR/GERENCIA.
CREATE OR REPLACE FUNCTION public.fn_usuario_objetivo_gestionable(p_id_actor bigint, p_id_usuario_objetivo bigint)
 RETURNS boolean
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
    ) AND EXISTS (
        SELECT 1
        FROM public.seg_usuarios_roles ar
        JOIN public.seg_roles ar_rol ON ar_rol.id_rol=ar.id_rol
        WHERE ar.id_usuario=p_id_actor AND ar.activo IS TRUE
          AND ar.fecha_revocacion IS NULL
          AND ar_rol.activo IS TRUE
          AND ar_rol.codigo IN ('ADMINISTRADOR','GERENCIA')
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
                OR (r.asignable_rrhh IS DISTINCT FROM TRUE AND r.codigo <> 'CLIENTE')
          )
    );

END;
$function$


-- El filtro legado es_interno=FALSE ocultaba CLIENTE, incluso de Gerencia.
CREATE OR REPLACE PROCEDURE public.sp_listar_usuarios_seguridad(IN p_id_actor bigint, OUT p_resultado jsonb, OUT p_estado character varying, OUT p_mensaje character varying)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $procedure$
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
          -- Mostrar cuentas CLIENTE sin eliminar la guarda por actor/gestionabilidad.
          AND public.fn_usuario_objetivo_gestionable(p_id_actor, u.id_usuario)
    ) x;

    p_estado := 'OK'; p_mensaje := 'Usuarios consultados correctamente.';
END;
$procedure$


-- La ejecucion de las rutinas permanece restringida al rol backend.
REVOKE ALL ON FUNCTION public.fn_usuario_objetivo_gestionable(bigint,bigint) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON PROCEDURE public.sp_listar_usuarios_seguridad(bigint) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.fn_usuario_objetivo_gestionable(bigint,bigint) TO sigi_app_user;
GRANT EXECUTE ON PROCEDURE public.sp_listar_usuarios_seguridad(bigint) TO sigi_app_user;
COMMIT;
