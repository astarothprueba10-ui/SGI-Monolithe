-- ==============================================================================
-- SGI-MONOLITHE: MIGRACION 16 - CORREO PARA VERIFICACION OTP
-- Modulo: auth-service / Recuperacion de Contrasena
-- ==============================================================================

CREATE OR REPLACE PROCEDURE public.sp_obtener_correo_recuperacion_password(
    IN p_id_usuario BIGINT,
    OUT p_correo VARCHAR
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    SELECT pc.valor
    INTO p_correo
    FROM public.seg_usuarios u
    JOIN public.core_personas_contactos pc
        ON pc.id_persona = u.id_persona
    JOIN public.cfg_tipos_contacto tc
        ON tc.id_tipo_contacto = pc.id_tipo_contacto
    WHERE u.id_usuario = p_id_usuario
      AND tc.codigo = 'EMAIL'
      AND tc.activo = TRUE
      AND pc.principal = TRUE
      AND pc.verificado = TRUE
      AND pc.activo = TRUE
    LIMIT 1;
END;
$$;

REVOKE ALL ON PROCEDURE public.sp_obtener_correo_recuperacion_password(
    BIGINT
) FROM PUBLIC, anon, authenticated;