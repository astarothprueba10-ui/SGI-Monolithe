-- ==============================================================================
-- SGI-MONOLITHE: MIGRACION 13 - SEGUNDA VERIFICACION DE RECUPERACION DE CONTRASEÑA POR OTP
-- Modulo: auth-service / Recuperación de Contraseña
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. CREACION DE TABLA SEGUNDA VERIFICACION POR OTP
-- Proposito: Almacena el estado intermedio de verificación por código de 6 dígitos (OTP),
-- ticket temporal de frontend y la nueva contraseña codificada con BCrypt pendiente de confirmación.
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.seg_verificaciones_recuperacion (
    id_verificacion BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

    id_token BIGINT NOT NULL,

    ticket_hash VARCHAR(64) NOT NULL,

    otp_hash VARCHAR(255) NOT NULL,

    password_pendiente_hash VARCHAR(255) NOT NULL,

    intentos_fallidos SMALLINT NOT NULL DEFAULT 0,

    fecha_expiracion TIMESTAMPTZ NOT NULL,

    fecha_confirmacion TIMESTAMPTZ NULL,

    fecha_bloqueo TIMESTAMPTZ NULL,

    fecha_creacion TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT uk_seg_verificaciones_recuperacion_id_token
        UNIQUE (id_token),

    CONSTRAINT uk_seg_verificaciones_recuperacion_ticket_hash
        UNIQUE (ticket_hash),

    CONSTRAINT fk_seg_verificaciones_recuperacion_token
        FOREIGN KEY (id_token)
        REFERENCES public.seg_tokens_recuperacion(id_token)
        ON DELETE CASCADE,

    CONSTRAINT chk_seg_verificaciones_recuperacion_intentos_min
        CHECK (intentos_fallidos >= 0),

    CONSTRAINT chk_seg_verificaciones_recuperacion_intentos_max
        CHECK (intentos_fallidos <= 5)
);

-- ------------------------------------------------------------------------------
-- 2. INDICE PARA OPTIMIZACION DE CONSULTAS DE EXPIRACION
-- ------------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_seg_verificaciones_recuperacion_expiracion
    ON public.seg_verificaciones_recuperacion(fecha_expiracion);

-- ------------------------------------------------------------------------------
-- 3. HABILITACION DE ROW LEVEL SECURITY (RLS)
-- Nota: No se crean políticas públicas; el acceso es exclusivo para auth-service vía backend.
-- ------------------------------------------------------------------------------
ALTER TABLE public.seg_verificaciones_recuperacion ENABLE ROW LEVEL SECURITY;
