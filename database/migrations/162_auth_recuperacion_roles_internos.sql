-- 162: recuperación de roles internos actuales y futuros; correo verificado único.
BEGIN;
CREATE OR REPLACE PROCEDURE public.sp_solicitar_recuperacion_password(IN p_usuario_login character varying, IN p_origen character varying, IN p_token_hash character varying, IN p_fecha_expiracion timestamp with time zone, IN p_ip_solicitud character varying, IN p_user_agent character varying, OUT p_id_usuario bigint, OUT p_correo character varying)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'pg_temp'
AS $procedure$
DECLARE
    v_id_usuario BIGINT;
    v_id_persona BIGINT;
    v_correo VARCHAR;
BEGIN
    IF p_origen IS NULL OR p_origen NOT IN ('BACKOFFICE', 'PORTAL_CLIENTE') THEN
        RAISE EXCEPTION 'Origen invalido para recuperacion de contrasena';
    END IF;

    IF p_token_hash IS NULL OR length(p_token_hash) <> 64 OR p_fecha_expiracion IS NULL OR p_fecha_expiracion <= now() THEN
        RAISE EXCEPTION 'Parametros de recuperacion invalidos';
    END IF;

    SELECT u.id_usuario, u.id_persona
    INTO v_id_usuario, v_id_persona
    FROM public.seg_usuarios u
    JOIN public.cfg_estados_usuario e ON e.id_estado_usuario = u.id_estado_usuario
    WHERE lower(btrim(u.usuario_login)) = lower(btrim(p_usuario_login))
      AND e.activo = TRUE
      AND e.permite_acceso = TRUE
      AND EXISTS (
          SELECT 1
          FROM public.seg_usuarios_roles ur
          JOIN public.seg_roles r ON r.id_rol = ur.id_rol
          WHERE ur.id_usuario = u.id_usuario
            AND ur.activo = TRUE
            AND ur.fecha_revocacion IS NULL
            AND r.activo = TRUE
            AND (
                (p_origen = 'BACKOFFICE' AND r.es_interno IS TRUE AND r.codigo <> 'CLIENTE')
                OR
                (p_origen = 'PORTAL_CLIENTE' AND r.codigo = 'CLIENTE')
            )
      );

    -- Si se introduce el correo asociado, solo resolver un correo principal verificado y único.
    -- No elegir arbitrariamente una cuenta cuando el mismo correo pertenece a varios usuarios.
    IF v_id_usuario IS NULL AND position('@' in coalesce(p_usuario_login,'')) > 0 THEN
        SELECT CASE WHEN count(DISTINCT u.id_usuario)=1 THEN min(u.id_usuario) END
        INTO v_id_usuario
        FROM public.seg_usuarios u
        JOIN public.cfg_estados_usuario e USING(id_estado_usuario)
        JOIN public.core_personas_contactos pc ON pc.id_persona=u.id_persona
        JOIN public.cfg_tipos_contacto tc USING(id_tipo_contacto)
        WHERE e.activo AND e.permite_acceso AND pc.activo AND pc.principal AND pc.verificado
          AND tc.activo AND tc.codigo='EMAIL'
          AND lower(btrim(pc.valor))=lower(btrim(p_usuario_login))
          AND EXISTS (SELECT 1 FROM public.seg_usuarios_roles ur JOIN public.seg_roles r USING(id_rol)
              WHERE ur.id_usuario=u.id_usuario AND ur.activo AND ur.fecha_revocacion IS NULL AND r.activo
              AND ((p_origen='BACKOFFICE' AND r.es_interno IS TRUE AND r.codigo<>'CLIENTE')
                   OR (p_origen='PORTAL_CLIENTE' AND r.codigo='CLIENTE')));
        IF v_id_usuario IS NOT NULL THEN
            SELECT id_persona INTO v_id_persona FROM public.seg_usuarios WHERE id_usuario=v_id_usuario;
        END IF;
    END IF;

    IF v_id_usuario IS NULL THEN
        p_id_usuario := NULL;
        p_correo := NULL;
        RETURN;
    END IF;

    SELECT pc.valor
    INTO v_correo
    FROM public.core_personas_contactos pc
    JOIN public.cfg_tipos_contacto tc ON tc.id_tipo_contacto = pc.id_tipo_contacto
    WHERE pc.id_persona = v_id_persona
      AND tc.codigo = 'EMAIL'
      AND tc.activo = TRUE
      AND pc.principal = TRUE
      AND BTRIM(pc.valor) <> ''
      AND CHAR_LENGTH(BTRIM(pc.valor)) <= 180
      AND BTRIM(pc.valor) ~* '^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$'
      AND pc.activo = TRUE
    LIMIT 1;

    IF v_correo IS NULL OR TRIM(v_correo) = '' THEN
        p_id_usuario := NULL;
        p_correo := NULL;
        RETURN;
    END IF;

    PERFORM 1
    FROM public.seg_usuarios
    WHERE id_usuario = v_id_usuario
    FOR UPDATE;

    v_id_persona := NULL;
    SELECT u.id_persona
    INTO v_id_persona
    FROM public.seg_usuarios u
    JOIN public.cfg_estados_usuario e ON e.id_estado_usuario = u.id_estado_usuario
    WHERE u.id_usuario = v_id_usuario
      AND e.activo = TRUE
      AND e.permite_acceso = TRUE
      AND EXISTS (
          SELECT 1
          FROM public.seg_usuarios_roles ur
          JOIN public.seg_roles r ON r.id_rol = ur.id_rol
          WHERE ur.id_usuario = u.id_usuario
            AND ur.activo = TRUE
            AND ur.fecha_revocacion IS NULL
            AND r.activo = TRUE
            AND (
                (p_origen = 'BACKOFFICE' AND r.es_interno IS TRUE AND r.codigo <> 'CLIENTE')
                OR
                (p_origen = 'PORTAL_CLIENTE' AND r.codigo = 'CLIENTE')
            )
      );

    IF v_id_persona IS NULL THEN
        p_id_usuario := NULL;
        p_correo := NULL;
        RETURN;
    END IF;

    v_correo := NULL;
    SELECT pc.valor
    INTO v_correo
    FROM public.core_personas_contactos pc
    JOIN public.cfg_tipos_contacto tc ON tc.id_tipo_contacto = pc.id_tipo_contacto
    WHERE pc.id_persona = v_id_persona
      AND tc.codigo = 'EMAIL'
      AND tc.activo = TRUE
      AND pc.principal = TRUE
      AND BTRIM(pc.valor) <> ''
      AND CHAR_LENGTH(BTRIM(pc.valor)) <= 180
      AND BTRIM(pc.valor) ~* '^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$'
      AND pc.activo = TRUE
    LIMIT 1;

    IF v_correo IS NULL OR TRIM(v_correo) = '' THEN
        p_id_usuario := NULL;
        p_correo := NULL;
        RETURN;
    END IF;

    UPDATE public.seg_tokens_recuperacion
    SET fecha_uso = now()
    WHERE id_usuario = v_id_usuario
      AND fecha_uso IS NULL;

    INSERT INTO public.seg_tokens_recuperacion (
        id_usuario,
        token_hash,
        fecha_expiracion,
        ip_solicitud,
        user_agent
    ) VALUES (
        v_id_usuario,
        p_token_hash,
        p_fecha_expiracion,
        LEFT(p_ip_solicitud, 45),
        LEFT(p_user_agent, 500)
    );

    p_id_usuario := v_id_usuario;
    p_correo := v_correo;
