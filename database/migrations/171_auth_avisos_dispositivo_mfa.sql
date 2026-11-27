BEGIN;

ALTER TABLE auth_mfa.dispositivos
    ADD COLUMN IF NOT EXISTS aviso_acceso_en timestamptz,
    ADD COLUMN IF NOT EXISTS aviso_intentar_en timestamptz,
    ADD COLUMN IF NOT EXISTS aviso_intentos smallint NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_auth_dispositivos_avisos_pendientes
    ON auth_mfa.dispositivos (aviso_intentar_en, id_usuario)
    WHERE aviso_intentar_en IS NOT NULL AND aviso_intentos < 6;

COMMIT;
