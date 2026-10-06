BEGIN;

CREATE OR REPLACE PROCEDURE public.sp_listar_auditoria_seguridad(
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

    IF p_id_actor IS NULL
       OR NOT public.fn_usuario_tiene_permiso_seguridad(
            p_id_actor,
            'audit.view'
       )
    THEN
        p_estado := 'DENEGADO';
        p_mensaje := 'No tiene permisos para consultar la auditoría.';
        RETURN;
    END IF;

    SELECT COALESCE(
        JSONB_AGG(
            x.dato
            ORDER BY x.fecha_evento DESC, x.id_evento DESC
        ),
        '[]'::JSONB
    )
    INTO p_resultado
    FROM (
        SELECT
            a.id_evento,
            a.fecha_evento,

            JSONB_BUILD_OBJECT(
                'idEvento', a.id_evento,
                'fechaEvento', a.fecha_evento,

                'idUsuario', a.id_usuario,
                'usuarioLogin', u.usuario_login,

                'nombreUsuario',
                    NULLIF(
                        CONCAT_WS(
                            ' ',
                            p.nombres,
                            p.apellido_paterno,
                            p.apellido_materno
                        ),
                        ''
                    ),

                'roles',
                    COALESCE(
                        (
                            SELECT JSONB_AGG(
                                JSONB_BUILD_OBJECT(
                                    'codigo', r.codigo,
                                    'nombre', r.nombre
                                )
                                ORDER BY r.nombre
                            )
                            FROM public.seg_usuarios_roles ur
                            INNER JOIN public.seg_roles r
                                ON r.id_rol = ur.id_rol
                            WHERE ur.id_usuario = a.id_usuario
                              AND ur.activo = TRUE
                              AND r.activo = TRUE
                        ),
                        '[]'::JSONB
                    ),

                'modulo', a.modulo,
                'accion', a.accion,

                'entidad', a.entidad,
                'idEntidad', a.id_entidad,

                'resultado', a.resultado,
                'descripcion', a.descripcion,

                'ipOrigen',
                    COALESCE(
                        a.ip_origen,
                        a.datos_contexto ->> 'ip_origen'
                    ),

                'userAgent',
                    COALESCE(
                        a.user_agent,
                        a.datos_contexto ->> 'user_agent'
                    ),

                'requestId', a.request_id,

                'metodoHttp',
                    COALESCE(
                        a.metodo_http,
                        a.datos_contexto ->> 'metodo_http'
                    ),

                'ruta',
                    COALESCE(
                        a.ruta,
                        a.datos_contexto ->> 'ruta'
                    ),

                'datosAntes', a.datos_antes,
                'datosDespues', a.datos_despues,
                'datosContexto', a.datos_contexto

            ) AS dato

        FROM public.aud_eventos a

        LEFT JOIN public.seg_usuarios u
            ON u.id_usuario = a.id_usuario

        LEFT JOIN public.core_personas p
            ON p.id_persona = u.id_persona

    ) x;

    p_estado := 'OK';
    p_mensaje := 'Auditoría consultada correctamente.';

END;
$$;

REVOKE ALL
ON PROCEDURE public.sp_listar_auditoria_seguridad(BIGINT)
FROM PUBLIC, anon, authenticated;

COMMIT;
