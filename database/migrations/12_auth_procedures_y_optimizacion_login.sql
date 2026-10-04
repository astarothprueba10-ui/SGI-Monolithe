-- ==============================================================================
-- SGI-MONOLITHE: MIGRACION 12 - PROCEDIMIENTOS ALMACENADOS DE AUTENTICACION Y OPTIMIZACION DE LOGIN
-- Modulo: auth-service (Optimizacion de rendimiento, auditoria y carga de contexto)
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. ACTUALIZACION DE FUNCION DE AUDITORIA
-- Proposito: Registra eventos de auditoria extrayendo atributos de conexion
-- (ip_origen, user_agent, metodo_http, ruta) desde el payload JSONB p_datos_contexto.
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.sp_registrar_auditoria(
    p_id_usuario BIGINT,
    p_modulo VARCHAR,
    p_accion VARCHAR,
    p_entidad VARCHAR,
    p_id_entidad VARCHAR,
    p_resultado VARCHAR,
    p_descripcion VARCHAR,
    p_datos_contexto JSONB DEFAULT '{}'::jsonb
)
RETURNS BIGINT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_id_evento BIGINT;
BEGIN
    INSERT INTO public.aud_eventos (
        id_usuario,
        modulo,
        accion,
        entidad,
        id_entidad,
        resultado,
        descripcion,
        ip_origen,
        user_agent,
        metodo_http,
        ruta,
        datos_contexto,
        fecha_evento
    ) VALUES (
        p_id_usuario,
        p_modulo,
        p_accion,
        p_entidad,
        p_id_entidad,
        p_resultado,
        p_descripcion,
        NULLIF(p_datos_contexto ->> 'ip_origen', ''),
        NULLIF(p_datos_contexto ->> 'user_agent', ''),
        NULLIF(p_datos_contexto ->> 'metodo_http', ''),
        NULLIF(p_datos_contexto ->> 'ruta', ''),
        p_datos_contexto,
        timezone('utc'::text, now())
    )
    RETURNING id_evento INTO v_id_evento;

    RETURN v_id_evento;
END;
$$;

-- ------------------------------------------------------------------------------
-- 2. PROCEDIMIENTO DE REGISTRO DE ACCESO EXITOSO
-- Proposito: Restablece el contador de intentos fallidos, limpia la marca de bloqueo
-- temporal y actualiza la fecha/hora de ultimo acceso del usuario de forma atomica.
-- ------------------------------------------------------------------------------
CREATE OR REPLACE PROCEDURE public.sp_registrar_acceso_exitoso(
    IN p_id_usuario BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    UPDATE public.seg_usuarios
    SET
        intentos_fallidos = 0,
        bloqueado_hasta = NULL,
        ultimo_acceso = timezone('utc'::text, now())
    WHERE id_usuario = p_id_usuario;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Usuario no encontrado: %', p_id_usuario;
    END IF;
END;
$$;

-- ------------------------------------------------------------------------------
-- 3. PROCEDIMIENTO DE OBTENCION DE CONTEXTO DE AUTENTICACION
-- Proposito: Recupera en un unico viaje a base de datos (single roundtrip) la
-- informacion del usuario, su estado y el arreglo consolidado de roles y permisos
-- (authorities) para reducir drásticamente la latencia en UserDetailsService.
-- ------------------------------------------------------------------------------
CREATE OR REPLACE PROCEDURE public.sp_obtener_contexto_autenticacion(
    IN  p_login VARCHAR,

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
        e.permite_acceso,

        COALESCE(
            (
                SELECT array_agg(
                    DISTINCT autoridad
                    ORDER BY autoridad
                )
                FROM (
                    SELECT
                        'ROLE_' || r.codigo AS autoridad
                    FROM public.seg_usuarios_roles ur
                    INNER JOIN public.seg_roles r
                        ON r.id_rol = ur.id_rol
                    WHERE ur.id_usuario = u.id_usuario
                      AND ur.activo = TRUE
                      AND r.activo = TRUE

                    UNION

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
        )

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
    WHERE u.usuario_login = p_login
    LIMIT 1;

END;
$$;