END;
$procedure$;
CREATE OR REPLACE PROCEDURE public.sp_confirmar_recuperacion_password(IN p_ticket_hash character varying, OUT p_id_usuario bigint)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $procedure$
DECLARE
    v_id_verificacion BIGINT;
    v_id_token BIGINT;
    v_id_usuario BIGINT;
    v_password_pendiente_hash VARCHAR;
    v_fecha_confirmacion TIMESTAMPTZ;
    v_fecha_bloqueo TIMESTAMPTZ;
    v_intentos SMALLINT;
    v_fecha_expiracion TIMESTAMPTZ;
BEGIN
     SELECT
        v.id_verificacion,
        t.id_usuario
    INTO
        v_id_verificacion,
        v_id_usuario
    FROM public.seg_verificaciones_recuperacion v
    JOIN public.seg_tokens_recuperacion t
        ON t.id_token = v.id_token
    WHERE v.ticket_hash = p_ticket_hash;

    IF v_id_verificacion IS NULL THEN
        RAISE EXCEPTION 'Verificacion invalida, expirada, confirmada o bloqueada';
    END IF;

    PERFORM 1
    FROM public.seg_usuarios
    WHERE id_usuario = v_id_usuario
    FOR UPDATE;

    SELECT
        v.id_token,
        t.id_usuario,
        v.password_pendiente_hash,
        v.fecha_confirmacion,
        v.fecha_bloqueo,
        v.intentos_fallidos,
        v.fecha_expiracion
    INTO
        v_id_token,
        v_id_usuario,
        v_password_pendiente_hash,
        v_fecha_confirmacion,
        v_fecha_bloqueo,
        v_intentos,
        v_fecha_expiracion
    FROM public.seg_verificaciones_recuperacion v
    JOIN public.seg_tokens_recuperacion t
        ON t.id_token = v.id_token
    WHERE v.id_verificacion = v_id_verificacion
    FOR UPDATE OF v;

    IF NOT FOUND
       OR v_fecha_confirmacion IS NOT NULL
       OR v_fecha_bloqueo IS NOT NULL
       OR v_intentos >= 5
       OR v_fecha_expiracion <= now() THEN
        RAISE EXCEPTION 'Verificacion invalida, expirada, confirmada o bloqueada';
    END IF;

    UPDATE public.seg_verificaciones_recuperacion vr
    SET fecha_bloqueo = now()
    WHERE vr.id_verificacion <> v_id_verificacion
      AND vr.fecha_confirmacion IS NULL
      AND vr.fecha_bloqueo IS NULL
      AND vr.id_token IN (
          SELECT tr.id_token
          FROM public.seg_tokens_recuperacion tr
          WHERE tr.id_usuario = v_id_usuario
      );

    UPDATE public.seg_usuarios
    SET password_hash = v_password_pendiente_hash,
        password_actualizado_en = now(),
        requiere_cambio_password = FALSE,
        password_temporal_expira_en = NULL,
        intentos_fallidos = 0,
        bloqueado_hasta = NULL,
        fecha_actualizacion = now()
    WHERE id_usuario = v_id_usuario;

    UPDATE public.seg_verificaciones_recuperacion
    SET fecha_confirmacion = now()
    WHERE id_verificacion = v_id_verificacion;

    UPDATE public.seg_sesiones
    SET fecha_revocacion = now(),
        motivo_revocacion = 'RECUPERACION_PASSWORD'
    WHERE id_usuario = v_id_usuario
      AND fecha_revocacion IS NULL;

    UPDATE public.seg_tokens_recuperacion
    SET fecha_uso = now()
    WHERE id_usuario = v_id_usuario
      AND fecha_uso IS NULL;

    p_id_usuario := v_id_usuario;
END;
$procedure$;
COMMIT;
