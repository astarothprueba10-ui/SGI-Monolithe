-- ==============================================================================
-- SGI-MONOLITHE: MIGRACION 17 - REENVIO SEGURO DE OTP DE RECUPERACION
-- Modulo: auth-service / Recuperacion de Contrasena
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. CAMPOS DE CONTROL DE REENVIO
--
-- Reglas:
-- - Maximo 3 reenvios por flujo.
-- - Minimo 60 segundos entre reenvios.
-- - Ventana maxima de 30 minutos desde que se crea la verificacion.
-- - Reenviar NO reinicia los intentos fallidos.
-- - El OTP anterior queda invalidado al reemplazar su hash.
-- ------------------------------------------------------------------------------

ALTER TABLE public.seg_verificaciones_recuperacion
    ADD COLUMN IF NOT EXISTS reenvios_otp SMALLINT NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS ultimo_reenvio_otp TIMESTAMPTZ NULL,
    ADD COLUMN IF NOT EXISTS fecha_limite_reenvio TIMESTAMPTZ
        NOT NULL DEFAULT (now() + INTERVAL '30 minutes');


-- ------------------------------------------------------------------------------
-- 2. RESTRICCION DE MAXIMO 3 REENVIOS
-- ------------------------------------------------------------------------------

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'chk_seg_verificaciones_reenvios_otp'
          AND conrelid =
              'public.seg_verificaciones_recuperacion'::regclass
    ) THEN

        ALTER TABLE public.seg_verificaciones_recuperacion
            ADD CONSTRAINT chk_seg_verificaciones_reenvios_otp
            CHECK (
                reenvios_otp >= 0
                AND reenvios_otp <= 3
            );

    END IF;
END;
$$;


-- ------------------------------------------------------------------------------
-- 3. PROCEDIMIENTO DE REENVIO DE OTP
--
-- Estados posibles:
--
-- REENVIADO
-- ESPERA
-- LIMITE_REENVIOS
-- VENTANA_EXPIRADA
-- NO_DISPONIBLE
-- INVALIDO
--
-- Importante:
-- - No cambia ticket_hash.
-- - No cambia password_pendiente_hash.
-- - No reinicia intentos_fallidos.
-- - No desbloquea verificaciones bloqueadas.
-- ------------------------------------------------------------------------------

CREATE OR REPLACE PROCEDURE public.sp_reenviar_otp_recuperacion(
    IN p_ticket_hash VARCHAR,
    IN p_nuevo_otp_hash VARCHAR,
    IN p_nueva_fecha_expiracion TIMESTAMPTZ,

    OUT p_id_usuario BIGINT,
    OUT p_reenvios_realizados SMALLINT,
    OUT p_reenvios_restantes SMALLINT,
    OUT p_segundos_espera INTEGER,
    OUT p_estado VARCHAR
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_id_verificacion BIGINT;
    v_id_usuario BIGINT;

    v_intentos_fallidos SMALLINT;
    v_reenvios_otp SMALLINT;

    v_fecha_confirmacion TIMESTAMPTZ;
    v_fecha_bloqueo TIMESTAMPTZ;
    v_ultimo_reenvio TIMESTAMPTZ;
    v_fecha_limite_reenvio TIMESTAMPTZ;

    v_segundos_espera INTEGER;
BEGIN

    -- Valores de salida seguros por defecto.
    p_id_usuario := NULL;
    p_reenvios_realizados := 0;
    p_reenvios_restantes := 0;
    p_segundos_espera := 0;
    p_estado := 'INVALIDO';


    -- --------------------------------------------------------------------------
    -- Bloqueo atomico de la verificacion.
    -- Evita dos reenvios simultaneos sobre el mismo ticket.
    -- --------------------------------------------------------------------------

    SELECT
        v.id_verificacion,
        t.id_usuario,
        v.intentos_fallidos,
        v.reenvios_otp,
        v.fecha_confirmacion,
        v.fecha_bloqueo,
        v.ultimo_reenvio_otp,
        v.fecha_limite_reenvio
    INTO
        v_id_verificacion,
        v_id_usuario,
        v_intentos_fallidos,
        v_reenvios_otp,
        v_fecha_confirmacion,
        v_fecha_bloqueo,
        v_ultimo_reenvio,
        v_fecha_limite_reenvio
    FROM public.seg_verificaciones_recuperacion v
    JOIN public.seg_tokens_recuperacion t
        ON t.id_token = v.id_token
    WHERE v.ticket_hash = p_ticket_hash
    FOR UPDATE OF v;


    -- --------------------------------------------------------------------------
    -- Ticket inexistente.
    -- --------------------------------------------------------------------------

    IF NOT FOUND OR v_id_verificacion IS NULL THEN
        p_estado := 'INVALIDO';
        RETURN;
    END IF;


    p_id_usuario := v_id_usuario;
    p_reenvios_realizados := COALESCE(v_reenvios_otp, 0);
    p_reenvios_restantes :=
        GREATEST(
            0,
            3 - COALESCE(v_reenvios_otp, 0)
        )::SMALLINT;


    -- --------------------------------------------------------------------------
    -- Verificacion ya confirmada, bloqueada o con 5 intentos fallidos.
    -- --------------------------------------------------------------------------

    IF v_fecha_confirmacion IS NOT NULL
       OR v_fecha_bloqueo IS NOT NULL
       OR v_intentos_fallidos >= 5 THEN

        p_estado := 'NO_DISPONIBLE';
        RETURN;

    END IF;


    -- --------------------------------------------------------------------------
    -- Ventana total para reenvios vencida.
    -- --------------------------------------------------------------------------

    IF v_fecha_limite_reenvio IS NULL
       OR now() > v_fecha_limite_reenvio THEN

        p_estado := 'VENTANA_EXPIRADA';
        RETURN;

    END IF;


    -- --------------------------------------------------------------------------
    -- Limite maximo de 3 reenvios.
    -- --------------------------------------------------------------------------

    IF COALESCE(v_reenvios_otp, 0) >= 3 THEN

        p_estado := 'LIMITE_REENVIOS';
        p_reenvios_realizados := 3;
        p_reenvios_restantes := 0;

        RETURN;

    END IF;


    -- --------------------------------------------------------------------------
    -- Cooldown de 60 segundos.
    -- --------------------------------------------------------------------------

    IF v_ultimo_reenvio IS NOT NULL
       AND now() < v_ultimo_reenvio + INTERVAL '60 seconds' THEN

        v_segundos_espera :=
            CEIL(
                EXTRACT(
                    EPOCH FROM (
                        (v_ultimo_reenvio + INTERVAL '60 seconds')
                        - now()
                    )
                )
            )::INTEGER;

        p_segundos_espera :=
            GREATEST(
                1,
                v_segundos_espera
            );

        p_estado := 'ESPERA';

        RETURN;

    END IF;


    -- --------------------------------------------------------------------------
    -- La nueva expiracion debe estar en el futuro.
    -- --------------------------------------------------------------------------

    IF p_nueva_fecha_expiracion IS NULL
       OR p_nueva_fecha_expiracion <= now() THEN

        p_estado := 'INVALIDO';
        RETURN;

    END IF;


    -- --------------------------------------------------------------------------
    -- REENVIO
    --
    -- El nuevo hash reemplaza al anterior.
    -- No se modifica intentos_fallidos.
    -- No se modifica password_pendiente_hash.
    -- No se modifica ticket_hash.
    -- --------------------------------------------------------------------------

    UPDATE public.seg_verificaciones_recuperacion
    SET
        otp_hash = p_nuevo_otp_hash,
        fecha_expiracion = p_nueva_fecha_expiracion,
        reenvios_otp = COALESCE(reenvios_otp, 0) + 1,
        ultimo_reenvio_otp = now()
    WHERE id_verificacion = v_id_verificacion;


    p_reenvios_realizados :=
        (COALESCE(v_reenvios_otp, 0) + 1)::SMALLINT;

    p_reenvios_restantes :=
        GREATEST(
            0,
            3 - p_reenvios_realizados
        )::SMALLINT;

    p_segundos_espera := 60;
    p_estado := 'REENVIADO';

END;
$$;


-- ------------------------------------------------------------------------------
-- 4. ENDURECIMIENTO DE PERMISOS
--
-- El procedimiento debe ejecutarse exclusivamente desde el backend.
-- ------------------------------------------------------------------------------

REVOKE ALL ON PROCEDURE public.sp_reenviar_otp_recuperacion(
    VARCHAR,
    VARCHAR,
    TIMESTAMPTZ,
    OUT BIGINT,
    OUT SMALLINT,
    OUT SMALLINT,
    OUT INTEGER,
    OUT VARCHAR
) FROM PUBLIC, anon, authenticated;


-- ==============================================================================
-- FIN MIGRACION 17
-- ==============================================================================